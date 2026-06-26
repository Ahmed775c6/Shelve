import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import ReadingSession from '@/app/models/ReadingSession';
import { authOptions } from '@/app/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPage } = await req.json();
    const { bookId } = await params;

    await connectDB();

    const currentBook = await Book.findOne({ _id: bookId, userId: session.user.id });
    if (!currentBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const previousPage = currentBook.currentPage || 0;
    currentBook.currentPage = currentPage;
    currentBook.status = 'reading';
    if (!currentBook.startedAt) {
      currentBook.startedAt = new Date();
    }

    if (currentPage >= currentBook.totalPages) {
      currentBook.status = 'archived';
      currentBook.finishedAt = new Date();
      currentBook.currentPage = currentBook.totalPages;
    }

    await currentBook.save();

    const pagesRead = Math.max(0, currentPage - previousPage);

    const sessionRecord = await ReadingSession.findOneAndUpdate(
      { bookId, userId: session.user.id },
      {
        $set: {
          currentPage,
          lastReadAt: new Date(),
        },
        $inc: {
          pagesRead,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      book: currentBook,
      session: sessionRecord,
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    await connectDB();

    const book = await Book.findOne({
      _id: bookId,
      userId: session.user.id,
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Get reading sessions
    const sessions = await ReadingSession.find({
      bookId,
      userId: session.user.id,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      book,
      sessions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}