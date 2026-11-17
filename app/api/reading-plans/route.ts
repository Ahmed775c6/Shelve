import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongodb';
import { authOptions } from '@/app/lib/auth';
import Book from '@/app/models/book';
import ReadingPlan from '@/app/models/ReadingPlan';

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidPlanInput(body: Record<string, unknown>) {
  const bookIds = body.bookIds;
  const daysOfWeek = body.daysOfWeek;

  return (
    typeof body.title === 'string' &&
    body.title.trim().length > 0 &&
    body.title.trim().length <= 80 &&
    Array.isArray(bookIds) &&
    bookIds.length > 0 &&
    bookIds.every((id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) &&
    new Set(bookIds).size === bookIds.length &&
    isDateOnly(body.startDate) &&
    isDateOnly(body.endDate) &&
    body.endDate >= body.startDate &&
    typeof body.time === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(body.time) &&
    Array.isArray(daysOfWeek) &&
    daysOfWeek.length > 0 &&
    daysOfWeek.every((day) => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) &&
    typeof body.reminderEnabled === 'boolean'
  );
}

async function serializePlans<T extends { bookIds: mongoose.Types.ObjectId[] }>(plans: T[], userId: string) {
  const ids = plans.flatMap((plan) => plan.bookIds);
  const books = ids.length
    ? await Book.find({ _id: { $in: ids }, userId })
        .select('title author totalPages currentPage status coverColor coverImage')
        .lean()
    : [];
  const booksById = new Map(books.map((book) => [String(book._id), book]));

  return plans.map((plan) => {
    const planBooks = plan.bookIds.flatMap((id) => {
      const book = booksById.get(String(id));
      return book ? [book] : [];
    });

    return {
      ...plan,
      bookIds: planBooks.map((book) => String(book._id)),
      books: planBooks,
    };
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const plans = await ReadingPlan.find({ userId: session.user.id })
      .sort({ startDate: 1, time: 1 })
      .lean();

    return NextResponse.json(await serializePlans(plans, session.user.id));
  } catch (error) {
    console.error('Error fetching reading plans:', error);
    return NextResponse.json({ error: 'Failed to fetch reading plans' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid reading plan' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || !isValidPlanInput(body as Record<string, unknown>)) {
      return NextResponse.json({ error: 'Invalid reading plan' }, { status: 400 });
    }

    const input = body as {
      title: string;
      bookIds: string[];
      startDate: string;
      endDate: string;
      time: string;
      daysOfWeek: number[];
      reminderEnabled: boolean;
    };

    await connectDB();
    const books = await Book.find({
      _id: { $in: input.bookIds },
      userId: session.user.id,
    }).select('_id');
    if (books.length !== input.bookIds.length) {
      return NextResponse.json({ error: 'One or more selected books were not found' }, { status: 400 });
    }

    const plan = await ReadingPlan.create({
      ...input,
      daysOfWeek: [...new Set(input.daysOfWeek)],
      userId: session.user.id,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Error creating reading plan:', error);
    return NextResponse.json({ error: 'Failed to create reading plan' }, { status: 500 });
  }
}
