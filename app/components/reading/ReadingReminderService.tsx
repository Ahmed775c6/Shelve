'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface ReminderPlan {
  _id: string;
  title: string;
  bookIds: string[];
  books: {
    title: string;
    totalPages: number;
    currentPage: number;
    status: string;
  }[];
  startDate: string;
  endDate: string;
  time: string;
  daysOfWeek: number[];
  reminderEnabled: boolean;
  isActive: boolean;
}

function isReminderPlan(value: unknown): value is ReminderPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<ReminderPlan>;
  return (
    typeof plan._id === 'string' &&
    typeof plan.title === 'string' &&
    Array.isArray(plan.bookIds) &&
    plan.bookIds.every((id) => typeof id === 'string') &&
    Array.isArray(plan.books) &&
    plan.books.every((book) =>
      book &&
      typeof book.title === 'string' &&
      typeof book.totalPages === 'number' &&
      typeof book.currentPage === 'number' &&
      typeof book.status === 'string'
    ) &&
    typeof plan.startDate === 'string' &&
    typeof plan.endDate === 'string' &&
    typeof plan.time === 'string' &&
    Array.isArray(plan.daysOfWeek) &&
    plan.daysOfWeek.every((day) => typeof day === 'number' && day >= 0 && day <= 6) &&
    typeof plan.reminderEnabled === 'boolean' &&
    typeof plan.isActive === 'boolean'
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ReadingReminderService() {
  const { status } = useSession();
  const notifiedRef = useRef(new Set<string>());
  const pendingRef = useRef(new Set<string>());

  useEffect(() => {
    if (status !== 'authenticated') return;

    let plans: ReminderPlan[] = [];

    const refreshPlans = async () => {
      const response = await fetch('/api/reading-plans');
      if (!response.ok) {
        throw new Error(`Could not load reading reminders (${response.status})`);
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || !payload.every(isReminderPlan)) {
        throw new Error('The reading reminders response was invalid.');
      }
      plans = payload;
    };

    const safelyRefreshPlans = () => {
      void refreshPlans().catch((error: unknown) => {
        console.error('Failed to refresh reading reminders:', error);
      });
    };

    const refreshOnStorage = (event: StorageEvent) => {
      if (event.key === 'shelve-reading-plans-updated') safelyRefreshPlans();
    };

    const checkReminders = async () => {
      const nativeNotification = window.windowControls?.showNotification;
      const browserNotificationAvailable =
        'Notification' in window && Notification.permission === 'granted';
      if (!nativeNotification && !browserNotificationAvailable) return;

      const now = new Date();
      const dateKey = localDateKey(now);
      const timeKey = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      for (const plan of plans) {
        const allBooksFinished =
          plan.books.length > 0 &&
          plan.books.every((book) =>
            book.status === 'archived' ||
            (book.totalPages > 0 && book.currentPage >= book.totalPages)
          );

        if (
          !plan.isActive ||
          !plan.reminderEnabled ||
          plan.books.length === 0 ||
          allBooksFinished ||
          plan.time !== timeKey ||
          !plan.daysOfWeek.includes(now.getDay()) ||
          dateKey < plan.startDate ||
          dateKey > plan.endDate
        ) {
          continue;
        }

        const reminderKey = `${plan._id}:${dateKey}`;
        if (notifiedRef.current.has(reminderKey) || pendingRef.current.has(reminderKey)) continue;

        pendingRef.current.add(reminderKey);
        const storageKey = `shelve-reading-reminder:${plan._id}`;
        try {
          try {
            if (window.localStorage.getItem(storageKey) === dateKey) {
              notifiedRef.current.add(reminderKey);
              continue;
            }
          } catch (error) {
            console.error('Could not read reading reminder history:', error);
          }

          const bookTitles = plan.books.map((book) => book.title).join(', ');
          const title = `Time to read: ${plan.title}`;
          const body = bookTitles ? `Today’s plan: ${bookTitles}` : 'Your scheduled reading time is here.';
          let delivered = false;
          if (nativeNotification) {
            try {
              delivered = await nativeNotification(title, body);
            } catch (error) {
              console.error('Native reading notification failed:', error);
            }
          }

          if (!delivered && browserNotificationAvailable) {
            new Notification(title, { body, tag: reminderKey });
            delivered = true;
          }
          if (!delivered) throw new Error('No supported notification service is available.');

          notifiedRef.current.add(reminderKey);
          try {
            window.localStorage.setItem(storageKey, dateKey);
          } catch (error) {
            console.error('Could not save reading reminder history:', error);
          }
        } catch (error) {
          console.error('Failed to deliver reading reminder:', error);
        } finally {
          pendingRef.current.delete(reminderKey);
        }
      }
    };

    const safelyCheckReminders = () => {
      if (!navigator.locks) {
        void checkReminders().catch((error: unknown) => {
          console.error('Failed to check reading reminders:', error);
        });
        return;
      }

      void navigator.locks.request('shelve-reading-reminder-check', checkReminders).catch((error: unknown) => {
        console.error('Failed to check reading reminders:', error);
      });
    };

    safelyRefreshPlans();
    const refreshInterval = window.setInterval(safelyRefreshPlans, 5 * 60 * 1000);
    const reminderInterval = window.setInterval(safelyCheckReminders, 15 * 1000);
    window.addEventListener('reading-plans:updated', safelyRefreshPlans);
    window.addEventListener('storage', refreshOnStorage);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(reminderInterval);
      window.removeEventListener('reading-plans:updated', safelyRefreshPlans);
      window.removeEventListener('storage', refreshOnStorage);
    };
  }, [status]);

  return null;
}
