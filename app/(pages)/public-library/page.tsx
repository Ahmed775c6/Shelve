'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search, BookOpen, Plus, Star, 
  Loader2, Filter, X, ChevronLeft, ChevronRight,
  Bookmark, ExternalLink, Info, FileText, ChevronDown
} from 'lucide-react';
import Book3D from '@/app/components/book/Book3D';

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  description?: string | { type: string; value: string };
  number_of_pages_median?: number;
  publisher?: string[];
  language?: string[];
  ratings_average?: number;
  ratings_count?: number;
  edition_count?: number;
  // For works API
  works?: {
    key: string;
    title: string;
    description?: string | { type: string; value: string };
  }[];
}

interface BookContent {
  description?: string;
  chapters?: Array<{
    title: string;
    pages?: number;
  }>;
  excerpts?: string[];
  subjects?: string[];
  characters?: string[];
  plots?: string[];
}

interface SearchResponse {
  docs: OpenLibraryBook[];
  numFound: number;
  start: number;
}

const CATEGORIES = [
  'All',
  'Fiction',
  'Non-fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Romance',
  'Thriller',
  'History',
  'Biography',
  'Science',
  'Philosophy',
  'Poetry',
  'Classics',
];

const COVER_COLORS = [
  'c-blue', 'c-purple', 'c-red', 'c-green', 
  'c-teal', 'c-amber', 'c-slate'
];

export default function PublicLibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingBook, setAddingBook] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBook, setSelectedBook] = useState<OpenLibraryBook | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [popularBooks, setPopularBooks] = useState<OpenLibraryBook[]>([]);
  
  // Book content state
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }

    // Load popular books on initial load
    fetchPopularBooks();
  }, [status, router]);

  const fetchPopularBooks = async () => {
    try {
      const response = await fetch(
        'https://openlibrary.org/search.json?q=popular&limit=12&sort=rating'
      );
      const data = await response.json();
      setPopularBooks(data.docs || []);
    } catch (err) {
      console.error('Error fetching popular books:', err);
    }
  };

  const searchBooks = async (page: number = 1) => {
    if (!searchQuery.trim() && selectedCategory === 'All') {
      fetchPopularBooks();
      return;
    }

    setLoading(true);
    setError('');

    try {
      let query = searchQuery.trim();
      if (selectedCategory !== 'All') {
        query += ` subject:${selectedCategory}`;
      }

      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&page=${page}&limit=20`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data: SearchResponse = await response.json();
      setBooks(data.docs || []);
      setTotalResults(data.numFound || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error searching books:', err);
      setError('Failed to search books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookContent = async (bookKey: string) => {
    setLoadingContent(true);
    setBookContent(null);
    
    try {
      // Get the work key from the book
      const workKey = bookKey.replace('/books/', '/works/');
      
      // Fetch work details including description
      const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);
      
      if (workResponse.ok) {
        const workData = await workResponse.json();
        
        // Parse description (can be string or object)
        let description = '';
        if (workData.description) {
          if (typeof workData.description === 'string') {
            description = workData.description;
          } else if (workData.description.value) {
            description = workData.description.value;
          }
        }
        
        // Fetch editions to get more details
        const editionsResponse = await fetch(
          `https://openlibrary.org${workKey}/editions.json?limit=1`
        );
        
        let chapters: Array<{ title: string; pages?: number }> = [];
        let excerpts: string[] = [];
        
        if (editionsResponse.ok) {
          const editionsData = await editionsResponse.json();
          const firstEdition = editionsData.entries?.[0];
          
          if (firstEdition) {
            // Try to get table of contents
            if (firstEdition.table_of_contents) {
              chapters = firstEdition.table_of_contents.map((item: any) => ({
                title: item.title,
                pages: item.pages || undefined,
              }));
            }
            
            // Try to get excerpts
            if (firstEdition.excerpts) {
              excerpts = firstEdition.excerpts.map((item: any) => item.text);
            }
          }
        }
        
        setBookContent({
          description,
          chapters: chapters.length > 0 ? chapters : undefined,
          excerpts: excerpts.length > 0 ? excerpts : undefined,
          subjects: workData.subjects || [],
          characters: workData.characters || [],
          plots: workData.plots || [],
        });
      }
    } catch (err) {
      console.error('Error fetching book content:', err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    searchBooks(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    if (searchQuery.trim() || category !== 'All') {
      searchBooks(1);
    } else {
      fetchPopularBooks();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(totalResults / 20)) {
      searchBooks(newPage);
    }
  };

  const handleBookClick = async (book: OpenLibraryBook) => {
    setSelectedBook(book);
    setShowDetailsModal(true);
    setShowFullDescription(false);
    await fetchBookContent(book.key);
  };

  const getCoverUrl = (coverId?: number, size: 'S' | 'M' | 'L' = 'M') => {
    if (!coverId) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  };

  const getRandomColor = () => {
    return COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];
  };

  const addBookToLibrary = async (book: OpenLibraryBook) => {
    setAddingBook(book.key);
    setError('');
    setSuccess('');
console.log('boo; ', book)
    try {
      // Get description from book content if available
      let description = '';
      if (bookContent?.description) {
        description = bookContent.description;
      } else if (book.description) {
        if (typeof book.description === 'string') {
          description = book.description;
        } else if (book.description.value) {
          description = book.description.value;
        }
      }

      const bookData = {
        title: book.title,
        author: book.author_name?.[0] || 'Unknown Author',
        category: book.subject?.[0] || 'Other',
        totalPages: book.number_of_pages_median || 300,
        coverColor: getRandomColor(),
        coverImage: getCoverUrl(book.cover_i, 'L'),
        fileUrl: null,
        fileType: null,
        status: 'unread',
        description: description.substring(0, 500), // Store first 500 chars
      };

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      if (response.ok) {
        setSuccess(`"${book.title}" added to your library!`);
        // Remove from displayed list
        setBooks(books.filter(b => b.key !== book.key));
        setPopularBooks(popularBooks.filter(b => b.key !== book.key));
        setShowDetailsModal(false);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to add book to library');
      }
    } catch (err) {
      console.error('Error adding book:', err);
      setError('Failed to add book to library');
    } finally {
      setAddingBook(null);
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    const stars = Math.round(rating / 2);
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < stars ? 'fill-[#c9a96e] text-[#c9a96e]' : 'text-[#5c5a56]'}
          />
        ))}
        <span className="text-xs text-[#5c5a56] ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="page-shell flex items-center justify-center min-h-100">
        <div className="text-[#9b9890]">Loading public library...</div>
      </div>
    );
  }

  const displayedBooks = searchQuery.trim() || selectedCategory !== 'All' ? books : popularBooks;

  return (
    <div className="page-shell max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#f0ede8] mb-2">Public Library</h1>
        <p className="text-sm text-[#9b9890]">
          Discover books from Open Library and add them to your personal collection
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-[rgba(74,158,107,0.1)] border border-[rgba(74,158,107,0.25)] rounded-lg flex items-center gap-3 text-sm text-[#4a9e6b]">
          <Bookmark size={16} className="shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.25)] rounded-lg flex items-center gap-3 text-sm text-[#e05252]">
          <Info size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <div className="flex items-center gap-2 bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2">
              <Search size={16} className="text-[#9b9890]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for books, authors, subjects..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#f0ede8] placeholder:text-[#5c5a56]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#c9a96e] text-[#1a1510]'
                  : 'bg-[#1a1916] text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {(searchQuery.trim() || selectedCategory !== 'All') && (
        <div className="text-sm text-[#5c5a56] mb-4">
          Found {totalResults.toLocaleString()} books
          {currentPage > 1 && ` (Page ${currentPage})`}
        </div>
      )}

      {/* Books Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[#c9a96e]" size={32} />
        </div>
      ) : displayedBooks.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {displayedBooks.map((book : any) => (
            <div
              key={book.key}
              className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.12)] transition-colors group"
            >
              <div className="flex flex-col items-center">
                {/* 3D Book */}
                <div 
                  className="cursor-pointer"
                  onClick={() => handleBookClick(book)}
                >
                  <Book3D
                    title={book.title}
                    author={book.author_name?.[0] || 'Unknown Author'}
                    coverImage={getCoverUrl(book.cover_i , 'L')}
                    coverColor={getRandomColor()}
                    category={book.subject?.[0]}
                  />
                </div>

                {/* Book Info */}
                <div className="w-full mt-3">
                  <h3 
                    className="text-sm font-medium text-[#f0ede8] text-center line-clamp-2 cursor-pointer hover:text-[#c9a96e] transition-colors"
                    onClick={() => handleBookClick(book)}
                  >
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#5c5a56] text-center mt-1">
                    {book.author_name?.[0] || 'Unknown Author'}
                  </p>
                  {book.first_publish_year && (
                    <p className="text-[10px] text-[#5c5a56] text-center">
                      {book.first_publish_year}
                    </p>
                  )}
                  {book.ratings_average && (
                    <div className="mt-1 flex justify-center">
                      {getRatingStars(book.ratings_average)}
                    </div>
                  )}
                </div>

                {/* Add Button */}
                <button
                  onClick={() => addBookToLibrary(book)}
                  disabled={addingBook === book.key}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-lg text-xs text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#2a2926] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingBook === book.key ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <Plus size={12} />
                  )}
                  Add to Library
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-[#5c5a56]">
          <div className="text-5xl mb-3 opacity-40">📚</div>
          <div className="text-sm text-[#9b9890]">No books found</div>
          <div className="text-xs mt-1">Try searching for a different book or category</div>
        </div>
      )}

      {/* Pagination */}
      {(searchQuery.trim() || selectedCategory !== 'All') && totalResults > 20 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-[#1a1916] border border-[rgba(255,255,255,0.07)] text-[#9b9890] hover:text-[#f0ede8] disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-[#5c5a56]">
            Page {currentPage} of {Math.ceil(totalResults / 20)}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalResults / 20)}
            className="p-2 rounded-lg bg-[#1a1916] border border-[rgba(255,255,255,0.07)] text-[#9b9890] hover:text-[#f0ede8] disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Book Details Modal with Content */}
      {showDetailsModal && selectedBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.12)] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-serif text-[#f0ede8]">Book Details</h3>
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  setBookContent(null);
                }}
                className="text-[#5c5a56] hover:text-[#9b9890] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-[220px_1fr] gap-6">
              {/* Book Cover */}
              <div className="flex flex-col items-center">
                <div className="w-full aspect2/3 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.07)]">
                  {getCoverUrl(selectedBook.cover_i, 'L') ? (
                    <img 
                      src={getCoverUrl(selectedBook.cover_i, 'L')!} 
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center">
                      <span className="text-white/60 font-serif text-center px-4">
                        {selectedBook.title}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addBookToLibrary(selectedBook)}
                  disabled={addingBook === selectedBook.key}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50"
                >
                  {addingBook === selectedBook.key ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  Add to My Library
                </button>
              </div>

              {/* Book Info */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-serif text-[#f0ede8]">{selectedBook.title}</h2>
                  <p className="text-sm text-[#9b9890]">{selectedBook.author_name?.[0] || 'Unknown Author'}</p>
                </div>

                {selectedBook.ratings_average && (
                  <div className="flex items-center gap-2">
                    {getRatingStars(selectedBook.ratings_average)}
                    <span className="text-xs text-[#5c5a56]">
                      ({selectedBook.ratings_count || 0} ratings)
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {selectedBook.first_publish_year && (
                    <div>
                      <span className="text-[#5c5a56]">First Published:</span>
                      <p className="text-[#f0ede8]">{selectedBook.first_publish_year}</p>
                    </div>
                  )}
                  {selectedBook.number_of_pages_median && (
                    <div>
                      <span className="text-[#5c5a56]">Pages:</span>
                      <p className="text-[#f0ede8]">{selectedBook.number_of_pages_median}</p>
                    </div>
                  )}
                  {selectedBook.publisher && (
                    <div>
                      <span className="text-[#5c5a56]">Publisher:</span>
                      <p className="text-[#f0ede8]">{selectedBook.publisher[0]}</p>
                    </div>
                  )}
                  {selectedBook.language && (
                    <div>
                      <span className="text-[#5c5a56]">Language:</span>
                      <p className="text-[#f0ede8]">{selectedBook.language[0]}</p>
                    </div>
                  )}
                </div>

                {/* Book Content Section */}
                <div className="border-t border-[rgba(255,255,255,0.07)] pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-[#c9a96e]" />
                    <h4 className="text-sm font-medium text-[#f0ede8]">Book Content</h4>
                    {loadingContent && (
                      <Loader2 className="animate-spin text-[#c9a96e]" size={14} />
                    )}
                  </div>

                  {loadingContent ? (
                    <div className="text-sm text-[#5c5a56]">Loading content...</div>
                  ) : bookContent ? (
                    <div className="space-y-3">
                      {/* Description */}
                      {bookContent.description && (
                        <div>
                          <p className="text-sm text-[#9b9890] mb-1">Description:</p>
                          <div className="text-sm text-[#e4e2dd] leading-relaxed">
                            {showFullDescription 
                              ? bookContent.description
                              : truncateText(bookContent.description, 300)}
                            {bookContent.description.length > 300 && (
                              <button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="ml-2 text-[#c9a96e] hover:text-[#d4b47a] transition-colors text-xs"
                              >
                                {showFullDescription ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Chapters */}
                      {bookContent.chapters && bookContent.chapters.length > 0 && (
                        <div>
                          <p className="text-sm text-[#9b9890] mb-1">Table of Contents:</p>
                          <div className="bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 max-h-37.5 overflow-y-auto">
                            {bookContent.chapters.slice(0, 10).map((chapter, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-[#e4e2dd]">{chapter.title}</span>
                                {chapter.pages && (
                                  <span className="text-[#5c5a56]">p. {chapter.pages}</span>
                                )}
                              </div>
                            ))}
                            {bookContent.chapters.length > 10 && (
                              <div className="text-xs text-[#5c5a56] mt-1">
                                + {bookContent.chapters.length - 10} more chapters
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Excerpts */}
                      {bookContent.excerpts && bookContent.excerpts.length > 0 && (
                        <div>
                          <p className="text-sm text-[#9b9890] mb-1">Excerpts:</p>
                          <div className="space-y-2">
                            {bookContent.excerpts.slice(0, 2).map((excerpt, i) => (
                              <div key={i} className="bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg p-3">
                                <p className="text-xs text-[#e4e2dd] italic leading-relaxed">
                                  "{truncateText(excerpt, 200)}"
                                </p>
                              </div>
                            ))}
                            {bookContent.excerpts.length > 2 && (
                              <div className="text-xs text-[#5c5a56]">
                                + {bookContent.excerpts.length - 2} more excerpts
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Subjects */}
                      {bookContent.subjects && bookContent.subjects.length > 0 && (
                        <div>
                          <p className="text-sm text-[#9b9890] mb-1">Subjects:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {bookContent.subjects.slice(0, 8).map((subject, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-full text-xs text-[#9b9890]"
                              >
                                {subject}
                              </span>
                            ))}
                            {bookContent.subjects.length > 8 && (
                              <span className="text-xs text-[#5c5a56] px-2 py-0.5">
                                +{bookContent.subjects.length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Characters */}
                      {bookContent.characters && bookContent.characters.length > 0 && (
                        <div>
                          <p className="text-sm text-[#9b9890] mb-1">Characters:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {bookContent.characters.slice(0, 6).map((character, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-[rgba(139,125,216,0.1)] border border-[rgba(139,125,216,0.25)] rounded-full text-xs text-[#a78bfa]"
                              >
                                {character}
                              </span>
                            ))}
                            {bookContent.characters.length > 6 && (
                              <span className="text-xs text-[#5c5a56] px-2 py-0.5">
                                +{bookContent.characters.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-[#5c5a56]">
                      No additional content available for this book.
                    </div>
                  )}
                </div>

                {/* Open Library Link */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.07)]">
                  <a
                    href={`https://openlibrary.org${selectedBook.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-[#c9a96e] hover:text-[#d4b47a] transition-colors"
                  >
                    <ExternalLink size={14} />
                    View on Open Library
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}