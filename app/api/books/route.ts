import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import { authOptions } from '@/app/lib/auth';


export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    await connectDB();
    
    const query: any = { userId: session.user.id };
    if (status) {
      query.status = status;
    }

    const books = await Book.find(query).sort({ 
      status: -1,
      updatedAt: -1 
    });

    return NextResponse.json(books);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
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

    const book = new Book({
      ...data,
      userId: session.user.id,
    });

    await book.save();
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}