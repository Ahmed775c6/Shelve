'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock3,
  Maximize,
  Minus,
  RotateCw,
  Search,
  X,
} from 'lucide-react';

interface BookSearchResult {
  _id: string;
  title: string;
  author: string;
  category: string;
}

const RECENT_SEARCHES_KEY = 'shelve-recent-searches';

export default function WindowTitleBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [navigation, setNavigation] = useState({ canGoBack: false, canGoForward: false });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const routeHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);

  useEffect(() => {
    const controls = window.windowControls;
    if (!controls) return;

    document.documentElement.classList.add('electron-window');
    setIsElectron(true);
    controls.isMaximized().then(setIsMaximized).catch(console.error);
    try {
      const savedSearches = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (savedSearches) {
        const parsedSearches: unknown = JSON.parse(savedSearches);
        if (Array.isArray(parsedSearches) && parsedSearches.every((item) => typeof item === 'string')) {
          setRecentSearches(parsedSearches.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }

    const unsubscribe = controls.onMaximizeState(setIsMaximized);
    return () => {
      document.documentElement.classList.remove('electron-window');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const paths = routeHistory.current;
    const index = historyIndex.current;

    if (index < 0) {
      paths.push(pathname);
      historyIndex.current = 0;
    } else if (paths[index - 1] === pathname) {
      historyIndex.current -= 1;
    } else if (paths[index + 1] === pathname) {
      historyIndex.current += 1;
    } else if (paths[index] !== pathname) {
      paths.splice(index + 1);
      paths.push(pathname);
      historyIndex.current += 1;
    }

    setNavigation({
      canGoBack: historyIndex.current > 0,
      canGoForward: historyIndex.current < paths.length - 1,
    });
  }, [pathname]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === 'c' && window.windowControls) {
        event.preventDefault();
        void window.windowControls.captureScreenshot()
          .then((filePath) => {
            if (filePath) console.info(`Screenshot saved to ${filePath}`);
          })
          .catch((error: unknown) => {
            console.error('Failed to save screenshot:', error);
          });
      } else if (key === 'p') {
        event.preventDefault();
        if (window.windowControls) {
          void window.windowControls.openReadingPlanner().catch((error: unknown) => {
            console.error('Failed to open the reading planner window:', error);
          });
        } else {
          const plannerWindow = window.open(
            '/reading-planner-window',
            'shelve-reading-planner',
            'popup,width=720,height=780'
          );
          if (!plannerWindow) window.location.assign('/reading-planner-window');
        }
      } else if (key === 'q' && window.windowControls) {
        event.preventDefault();
        void window.windowControls.quit().catch((error: unknown) => {
          console.error('Failed to quit Shelve:', error);
        });
      } else if (key === 'm' && window.windowControls) {
        event.preventDefault();
        void window.windowControls.toggleMaximize().catch((error: unknown) => {
          console.error('Failed to toggle window maximization:', error);
        });
      } else if (key === 's' && window.windowControls && pathname !== '/reading-planner-window') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen || !query.trim()) {
      setResults([]);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError('');
    setResults([]);
    setActiveSuggestion(-1);

    const timeout = window.setTimeout(() => {
      fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              response.status === 401
                ? 'Sign in to search your library.'
                : 'Could not load search suggestions. Please try again.'
            );
          }

          const payload: unknown = await response.json();
          if (
            !Array.isArray(payload) ||
            !payload.every(
              (item): item is BookSearchResult =>
                item &&
                typeof item._id === 'string' &&
                typeof item.title === 'string' &&
                typeof item.author === 'string' &&
                typeof item.category === 'string'
            )
          ) {
            throw new Error('The search response was invalid.');
          }

          setResults(payload);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error('Book search failed:', error);
          setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [searchOpen]);

  if (!isElectron) return null;

  const buttonClass =
    'inline-flex size-9 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-white/10 disabled:cursor-default disabled:text-white/30 disabled:hover:bg-transparent';

  if (pathname === '/reading-planner-window') {
    return (
      <header className="titlebar-drag-region fixed inset-x-0 top-0 z-130 flex h-10 select-none items-center justify-between border-b-2 border-[#c9a96e] bg-[#0f0e0c] text-[#f0ede8] dark:border-white/10">
        <div className="ml-4 flex items-center gap-2 text-xs font-medium tracking-wide text-[#c9a96e]">
          <BookOpen size={15} />
          <span>Shelve/Schedule</span>
        </div>
        <div className="flex h-full items-stretch">
          <button
            type="button"
            aria-label="Minimize window"
            title="Minimize"
            className="titlebar-no-drag inline-flex w-11 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-white/10"
            onClick={() => void window.windowControls?.minimize().catch(console.error)}
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            title={isMaximized ? 'Restore' : 'Maximize'}
            className="titlebar-no-drag inline-flex w-11 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-white/10"
            onClick={() => void window.windowControls?.toggleMaximize().catch(console.error)}
          >
            {isMaximized ? <Copy size={13} /> : <Maximize size={13} />}
          </button>
          <button
            type="button"
            aria-label="Close window"
            title="Close"
            className="titlebar-no-drag inline-flex w-11 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-[#e05252] hover:text-white"
            onClick={() => window.windowControls?.close()}
          >
            <X size={15} />
          </button>
        </div>
      </header>
    );
  }

  const rememberSearch = (searchTerm: string) => {
    const normalizedTerm = searchTerm.trim();
    if (!normalizedTerm) return;

    const updatedSearches = [
      normalizedTerm,
      ...recentSearches.filter((recentSearch) => recentSearch.toLowerCase() !== normalizedTerm.toLowerCase()),
    ].slice(0, 5);

    setRecentSearches(updatedSearches);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Failed to save recent searches:', error);
    }
  };

  const openBook = (book: BookSearchResult) => {
    rememberSearch(query);
    setSearchOpen(false);
    router.push(`/read/${book._id}`);
  };

  const chooseRecentSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setActiveSuggestion(-1);
    setSearchOpen(true);
    searchInputRef.current?.focus();
  };

  const suggestionsCount = query.trim() ? results.length : recentSearches.length;

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchOpen(false);
      setActiveSuggestion(-1);
    } else if (event.key === 'ArrowDown' && suggestionsCount > 0) {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestionsCount);
    } else if (event.key === 'ArrowUp' && suggestionsCount > 0) {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestionsCount - 1 : current - 1));
    } else if (event.key === 'Enter' && query.trim()) {
      event.preventDefault();
      const selectedBook = results[activeSuggestion] ?? results[0];
      if (selectedBook) {
        openBook(selectedBook);
      } else {
        rememberSearch(query);
      }
    } else if (event.key === 'Enter' && !query.trim() && activeSuggestion >= 0) {
      event.preventDefault();
      chooseRecentSearch(recentSearches[activeSuggestion]);
    }
  };

  return (
    <header className="titlebar-drag-region fixed inset-x-0 top-0 z-130 grid h-10 select-none grid-cols-[minmax(0,1fr)_minmax(180px,360px)_minmax(0,1fr)] items-center border-b-2 dark:border-white/10 border-[#c9a96e] bg-[#0f0e0c] text-[#f0ede8]">
      <div className="flex h-full min-w-0 items-center gap-1 pl-2">
        <button
          type="button"
          aria-label="Go back"
          title="Go back"
          className={`titlebar-no-drag ${buttonClass}`}
          disabled={!navigation.canGoBack}
          onClick={() => router.back()}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          aria-label="Go forward"
          title="Go forward"
          className={`titlebar-no-drag ${buttonClass}`}
          disabled={!navigation.canGoForward}
          onClick={() => router.forward()}
        >
          <ChevronRight size={17} />
        </button>
        <button
          type="button"
          aria-label="Reload page"
          title="Reload page"
          className={`titlebar-no-drag ${buttonClass}`}
          onClick={() => window.location.reload()}
        >
          <RotateCw size={15} />
        </button>

        <div className="ml-2 flex items-center gap-2 text-xs font-medium tracking-wide text-[#c9a96e]">
          <BookOpen size={15} />
          <span>Shelve</span>
        </div>
      </div>

      <div ref={searchContainerRef} className="titlebar-no-drag relative px-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1916] px-3 py-1.5">
          <Search size={14} className="shrink-0 text-[#9b9890]" />
          <input
            ref={searchInputRef}
            type="text"
            aria-label="Search books, authors, and genres"
            aria-autocomplete="list"
            aria-controls="book-search-suggestions"
            aria-expanded={searchOpen}
            aria-activedescendant={
              activeSuggestion >= 0 ? `book-search-suggestion-${activeSuggestion}` : undefined
            }
            placeholder="Search books, authors, genres…"
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-[#f0ede8] outline-none placeholder:text-[#5c5a56]"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveSuggestion(-1);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {searchOpen && (
          <div
            id="book-search-suggestions"
            role="listbox"
            className="absolute left-3 right-3 top-full z-[60] mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1916] p-2 text-sm shadow-2xl"
          >
            {query.trim() ? (
              <>
                <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9890]">
                  Matching books
                </p>
                {isSearching ? (
                  <p className="px-3 py-3 text-[#9b9890]">Searching your library…</p>
                ) : searchError ? (
                  <p role="status" className="px-3 py-3 text-[#e4a1a1]">{searchError}</p>
                ) : results.length ? (
                  results.map((book, index) => (
                    <button
                      key={book._id}
                      id={`book-search-suggestion-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeSuggestion === index}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        activeSuggestion === index ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => openBook(book)}
                    >
                      <BookOpen size={16} className="shrink-0 text-[#c9a96e]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[#f0ede8]">{book.title}</span>
                        <span className="block truncate text-xs text-[#9b9890]">
                          {book.author} · {book.category}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-[#9b9890]">No matching books found.</p>
                )}
              </>
            ) : recentSearches.length ? (
              <>
                <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9890]">
                  Recently searched
                </p>
                {recentSearches.map((recentSearch, index) => (
                  <button
                    key={`${recentSearch}-${index}`}
                    id={`book-search-suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeSuggestion === index}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[#e4e2dd] transition-colors ${
                      activeSuggestion === index ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    onClick={() => chooseRecentSearch(recentSearch)}
                  >
                    <Clock3 size={15} className="shrink-0 text-[#9b9890]" />
                    <span className="truncate">{recentSearch}</span>
                  </button>
                ))}
              </>
            ) : (
              <p className="px-3 py-3 text-[#9b9890]">Search books by title, author, category, or tag.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex h-full items-stretch justify-self-end">
        <button
          type="button"
          aria-label="Minimize window"
          title="Minimize"
          className="titlebar-no-drag inline-flex w-11 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-white/10"
          onClick={() => void window.windowControls?.minimize().catch(console.error)}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          title={isMaximized ? 'Restore' : 'Maximize'}
          className="titlebar-no-drag inline-flex w-11 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-white/10"
          onClick={() => void window.windowControls?.toggleMaximize().catch(console.error)}
        >
          {isMaximized ? <Copy size={13} /> : <Maximize size={13} />}
        </button>
        <button
          type="button"
          aria-label="Close window"
          title="Close"
          className="titlebar-no-drag inline-flex w-11 items-center justify-center text-[#e4e2dd] transition-colors hover:bg-[#e05252] hover:text-white"
          onClick={() => window.windowControls?.close()}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
