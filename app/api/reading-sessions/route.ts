import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
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
      .populate('bookId', 'title author')
      .sort({ lastReadAt: -1 });

    return NextResponse.json(sessions);
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

    const data = await req.json();
    await connectDB();

    const readingSession = new ReadingSession({
      ...data,
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