'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Save, Trash2, UploadCloud, X } from 'lucide-react';

interface EditBookData {
  title: string;
  author: string;
  category: string;
  totalPages: number;
  description: string;
  story: string;
  coverColor: string;
  coverImage: string;
}

const initialEditData: EditBookData = {
  title: '',
  author: '',
  category: '',
  totalPages: 0,
  description: '',
  story: '',
  coverColor: 'c-blue',
  coverImage: '',
};

const coverColors = [
  { id: 'c-blue', gradient: 'from-[#1e3a5f] to-[#2d5a8e]' },
  { id: 'c-purple', gradient: 'from-[#2d2460] to-[#4a3d9e]' },
  { id: 'c-red', gradient: 'from-[#5a1f1f] to-[#8b3030]' },
  { id: 'c-green', gradient: 'from-[#1a3d28] to-[#2d6645]' },
  { id: 'c-teal', gradient: 'from-[#0f3d38] to-[#1d6b63]' },
  { id: 'c-amber', gradient: 'from-[#4a3010] to-[#7a5020]' },
  { id: 'c-slate', gradient: 'from-[#253040] to-[#3d4e62]' },
  { id: 'c-rose', gradient: 'from-[#6b1f3a] to-[#c2416c]' },
  { id: 'c-orange', gradient: 'from-[#7c2d12] to-[#ea580c]' },
  { id: 'c-gold', gradient: 'from-[#5c3c0e] to-[#c8972d]' },
  { id: 'c-indigo', gradient: 'from-[#28235f] to-[#5151a5]' },
  { id: 'c-cyan', gradient: 'from-[#134e5e] to-[#168fa0]' },
  { id: 'c-forest', gradient: 'from-[#16382c] to-[#39805c]' },
  { id: 'c-charcoal', gradient: 'from-[#202329] to-[#545962]' },
];

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { status } = useSession();
  const [editData, setEditData] = useState<EditBookData>(initialEditData);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookFound, setBookFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
      return;
    }

    if (status !== 'authenticated' || !id) return;

    const loadBook = async () => {
      try {
        const response = await fetch(`/api/books/${id}`);
        if (!response.ok) {
          setError('Book not found');
          return;
        }

        const book = await response.json();
        setEditData({
          title: book.title,
          author: book.author,
          category: book.category,
          totalPages: book.totalPages,
          description: book.description || '',
          story: book.story || '',
          coverColor: book.coverColor || 'c-blue',
          coverImage: book.coverImage || '',
        });
        setCoverPreview(book.coverImage || null);
        setBookFound(true);
      } catch (loadError) {
        console.error('Error loading book for editing:', loadError);
        setError('Unable to load book');
      } finally {
        setLoading(false);
      }
    };

    void loadBook();
  }, [id, router, status]);

  const closeEditor = () => {
    if (window.windowControls) {
      window.windowControls.close();
      return;
    }

    if (window.opener) {
      window.close();
    } else {
      router.push(`/read/${id}`);
    }
  };

  const handleCoverSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setEditData((current) => ({ ...current, coverImage: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!editData.title.trim() || !editData.author.trim()) {
      setError('Title and author are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let coverImageUrl = editData.coverImage;
      if (coverFile) {
        const formData = new FormData();
        formData.append('file', coverFile);
        formData.append('type', 'image');

        const uploadResponse = await fetch('/api/uploadthing', {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) throw new Error('Failed to upload cover image');

        const uploadData = await uploadResponse.json();
        if (uploadData.fileUrl) coverImageUrl = uploadData.fileUrl;
      }

      const response = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title.trim(),
          author: editData.author.trim(),
          category: editData.category || 'Other',
          totalPages: editData.totalPages || 0,
          description: editData.description.trim(),
          story: editData.story.trim() || undefined,
          coverColor: editData.coverColor,
          coverImage: coverImageUrl || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update book');
      }

      const updatedBook = await response.json();
      const updateMessage = { type: 'book-updated', bookId: id, book: updatedBook };

      if (window.windowControls) {
        const channel = new BroadcastChannel('shelve-book-updates');
        channel.postMessage(updateMessage);
        window.windowControls.close();
      } else if (window.opener) {
        window.opener.postMessage(
          updateMessage,
          window.location.origin
        );
        window.close();
      } else {
        router.replace(`/read/${id}`);
      }
    } catch (saveError) {
      console.error('Error updating book:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-[#9b9890]" role="status">Loading book...</p>
      </main>
    );
  }

  if (!bookFound) {
    return (
      <main className="page-shell flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-[#9b9890]" role="alert">{error || 'Book not found'}</p>
        <button
          type="button"
          onClick={closeEditor}
          className="rounded-lg border border-[rgba(255,255,255,0.12)] px-4 py-2 text-sm text-[#9b9890] transition-colors hover:bg-[#1a1916] hover:text-[#f0ede8]"
        >
          Close
        </button>
      </main>
    );
  }

  return (
    <main className="page-shell min-h-screen">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-[#f0ede8]">Edit Book</h1>
            <p className="mt-1 text-sm text-[#9b9890]">Update the details in your library.</p>
          </div>
          <button
            type="button"
            onClick={closeEditor}
            aria-label="Close editor"
            className="text-[#5c5a56] transition-colors hover:text-[#9b9890]"
          >
            <X size={20} />
          </button>
        </header>

        <section className="space-y-5 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#1a1916] p-6">
          {error && (
            <div className="rounded-lg border border-[rgba(224,82,82,0.25)] bg-[rgba(224,82,82,0.1)] p-3 text-sm text-[#e05252]" role="alert">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">
              Book Cover
            </label>
            <div className="flex items-center gap-4">
              <div className="relative h-34 w-24 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c]">
                {coverPreview ? (
                  <img src={coverPreview} alt="Book cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className={`h-full w-full bg-linear-to-br ${coverColors.find((color) => color.id === editData.coverColor)?.gradient || 'from-[#253040] to-[#3d4e62]'}`}>
                    <div className="flex h-full items-center justify-center">
                      <span className="px-2 text-center text-xs font-medium text-white/60">
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
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#222119] px-3 py-1.5 text-sm text-[#9b9890] transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-[#f0ede8]"
                >
                  <UploadCloud size={14} />
                  Upload Image
                </button>
                {coverPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="flex items-center gap-2 rounded-lg border border-[rgba(224,82,82,0.25)] bg-[rgba(224,82,82,0.1)] px-3 py-1.5 text-sm text-[#e05252] transition-colors hover:bg-[rgba(224,82,82,0.15)]"
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
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">Title</label>
              <input
                type="text"
                value={editData.title}
                onChange={(event) => setEditData({ ...editData, title: event.target.value })}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] px-3 py-2 text-sm text-[#f0ede8] outline-none transition-colors placeholder:text-[#5c5a56] focus:border-[#c9a96e]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">Author</label>
              <input
                type="text"
                value={editData.author}
                onChange={(event) => setEditData({ ...editData, author: event.target.value })}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] px-3 py-2 text-sm text-[#f0ede8] outline-none transition-colors placeholder:text-[#5c5a56] focus:border-[#c9a96e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">Category</label>
              <select
                value={editData.category}
                onChange={(event) => setEditData({ ...editData, category: event.target.value })}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] px-3 py-2 text-sm text-[#f0ede8] outline-none focus:border-[#c9a96e]"
              >
                <option value="">Select a category</option>
                {['Fantasy', 'Sci-fi', 'Fiction', 'Non-fiction', 'Self-help', 'History', 'Science', 'Biography', 'Philosophy', 'Psychologie'].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">Total Pages</label>
              <input
                type="number"
                value={editData.totalPages}
                onChange={(event) => setEditData({ ...editData, totalPages: parseInt(event.target.value, 10) || 0 })}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] px-3 py-2 text-sm text-[#f0ede8] outline-none transition-colors placeholder:text-[#5c5a56] focus:border-[#c9a96e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">Description</label>
              <textarea
                value={editData.description}
                onChange={(event) => setEditData({ ...editData, description: event.target.value })}
                rows={4}
                className="w-full resize-none rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] px-3 py-2 text-sm text-[#f0ede8] outline-none transition-colors placeholder:text-[#5c5a56] focus:border-[#c9a96e]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">Story (optional)</label>
              <textarea
                value={editData.story}
                onChange={(event) => setEditData({ ...editData, story: event.target.value })}
                rows={4}
                className="w-full resize-none rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] px-3 py-2 text-sm text-[#f0ede8] outline-none transition-colors placeholder:text-[#5c5a56] focus:border-[#c9a96e]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">
              Cover Color (if no image)
            </label>
            <div className="flex flex-wrap gap-2">
              {coverColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  aria-label={`Select ${color.id.replace('c-', '')} cover color`}
                  aria-pressed={editData.coverColor === color.id && !coverPreview}
                  onClick={() => setEditData({ ...editData, coverColor: color.id })}
                  className={`h-11 w-8 rounded-[3px_5px_5px_3px] border-2 bg-linear-to-br ${color.gradient} transition-colors ${
                    editData.coverColor === color.id && !coverPreview
                      ? 'border-[#c9a96e]'
                      : 'border-transparent hover:border-[rgba(255,255,255,0.12)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[rgba(255,255,255,0.07)] pt-5">
            <button
              type="button"
              onClick={closeEditor}
              className="px-4 py-2 text-sm text-[#9b9890] transition-colors hover:text-[#f0ede8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#c9a96e] px-4 py-2 text-sm font-medium text-[#1a1510] transition-colors hover:bg-[#d4b47a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
