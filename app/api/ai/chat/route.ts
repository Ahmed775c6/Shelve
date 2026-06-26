import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import anthropic from '@/app/lib/anthropic';
import { authOptions } from '@/app/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history } = await req.json();

    // Build conversation context
    const messages = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: message,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `You are a knowledgeable literary assistant helping a reader with their personal library. 
          You can summarize books, explain themes, answer questions about literature, and give personalized book recommendations.
          Be thoughtful, detailed, and engaging in your responses.`,
        },
        ...messages,
      ],
    });

    return NextResponse.json({
      response: response.content[0].text,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}