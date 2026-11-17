'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Bell, BellOff, CalendarDays, Clock3, Pause, Play, Plus, Trash2 } from 'lucide-react';

interface LibraryBook {
  _id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: string;
  coverColor?: string;
  coverImage?: string;
}

interface ReadingPlan {
  _id: string;
  title: string;
  bookIds: string[];
  books: LibraryBook[];
  startDate: string;
  endDate: string;
  time: string;
  daysOfWeek: number[];
  reminderEnabled: boolean;
  isActive: boolean;
}

interface PlanForm {
  title: string;
  startDate: string;
  endDate: string;
  time: string;
  daysOfWeek: number[];
  bookIds: string[];
  reminderEnabled: boolean;
}

function isLibraryBook(value: unknown): value is LibraryBook {
  if (!value || typeof value !== 'object') return false;
  const book = value as Partial<LibraryBook>;
  return (
    typeof book._id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.author === 'string' &&
    typeof book.totalPages === 'number' &&
    typeof book.currentPage === 'number' &&
    typeof book.status === 'string'
  );
}

function isReadingPlan(value: unknown): value is ReadingPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<ReadingPlan>;
  return (
    typeof plan._id === 'string' &&
    typeof plan.title === 'string' &&
    Array.isArray(plan.bookIds) &&
    plan.bookIds.every((id) => typeof id === 'string') &&
    Array.isArray(plan.books) &&
    plan.books.every(isLibraryBook) &&
    typeof plan.startDate === 'string' &&
    typeof plan.endDate === 'string' &&
    typeof plan.time === 'string' &&
    Array.isArray(plan.daysOfWeek) &&
    plan.daysOfWeek.every((day) => typeof day === 'number') &&
    typeof plan.reminderEnabled === 'boolean' &&
    typeof plan.isActive === 'boolean'
  );
}

const weekDays = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

function announcePlanChange() {
  window.dispatchEvent(new Event('reading-plans:updated'));
  try {
    window.localStorage.setItem('shelve-reading-plans-updated', String(Date.now()));
  } catch (error) {
    console.error('Could not notify other Shelve windows about the plan change:', error);
  }
}

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyForm(): PlanForm {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  return {
    title: 'Evening reading',
    startDate: localDateInputValue(start),
    endDate: localDateInputValue(end),
    time: '21:00',
    daysOfWeek: weekDays.map((day) => day.value),
    bookIds: [],
    reminderEnabled: true,
  };
}

function formatPlanDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function dayLabels(daysOfWeek: number[]) {
  return weekDays
    .filter((day) => daysOfWeek.includes(day.value))
    .map((day) => day.label)
    .join(', ');
}

function finishedBook(book: LibraryBook) {
  return book.status === 'archived' || (book.totalPages > 0 && book.currentPage >= book.totalPages);
}

function planProgress(plan: ReadingPlan) {
  const completed = plan.books.filter(finishedBook).length;
  return {
    completed,
    total: plan.bookIds.length,
    percent: plan.bookIds.length ? Math.round((completed / plan.bookIds.length) * 100) : 0,
  };
}

async function responseError(response: Response, fallback: string) {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }
  return fallback;
}

export default function ScheduledReading() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [form, setForm] = useState<PlanForm>(createEmptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setNotificationPermission(
      window.windowControls?.showNotification
        ? 'granted'
        : 'Notification' in window
          ? Notification.permission
          : 'unsupported'
    );
  }, []);

  const loadData = useCallback(async () => {
    const [booksResponse, plansResponse] = await Promise.all([
      fetch('/api/books'),
      fetch('/api/reading-plans'),
    ]);

    if (!booksResponse.ok) {
      throw new Error(await responseError(booksResponse, 'Could not load your books.'));
    }
    if (!plansResponse.ok) {
      throw new Error(await responseError(plansResponse, 'Could not load your reading plans.'));
    }

    const [booksPayload, plansPayload]: [unknown, unknown] = await Promise.all([
      booksResponse.json(),
      plansResponse.json(),
    ]);
    if (
      !Array.isArray(booksPayload) ||
      !booksPayload.every(isLibraryBook) ||
      !Array.isArray(plansPayload) ||
      !plansPayload.every(isReadingPlan)
    ) {
      throw new Error('The reading planner received an invalid response.');
    }

    setBooks(booksPayload);
    setPlans(plansPayload);
  }, []);

  useEffect(() => {
    void loadData()
      .catch((loadError: unknown) => {
        console.error('Failed to load reading planner:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Could not load your reading planner.');
      })
      .finally(() => setIsLoading(false));
  }, [loadData]);

  const openForm = () => {
    setError('');
    setNotice('');
    setForm(createEmptyForm());
    setIsFormOpen(true);
  };

  const toggleBook = (bookId: string) => {
    setForm((current) => ({
      ...current,
      bookIds: current.bookIds.includes(bookId)
        ? current.bookIds.filter((id) => id !== bookId)
        : [...current.bookIds, bookId],
    }));
  };

  const toggleDay = (day: number) => {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((selectedDay) => selectedDay !== day)
        : [...current.daysOfWeek, day],
    }));
  };

  const createPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (form.bookIds.length === 0) {
      setError('Choose at least one book for this plan.');
      return;
    }
    if (form.daysOfWeek.length === 0) {
      setError('Choose at least one day for your reading sessions.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('The finish-by date must be on or after the start date.');
      return;
    }

    setIsSaving(true);
    let permissionMessage = '';
    if (form.reminderEnabled) {
      if (window.windowControls?.showNotification) {
        setNotificationPermission('granted');
      } else if (!('Notification' in window)) {
        permissionMessage = 'Plan saved, but this browser does not support system notifications.';
      } else if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
          if (permission !== 'granted') {
            permissionMessage = 'Plan saved, but notifications are not allowed. Enable them in your browser or system settings.';
          }
        } catch (permissionError) {
          console.error('Could not request notification permission:', permissionError);
          permissionMessage = 'Plan saved, but notification permission could not be requested.';
        }
      } else if (Notification.permission === 'denied') {
        permissionMessage = 'Plan saved, but notifications are blocked. Enable them in your browser or system settings.';
      }
    }

    try {
      const response = await fetch('/api/reading-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, 'Could not save your reading plan.'));
      }

      announcePlanChange();
      setForm(createEmptyForm());
      setIsFormOpen(false);
      try {
        await loadData();
        setNotice(permissionMessage || 'Your reading plan is saved.');
      } catch (refreshError) {
        console.error('Reading plan was saved but the list could not be refreshed:', refreshError);
        setNotice('Your plan was saved, but the list could not be refreshed. Reload the page to see it.');
      }
    } catch (saveError) {
      console.error('Failed to save reading plan:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Could not save your reading plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePlan = async (plan: ReadingPlan, action: 'pause' | 'resume' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Delete “${plan.title}”?`)) return;

    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/reading-plans/${plan._id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        ...(action !== 'delete' && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: action === 'resume' }),
        }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, `Could not ${action} this reading plan.`));
      }

      announcePlanChange();
      try {
        await loadData();
        setNotice(action === 'delete' ? 'Reading plan deleted.' : `Reading plan ${action}d.`);
      } catch (refreshError) {
        console.error('Reading plan was updated but the list could not be refreshed:', refreshError);
        setNotice('Your change was saved, but the list could not be refreshed. Reload the page to see it.');
      }
    } catch (updateError) {
      console.error(`Failed to ${action} reading plan:`, updateError);
      setError(updateError instanceof Error ? updateError.message : `Could not ${action} this reading plan.`);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#1a1916] p-5 sm:p-6" aria-labelledby="scheduled-reading-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[#c9a96e]">
            <CalendarDays size={16} aria-hidden="true" />
            <h2 id="scheduled-reading-title" className="text-sm font-semibold uppercase tracking-wider">Scheduled reading</h2>
          </div>
          <p className="text-xs text-[#9b9890]">Build a routine and track books toward your finish-by date.</p>
        </div>
        {!isFormOpen && (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a96e] px-3 py-2 text-xs font-medium text-[#1a1510] transition-colors hover:bg-[#d4b47a]"
          >
            <Plus size={14} aria-hidden="true" />
            New plan
          </button>
        )}
      </div>

      {(error || notice) && (
        <p className={`mb-4 rounded-lg border px-3 py-2 text-sm ${error ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-green-400/25 bg-green-400/10 text-green-200'}`} role={error ? 'alert' : 'status'}>
          {error || notice}
        </p>
      )}

      {isFormOpen && (
        <form onSubmit={createPlan} className="mb-6 space-y-5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-[#9b9890]">
              Plan name
              <input
                required
                maxLength={80}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#1a1916] px-3 py-2.5 text-sm text-[#f0ede8] outline-none focus:border-[#c9a96e]"
              />
            </label>
            <label className="text-xs text-[#9b9890]">
              Reading time
              <input
                required
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#1a1916] px-3 py-2.5 text-sm text-[#f0ede8] outline-none focus:border-[#c9a96e]"
              />
            </label>
            <label className="text-xs text-[#9b9890]">
              Start date
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#1a1916] px-3 py-2.5 text-sm text-[#f0ede8] outline-none focus:border-[#c9a96e]"
              />
            </label>
            <label className="text-xs text-[#9b9890]">
              Finish-by date
              <input
                required
                type="date"
                min={form.startDate}
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#1a1916] px-3 py-2.5 text-sm text-[#f0ede8] outline-none focus:border-[#c9a96e]"
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs text-[#9b9890]">Repeat on</legend>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <label key={day.value} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${form.daysOfWeek.includes(day.value) ? 'border-[#c9a96e] bg-[rgba(201,169,110,0.14)] text-[#e8d2a7]' : 'border-[rgba(255,255,255,0.12)] text-[#9b9890] hover:border-white/30'}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.daysOfWeek.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs text-[#9b9890]">Books to finish by {form.endDate ? formatPlanDate(form.endDate) : 'your deadline'}</legend>
            {books.length === 0 ? (
              <p className="rounded-lg border border-[rgba(255,255,255,0.07)] p-3 text-sm text-[#9b9890]">Add a book to your library before creating a plan.</p>
            ) : (
              <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                {books.map((book) => (
                  <label key={book._id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.07)] p-3 hover:border-[rgba(201,169,110,0.25)]">
                    <input
                      type="checkbox"
                      checked={form.bookIds.includes(book._id)}
                      onChange={() => toggleBook(book._id)}
                      className="accent-[#c9a96e]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#f0ede8]">{book.title}</span>
                      <span className="block truncate text-xs text-[#9b9890]">{book.author}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <label className="flex items-start gap-2 text-xs text-[#9b9890]">
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(event) => setForm((current) => ({ ...current, reminderEnabled: event.target.checked }))}
              className="mt-0.5 accent-[#c9a96e]"
            />
            <span className="flex items-center gap-1.5">
              <Bell size={14} aria-hidden="true" />
              Remind me with a system notification while Shelve is running
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-[rgba(255,255,255,0.12)] px-3 py-2 text-xs text-[#9b9890] hover:text-[#f0ede8]">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || books.length === 0} className="rounded-lg bg-[#c9a96e] px-4 py-2 text-xs font-medium text-[#1a1510] hover:bg-[#d4b47a] disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save reading plan'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="py-4 text-sm text-[#9b9890]" role="status">Loading reading plans…</p>
      ) : plans.length === 0 ? (
        !isFormOpen && !error && (
          <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] px-4 py-6 text-center">
            <BookOpen className="mx-auto mb-2 text-[#5c5a56]" size={20} aria-hidden="true" />
            <p className="text-sm text-[#9b9890]">No reading plans yet. Set a time and choose what you’d like to finish.</p>
          </div>
        )
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {plans.map((plan) => {
            const progress = planProgress(plan);
            const isComplete = progress.total > 0 && progress.completed === progress.total;
            const isPastDeadline = plan.endDate < localDateInputValue(new Date());
            const PlanBell = plan.reminderEnabled ? Bell : BellOff;
            return (
              <article key={plan._id} className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-[#f0ede8]">{plan.title}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9b9890]">
                      <span className="inline-flex items-center gap-1"><Clock3 size={12} aria-hidden="true" />{plan.time}</span>
                      <span>{dayLabels(plan.daysOfWeek)}</span>
                      <span className="inline-flex items-center gap-1">
                        <PlanBell size={12} aria-hidden="true" />
                        {!plan.reminderEnabled
                          ? 'Reminder off'
                          : notificationPermission === 'granted'
                            ? 'Reminder on'
                            : notificationPermission === 'denied'
                              ? 'Notifications blocked'
                              : notificationPermission === 'unsupported'
                                ? 'Notifications unavailable'
                                : 'Permission needed'}
                      </span>
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${isComplete || plan.isActive ? 'bg-[rgba(74,158,107,0.12)] text-[#82c49a]' : 'bg-[rgba(155,152,144,0.12)] text-[#9b9890]'}`}>
                    {isComplete ? 'Completed' : plan.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>

                <p className={`mt-3 text-xs ${isPastDeadline && progress.completed < progress.total ? 'text-amber-300' : 'text-[#9b9890]'}`}>
                  {formatPlanDate(plan.startDate)} – finish by {formatPlanDate(plan.endDate)}
                  {isPastDeadline && progress.completed < progress.total && ' · deadline passed'}
                </p>

                <div className="mt-3">
                  <div className="mb-1.5 flex justify-between text-xs text-[#9b9890]">
                    <span>{progress.completed} of {progress.total} books finished</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.12)]">
                    <div className="h-full rounded-full bg-[#c9a96e] transition-[width]" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5">
                  {plan.books.map((book) => {
                    const complete = finishedBook(book);
                    const bookProgress = book.totalPages > 0
                      ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
                      : complete ? 100 : 0;
                    return (
                      <li key={book._id} className="flex items-center justify-between gap-3 text-xs">
                        <span className={`truncate ${complete ? 'text-[#82c49a]' : 'text-[#d1c9bd]'}`}>{book.title}</span>
                        <span className="shrink-0 text-[#9b9890]">{complete ? 'Finished' : `${bookProgress}%`}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 flex justify-end gap-2 border-t border-[rgba(255,255,255,0.07)] pt-3">
                  {!isComplete && (
                    <button
                      type="button"
                      onClick={() => void updatePlan(plan, plan.isActive ? 'pause' : 'resume')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] px-2.5 py-1.5 text-xs text-[#9b9890] hover:text-[#f0ede8]"
                    >
                      {plan.isActive ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                      {plan.isActive ? 'Pause' : 'Resume'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void updatePlan(plan, 'delete')}
                    aria-label={`Delete ${plan.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] px-2.5 py-1.5 text-xs text-[#c98e8e] hover:border-red-400/40 hover:text-red-300"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
