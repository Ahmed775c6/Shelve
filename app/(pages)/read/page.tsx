'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { IBook } from '@/app/models/book';
import { 
  BookOpen, Clock, ChevronLeft, ChevronRight, 
  Bookmark, Share2, Settings, Sun, Moon, 
  ZoomIn, ZoomOut, Menu, X
} from 'lucide-react';

export default function ReadPage() {
  const { data: session, status } = useSession();
  const [readingBooks, setReadingBooks] = useState<IBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<IBook | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('dark');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    const fetchReadingBooks = async () => {
      try {
        const response = await fetch('/api/books?status=reading');
        const data = await response.json();
        const booksArray = Array.isArray(data) ? data : [];
        setReadingBooks(booksArray);
        
        // Select the first book by default
        if (booksArray.length > 0) {
          setSelectedBook(booksArray[0]);
          setCurrentPage(booksArray[0].currentPage || 0);
        }
      } catch (error) {
        console.error('Error fetching reading books:', error);
        setReadingBooks([]);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchReadingBooks();
    }

    // Load saved preferences
    const savedFontSize = localStorage.getItem('reader-font-size');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    
    const savedTheme = localStorage.getItem('reader-theme');
    if (savedTheme) setTheme(savedTheme as any);
    
    const savedShowSidebar = localStorage.getItem('reader-sidebar');
    if (savedShowSidebar) setShowSidebar(savedShowSidebar === 'true');
  }, [status]);

  useEffect(() => {
    const loadPreviewContent = async () => {
      if (!selectedBook?.fileUrl) {
        setPreviewContent(null);
        return;
      }

      const fileType = (selectedBook.fileType || '').toLowerCase();
      const isTextLike = fileType.includes('text') || fileType.includes('json') || fileType.includes('xml') || fileType.includes('markdown') || fileType.includes('javascript') || fileType.includes('html');

      if (!isTextLike) {
        setPreviewContent(null);
        return;
      }

      try {
        const response = await fetch(selectedBook.fileUrl);
        if (response.ok) {
          const text = await response.text();
          setPreviewContent(text);
        } else {
          setPreviewContent(null);
        }
      } catch (error) {
        console.error('Error loading preview content:', error);
        setPreviewContent(null);
      }
    };

    loadPreviewContent();
  }, [selectedBook?._id, selectedBook?.fileUrl, selectedBook?.fileType]);

  if (status === 'loading' || loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading your reading list...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const handleBookSelect = (book: IBook) => {
    setSelectedBook(book);
    setCurrentPage(book.currentPage || 0);
    setIsReading(false);
  };

  const handlePageChange = (newPage: number) => {
    if (!selectedBook) return;
    
    const clampedPage = Math.max(0, Math.min(newPage, selectedBook.totalPages));
    setCurrentPage(clampedPage);
    
    // Auto-save progress
    saveProgress(clampedPage);
  };

  const saveProgress = async (page: number) => {
    if (!selectedBook) return;
    
    try {
      const response = await fetch(`/api/progress/${selectedBook._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: page }),
      });
      
      if (response.ok) {
        // Update local book data
        const updatedBook = { ...selectedBook, currentPage: page } as IBook;
        setSelectedBook(updatedBook);
        setReadingBooks((books: any) => 
          books.map((b: any) => b._id === updatedBook._id ? updatedBook : b)
        );
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem('reader-font-size', newSize.toString());
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme);
    localStorage.setItem('reader-theme', newTheme);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('reader-sidebar', (!showSidebar).toString());
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-[#f5f0e8] text-[#2a2926]';
      case 'sepia':
        return 'bg-[#f4ecd8] text-[#3d3a32]';
      default:
        return 'bg-[#1c1a14] text-[#d4cfc7]';
    }
  };

  const getProgressPercentage = () => {
    if (!selectedBook || selectedBook.totalPages === 0) return 0;
    return Math.round((currentPage / selectedBook.totalPages) * 100);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate estimated reading time remaining
  const getEstimatedTimeRemaining = () => {
    if (!selectedBook) return '--';
    const pagesRemaining = selectedBook.totalPages - currentPage;
    // Assuming average reading speed of 2 minutes per page
    const minutes = pagesRemaining * 2;
    return formatTime(minutes);
  };

  const getBookContent = () => {
    if (!selectedBook) return null;

    if (selectedBook.fileUrl) {
      const fileType = (selectedBook.fileType || '').toLowerCase();
      const isPdf = fileType.includes('pdf');
      const isTextLike = fileType.includes('text') || fileType.includes('json') || fileType.includes('xml') || fileType.includes('markdown') || fileType.includes('javascript') || fileType.includes('html');

      if (isPdf) {
        return (
          <div className="h-full w-full overflow-hidden bg-white">
            <iframe
              src={selectedBook.fileUrl}
              title={selectedBook.title}
              className="h-full min-h-[70vh] w-full border-0"
            />
          </div>
        );
      }

      return (
        <div className="h-full w-full overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-[720px] space-y-4">
            <h2 className="text-2xl font-serif font-normal text-[#f0ede8]">
              {selectedBook.title}
            </h2>

            {previewContent ? (
              <div className="whitespace-pre-wrap rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-relaxed text-[#e4e2dd]">
                {previewContent}
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-relaxed text-[#e4e2dd]">
                <p>
                  The uploaded book file is attached and ready to open. For text-based uploads, the content preview will appear here.
                </p>
                <p className="mt-3">
                  <a
                    href={selectedBook.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#c9a96e] underline"
                  >
                    Open the uploaded file
                  </a>
                </p>
              </div>
            )}

            <p className="text-sm text-[#9b9890]">
              File type: <span className="text-[#c9a96e]">{selectedBook.fileType || 'uploaded file'}</span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[#9b9890]">
        No uploaded file is attached to this book yet.
      </div>
    );
  };

  if (!selectedBook) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-3 opacity-40">📖</div>
          <div className="text-sm text-[#9b9890] mb-1.5">No books in your reading list</div>
          <div className="text-sm text-[#5c5a56]">
            Add books to your library and start reading
          </div>
        </div>
      </div>
    );
  }

  const progress = getProgressPercentage();

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Sidebar - Book List */}
      <div className={`${showSidebar ? 'w-[280px]' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-[rgba(255,255,255,0.07)] bg-[#1a1916]`}>
        <div className="p-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#9b9890] uppercase tracking-wider">
              Reading Now
            </h2>
            <span className="text-xs text-[#5c5a56]">{readingBooks.length} books</span>
          </div>

          <div className="space-y-2">
            {readingBooks.map((book : any) => {
              const bookProgress = book.totalPages > 0 
                ? Math.round((book.currentPage / book.totalPages) * 100) 
                : 0;
              
              return (
                <div
                  key={book?._id}
                  onClick={() => handleBookSelect(book)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedBook?._id === book._id
                      ? 'bg-[#222119] border border-[rgba(201,169,110,0.25)]'
                      : 'hover:bg-[#222119]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-[58px] rounded-[2px_4px_4px_2px] flex-shrink-0 overflow-hidden">
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
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#f0ede8] truncate">
                        {book.title}
                      </div>
                      <div className="text-xs text-[#9b9890] truncate">
                        {book.author}
                      </div>
                      <div className="mt-1.5">
                        <div className="h-1 bg-[rgba(255,255,255,0.07)] rounded overflow-hidden">
                          <div 
                            className="h-full bg-[#c9a96e] rounded transition-all"
                            style={{ width: `${bookProgress}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-[#5c5a56] mt-0.5">
                          {bookProgress}% complete
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {readingBooks.length === 0 && (
            <div className="text-center py-8 text-[#5c5a56]">
              <div className="text-3xl mb-2 opacity-40">📚</div>
              <div className="text-xs text-[#9b9890]">No books currently reading</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Reader Area */}
      <div className="flex-1 flex flex-col">
        {/* Reader Toolbar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[#1a1916]">
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] transition-colors"
          >
            {showSidebar ? <Menu size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex-1">
            <div className="text-sm text-[#f0ede8]">{selectedBook.title}</div>
            <div className="text-xs text-[#9b9890]">{selectedBook.author}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 0}
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs text-[#5c5a56]">
              {currentPage} / {selectedBook.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= selectedBook.totalPages}
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] transition-colors"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: selectedBook.title,
                    text: `Reading ${selectedBook.title} by ${selectedBook.author}`,
                  });
                }
              }}
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] transition-colors"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-[#1a1916] border-b border-[rgba(255,255,255,0.07)] p-4">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#9b9890]">Font size</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFontSizeChange(-1)}
                    className="p-1 text-[#9b9890] hover:text-[#f0ede8] transition-colors"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-sm text-[#f0ede8] w-8 text-center">{fontSize}</span>
                  <button
                    onClick={() => handleFontSizeChange(1)}
                    className="p-1 text-[#9b9890] hover:text-[#f0ede8] transition-colors"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9b9890]">Theme</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`w-6 h-6 rounded-full border-2 transition-colors ${
                      theme === 'light' ? 'border-[#c9a96e]' : 'border-transparent'
                    }`}
                    style={{ background: '#f5f0e8' }}
                  />
                  <button
                    onClick={() => handleThemeChange('sepia')}
                    className={`w-6 h-6 rounded-full border-2 transition-colors ${
                      theme === 'sepia' ? 'border-[#c9a96e]' : 'border-transparent'
                    }`}
                    style={{ background: '#f4ecd8' }}
                  />
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-6 h-6 rounded-full border-2 transition-colors ${
                      theme === 'dark' ? 'border-[#c9a96e]' : 'border-transparent'
                    }`}
                    style={{ background: '#1c1a14' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reader Content */}
        <div 
          className={`flex-1 overflow-hidden ${getThemeClasses()}`}
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: 1.85,
          }}
        >
          {getBookContent()}
        </div>

        {/* Bottom Progress Bar */}
        <div className="relative">
          <div className="h-0.5 bg-[rgba(255,255,255,0.07)]">
            <div 
              className="h-full bg-[#c9a96e] transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between px-6 py-2 bg-[#1a1916] border-t border-[rgba(255,255,255,0.07)]">
            <div className="text-xs text-[#5c5a56]">
              <Clock size={12} className="inline mr-1" />
              {getEstimatedTimeRemaining()} remaining
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5c5a56]">
              <span>{progress}% complete</span>
              <span>•</span>
              <span>Page {currentPage} of {selectedBook.totalPages}</span>
            </div>
            <div className="text-xs text-[#5c5a56]">
              <BookOpen size={12} className="inline mr-1" />
              {Math.round(currentPage / 30)} sessions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}