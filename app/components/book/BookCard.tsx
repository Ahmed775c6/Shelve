'use client';

import { IBook } from '@/app/models/book';
import Book3D from './Book3D';

interface BookCardProps {
  book: IBook;
  onClick?: () => void;
  onAction?: (action: 'read' | 'details' | 'archive') => void;
}

export default function BookCard({ book, onClick, onAction }: BookCardProps) {
  const progress = book.totalPages > 0 
    ? Math.round((book.currentPage / book.totalPages) * 100) 
    : 0;

  const badgeClass =
    book.status === 'archived'
      ? 'bg-[rgba(92,90,86,0.1)] text-[#5c5a56]'
      : book.category === 'Fantasy'
      ? 'bg-[rgba(139,125,216,0.15)] text-[#a78bfa]'
      : book.category === 'Sci-fi'
      ? 'bg-[rgba(56,138,221,0.15)] text-[#60a5fa]'
      : 'bg-[rgba(201,169,110,0.15)] text-[#c9a96e]';

  return (
    <div className="group w-fit rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4 transition duration-300 hover:border-[rgba(255,255,255,0.16)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
      <Book3D
        title={book.title}
        author={book.author}
        coverColor={book.coverColor}
        coverImage={book.coverImage}
        progress={progress}
        onClick={onClick}
      />
      <div className="w-full">
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {book.status === 'archived' ? 'Archived' : book.category}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {book.status === 'unread' && (
            <button
              type="button"
              onClick={() => onAction?.('read')}
              className="rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-medium text-[#1a1510]"
            >
              Start reading
            </button>
          )}
          {book.status === 'reading' && (
            <button
              type="button"
              onClick={() => onAction?.('archive')}
              className="rounded-full bg-[var(--green)] px-3 py-1 text-[11px] font-medium text-white"
            >
              Mark finished
            </button>
          )}
          {book.status === 'archived' && (
            <button
              type="button"
              onClick={() => onAction?.('details')}
              className="rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] px-3 py-1 text-[11px] font-medium text-[var(--ink-soft)]"
            >
              View details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}