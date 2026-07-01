'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { IWriting } from '../../models/Writing';
import { 
  Bold, Italic, Underline, Strikethrough, 
  Heading1, Heading2, Heading3, Heading4,
  Quote, List, ListOrdered, Sparkles, Save, Plus, Trash2, 
  Undo, Redo, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Link as LinkIcon, Image as ImageIcon, 
  Code, Minus, Highlighter, Palette, Type, 
  Check, X, FileText, BookOpen, Superscript, Subscript,
  RemoveFormatting, Copy, Scissors, ClipboardPaste,
  Table as TableIcon, Eye, EyeOff, Maximize2, Minimize2,
  TextQuote, Pilcrow, ListChecks,
  Indent, Outdent, Baseline, CircleDot,
  Square, Circle, Diamond, Hash,
  ArrowUpDown, AlignHorizontalSpaceBetween,
  CaseUpper, CaseLower, CaseSensitive,
  WrapText, Ruler, LetterText
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import TextAlignExtension from '@tiptap/extension-text-align';
import ColorExtension from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import HighlightExtension from '@tiptap/extension-highlight';
import FontFamilyExtension from '@tiptap/extension-font-family';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import HorizontalRuleExtension from '@tiptap/extension-horizontal-rule';
import CodeBlockExtension from '@tiptap/extension-code-block';
import BlockquoteExtension from '@tiptap/extension-blockquote';
import BulletListExtension from '@tiptap/extension-bullet-list';
import OrderedListExtension from '@tiptap/extension-ordered-list';
import ListItemExtension from '@tiptap/extension-list-item';
import { Strike } from '@tiptap/extension-strike';
import { Superscript as TiptapSuperscript } from '@tiptap/extension-superscript';
import { Subscript as TiptapSubscript } from '@tiptap/extension-subscript';
import { Table as TiptapTable, TableRow as TiptapTableRow, TableCell as TiptapTableCell, TableHeader as TiptapTableHeader } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Typography } from '@tiptap/extension-typography';

// Color options
const TEXT_COLORS = [
  '#f0ede8', '#9b9890', '#5c5a56', '#c9a96e', 
  '#e05252', '#4a9e6b', '#8b7dd8', '#60a5fa',
  '#f472b6', '#fbbf24', '#fb923c', '#34d399',
  '#a78bfa', '#f87171', '#6ee7b7', '#93c5fd',
];

const HIGHLIGHT_COLORS = [
  '#fbbf24', '#34d399', '#60a5fa', '#f472b6',
  '#a78bfa', '#f87171', '#fb923c', '#9ca3af',
];

const FONT_FAMILIES = [
  { name: 'Default', value: 'inherit' },
  { name: 'Serif', value: 'serif' },
  { name: 'Sans Serif', value: 'sans-serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
];

const FONT_SIZES = [
  { label: 'XS', value: '0.75rem' },
  { label: 'SM', value: '0.875rem' },
  { label: 'Base', value: '1rem' },
  { label: 'LG', value: '1.125rem' },
  { label: 'XL', value: '1.25rem' },
  { label: '2XL', value: '1.5rem' },
  { label: '3XL', value: '1.875rem' },
  { label: '4XL', value: '2.25rem' },
];

export default function WritePage() {
  const { data: session, status } = useSession();
  const [writings, setWritings] = useState<IWriting[]>([]);
  const [selectedWriting, setSelectedWriting] = useState<IWriting | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  const [content, setContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize TipTap editor with all extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            style: 'white-space: pre-wrap;',
          },
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      UnderlineExtension,
      Strike,
      TiptapSuperscript,
      TiptapSubscript,
      LinkExtension.configure({
        openOnClick: false,
        linkOnPaste: true,
        autolink: true,
      }),
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlignExtension.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      ColorExtension,
      TextStyle,
      HighlightExtension.configure({
        multicolor: true,
      }),
      FontFamilyExtension,
      PlaceholderExtension.configure({
        placeholder: 'Start writing your story, thoughts, or notes...',
        includeChildren: true,
        emptyNodeClass: 'is-editor-empty',
      }),
      HorizontalRuleExtension,
      CodeBlockExtension,
      BlockquoteExtension,
      BulletListExtension,
      OrderedListExtension,
      ListItemExtension,
      TiptapTable.configure({
        resizable: true,
      }),
      TiptapTableRow,
      TiptapTableCell,
      TiptapTableHeader,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Typography,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
        style: 'white-space: pre-wrap;',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
      setCharacterCount(text.length);
      setReadTime(Math.ceil(words.length / 200));
      
      const html = editor.getHTML();
      setContent(html);
    },
  });

  // Update editor content when switching writings
  useEffect(() => {
    if (editor && selectedWriting) {
      editor.commands.setContent(selectedWriting.content || '');
    }
  }, [selectedWriting, editor]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    const fetchWritings = async () => {
      try {
        const response = await fetch('/api/writings');
        const data = await response.json();
        const writingsArray = Array.isArray(data) ? data : [];
        setWritings(writingsArray);
        if (writingsArray.length > 0) {
          setSelectedWriting(writingsArray[0]);
          setTitle(writingsArray[0].title);
        }
      } catch (error) {
        console.error('Error fetching writings:', error);
        setWritings([]);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchWritings();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading your writings...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const handleSelectWriting = (writing: IWriting) => {
    setSelectedWriting(writing);
    setTitle(writing.title);
    if (editor) {
      editor.commands.setContent(writing.content || '');
    }
  };

  const handleSave = async () => {
    if (!selectedWriting) return;
    setSaving(true);

    try {
      const html = editor?.getHTML() || '';
      const response = await fetch(`/api/writings/${selectedWriting._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          content: html,
          wordCount,
          characterCount,
          readTime,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWritings(writings.map(w => 
          w._id === updated._id ? updated : w
        ));
        setSelectedWriting(updated);
        showToast('Writing saved successfully!');
      }
    } catch (error) {
      console.error('Error saving writing:', error);
      showToast('Failed to save writing');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const response = await fetch('/api/writings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: '' }),
      });

      if (response.ok) {
        const newWriting = await response.json();
        setWritings([newWriting, ...writings]);
        setSelectedWriting(newWriting);
        setTitle('Untitled');
        editor?.commands.setContent('');
        setWordCount(0);
        setCharacterCount(0);
        setReadTime(0);
      }
    } catch (error) {
      console.error('Error creating writing:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedWriting || !confirm('Delete this entry?')) return;

    try {
      const response = await fetch(`/api/writings/${selectedWriting._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const newWritings = writings.filter(w => w._id !== selectedWriting._id);
        setWritings(newWritings);
        if (newWritings.length > 0) {
          setSelectedWriting(newWritings[0]);
          setTitle(newWritings[0].title);
          editor?.commands.setContent(newWritings[0].content || '');
        } else {
          setSelectedWriting(null);
          setTitle('');
          editor?.commands.setContent('');
        }
      }
    } catch (error) {
      console.error('Error deleting writing:', error);
    }
  };

  const handleAIAssist = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    try {
      const response = await fetch('/api/ai/writing-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          context: editor?.getText() || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        editor?.chain().focus().insertContent(data.content).run();
        setAiPrompt('');
        setShowAIModal(false);
        showToast('AI suggestion inserted!');
      }
    } catch (error) {
      console.error('Error with AI assist:', error);
      showToast('Failed to get AI assistance');
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleFullscreen = () => {
    if (!editorRef.current) return;
    if (!document.fullscreenElement) {
      editorRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-[#222119] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-3 text-sm text-[#f0ede8] z-50 animate-in slide-in-from-bottom-2';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    active, 
    children, 
    title,
    disabled = false
  }: { 
    onClick: () => void; 
    active?: boolean; 
    children: React.ReactNode; 
    title?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active 
          ? 'bg-[rgba(201,169,110,0.15)] text-[#c9a96e]' 
          : 'text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119]'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  // Color Picker component
  const ColorPicker = ({ 
    colors, 
    onSelect, 
    currentColor,
    onClose 
  }: { 
    colors: string[]; 
    onSelect: (color: string) => void; 
    currentColor?: string;
    onClose: () => void;
  }) => (
    <div className="color-picker-dropdown" onMouseLeave={onClose}>
      {colors.map((color) => (
        <button
          key={color}
          style={{ backgroundColor: color }}
          className={currentColor === color ? 'active' : ''}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );

  // Font Family Dropdown
  const FontFamilyDropdown = ({ onClose }: { onClose: () => void }) => (
    <div className="toolbar-dropdown-content" onMouseLeave={onClose}>
      {FONT_FAMILIES.map((font) => (
        <button
          key={font.value}
          className="toolbar-dropdown-item"
          onClick={() => {
            editor?.chain().focus().setFontFamily(font.value).run();
            onClose();
          }}
          style={{ fontFamily: font.value }}
        >
          {font.name}
        </button>
      ))}
    </div>
  );

  // Font Size Dropdown
  const FontSizeDropdown = ({ onClose }: { onClose: () => void }) => (
    <div className="toolbar-dropdown-content" onMouseLeave={onClose}>
      {FONT_SIZES.map((size) => (
        <button
          key={size.value}
          className="toolbar-dropdown-item"
          onClick={() => {
            editor?.chain().focus().setFontSize(size.value).run();
            onClose();
          }}
          style={{ fontSize: size.value }}
        >
          {size.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="page-shell" ref={editorRef}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">My writings</h1>
          <p className="text-sm text-[#9b9890]">Your personal notes, essays, and thoughts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222119] text-[#9b9890] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm hover:bg-[#2a2926] transition-colors"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors"
          >
            <Plus size={14} />
            New entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5 min-h-[calc(100vh-200px)]">
        {/* Writing List */}
        <div className="border-r border-[rgba(255,255,255,0.07)] pr-5 overflow-y-auto max-h-[calc(100vh-200px)]">
          {writings.length > 0 ? (
            writings.map((writing) => (
              <div
                key={writing._id}
                onClick={() => handleSelectWriting(writing)}
                className={`p-3 rounded-lg cursor-pointer transition-colors mb-1.5 ${
                  selectedWriting?._id === writing._id
                    ? 'bg-[#222119] border border-[rgba(255,255,255,0.07)]'
                    : 'hover:bg-[#1a1916]'
                }`}
              >
                <div className="text-sm font-medium text-[#f0ede8] mb-0.5">
                  {writing.title || 'Untitled'}
                </div>
                <div className="text-xs text-[#5c5a56]">
                  {formatDate(writing.createdAt)}
                </div>
                <div className="text-xs text-[#5c5a56] mt-1 line-clamp-2">
                  {writing.content ? 
                    writing.content.replace(/<[^>]*>/g, '').substring(0, 60) + '...' 
                    : 'No content yet...'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-[#5c5a56]">
              <div className="text-3xl mb-2 opacity-40">✍️</div>
              <div className="text-sm text-[#9b9890]">No writings yet</div>
              <div className="text-xs">Start writing your thoughts</div>
            </div>
          )}
        </div>

        {/* Editor */}
        {selectedWriting ? (
          <div className={`flex flex-col bg-[#1a1916] rounded-xl border border-[rgba(255,255,255,0.07)] ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''}`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(255,255,255,0.07)]">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled..."
                className="flex-1 bg-transparent border-none outline-none font-serif text-xl text-[#f0ede8] placeholder:text-[#5c5a56]"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(224,82,82,0.1)] text-[#e05252] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm hover:bg-[rgba(224,82,82,0.15)] transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[rgba(255,255,255,0.07)] text-xs text-[#5c5a56]">
              <span className="flex items-center gap-1">
                <FileText size={12} />
                {wordCount} words
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {characterCount} characters
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[10px]">⚡</span>
                {readTime} min read
              </span>
            </div>

            {/* Extended Toolbar */}
            <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-[rgba(255,255,255,0.07)] bg-[#0f0e0c] max-h-[120px] overflow-y-auto">
              {/* Undo/Redo */}
              <div className="toolbar-group">
                <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo">
                  <Undo size={14} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo">
                  <Redo size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Text Formatting */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleBold().run()} 
                  active={editor?.isActive('bold')}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleItalic().run()} 
                  active={editor?.isActive('italic')}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleUnderline().run()} 
                  active={editor?.isActive('underline')}
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleStrike().run()} 
                  active={editor?.isActive('strike')}
                  title="Strikethrough"
                >
                  <Strikethrough size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Superscript/Subscript */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleSuperscript().run()} 
                  active={editor?.isActive('superscript')}
                  title="Superscript"
                >
                  <Superscript size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleSubscript().run()} 
                  active={editor?.isActive('subscript')}
                  title="Subscript"
                >
                  <Subscript size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Headings */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} 
                  active={editor?.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  <Heading1 size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} 
                  active={editor?.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  <Heading2 size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} 
                  active={editor?.isActive('heading', { level: 3 })}
                  title="Heading 3"
                >
                  <Heading3 size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()} 
                  active={editor?.isActive('heading', { level: 4 })}
                  title="Heading 4"
                >
                  <Heading4 size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Alignment */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()} 
                  active={editor?.isActive({ textAlign: 'left' })}
                  title="Align Left"
                >
                  <AlignLeft size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()} 
                  active={editor?.isActive({ textAlign: 'center' })}
                  title="Align Center"
                >
                  <AlignCenter size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()} 
                  active={editor?.isActive({ textAlign: 'right' })}
                  title="Align Right"
                >
                  <AlignRight size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().setTextAlign('justify').run()} 
                  active={editor?.isActive({ textAlign: 'justify' })}
                  title="Justify"
                >
                  <AlignJustify size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Lists */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleBulletList().run()} 
                  active={editor?.isActive('bulletList')}
                  title="Bullet List"
                >
                  <List size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()} 
                  active={editor?.isActive('orderedList')}
                  title="Numbered List"
                >
                  <ListOrdered size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleTaskList().run()} 
                  active={editor?.isActive('taskList')}
                  title="Task List"
                >
                  <ListChecks size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Blocks */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()} 
                  active={editor?.isActive('blockquote')}
                  title="Quote"
                >
                  <Quote size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()} 
                  active={editor?.isActive('codeBlock')}
                  title="Code Block"
                >
                  <Code size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()} 
                  title="Horizontal Rule"
                >
                  <Minus size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Links & Media */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => {
                    const url = window.prompt('Enter URL:');
                    if (url) {
                      editor?.chain().focus().setLink({ href: url }).run();
                    }
                  }} 
                  active={editor?.isActive('link')}
                  title="Link (Ctrl+K)"
                >
                  <LinkIcon size={14} />
                </ToolbarButton>
                <ToolbarButton 
                  onClick={() => {
                    const url = window.prompt('Enter image URL:');
                    if (url) {
                      editor?.chain().focus().setImage({ src: url }).run();
                    }
                  }} 
                  title="Image"
                >
                  <ImageIcon size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Table */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => {
                    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  }} 
                  title="Insert Table"
                >
                  <TableIcon size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* Font Family */}
              <div className="toolbar-group relative toolbar-dropdown">
                <button
                  className="p-1.5 rounded text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119] transition-colors flex items-center gap-1"
                  onMouseEnter={() => setShowFontFamily(true)}
                  title="Font Family"
                >
                  <Type size={14} />
                  <span className="text-xs">▼</span>
                </button>
                {showFontFamily && (
                  <FontFamilyDropdown onClose={() => setShowFontFamily(false)} />
                )}
              </div>

              {/* Font Size */}
              <div className="toolbar-group relative toolbar-dropdown">
                <button
                  className="p-1.5 rounded text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119] transition-colors flex items-center gap-1"
                  onMouseEnter={() => setShowFontSize(true)}
                  title="Font Size"
                >
                  <Type size={14} />
                  <span className="text-xs">▼</span>
                </button>
                {showFontSize && (
                  <FontSizeDropdown onClose={() => setShowFontSize(false)} />
                )}
              </div>

              {/* Text Color */}
              <div className="toolbar-group relative">
                <button
                  className="p-1.5 rounded text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119] transition-colors relative"
                  onMouseEnter={() => setShowColorPicker(true)}
                  title="Text Color"
                >
                  <Palette size={14} />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-current"></span>
                </button>
                {showColorPicker && (
                  <ColorPicker
                    colors={TEXT_COLORS}
                    onSelect={(color) => {
                      editor?.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    currentColor={editor?.getAttributes('textStyle').color}
                    onClose={() => setShowColorPicker(false)}
                  />
                )}
              </div>

              {/* Highlight */}
              <div className="toolbar-group relative">
                <button
                  className="p-1.5 rounded text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119] transition-colors relative"
                  onMouseEnter={() => setShowHighlightPicker(true)}
                  title="Highlight"
                >
                  <Highlighter size={14} />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-yellow-400"></span>
                </button>
                {showHighlightPicker && (
                  <ColorPicker
                    colors={HIGHLIGHT_COLORS}
                    onSelect={(color) => {
                      editor?.chain().focus().setHighlight({ color }).run();
                      setShowHighlightPicker(false);
                    }}
                    currentColor={editor?.getAttributes('highlight').color}
                    onClose={() => setShowHighlightPicker(false)}
                  />
                )}
              </div>

              <div className="toolbar-separator"></div>

              {/* Clear Formatting */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => editor?.chain().focus().unsetAllMarks().run()} 
                  title="Clear Formatting"
                >
                  <RemoveFormatting size={14} />
                </ToolbarButton>
              </div>

              <div className="toolbar-separator"></div>

              {/* AI Assist */}
              <div className="toolbar-group">
                <ToolbarButton 
                  onClick={() => setShowAIModal(true)} 
                  title="AI Assist"
                >
                  <Sparkles size={14} />
                </ToolbarButton>
              </div>
            </div>

            {/* Editor Content */}
            <div className={`flex-1 p-6 ${isFullscreen ? 'min-h-[calc(100vh-200px)]' : 'min-h-[500px]'}`}>
              <EditorContent 
                editor={editor} 
                className="prose prose-invert max-w-none min-h-[400px] focus:outline-none"
              />

            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-[#5c5a56] bg-[#1a1916] rounded-xl border border-[rgba(255,255,255,0.07)]">
            <div className="text-center">
              <div className="text-5xl mb-3 opacity-40">📝</div>
              <div className="text-sm text-[#9b9890]">Select a writing or create a new one</div>
            </div>
          </div>
        )}
      </div>

      {/* AI Assist Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.12)] rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-[#f0ede8]">AI Writing Assistant</h3>
              <button 
                onClick={() => setShowAIModal(false)}
                className="text-[#5c5a56] hover:text-[#9b9890] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="What would you like to write about? Expand on a thought, generate ideas, continue a paragraph..."
              className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors resize-none h-32"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-2 text-sm text-[#9b9890] hover:text-[#f0ede8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAIAssist}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50"
              >
                <Sparkles size={16} />
                {aiGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}