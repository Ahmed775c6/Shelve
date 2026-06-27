'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { IBook } from '../../models/book';
import { Star, Calendar, BookOpen } from 'lucide-react';

export default function ArchivePage() {
  const { data: session, status } = useSession();
  const [archivedBooks, setArchivedBooks] = useState<IBook[] | any>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    const fetchArchivedBooks = async () => {
      try {
        const response = await fetch('/api/books?status=archived');
        const data = await response.json();
        setArchivedBooks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching archived books:', error);
        setArchivedBooks([]);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchArchivedBooks();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading your archive...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < rating ? 'text-[#c9a96e] fill-[#c9a96e]' : 'text-[#5c5a56]'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">Archived books</h1>
        <p className="text-sm text-[#9b9890]">
          {archivedBooks.length} books you've finished reading
        </p>
      </div>

      <div className="space-y-2.5">
        {archivedBooks.length > 0 ? (
          archivedBooks.map((book : any) => (
            <div
              key={book._id}
              className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-4 flex items-center gap-4 hover:border-[rgba(255,255,255,0.12)] transition-colors cursor-pointer"
            >
              <div className="w-9 h-[52px] rounded-[2px_4px_4px_2px] flex-shrink-0 overflow-hidden">
                {book.coverImage ? (
                  <img 
                    src={book.coverImage} 
                    alt={book.title}
                    className="w-full h-full object-cover rounded-[2px_4px_4px_2px]"
                  />
                ) : (
                  <div className={`w-full h-full ${book.coverColor}`}></div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[#f0ede8]">{book.title}</div>
                <div className="text-xs text-[#9b9890]">
                  {book.author} · {book.category}
                </div>
                <div className="mt-1">{renderStars(book.rating)}</div>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <div className="text-[10px] text-[#5c5a56] uppercase tracking-wider">Started</div>
                  <div className="text-xs text-[#9b9890]">
                    {book.startedAt ? new Date(book.startedAt).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#5c5a56] uppercase tracking-wider">Finished</div>
                  <div className="text-xs text-[#9b9890]">
                    {book.finishedAt ? new Date(book.finishedAt).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-15 text-[#5c5a56]">
            <div className="text-5xl mb-3 opacity-40">📚</div>
            <div className="text-sm text-[#9b9890] mb-1.5">No archived books yet</div>
            <div className="text-sm">Finish reading a book to add it to your archive</div>
          </div>
        )}
      </div>
    </div>
  );
}