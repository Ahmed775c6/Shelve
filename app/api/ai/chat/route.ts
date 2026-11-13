import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import anthropic from '@/app/lib/anthropic';
import { authOptions } from '@/app/lib/auth';
import Book from '@/app/models/book';
import connectDB from '@/app/lib/mongodb';

function isChatMessage(value: unknown): value is { role: 'user' | 'assistant'; content: string } {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string'
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const message = body?.message;
    const history = body?.history;
    if (
      typeof message !== 'string' ||
      !message.trim() ||
      !Array.isArray(history) ||
      !history.every(isChatMessage)
    ) {
      return NextResponse.json({ error: 'A message and conversation history are required' }, { status: 400 });
    }

    await connectDB();
    const books = await Book.find({ userId: session.user.id })
      .select('title author category status currentPage totalPages');

    // Build conversation context
    const messages = history.map(({ role, content }) => ({ role, content }));
    while (messages[0]?.role === 'assistant') {
      messages.shift();
    }

    messages.push({
      role: 'user',
      content: message,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      system: `You are a knowledgeable literary assistant helping a reader with their personal library.
        The reader's books: ${books.map((book) => `${book.title} by ${book.author} (${book.category}, ${book.status})`).join('; ')}
        You can summarize books, explain themes, answer questions about literature, and give personalized book recommendations.
        Be thoughtful, detailed, and engaging in your responses.`,
      messages: [
        ...messages,
      ],
    });

    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    if (!answer.trim()) {
      throw new Error('AI response did not contain text');
    }

    return NextResponse.json({
      response: answer,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}