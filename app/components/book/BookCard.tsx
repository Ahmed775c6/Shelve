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
      ? 'bg-[rgba(92,90,86,0.32)] text-[#f0ede8]'
      : book.category === 'Fantasy'
      ? 'bg-[rgba(139,125,216,0.38)] text-[#d6c9ff]'
      : book.category === 'Sci-fi'
      ? 'bg-[rgba(56,138,221,0.38)] text-[#c7e2ff]'
      : 'bg-[rgba(201,169,110,0.38)] text-[#ffe3b0]';

  return (
    <div className=" relative ">
      <Book3D
        title={book.title}
        author={book.author}
        coverColor={book.coverColor}
        coverImage={book.coverImage}
        description={book.description}
        category={book.category}
        pages={book.totalPages}
        progress={progress}
      />
      <div
        className="book-status-rotated absolute left-25 top-16 z-10 mt-2 flex flex-col items-center gap-1"
      >
        {book.status === 'unread' && (
          <div className={`book-status-glass flex flex-col items-center gap-1 rounded-md px-4 py-2 text-[13px] font-medium ${badgeClass}`}>
            <span className="whitespace-nowrap text-[14px] font-semibold text-white">Pending 🧐</span>
            <button
              type="button"
              onClick={() => onAction?.('read')}
              className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(250,175,63,0.9)] px-4 py-1.5 text-[13px] font-semibold text-white"
            >
              Start reading
            </button>
            <button
              type="button"
              onClick={() => onAction?.('details')}
              className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.12)] px-4 py-1.5 text-[13px] font-semibold text-white"
            >
              View details
            </button>
          </div>
        )}
        {book.status === 'reading' && (
          <div className={`book-status-glass flex flex-col items-center gap-1 rounded-md px-4 py-2 text-[13px] font-medium ${badgeClass}`}>
            <span className="whitespace-nowrap text-[14px] font-semibold text-white">In progress {progress}% 🤓</span>
            <button
              type="button"
              onClick={() => onAction?.('archive')}
              className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(250,175,63,0.9)] px-4 py-1.5 text-[13px] font-semibold text-white"
            >
              Finish it?
            </button>
            <button
              type="button"
              onClick={() => onAction?.('details')}
              className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.12)] px-4 py-1.5 text-[13px] font-semibold text-white"
            >
              View details
            </button>
          </div>
        )}
        {book.status === 'archived' && (
          <div className={`book-status-glass flex flex-col items-center gap-1 rounded-md px-4 py-2 text-[13px] font-medium ${badgeClass}`}>
            <span className="flex gap-2 whitespace-nowrap text-[14px] font-semibold text-white">Finished 🥳</span>
            <button
              type="button"
              onClick={() => onAction?.('details')}
              className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(250,175,63,0.9)] px-4 py-1.5 text-[13px] font-semibold text-white"
            >
              View details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}