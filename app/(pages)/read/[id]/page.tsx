'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IBook } from '@/app/models/book';
import { 
  Save, Edit2, Trash2, Clock, BookOpen, 
  Star, MessageSquare, Plus, X, Pencil
} from 'lucide-react';

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
  
  // Note state
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<BookNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [notePage, setNotePage] = useState<number | ''>('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

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
    const loadPreviewContent = async () => {
      if (!book?.fileUrl) {
        setPreviewContent(null);
        return;
      }

      const fileType = (book.fileType || '').toLowerCase();
      const isTextLike = fileType.includes('text') || fileType.includes('json') || 
        fileType.includes('xml') || fileType.includes('markdown') || 
        fileType.includes('javascript') || fileType.includes('html');

      if (!isTextLike) {
        setPreviewContent(null);
        return;
      }

      try {
        const response = await fetch(book.fileUrl);
        if (response.ok) {
          setPreviewContent(await response.text());
        } else {
          setPreviewContent(null);
        }
      } catch (err) {
        console.error(err);
        setPreviewContent(null);
      }
    };

    loadPreviewContent();
  }, [book?._id, book?.fileUrl, book?.fileType]);

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-[#9b9890]">
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
    return <div className="p-8 text-[#9b9890]">Book not found.</div>;
  }

  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button
        className="mb-6 text-sm text-[#9b9890] hover:text-[#f0ede8] transition-colors flex items-center gap-2"
        onClick={() => router.push('/library')}
      >
        ← Back to library
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column - Book Content */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-serif text-[#f0ede8] mb-2">{book.title}</h1>
            <p className="text-sm text-[#9b9890]">{book.author}</p>
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
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#5c5a56] mb-4">Reader preview</h2>
              <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)]">
                {book.fileType?.toLowerCase().includes('pdf') ? (
                  <iframe 
                    src={book.fileUrl} 
                    title={book.title} 
                    className="min-h-[70vh] w-full border-0 bg-white"
                  />
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
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2.5 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors resize-none min-h-[80px]"
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
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
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
            <h2 className="text-sm uppercase tracking-[0.2em] text-[#5c5a56] mb-4">
              Book details
            </h2>
            <div className="space-y-3 text-sm text-[#e4e2dd]">
              <div className="flex justify-between">
                <span className="text-[#9b9890]">Category</span>
                <span>{book.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9b9890]">Cover color</span>
                <div className="flex items-center gap-2">
                  <span>{book.coverColor}</span>
                  <div className={`w-4 h-6 rounded-[2px_4px_4px_2px] ${book.coverColor}`}></div>
                </div>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}