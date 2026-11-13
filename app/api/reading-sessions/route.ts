import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import ReadingSession from '@/app/models/ReadingSession';
import { authOptions } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all reading sessions for the user
    const sessions = await ReadingSession.find({
      userId: session.user.id,
    })
      .populate({
        path: 'bookId',
        match: { userId: session.user.id },
        select: 'title author',
      })
      .sort({ lastReadAt: -1 });

    return NextResponse.json(sessions.filter((readingSession) => readingSession.bookId));
  } catch (error) {
    console.error('Error fetching reading sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading sessions' },
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

    const { bookId, currentPage = 0, pagesRead = 0 } = await req.json();
    if (
      typeof bookId !== 'string' ||
      !Number.isInteger(currentPage) ||
      currentPage < 0 ||
      !Number.isInteger(pagesRead) ||
      pagesRead < 0
    ) {
      return NextResponse.json({ error: 'Invalid reading session' }, { status: 400 });
    }

    await connectDB();

    const book = await Book.findOne({ _id: bookId, userId: session.user.id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const readingSession = new ReadingSession({
      bookId,
      currentPage,
      pagesRead,
      userId: session.user.id,
    });

    await readingSession.save();
    return NextResponse.json(readingSession, { status: 201 });
  } catch (error) {
    console.error('Error creating reading session:', error);
    return NextResponse.json(
      { error: 'Failed to create reading session' },
      { status: 500 }
    );
  }
}