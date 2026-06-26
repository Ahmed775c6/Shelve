'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import BookCard from './components/book/BookCard';
import { IBook } from './models/book';
import { Book } from 'lucide-react';

export default function OverviewPage() {
  const { data: session, status } = useSession();
  const [books, setBooks] = useState<IBook[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    reading: 0,
    completed: 0,
    pagesRead: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('tet')
            redirect('/auth/signin');
    }

    const fetchBooks = async () => {
      try {
        const response = await fetch('/api/books');
        const data = await response.json();
        
        // Ensure data is an array
        const booksArray = Array.isArray(data) ? data : [];
        setBooks(booksArray);
        
        setStats({
          total: booksArray.length,
          reading: booksArray.filter((b: IBook) => b.status === 'reading').length,
          completed: booksArray.filter((b: IBook) => b.status === 'archived').length,
          pagesRead: booksArray.reduce((sum: number, b: IBook) => sum + (b.currentPage || 0), 0),
        });
      } catch (error) {
        console.error('Error fetching books:', error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchBooks();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-100">
        <div className="text-[#9b9890]">Loading your library...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const readingBooks = Array.isArray(books) ? books.filter((b: IBook) => b.status === 'reading') : [];
  const recentBooks = Array.isArray(books) ? books.slice(0, 6) : [];

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">
          Good evening, Reader 🌙
        </h1>
        <p className="text-sm text-[#9b9890]">
          You've read {stats.pagesRead} pages this month. Keep it up.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-4.5">
          <div className="text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">Total books</div>
          <div className="text-2xl font-serif">{stats.total}</div>
          <div className="text-[11px] text-[#5c5a56] mt-1">+3 this month</div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-4.5">
          <div className="text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">Reading now</div>
          <div className="text-2xl font-serif text-[#c9a96e]">{stats.reading}</div>
          <div className="text-[11px] text-[#5c5a56] mt-1">
            {readingBooks.length > 0 
              ? readingBooks.map((b: IBook) => b.title).join(', ') 
              : 'None'}
          </div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-4.5">
          <div className="text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">Completed</div>
          <div className="text-2xl font-serif text-[#4a9e6b]">{stats.completed}</div>
          <div className="text-[11px] text-[#5c5a56] mt-1">2 this year</div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-4.5">
          <div className="text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">Pages this month</div>
          <div className="text-2xl font-serif">{stats.pagesRead}</div>
          <div className="text-[11px] text-[#5c5a56] mt-1">Avg 11/day</div>
        </div>
      </div>

      {/* Currently Reading */}
      {readingBooks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4.5">
            <h2 className="text-sm font-medium text-[#9b9890] uppercase tracking-wider">Currently reading</h2>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]"></div>
          </div>
          {readingBooks.map((book: IBook) => (
            <div key={book._id} className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-5.5 flex gap-5 items-center mb-4 relative overflow-hidden">
              <div className="w-16 h-23.5 shrink-0 relative rounded-[3px_6px_6px_3px]">
                <div className={`w-full h-full rounded-[3px_6px_6px_3px] ${book.coverColor}`}></div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-[#c9a96e] uppercase tracking-wider mb-1.5">Currently reading</div>
                <div className="font-serif text-lg text-[#f0ede8] mb-0.5">{book.title}</div>
                <div className="text-xs text-[#9b9890] mb-3.5">
                  {book.author} · {book.category} · Added {new Date(book.uploadedAt).toLocaleDateString()}
                </div>
                <div className="progress-bar">
                  <div className="h-1 bg-[rgba(255,255,255,0.12)] rounded mb-1.5">
                    <div className="h-1 rounded bg-[#c9a96e]" style={{ width: `${(book.currentPage / book.totalPages) * 100}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#5c5a56]">
                    <span>Page {book.currentPage} of {book.totalPages}</span>
                    <span>{Math.round((book.currentPage / book.totalPages) * 100)}% · last read {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors">
                  <Book size={14} />
                  Resume reading
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-[#9b9890] border border-[rgba(255,255,255,0.12)] rounded-lg text-xs hover:bg-[#1a1916] hover:text-[#f0ede8] transition-colors">
                  Book details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shelf */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4.5">
          <h2 className="text-sm font-medium text-[#9b9890] uppercase tracking-wider">Your shelf</h2>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]"></div>
        </div>
        <div className="flex gap-5.5 flex-wrap">
          {recentBooks.length > 0 ? (
            recentBooks.map((book: IBook) => (
              <BookCard key={book._id} book={book} />
            ))
          ) : (
            <div className="text-[#5c5a56] text-sm">No books in your library yet. Start by adding some!</div>
          )}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-[#1a1916] border border-[rgba(201,169,110,0.25)] rounded-lg p-5.5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#c9a96e] animate-pulse"></div>
          <div className="text-sm font-medium text-[#c9a96e]">Recommended based on your reading history</div>
          <div className="text-xs text-[#5c5a56] ml-auto">Updated today</div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { title: 'The Stormlight Archive', author: 'Brandon Sanderson', reason: 'You loved Dune\'s world-building' },
            { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', reason: 'Pairs well with Atomic Habits' },
            { title: 'Brave New World', author: 'Aldous Huxley', reason: 'Natural next read after 1984' },
          ].map((rec, i) => (
            <div key={i} className="bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 cursor-pointer hover:border-[rgba(201,169,110,0.25)] hover:bg-[#2a2926] transition-colors">
              <div className="text-sm font-medium text-[#f0ede8] mb-0.5">{rec.title}</div>
              <div className="text-[11px] text-[#5c5a56] mb-1.5">{rec.author}</div>
              <div className="text-[11px] text-[#c9a96e]">✦ {rec.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}