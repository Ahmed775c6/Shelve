'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { UploadCloud, X } from 'lucide-react';

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '',
    totalPages: '',
    description: '',
    story: '',
    coverColor: 'c-blue',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }
  }, [status]);

  useEffect(() => {
    if (!coverPreview) return;
    return () => URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  if (status === 'loading') {
    return (
      <div className="page-shell flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedCover = e.target.files?.[0];
    if (!selectedCover) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedCover.type)) {
      setUploadError('Cover images must be JPG, PNG, or WebP.');
      e.target.value = '';
      return;
    }

    if (selectedCover.size > 5 * 1024 * 1024) {
      setUploadError('Cover images must be 5MB or smaller.');
      e.target.value = '';
      return;
    }

    setUploadError('');
    setCoverFile(selectedCover);
    setCoverPreview(URL.createObjectURL(selectedCover));
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const uploadResponse = await fetch('/api/uploadthing', {
        method: 'POST',
        body: fd,
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Failed to upload book file.');
      }

      let coverImage: string | undefined;
      if (coverFile) {
        const coverData = new FormData();
        coverData.append('file', coverFile);
        const coverResponse = await fetch('/api/uploadthing', {
          method: 'POST',
          body: coverData,
        });
        const coverResult = await coverResponse.json();
        if (!coverResponse.ok) {
          throw new Error(coverResult.error || 'Failed to upload cover image.');
        }
        coverImage = coverResult.fileUrl;
      }

      const bookData = {
        title: formData.title,
        author: formData.author,
        category: formData.category,
        totalPages: parseInt(formData.totalPages) || 0,
        description: formData.description.trim(),
        story: formData.story.trim() || undefined,
        coverColor: formData.coverColor,
        coverImage,
        fileUrl: uploadResult.fileUrl,
        fileType: file.type.split('/')[1],
        status: 'unread',
      };

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      if (response.ok) {
        router.push('/library');
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to add book to your library.');
      }
    } catch (error) {
      console.error('Error uploading book:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload book.');
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="page-shell">
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">Upload a book</h1>
        <p className="text-sm text-[#9b9890]">PDF, ePub, or MOBI — up to 50MB</p>
      </div>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[1fr_360px]">
        <div>
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all bg-[#1a1916] sm:p-12 ${
              dragActive 
                ? 'border-[#c9a96e] bg-[rgba(201,169,110,0.1)]' 
                : 'border-[rgba(255,255,255,0.12)] hover:border-[#c9a96e] hover:bg-[rgba(201,169,110,0.05)]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.epub,.mobi"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="text-5xl mb-3 opacity-60">📖</div>
            <div className="text-sm font-medium text-[#f0ede8] mb-1">
              {file ? file.name : 'Drop your book file here'}
            </div>
            <div className="text-xs text-[#5c5a56]">
              {file 
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                : 'or click to browse · PDF, ePub, MOBI supported'
              }
            </div>
            {file && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-3 p-1 bg-[rgba(224,82,82,0.1)] text-[#e05252] rounded-full hover:bg-[rgba(224,82,82,0.15)] transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. The Hobbit"
                  required
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="e.g. J.R.R. Tolkien"
                  required
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                />
              </div>
            </div>

            {uploadError && (
              <p role="alert" className="text-sm text-[#e05252]">
                {uploadError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
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
                      <option value="Psychologie">Psychologie</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Total pages
                </label>
                <input
                  type="number"
                  value={formData.totalPages}
                  onChange={(e) => setFormData({ ...formData, totalPages: e.target.value })}
                  placeholder="e.g. 310"
                  required
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A brief overview of the book"
                  rows={3}
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                  Story (optional)
                </label>
                <textarea
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  placeholder="Tell the story or premise of this book"
                  rows={4}
                  className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                Cover color
              </label>
              <div className="flex gap-2 flex-wrap">
                {coverColors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, coverColor: color.id })}
                    aria-label={`${color.id.replace('c-', '')} cover color`}
                    title={color.id.replace('c-', '')}
                    className={`w-8 h-11 rounded-[3px_5px_5px_3px] bg-gradient-to-br ${color.gradient} border-2 transition-colors ${
                      formData.coverColor === color.id
                        ? 'border-[#c9a96e]'
                        : 'border-transparent hover:border-[rgba(255,255,255,0.12)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5c5a56]">
                Cover image (optional · JPG, PNG, WebP · up to 5MB)
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Selected book cover preview"
                    className="h-20 w-14 rounded border border-[rgba(255,255,255,0.12)] object-cover"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#1a1916] px-3 py-2 text-sm text-[#f0ede8] transition-colors hover:border-[#c9a96e]"
                  >
                    <UploadCloud size={15} />
                    {coverPreview ? 'Change cover' : 'Upload cover'}
                  </button>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(224,82,82,0.25)] px-3 py-2 text-sm text-[#e05252] transition-colors hover:bg-[rgba(224,82,82,0.1)]"
                    >
                      <X size={15} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-2.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Add to library'}
            </button>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg p-6 text-center">
          <div className="text-[11px] text-[#5c5a56] uppercase tracking-wider mb-4">Preview</div>
          <div className={`w-[100px] h-[148px] mx-auto relative overflow-hidden rounded-[3px_7px_7px_3px] ${
            coverPreview ? '' : `bg-gradient-to-br ${coverColors.find((color) => color.id === formData.coverColor)?.gradient}`
          }`}>
            <div className="absolute -left-3 top-0.5 w-3 h-[146px] bg-[#1a222e] rounded-l-[2px]"></div>
            {coverPreview && (
              <img src={coverPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-end justify-center pb-3">
              <div className="text-[11px] text-white/80 font-medium max-w-[80px] leading-tight drop-shadow">
                {formData.title || 'Your book title'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium text-[#f0ede8]">
              {formData.title || 'Title'}
            </div>
            <div className="text-xs text-[#9b9890]">
              {formData.author || 'Author'} · {formData.category || 'Category'}
            </div>
          </div>
          <div className="mt-4 text-[11px] text-[#5c5a56]">
            Added today · 0 pages read
          </div>
        </div>
      </div>
    </div>
  );
}