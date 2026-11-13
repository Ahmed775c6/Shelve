'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { IBook } from '@/app/models/book';
import { 
  BookOpen, Clock, ChevronLeft, ChevronRight, 
  Share2, Settings, ZoomIn, ZoomOut, Menu, FileText, Maximize2, Minimize2,
  Download, ExternalLink, Loader2
} from 'lucide-react';

const PdfReader = dynamic(() => import('@/app/components/reader/PdfReader'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[#9b9890]">
      Loading PDF reader...
    </div>
  ),
});

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
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

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
    else if (window.innerWidth < 768) setShowSidebar(false);
  }, [status]);

  const fetchOpenLibraryPreview = async (book: IBook) => {
    setContentLoading(true);
    setContentError(null);
    setPreviewContent(null);

    const searchQuery = [book.title, book.author].filter(Boolean).join(' ');

    if (!searchQuery.trim()) {
      setPreviewContent(book.description?.trim() || 'No preview available for this book yet.');
      setContentLoading(false);
      return;
    }

    try {
      const searchResponse = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`
      );

      if (!searchResponse.ok) {
        throw new Error('Open Library search failed');
      }

      const searchData = await searchResponse.json();
      const match = searchData.docs?.find((doc: any) => doc.title);

      if (!match?.key) {
        setPreviewContent(book.description?.trim() || 'No preview available for this book yet.');
        return;
      }

      const workKey = match.key.replace('/books/', '/works/');
      const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);

      if (!workResponse.ok) {
        throw new Error('Open Library work details failed');
      }

      const workData = await workResponse.json();
      const description = typeof workData.description === 'string'
        ? workData.description
        : workData.description?.value || book.description || '';

      let excerpts: string[] = [];
      let chapters: Array<{ title: string; pages?: number }> = [];

      const editionsResponse = await fetch(`https://openlibrary.org${workKey}/editions.json?limit=1`);
      if (editionsResponse.ok) {
        const editionsData = await editionsResponse.json();
        const firstEdition = editionsData.entries?.[0];

        if (firstEdition) {
          chapters = (firstEdition.table_of_contents || []).map((item: any) => ({
            title: item.title,
            pages: item.pages || undefined,
          }));
          excerpts = (firstEdition.excerpts || [])
            .map((item: any) => item.text)
            .filter(Boolean);
        }
      }

      const contentParts = [
        description,
        chapters.length > 0 ? `Chapters:\n${chapters.map((chapter) => `• ${chapter.title}`).join('\n')}` : '',
        excerpts.slice(0, 3).length > 0 ? `Excerpts:\n${excerpts.slice(0, 3).join('\n\n')}` : '',
      ].filter(Boolean);

      setPreviewContent(contentParts.join('\n\n') || 'No preview available for this book yet.');
    } catch (error) {
      console.error('Error loading Open Library preview:', error);
      setContentError('Unable to load preview for this book right now.');
      setPreviewContent(book.description?.trim() || null);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    const loadPreviewContent = async () => {
      if (!selectedBook) {
        setPreviewContent(null);
        setContentError(null);
        return;
      }

      if (selectedBook.fileUrl) {
        setContentLoading(true);
        setContentError(null);

        const fileType = (selectedBook.fileType || '').toLowerCase();

        const isTextLike = fileType.includes('text') ||
          fileType.includes('json') ||
          fileType.includes('xml') ||
          fileType.includes('markdown') ||
          fileType.includes('javascript') ||
          fileType.includes('html') ||
          fileType.includes('css') ||
          fileType.includes('csv');

        if (!isTextLike && !fileType.includes('pdf')) {
          setPreviewContent(null);
          setContentLoading(false);
          return;
        }

        try {
          const response = await fetch(selectedBook.fileUrl);
          if (response.ok) {
            if (isTextLike) {
              const text = await response.text();
              setPreviewContent(text);
            } else {
              setPreviewContent(null);
            }
          } else {
            setContentError('Failed to load book content');
            setPreviewContent(null);
          }
        } catch (error) {
          console.error('Error loading preview content:', error);
          setContentError('Error loading book content');
          setPreviewContent(null);
        } finally {
          setContentLoading(false);
        }

        return;
      }

      await fetchOpenLibraryPreview(selectedBook);
    };

    loadPreviewContent();
  }, [selectedBook?._id, selectedBook?.fileUrl, selectedBook?.fileType, selectedBook?.title, selectedBook?.author, selectedBook?.description]);

  useEffect(() => {
    if (!isFocusMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFocusMode(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  if (status === 'loading' || loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-100">
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
    setPdfPageCount(0);
  };

  const handlePageChange = (newPage: number) => {
    if (!selectedBook) return;
    
    const totalPages = pdfPageCount || selectedBook.totalPages;
    const clampedPage = Math.max(0, Math.min(newPage, totalPages));
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
    if (!selectedBook) return 0;
    const totalPages = pdfPageCount || selectedBook.totalPages;
    if (totalPages === 0) return 0;
    return Math.round((currentPage / totalPages) * 100);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate estimated reading time remaining
  const getEstimatedTimeRemaining = () => {
    if (!selectedBook) return '--';
    const pagesRemaining = (pdfPageCount || selectedBook.totalPages) - currentPage;
    // Assuming average reading speed of 2 minutes per page
    const minutes = pagesRemaining * 2;
    return formatTime(minutes);
  };

  const getBookContent = () => {
    if (!selectedBook) return null;

    if (!selectedBook.fileUrl) {
      return (
        <div className="h-full w-full overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-180">
            <h2 className="text-2xl font-serif font-normal text-[#f0ede8] mb-8">
              {selectedBook.title}
            </h2>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm text-[#c9a96e]">
                <BookOpen size={16} />
                Open Library preview
              </div>

              {contentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-[#c9a96e]" size={32} />
                </div>
              ) : contentError ? (
                <div className="rounded-xl border border-[rgba(224,82,82,0.25)] bg-[rgba(224,82,82,0.1)] p-6 text-center">
                  <p className="text-[#e05252]">{contentError}</p>
                </div>
              ) : previewContent ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#e4e2dd]">
                  {previewContent}
                </div>
              ) : (
                <p className="text-sm text-[#e4e2dd]">
                  A preview for this book is not available yet. Try opening the book from the library again later.
                </p>
              )}
            </div>

            <div className="mt-6 text-sm text-[#9b9890]">
              <span className="flex items-center gap-2">
                <FileText size={14} />
                Source: <span className="text-[#c9a96e]">Open Library</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    const fileType = (selectedBook.fileType || '').toLowerCase();
    const isTextLike = fileType.includes('text') || 
      fileType.includes('json') || 
      fileType.includes('xml') || 
      fileType.includes('markdown') || 
      fileType.includes('javascript') || 
      fileType.includes('html') ||
      fileType.includes('css') ||
      fileType.includes('csv');
    const isPdf = fileType.includes('pdf');
    const isEpub = fileType.includes('epub');
    const isMobi = fileType.includes('mobi');

    // Render PDFs as individual pages for controlled scrolling and page turns.
    if (isPdf) {
      return (
        <div className="h-full w-full overflow-hidden bg-[#2a2926]">
          <PdfReader
            key={selectedBook.fileUrl}
            fileUrl={selectedBook.fileUrl}
            pageIndex={currentPage}
            fitToPage={isFocusMode}
            onPageChange={handlePageChange}
            onDocumentLoad={(pageCount) => {
              setPdfPageCount(pageCount);
              setCurrentPage((page) => Math.min(page, pageCount - 1));
            }}
          />
        </div>
      );
    }

    // For text-based files - show formatted text
    if (isTextLike) {
      return (
        <div className="h-full w-full overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-180">
            <h2 className="text-2xl font-serif font-normal text-[#f0ede8] mb-8">
              {selectedBook.title}
            </h2>

            {contentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-[#c9a96e]" size={32} />
              </div>
            ) : contentError ? (
              <div className="rounded-xl border border-[rgba(224,82,82,0.25)] bg-[rgba(224,82,82,0.1)] p-6 text-center">
                <p className="text-[#e05252]">{contentError}</p>
                <a
                  href={selectedBook.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-[#c9a96e] hover:underline"
                >
                  Try opening the file directly
                </a>
              </div>
            ) : previewContent ? (
              <div className="whitespace-pre-wrap rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 text-sm leading-relaxed text-[#e4e2dd]">
                {previewContent}
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 text-sm leading-relaxed text-[#e4e2dd]">
                <p>No preview available for this file type.</p>
                <p className="mt-3">
                  <a
                    href={selectedBook.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#c9a96e] hover:underline"
                  >
                    Download or open the file
                  </a>
                </p>
              </div>
            )}

            <div className="mt-8 text-sm text-[#9b9890]">
              <span className="flex items-center gap-2">
                <FileText size={14} />
                File type: <span className="text-[#c9a96e]">{selectedBook.fileType || 'Unknown'}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    // For EPUB and MOBI files
    if (isEpub || isMobi) {
      return (
        <div className="h-full w-full overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-180">
            <h2 className="text-2xl font-serif font-normal text-[#f0ede8] mb-4">
              {selectedBook.title}
            </h2>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6">
              <p className="text-sm text-[#e4e2dd]">
                This book is in <strong>{selectedBook.fileType?.toUpperCase()}</strong> format.
                For the best reading experience, we recommend downloading the file and opening it 
                with a dedicated e-reader application.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href={selectedBook.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a]"
                >
                  <Download size={14} />
                  Download File
                </a>
                <a
                  href={selectedBook.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#222119] border border-[rgba(255,255,255,0.07)] text-[#9b9890] rounded-lg text-sm hover:text-[#f0ede8]"
                >
                  <ExternalLink size={14} />
                  Open in Browser
                </a>
              </div>
            </div>
            <div className="mt-4 text-sm text-[#9b9890]">
              <span className="flex items-center gap-2">
                <FileText size={14} />
                File type: <span className="text-[#c9a96e]">{selectedBook.fileType?.toUpperCase()}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Generic fallback
    return (
      <div className="h-full w-full overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-180">
          <h2 className="text-2xl font-serif font-normal text-[#f0ede8] mb-4">
            {selectedBook.title}
          </h2>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6">
            <p className="text-sm text-[#e4e2dd]">
              This book is in <strong>{selectedBook.fileType?.toUpperCase() || 'Unknown'}</strong> format.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href={selectedBook.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a]"
              >
                <Download size={14} />
                Download File
              </a>
              <a
                href={selectedBook.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#222119] border border-[rgba(255,255,255,0.07)] text-[#9b9890] rounded-lg text-sm hover:text-[#f0ede8]"
              >
                <ExternalLink size={14} />
                Open in Browser
              </a>
            </div>
          </div>
        </div>
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
  const totalPages = pdfPageCount || selectedBook.totalPages;

  return (
    <div className={`flex ${
      isFocusMode
        ? 'fixed inset-0 z-200 h-dvh w-screen bg-[#0f0e0c]'
        : 'h-[calc(100vh-52px)]'
    }`}>
      {/* Sidebar - Book List */}
      {!isFocusMode && <div className={`${showSidebar ? 'w-70' : 'w-0'} overflow-hidden border-r border-[rgba(255,255,255,0.07)] bg-[#1a1916]`}>
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
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedBook?._id === book._id
                      ? 'bg-[#222119] border border-[rgba(201,169,110,0.25)]'
                      : 'hover:bg-[#222119]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-14.5 rounded-[2px_4px_4px_2px] shrink-0 overflow-hidden">
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
                            className="h-full bg-[#c9a96e] rounded"
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
      </div>}

      {/* Main Reader Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Reader Toolbar */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[#1a1916] sm:gap-4 sm:px-6">
          {!isFocusMode && (
            <button
              onClick={toggleSidebar}
              aria-label={showSidebar ? 'Hide reading list' : 'Show reading list'}
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8]"
            >
              {showSidebar ? <Menu size={18} /> : <Menu size={18} />}
            </button>
          )}

          <div className="flex-1">
            <div className="text-sm text-[#f0ede8]">{selectedBook.title}</div>
            <div className="text-xs text-[#9b9890]">{selectedBook.author}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 0}
              aria-label="Previous page"
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs text-[#5c5a56]">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              aria-label="Next page"
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8] disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsFocusMode((focusMode) => !focusMode);
                setShowSettings(false);
              }}
              aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
              title={isFocusMode ? 'Exit focus mode' : 'Read in focus mode'}
              className="p-1.5 text-[#9b9890] hover:text-[#f0ede8]"
            >
              {isFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {!isFocusMode && (
              <>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  aria-label="Reading settings"
                  className="p-1.5 text-[#9b9890] hover:text-[#f0ede8]"
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
                  className="p-1.5 text-[#9b9890] hover:text-[#f0ede8]"
                >
                  <Share2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && !isFocusMode && (
          <div className="bg-[#1a1916] border-b border-[rgba(255,255,255,0.07)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 max-w-3xl mx-auto">
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#9b9890]">Font size</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFontSizeChange(-1)}
                    className="p-1 text-[#9b9890] hover:text-[#f0ede8]"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-sm text-[#f0ede8] w-8 text-center">{fontSize}</span>
                  <button
                    onClick={() => handleFontSizeChange(1)}
                    className="p-1 text-[#9b9890] hover:text-[#f0ede8]"
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
                    className={`w-6 h-6 rounded-full border-2 ${
                      theme === 'light' ? 'border-[#c9a96e]' : 'border-transparent'
                    }`}
                    style={{ background: '#f5f0e8' }}
                  />
                  <button
                    onClick={() => handleThemeChange('sepia')}
                    className={`w-6 h-6 rounded-full border-2 ${
                      theme === 'sepia' ? 'border-[#c9a96e]' : 'border-transparent'
                    }`}
                    style={{ background: '#f4ecd8' }}
                  />
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-6 h-6 rounded-full border-2 ${
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
          className={`min-h-0 flex-1 overflow-hidden relative ${getThemeClasses()}`}
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: 1.85,
          }}
        >
          {getBookContent()}
        </div>

        {/* Bottom Progress Bar */}
        {!isFocusMode && <div className="relative">
          <div className="h-0.5 bg-[rgba(255,255,255,0.07)]">
            <div 
              className="h-full bg-[#c9a96e]"
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
              <span>Page {currentPage + 1} of {totalPages}</span>
            </div>
            <div className="text-xs text-[#5c5a56]">
              <BookOpen size={12} className="inline mr-1" />
              {Math.round(currentPage / 30)} sessions
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}