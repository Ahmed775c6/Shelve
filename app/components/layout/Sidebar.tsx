'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, Library, BookOpen, Archive, 
  PenTool, UploadCloud, Sparkles, MessageSquare,
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: LayoutGrid, label: 'Overview' },
    { href: '/library', icon: Library, label: 'My library', badge: '24' },
    { href: '/read', icon: BookOpen, label: 'Reading now', badge: '3' },
    { href: '/archive', icon: Archive, label: 'Archived', badge: '11' },
    { href: '/write', icon: PenTool, label: 'My writings' },
    { href: '/upload', icon: UploadCloud, label: 'Upload book' },
    { href: '/ai', icon: Sparkles, label: 'Recommendations' },
    { href: '/ask', icon: MessageSquare, label: 'Ask about a book' },
  ];

  return (
    <aside className="w-[240px] bg-[#1a1916] border-r border-[rgba(255,255,255,0.07)] fixed left-0 top-0 bottom-0 z-100">
      <div className="p-6 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#c9a96e] rounded-lg flex items-center justify-center text-sm">
            📚
          </div>
          <div>
            <div className="font-serif text-lg text-[#f0ede8]">Shelve</div>
            <div className="text-[11px] text-[#5c5a56]">Personal Library</div>
          </div>
        </div>
      </div>

      <nav className="py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-2.5 transition-colors border-l-2 ${
                isActive 
                  ? 'border-[#c9a96e] bg-[rgba(201,169,110,0.1)] text-[#c9a96e]' 
                  : 'border-transparent text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119]'
              }`}
            >
              <item.icon size={16} />
              <span className="text-sm">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] bg-[rgba(201,169,110,0.1)] text-[#c9a96e] px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-[rgba(255,255,255,0.07)]">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-6 py-2 text-[#9b9890] hover:text-[#f0ede8] transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}