import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import BookNote from '@/app/models/BookNote';
import { authOptions } from '@/app/lib/auth';


export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookId = req.nextUrl.searchParams.get('bookId');
    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    await connectDB();
    const book = await Book.findOne({ _id: bookId, userId: session.user.id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Get all notes for this book (both public and user's private notes)
    const notes = await BookNote.find({
      bookId,
      $or: [
        { userId: session.user.id },
        { isPrivate: false },
      ],
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookId = req.nextUrl.searchParams.get('bookId');
    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const { content, page, isPrivate } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const book = await Book.findOne({ _id: bookId, userId: session.user.id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const note = new BookNote({
      bookId,
      userId: session.user.id,
      content: content.trim(),
      page: page || undefined,
      isPrivate: isPrivate ?? true,
    });

    await note.save();
    
    // Populate user info
    await note.populate('userId', 'name email');

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}