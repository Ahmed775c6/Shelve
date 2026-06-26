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

    const { prompt, context } = await req.json();

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are a creative writing assistant helping a writer with their work.
          Generate content based on the user's prompt. Keep the tone consistent and engaging.
          Return your response as plain text that can be inserted into a document.`,
        },
        {
          role: 'user',
          content: `Context: ${context || 'No context provided'}\n\nPrompt: ${prompt}`,
        },
      ],
    });

    return NextResponse.json({
      content: response.content[0].text,
    });
  } catch (error) {
    console.error('AI writing assist error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI assistance' },
      { status: 500 }
    );
  }
}