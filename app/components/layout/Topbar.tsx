'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Keyboard, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { ModeToggle } from './ThemeButton';


export default function Topbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openReadingPlanner = useCallback(() => {
    if (window.windowControls) {
      void window.windowControls.openReadingPlanner().catch((error: unknown) => {
        console.error('Failed to open the reading planner window:', error);
      });
      return;
    }

    const plannerWindow = window.open(
      '/reading-planner-window',
      'shelve-reading-planner',
      'popup,width=720,height=780'
    );
    if (!plannerWindow) router.push('/reading-planner-window');
  }, [router]);

  useEffect(() => {
    if (!shortcutsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShortcutsOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [shortcutsOpen]);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] sticky top-0 z-40">
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={openReadingPlanner}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#1a1916] px-3 py-1.5 text-xs text-[#c9a96e] transition-colors hover:border-[#c9a96e] hover:bg-[#222119]"
        >
          <CalendarDays size={14} aria-hidden="true" />
          Reading plan
        </button>
        <button
          onClick={() => router.push('/upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-xs font-medium hover:bg-[#d4b47a] transition-colors"
        >
          <Plus size={14} />
          Add book
        </button>

        <div className="relative">
          <button
            type="button"
            aria-label="Keyboard shortcuts"
            aria-haspopup="dialog"
            aria-expanded={shortcutsOpen}
            title="Keyboard shortcuts"
            onClick={() => setShortcutsOpen((open) => !open)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#1a1916] px-2 text-xs text-[#9b9890] transition-colors hover:border-[#c9a96e] hover:text-[#c9a96e]"
          >
            <Keyboard size={16} />
            <span>Shortcuts</span>
          </button>
          {shortcutsOpen && (
            <div
              role="dialog"
              aria-label="Keyboard shortcuts"
              className="absolute right-0 top-full z-70 mt-3 w-72 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#1a1916] p-4 text-[#f0ede8] shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
                <button
                  type="button"
                  aria-label="Close keyboard shortcuts"
                  onClick={() => setShortcutsOpen(false)}
                  className="rounded p-1 text-[#9b9890] hover:bg-white/10 hover:text-[#f0ede8]"
                >
                  <X size={15} />
                </button>
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Focus search</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + S</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Save screenshot</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + C</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Toggle reading focus mode</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + F</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Passage actions</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + J</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Toggle light / dark theme</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + T</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Toggle menu</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + B</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Toggle maximize / restore</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + M</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Open/close reading planner</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + P</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Reload</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + R</kbd></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#9b9890]">Quit Application</dt>
                  <dd><kbd className="rounded border border-white/10 bg-[#0f0e0c] px-1.5 py-1">Ctrl + Q</kbd></dd>
                </div>
          
              </dl>
            </div>
          )}
        </div>

        <ModeToggle />

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