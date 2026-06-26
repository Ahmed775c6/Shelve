'use client';

import { Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4 px-9 py-4 border-b border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] sticky top-0 z-40">
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2">
          <Search size={14} className="text-[#9b9890]" />
          <input
            type="text"
            placeholder="Search books, authors, genres…"
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#f0ede8] placeholder:text-[#5c5a56]"
          />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => router.push('/upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-xs font-medium hover:bg-[#d4b47a] transition-colors"
        >
          <Plus size={14} />
          Add book
        </button>
      </div>
    </div>
  );
}
