'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IBook } from '@/app/models/book';
import { 
  Save, Edit2, Trash2, Clock, BookOpen, 
  Star, MessageSquare, Plus, X, Pencil,
  UploadCloud, Image as ImageIcon
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

  // Delete book state
  const [deletingBook, setDeletingBook] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit book state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    author: '',
    category: '',
    totalPages: 0,
    coverColor: 'c-blue',
    coverImage: '',
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setEditData({
            title: data.title,
            author: data.author,
            category: data.category,
            totalPages: data.totalPages,
            coverColor: data.coverColor || 'c-blue',
            coverImage: data.coverImage || '',
          });
          if (data.coverImage) {
            setCoverPreview(data.coverImage);
          }
          
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

  // Edit book
  const handleEditBook = async () => {
    if (!id) return;
    if (!editData.title.trim() || !editData.author.trim()) {
      setError('Title and author are required');
      return;
    }

    setSavingNote(true);

    try {
      let coverImageUrl = editData.coverImage;
      
      // Upload cover image if a new file is selected
      if (coverFile) {
        const formData = new FormData();
        formData.append('file', coverFile);
        formData.append('type', 'image');

        const uploadRes = await fetch('/api/uploadthing', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload cover image');
        }
        
        const uploadData = await uploadRes.json();
        if (uploadData.fileUrl) {
          coverImageUrl = uploadData.fileUrl;
        }
      }

      const res = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title.trim(),
          author: editData.author.trim(),
          category: editData.category || 'Other',
          totalPages: parseInt(editData.totalPages as any) || 0,
          coverColor: editData.coverColor,
          coverImage: coverImageUrl || undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setBook(updated);
        setEditData({
          title: updated.title,
          author: updated.author,
          category: updated.category,
          totalPages: updated.totalPages,
          coverColor: updated.coverColor || 'c-blue',
          coverImage: updated.coverImage || '',
        });
        setCoverPreview(updated.coverImage || null);
        setCoverFile(null);
        setShowEditModal(false);
        setError('');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to update book');
      }
    } catch (err) {
      console.error('Error updating book:', err);
      setError(err instanceof Error ? err.message : 'Failed to update book');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setEditData({ ...editData, coverImage: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const coverColors = [
    { id: 'c-blue', gradient: 'from-[#1e3a5f] to-[#2d5a8e]' },
    { id: 'c-purple', gradient: 'from-[#2d2460] to-[#4a3d9e]' },
    { id: 'c-red', gradient: 'from-[#5a1f1f] to-[#8b3030]' },
    { id: 'c-green', gradient: 'from-[#1a3d28] to-[#2d6645]' },
    { id: 'c-teal', gradient: 'from-[#0f3d38] to-[#1d6b63]' },
    { id: 'c-amber', gradient: 'from-[#4a3010] to-[#7a5020]' },
    { id: 'c-slate', gradient: 'from-[#253040] to-[#3d4e62]' },
  ];

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
      {/* Edit Book Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.12)] rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-[#f0ede8]">Edit Book</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-[#5c5a56] hover:text-[#9b9890] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm text-[#e05252]">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              {/* Cover Image Upload */}
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Book Cover
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-34 rounded-lg overflow-hidden bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)]">
                    {coverPreview ? (
                      <img 
                        src={coverPreview} 
                        alt="Book cover" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${coverColors.find(c => c.id === editData.coverColor)?.gradient || 'from-[#253040] to-[#3d4e62]'}`}>
                        <div className="flex items-center justify-center h-full">
                          <span className="text-xs text-white/60 font-medium px-2 text-center">
                            {editData.title || 'No cover'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleCoverSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#9b9890] hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                    >
                      <UploadCloud size={14} />
                      Upload Image
                    </button>
                    {coverPreview && (
                      <button
                        onClick={handleRemoveCover}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(224,82,82,0.1)] text-[#e05252] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm hover:bg-[rgba(224,82,82,0.15)] transition-colors"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    Author
                  </label>
                  <input
                    type="text"
                    value={editData.author}
                    onChange={(e) => setEditData({ ...editData, author: e.target.value })}
                    className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] focus:border-[#c9a96e] outline-none transition-colors"
                  >
                    <option value="">Select a category</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Sci-fi">Sci-fi</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-fiction">Non-fiction</option>
                    <option value="Self-help">Self-help</option>
                    <option value="History">History</option>
                    <option value="Science">Science</option>
                    <option value="Biography">Biography</option>
                    <option value="Philosophy">Philosophy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    Total Pages
                  </label>
                  <input
                    type="number"
                    value={editData.totalPages}
                    onChange={(e) => setEditData({ ...editData, totalPages: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Cover Color Selection (fallback) */}
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Cover Color (if no image)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {coverColors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setEditData({ ...editData, coverColor: color.id })}
                      className={`w-8 h-11 rounded-[3px_5px_5px_3px] bg-gradient-to-br ${color.gradient} border-2 transition-colors ${
                        editData.coverColor === color.id && !coverPreview
                          ? 'border-[#c9a96e]'
                          : 'border-transparent hover:border-[rgba(255,255,255,0.12)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError('');
                }}
                className="px-4 py-2 text-sm text-[#9b9890] hover:text-[#f0ede8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditBook}
                disabled={savingNote}
                className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {savingNote ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => setShowEditModal(true)}
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