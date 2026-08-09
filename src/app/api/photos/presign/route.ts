import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '@/lib/auth';
import { b2Client, B2_BUCKET_NAME } from '@/lib/b2';
import { getDb } from '@/db/client';
import { progressPhotos } from '@/db/schema';
import { presignRequestSchema } from '@/lib/validation/photos';

/** Presigned PUT URL lifetime in seconds */
const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return NextResponse.json({ error: 'Validation failed.', issues }, { status: 400 });
  }

  const { date, tag, notes, contentType, width, height, byteSize } = parsed.data;
  const userId = session.user.id;

  // 3. Generate unguessable storage key
  const storageKey = `users/${userId}/${randomUUID()}`;

  // 4. Create presigned PUT URL
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
    ContentLength: byteSize,
  });

  const uploadUrl = await getSignedUrl(b2Client, command, {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });

  return NextResponse.json({
    storageKey,
    uploadUrl,
  });
}
