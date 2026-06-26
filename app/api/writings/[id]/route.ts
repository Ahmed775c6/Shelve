import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import Writing from '@/app/models/Writing';
import { authOptions } from '@/app/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const writing = await Writing.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!writing) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    return NextResponse.json(writing);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch writing' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    await connectDB();
    const { id } = await params;

    const writing = await Writing.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: data },
      { new: true }
    );

    if (!writing) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    return NextResponse.json(writing);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update writing' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const writing = await Writing.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!writing) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete writing' }, { status: 500 });
  }
}