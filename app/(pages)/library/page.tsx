'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import BookCard from '@/app/components/book/BookCard';
import { IBook } from '@/app/models/book';

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<IBook[] | any>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const handleAction = async (bookId: string, action: string) => {
    if (action === 'details') {
      router.push(`/read/${bookId}`);
      return;
    }

    let patch: any = {};
    if (action === 'read') {
      patch = { status: 'reading', startedAt: new Date().toISOString() };
    } else if (action === 'archive') {
      const book = books.find((b: any) => b._id === bookId);
      patch = { status: 'archived', finishedAt: new Date().toISOString(), currentPage: book?.totalPages || 0 };
    }

    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      setBooks((prev: any[]) => prev.map(b => b._id === updated._id ? updated : b));
    } catch (err) {
      console.error('Failed to update book', err);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    fetch('/api/books')
      .then(res => res.json())
      .then(setBooks);
  }, [status]);

  if (status === 'loading') {
    return <div className="page-shell">Loading...</div>;
  }

  const filteredBooks = (books || []).filter((book:any) => {
    if (filter !== 'all' && book.status !== filter && book.category.toLowerCase() !== filter) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
    }
    return true;
  });

  const filters = ['all', 'reading', 'unread', 'fantasy', 'scifi', 'selfhelp'];
  const totals = {
    reading: books.filter((book: any) => book.status === 'reading').length,
    unread: books.filter((book: any) => book.status === 'unread').length,
    archived: books.filter((book: any) => book.status === 'archived').length,
  };

  return (
    <div className="library-page min-h-screen relative overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
      <div className="page-frame" />
      <div className="library-hero-word">Library</div>
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="library-masthead flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow mb-3">Collection overview</p>
     
            <p className="mt-4 max-w-2xl text-sm text-[var(--ink-soft)]">
              {books.length} volumes across all categories, surfaced in a tactile reading shelf.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
            <div>Reading: {totals.reading}</div>
            <div>Unread: {totals.unread}</div>
            <div>Archived: {totals.archived}</div>
          </div>
        </div>

        <div className="glass-panel mt-10 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(244,236,219,0.08)] p-6 backdrop-blur-xl shadow-[0_32px_90px_rgba(0,0,0,0.14)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 rounded-3xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                <input
                  type="text"
                  placeholder="Search your library…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === f
                      ? 'border border-[rgba(201,169,110,0.25)] bg-[rgba(201,169,110,0.12)] text-[var(--accent)]'
                      : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--ink-soft)] hover:border-[rgba(255,255,255,0.16)] hover:text-[var(--ink)]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-8">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book: any) => (
              <BookCard
                key={book._id}
                book={book}
                onAction={(action) => handleAction(book._id, action)}
                onClick={() => router.push(`/read/${book._id}`)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-(--ink-soft)">
              <div className="text-5xl mb-3 opacity-40">📭</div>
              <div className="text-sm mb-1.5">No books found</div>
              <div className="text-sm">Try a different filter or search</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}