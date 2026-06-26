import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Writing from '@/app/models/Writing';
import { authOptions } from '@/app/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const writings = await Writing.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(writings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch writings' }, { status: 500 });
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

    const writing = new Writing({
      ...data,
      userId: session.user.id,
    });

    await writing.save();
    return NextResponse.json(writing, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create writing' }, { status: 500 });
  }
}