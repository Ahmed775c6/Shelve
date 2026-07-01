'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  LayoutGrid, Library, BookOpen, Archive, 
  PenTool, UploadCloud, Sparkles, MessageSquare,BarChart3,Globe,
  Settings, User
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: '/', icon: LayoutGrid, label: 'Overview' },
    { href: '/library', icon: Library, label: 'My library', badge: '24' },
      { href: '/public-library', icon: Globe, label: 'Public Library' },
  
    { href: '/read', icon: BookOpen, label: 'Reading now', badge: '3' },
    { href: '/archive', icon: Archive, label: 'Archived', badge: '11' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },

    { href: '/write', icon: PenTool, label: 'My writings' },
    { href: '/upload', icon: UploadCloud, label: 'Upload book' },
    { href: '/ai', icon: Sparkles, label: 'Recommendations' },
    { href: '/ask', icon: MessageSquare, label: 'Ask about a book' },
  ];

  const user = session?.user;

  return (
    <>
      <aside className="hidden lg:flex w-60 bg-[#1a1916] border-r border-[rgba(255,255,255,0.07)] fixed left-0 top-0 bottom-0 z-110 flex-col">
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

        <nav className="flex-1 py-4 overflow-y-auto">
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
            className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#222119] transition-colors group"
          >
            <div className="relative shrink-0">
              {user?.image ? (
                <img 
                  src={user.image} 
                  alt={user.name || 'User'} 
                  className="w-10 h-10 rounded-full object-cover border border-[rgba(255,255,255,0.07)]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center border border-[rgba(255,255,255,0.07)]">
                  <User size={18} className="text-white/60" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4a9e6b] rounded-full border-2 border-[#1a1916]"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#f0ede8] truncate group-hover:text-[#c9a96e] transition-colors">
                {user?.name || 'User'}
              </div>
              <div className="text-xs text-[#5c5a56] truncate">
                {user?.email || ''}
              </div>
            </div>
            <Settings size={14} className="text-[#5c5a56] group-hover:text-[#f0ede8] transition-colors shrink-0" />
          </Link>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-120 border-t border-[rgba(255,255,255,0.07)] bg-[#1a1916]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a1916]/80 lg:hidden">
        <div className="flex items-center justify-between overflow-x-auto px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] transition-colors ${
                  isActive
                    ? 'bg-[rgba(201,169,110,0.14)] text-[#c9a96e]'
                    : 'text-[#9b9890] hover:bg-[#222119] hover:text-[#f0ede8]'
                }`}
              >
                <item.icon size={16} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}