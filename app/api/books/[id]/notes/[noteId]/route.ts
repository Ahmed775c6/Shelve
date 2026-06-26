import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import BookNote from '@/app/models/BookNote';
import { authOptions } from '@/app/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId, noteId } = await params;
    const { content, page, isPrivate } = await req.json();

    await connectDB();

    const book = await Book.findOne({ _id: bookId, userId: session.user.id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const note = await BookNote.findOne({ _id: noteId, bookId });
    if (!note || String(note.userId) !== String(session.user.id)) {
      return NextResponse.json(
        { error: 'Note not found or unauthorized' },
        { status: 404 }
      );
    }

    if (content !== undefined) note.content = content.trim();
    if (page !== undefined) note.page = page || undefined;
    if (isPrivate !== undefined) note.isPrivate = isPrivate;
    note.updatedAt = new Date();

    await note.save();
    await note.populate('userId', 'name email');

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId, noteId } = await params;
    await connectDB();

    const book = await Book.findOne({ _id: bookId, userId: session.user.id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const result = await BookNote.findOneAndDelete({ _id: noteId, bookId, userId: session.user.id });

    if (!result) {
      return NextResponse.json(
        { error: 'Note not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
