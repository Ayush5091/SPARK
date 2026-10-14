import { randomUUID } from 'crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Submission evidence (camera photos, reports, certificates) lives in a private S3 bucket.
// Credentials are passed explicitly so the app never falls back to whatever AWS profile
// happens to be configured on the machine.
const bucket = process.env.S3_EVIDENCE_BUCKET;
const region = process.env.S3_EVIDENCE_REGION || 'ap-south-1';

let client: S3Client | null = null;
function s3() {
  if (!bucket || !process.env.S3_EVIDENCE_ACCESS_KEY_ID || !process.env.S3_EVIDENCE_SECRET_ACCESS_KEY) {
    throw new Error('Evidence storage is not configured');
  }
  client ??= new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.S3_EVIDENCE_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_EVIDENCE_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

// Content type → extension. Anything else is rejected.
export const DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// The type comes from the file's own bytes, not the declared MIME type: a renamed
// executable can't pass as a PDF, and clients that send application/octet-stream
// (the Flutter app's Dio uploads) still work.
function sniffType(buffer: Buffer): string | null {
  const starts = (...bytes: number[]) => bytes.every((b, i) => buffer[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46)) return 'application/pdf'; // %PDF
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (starts(0x52, 0x49, 0x46, 0x46) && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (starts(0xd0, 0xcf, 0x11, 0xe0)) return 'application/msword'; // OLE compound file
  // .docx is a zip whose entries include word/document.xml
  if (starts(0x50, 0x4b, 0x03, 0x04) && buffer.includes('word/')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

export class EvidenceError extends Error {}

export async function readEvidence(file: File, allowed: Record<string, string>) {
  if (file.size === 0) throw new EvidenceError('The file is empty');
  if (file.size > MAX_EVIDENCE_BYTES) throw new EvidenceError('Files must be 10 MB or smaller');
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = sniffType(buffer);
  const ext = contentType ? allowed[contentType] : undefined;
  if (!contentType || !ext) throw new EvidenceError('Unsupported file type');
  return { buffer, contentType, ext };
}

export async function putEvidence(
  prefix: string,
  evidence: { buffer: Buffer; contentType: string; ext: string },
  filename?: string,
) {
  const key = `${prefix}/${randomUUID()}.${evidence.ext}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: evidence.buffer,
      ContentType: evidence.contentType,
      ...(filename ? { Metadata: { 'original-name': encodeURIComponent(filename).slice(0, 512) } } : {}),
    }),
  );
  return key;
}

// Best effort: a replaced file left behind is wasted storage, not a broken submission
export async function deleteEvidence(key: string) {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error('Failed to delete evidence', key, error);
  }
}

// Short-lived link for a reviewer or the owning student to open the file
export async function evidenceUrl(key: string, filename?: string | null) {
  const safeName = (filename || key.split('/').pop() || 'evidence').replace(/["\\\r\n]/g, '');
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${safeName}"`,
    }),
    { expiresIn: 15 * 60 },
  );
}
