import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import { authOptions } from '@/app/lib/auth';

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const book = await Book.findOne({ _id: id, userId: session.user.id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('Book GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: any }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    await connectDB();

    const updated = await Book.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: data },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Book PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}
