import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { authOptions } from '@/app/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const bookExtensions = new Set(['.pdf', '.epub', '.mobi']);
    const isImage = imageExtensions.has(extension);
    const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size === 0 || (!isImage && !bookExtensions.has(extension)) || file.size > maxSize) {
      return NextResponse.json(
        { error: isImage ? 'Images must be 5MB or smaller' : 'Only PDF, EPUB, and MOBI files up to 50MB are supported' },
        { status: 400 }
      );
    }

    const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}-${randomUUID()}${extension}`;
    const filePath = path.join(uploadsDir, safeName);

    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const fileUrl = `/api/uploadthing/${safeName}`;
    return NextResponse.json({ fileUrl }, { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
