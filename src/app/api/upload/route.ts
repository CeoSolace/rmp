import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary/server';

/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data POST containing a single `file` field. The
 * file is uploaded to Cloudinary using a data URL. On success the secure
 * URL of the uploaded image is returned as `{ url: string }`. If the
 * payload is malformed or the upload fails an appropriate error code is
 * returned.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    const folder = process.env.CLOUDINARY_FOLDER || 'rampchat';
    const uploadResult = await cloudinary.uploader.upload(dataUrl, { folder });
    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Image upload failed' },
      { status: 500 },
    );
  }
}