'use client';

import { Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { User } from 'lucide-react';

export default function Topbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] sticky top-0 z-40">
      <div className="w-full sm:flex-1 sm:max-w-md">
        <div className="flex items-center gap-2 bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2">
          <Search size={14} className="text-[#9b9890]" />
          <input
            type="text"
            placeholder="Search books, authors, genres…"
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#f0ede8] placeholder:text-[#5c5a56]"
          />
        </div>
      </div>
      
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => router.push('/upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-xs font-medium hover:bg-[#d4b47a] transition-colors"
        >
          <Plus size={14} />
          Add book
        </button>

        {/* User Avatar */}
        <Link
          href="/settings"
          className="shrink-0 group"
        >
          {user?.image ? (
            <img 
              src={user.image} 
              alt={user.name || 'User'} 
              className="w-8 h-8 rounded-full object-cover border border-[rgba(255,255,255,0.07)] hover:border-[#c9a96e] transition-colors cursor-pointer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center border border-[rgba(255,255,255,0.07)] hover:border-[#c9a96e] transition-colors cursor-pointer">
              <User size={14} className="text-white/60" />
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}