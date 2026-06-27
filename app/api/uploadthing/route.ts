import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File | undefined;
    const type = form.get('type') as string | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file contents as ArrayBuffer then to Buffer
    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const originalName = (file as any).name || `upload-${Date.now()}`;
    const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const filePath = path.join(uploadsDir, safeName);

    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${safeName}`;
    return NextResponse.json({ fileUrl }, { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}