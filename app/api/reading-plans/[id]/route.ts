import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import { authOptions } from '@/app/lib/auth';
import ReadingPlan from '@/app/models/ReadingPlan';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Reading plan not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid reading plan update' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || typeof (body as { isActive?: unknown }).isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid reading plan update' }, { status: 400 });
    }

    await connectDB();
    const plan = await ReadingPlan.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { isActive: (body as { isActive: boolean }).isActive } },
      { new: true, runValidators: true }
    );
    if (!plan) {
      return NextResponse.json({ error: 'Reading plan not found' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating reading plan:', error);
    return NextResponse.json({ error: 'Failed to update reading plan' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Reading plan not found' }, { status: 404 });
    }

    await connectDB();
    const plan = await ReadingPlan.findOneAndDelete({ _id: id, userId: session.user.id });
    if (!plan) {
      return NextResponse.json({ error: 'Reading plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reading plan:', error);
    return NextResponse.json({ error: 'Failed to delete reading plan' }, { status: 500 });
  }
}
