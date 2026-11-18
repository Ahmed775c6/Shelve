'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IBook } from '@/app/models/book';
import { 
  Save, Trash2, Clock, BookOpen, 
  Star, MessageSquare, Plus, X, Pencil,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const PdfReader = dynamic(() => import('@/app/components/reader/PdfReader'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[#9b9890]">
      Loading PDF reader...
    </div>
  ),
});

interface BookNote {
  _id: string;
  bookId: string;
  userId: string;
  content: string;
  page?: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ReadBookPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  const [book, setBook] = useState<IBook | null>(null);
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewPdfPage, setPreviewPdfPage] = useState(0);
  const [previewPdfPageCount, setPreviewPdfPageCount] = useState(0);

  // Note state
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<BookNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [notePage, setNotePage] = useState<number | ''>('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

  // Delete book state
  const [deletingBook, setDeletingBook] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }

    if (status === 'authenticated' && id) {
      const loadBook = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/books/${id}`);
          if (!res.ok) {
            setError('Book not found');
            return;
          }
          const data = await res.json();
          setBook(data);
          setPreviewPdfPage(0);
          setPreviewPdfPageCount(0);
          // Load notes for this book
          await loadNotes();
        } catch (err) {
          setError('Unable to load book');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      loadBook();
    }
  }, [status, id, router]);

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/books/${id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  };

  useEffect(() => {
    const handleBookUpdated = (event: MessageEvent<{ type?: string; bookId?: string; book?: IBook }>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'book-updated' || event.data.bookId !== id || !event.data.book) return;
      setBook(event.data.book);
    };

    window.addEventListener('message', handleBookUpdated);
    const channel = new BroadcastChannel('shelve-book-updates');
    channel.addEventListener('message', handleBookUpdated);
    return () => {
      window.removeEventListener('message', handleBookUpdated);
      channel.close();
    };
  }, [id]);

  const updateStatus = async (payload: any) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      const updated = await res.json();
      setBook(updated);
    } catch (err) {
      console.error(err);
      setError('Unable to update book status');
    }
  };

  // Delete book
  const handleDeleteBook = async () => {
    if (!id) return;
    setDeletingBook(true);

    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete book');
      }

      // Redirect to library page after successful deletion
      router.push('/library');
    } catch (err) {
      console.error('Error deleting book:', err);
      setError('Failed to delete book. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setDeletingBook(false);
    }
  };

  // Note CRUD operations
  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    setSavingNote(true);

    try {
      const url = editingNote 
        ? `/api/books/${id}/notes/${editingNote._id}`
        : `/api/books/${id}/notes`;
      
      const method = editingNote ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
          page: notePage || undefined,
          isPrivate,
        }),
      });

      if (res.ok) {
        const savedNote = await res.json();
        if (editingNote) {
          setNotes(notes.map(n => n._id === savedNote._id ? savedNote : n));
        } else {
          setNotes([savedNote, ...notes]);
        }
        resetNoteEditor();
      } else {
        setError('Failed to save note');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    setDeletingNote(noteId);

    try {
      const res = await fetch(`/api/books/${id}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setNotes(notes.filter(n => n._id !== noteId));
      } else {
        setError('Failed to delete note');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    } finally {
      setDeletingNote(null);
    }
  };

  const resetNoteEditor = () => {
    setShowNoteEditor(false);
    setEditingNote(null);
    setNoteContent('');
    setNotePage('');
    setIsPrivate(true);
  };

  const startEditNote = (note: BookNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setNotePage(note.page || '');
    setIsPrivate(note.isPrivate);
    setShowNoteEditor(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell text-center text-[#9b9890]">
        <p>{error}</p>
        <button
          className="mt-4 rounded-lg border border-[rgba(255,255,255,0.12)] px-4 py-2 text-sm hover:bg-[#1a1916] transition-colors"
          onClick={() => router.push('/library')}
        >
          Back to library
        </button>
      </div>
    );
  }

  if (!book) {
    return <div className="page-shell text-[#9b9890]">Book not found.</div>;
  }

  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  return (
    <div className="page-shell max-w-7xl mx-auto">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.12)] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-[#f0ede8]">Delete Book</h3>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[#5c5a56] hover:text-[#9b9890] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-[#9b9890] mb-2">
                Are you sure you want to delete <strong className="text-[#f0ede8]">{book.title}</strong>?
              </p>
              <p className="text-xs text-[#5c5a56]">
                This action will permanently delete the book and all associated notes. This cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-[#9b9890] hover:text-[#f0ede8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                disabled={deletingBook}
                className="flex items-center gap-2 px-4 py-2 bg-[rgba(224,82,82,0.15)] text-[#e05252] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm font-medium hover:bg-[rgba(224,82,82,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {deletingBook ? 'Deleting...' : 'Delete Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="mb-6 text-sm text-[#9b9890] hover:text-[#f0ede8] transition-colors flex items-center gap-2"
        onClick={() => router.push('/library')}
      >
        ← Back to library
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column - Book Content */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-serif text-[#f0ede8] mb-2">{book.title}</h1>
              <p className="text-sm text-[#9b9890]">{book.author}</p>
            </div>
            <button
              onClick={() => {
                const editUrl = `/edit-book/${id}`;
                if (window.windowControls) {
                  void window.windowControls.openEditBook(id).catch((openError: unknown) => {
                    console.error('Failed to open the book editor window:', openError);
                    router.push(editUrl);
                  });
                  return;
                }

                const editWindow = window.open(
                  editUrl,
                  `shelve-edit-book-${id}`,
                  'popup,width=760,height=900'
                );
                if (!editWindow) router.push(editUrl);
              }}
              aria-label="Edit book in a new window"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222119] text-[#9b9890] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors"
            >
              <Pencil size={14} />
              Edit Book
            </button>
          </div>

       

          {/* Status Card */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a1916] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c5a56]">Status</p>
                <p className="mt-2 text-xl font-semibold text-[#f0ede8]">
                  {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                </p>
              </div>
              <div className="text-right text-sm text-[#9b9890]">
                <p>{progress}% complete</p>
                <p>{book.currentPage}/{book.totalPages} pages</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-1.5 bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {book.status === 'unread' && (
                <button
                  className="rounded-full bg-[#c9a96e] px-5 py-2.5 text-sm font-medium text-[#1a1510] hover:bg-[#d4b47a] transition-colors"
                  onClick={() => updateStatus({ status: 'reading', startedAt: new Date().toISOString() })}
                >
                  Start reading
                </button>
              )}
              {book.status === 'reading' && (
                <button
                  className="rounded-full bg-[#4a9e6b] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#5ab07a] transition-colors"
                  onClick={() => updateStatus({ 
                    status: 'archived', 
                    finishedAt: new Date().toISOString(), 
                    currentPage: book.totalPages 
                  })}
                >
                  Mark finished
                </button>
              )}
              {book.status === 'archived' && (
                <button
                  className="rounded-full border border-[rgba(255,255,255,0.12)] px-5 py-2.5 text-sm text-[#9b9890] hover:bg-[#1a1916] transition-colors"
                  onClick={() => updateStatus({ status: 'unread', finishedAt: null })}
                >
                  Restore to unread
                </button>
              )}
            </div>
          </div>

{/* File Preview */}
{book.fileUrl && (
  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a1916] p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm uppercase tracking-[0.2em] text-[#5c5a56]">Reader preview 101</h2>
      {(book.fileType?.toLowerCase().includes('pdf') ||
        book.fileUrl.toLowerCase().endsWith('.pdf')) && previewPdfPageCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-[#9b9890]">
          <button
            type="button"
            onClick={() => setPreviewPdfPage((page) => Math.max(0, page - 1))}
            disabled={previewPdfPage === 0}
            aria-label="Previous PDF page"
            className="rounded p-1 hover:bg-[#292722] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {previewPdfPage + 1} of {previewPdfPageCount}</span>
          <button
            type="button"
            onClick={() => setPreviewPdfPage((page) => Math.min(previewPdfPageCount - 1, page + 1))}
            disabled={previewPdfPage >= previewPdfPageCount - 1}
            aria-label="Next PDF page"
            className="rounded p-1 hover:bg-[#292722] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
    <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)]">
      {(book.fileType?.toLowerCase().includes('pdf') ||
        book.fileUrl.toLowerCase().endsWith('.pdf')) ? (
        <div className="h-[70vh] w-full overflow-hidden bg-[#2a2926]">
          <PdfReader
            key={book.fileUrl}
            fileUrl={book.fileUrl}
            pageIndex={previewPdfPage}
            fitToPage={false}
            onPageChange={setPreviewPdfPage}
            onDocumentLoad={(pageCount) => {
              setPreviewPdfPageCount(pageCount);
              setPreviewPdfPage((page) => Math.min(page, pageCount - 1));
            }}
          />
        </div>
      ) : previewContent ? (
        <div className="whitespace-pre-wrap bg-[rgba(255,255,255,0.03)] p-6 text-sm leading-relaxed text-[#e4e2dd] max-h-[70vh] overflow-y-auto">
          {previewContent}
        </div>
      ) : (
        <div className="bg-[rgba(255,255,255,0.03)] p-6 text-sm leading-relaxed text-[#e4e2dd]">
          <p>The uploaded book file is attached. Open it directly if you want to read it outside the preview panel.</p>
          <a 
            href={book.fileUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="mt-3 inline-block text-[#c9a96e] hover:underline"
          >
            Open uploaded file →
          </a>
        </div>
      )}
    </div>
  </div>
)}


        </div>

        {/* Right Column - Notes & Details */}
        <div className="space-y-6">
          {/* Notes Section */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a1916] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#5c5a56]">
                <MessageSquare size={14} className="inline mr-2" />
                Notes & Comments
              </h2>
              <button
                onClick={() => {
                  resetNoteEditor();
                  setShowNoteEditor(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-[#c9a96e] px-3 py-1.5 text-xs font-medium text-[#1a1510] hover:bg-[#d4b47a] transition-colors"
              >
                <Plus size={14} />
                Add note
              </button>
            </div>

            {/* Note Editor */}
            {showNoteEditor && (
              <div className="mb-4 rounded-xl border border-[rgba(201,169,110,0.25)] bg-[rgba(201,169,110,0.05)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#c9a96e]">
                    {editingNote ? 'Edit note' : 'New note'}
                  </span>
                  <button
                    onClick={resetNoteEditor}
                    className="text-[#5c5a56] hover:text-[#9b9890] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your thoughts about this book..."
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2.5 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors resize-none min-h-20"
                  rows={3}
                />
                
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#9b9890]">Page:</label>
                    <input
                      type="number"
                      value={notePage}
                      onChange={(e) => setNotePage(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="optional"
                      className="w-20 bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded px-2 py-1 text-xs text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#9b9890] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="accent-[#c9a96e]"
                    />
                    Private note
                  </label>
                </div>
                
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={resetNoteEditor}
                    className="px-3 py-1.5 text-xs text-[#9b9890] hover:text-[#f0ede8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={!noteContent.trim() || savingNote}
                    className="flex items-center gap-1.5 rounded-lg bg-[#c9a96e] px-4 py-1.5 text-xs font-medium text-[#1a1510] hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    {savingNote ? 'Saving...' : editingNote ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-3 max-h-125 overflow-y-auto pr-2">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    key={note._id}
                    className="group rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] p-4 hover:border-[rgba(255,255,255,0.12)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm text-[#e4e2dd] leading-relaxed">
                          {note.content}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[#5c5a56]">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(note.updatedAt)}
                          </span>
                          {note.page && (
                            <span className="flex items-center gap-1">
                              <BookOpen size={12} />
                              Page {note.page}
                            </span>
                          )}
                          {note.isPrivate && (
                            <span className="text-[10px] bg-[rgba(201,169,110,0.1)] text-[#c9a96e] px-2 py-0.5 rounded-full">
                              Private
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditNote(note)}
                          className="p-1 text-[#5c5a56] hover:text-[#9b9890] transition-colors"
                          title="Edit note"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note._id)}
                          disabled={deletingNote === note._id}
                          className="p-1 text-[#5c5a56] hover:text-[#e05252] transition-colors"
                          title="Delete note"
                        >
                          {deletingNote === note._id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#5c5a56]">
                  <div className="text-3xl mb-2 opacity-40">📝</div>
                  <div className="text-sm text-[#9b9890]">No notes yet</div>
                  <div className="text-xs">Start adding your thoughts about this book</div>
                </div>
              )}
            </div>
          </div>

          {/* Book Details */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a1916] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#5c5a56]">
                Book details
              </h2>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(224,82,82,0.1)] text-[#e05252] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm hover:bg-[rgba(224,82,82,0.15)] transition-colors"
              >
                <Trash2 size={14} />
                Delete Book
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#e4e2dd]">
              <div className="flex justify-between">
                <span className="text-[#9b9890]">Category</span>
                <span>{book.category}</span>
              </div>
              {book.coverImage ? (
                <div className="flex justify-between">
                  <span className="text-[#9b9890]">Cover</span>
                  <span className="text-[#c9a96e]">Custom Image</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-[#9b9890]">Cover color</span>
                  <div className="flex items-center gap-2">
                    <span>{book.coverColor}</span>
                    <div className={`w-4 h-6 rounded-[2px_4px_4px_2px] ${book.coverColor}`}></div>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#9b9890]">File type</span>
                <span>{book.fileType?.toUpperCase() || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9b9890]">Uploaded</span>
                <span>{new Date(book.uploadedAt).toLocaleDateString()}</span>
              </div>
              {book.startedAt && (
                <div className="flex justify-between">
                  <span className="text-[#9b9890]">Started</span>
                  <span>{new Date(book.startedAt).toLocaleDateString()}</span>
                </div>
              )}
              {book.finishedAt && (
                <div className="flex justify-between">
                  <span className="text-[#9b9890]">Finished</span>
                  <span>{new Date(book.finishedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {book.description && (
              <div className="mt-6 border-t border-[rgba(255,255,255,0.08)] pt-5">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#5c5a56] mb-3">
                  Description
                </h3>
                <p className="text-sm leading-6 text-[#e4e2dd] whitespace-pre-wrap">
                  {book.description}
                </p>
              </div>
            )}

            {book.story && (
              <div className="mt-6 border-t border-[rgba(255,255,255,0.08)] pt-5">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#5c5a56] mb-3">
                  Story
                </h3>
                <p className="text-sm leading-6 text-[#e4e2dd] whitespace-pre-wrap">
                  {book.story}
                </p>
              </div>
            )}
          </div>

             {/* Book Cover Display */}
          {book.coverImage && (
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a1916] p-6">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#5c5a56] mb-4">Book Cover</h2>
              <div className="flex justify-center">
                <img 
                  src={book.coverImage} 
                  alt={book.title} 
                  className="max-h-100 object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}