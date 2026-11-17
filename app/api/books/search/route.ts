import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import { authOptions } from '@/app/lib/auth';
import Book from '@/app/models/book';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const term = request.nextUrl.searchParams.get('q')?.trim().slice(0, 100) ?? '';
    if (!term) {
      return NextResponse.json([]);
    }

    await connectDB();

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escapedTerm, 'i');
    const books = await Book.find({
      userId: session.user.id,
      $or: [
        { title: expression },
        { author: expression },
        { category: expression },
        { tags: expression },
      ],
    })
      .select('title author category coverImage status')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    return NextResponse.json(books);
  } catch (error) {
    console.error('Failed to search books:', error);
    return NextResponse.json({ error: 'Failed to search books' }, { status: 500 });
  }
}
