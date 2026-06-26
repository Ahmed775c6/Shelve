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
    return <div className="p-8">Loading...</div>;
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

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">My library</h1>
        <p className="text-sm text-[#9b9890]">{books.length} books across all categories</p>
      </div>

      <div className="flex items-center gap-2.5 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2.25 text-[#9b9890] text-sm">
            <input
              type="text"
              placeholder="Search your library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[#f0ede8] placeholder:text-[#5c5a56]"
            />
          </div>
        </div>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              filter === f
                ? 'bg-[rgba(201,169,110,0.1)] text-[#c9a96e] border border-[rgba(201,169,110,0.25)]'
                : 'bg-[#1a1916] text-[#9b9890] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)] hover:text-[#f0ede8]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-6">
        {filteredBooks.length > 0 ? (
          filteredBooks.map((book :any) => (
            <BookCard key={book._id} book={book} onAction={(action) => handleAction(book._id, action)} onClick={() => router.push(`/read/${book._id}`)} />
          ))
        ) : (
          <div className="col-span-full text-center py-15 text-[#5c5a56]">
            <div className="text-5xl mb-3 opacity-40">📭</div>
            <div className="text-sm text-[#9b9890] mb-1.5">No books found</div>
            <div className="text-sm">Try a different filter or search</div>
          </div>
        )}
      </div>
    </div>
  );
}