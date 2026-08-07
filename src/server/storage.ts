import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (client) return client;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  client = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle,
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function getBucket(): string {
  return required("S3_BUCKET");
}

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  const bucket = getBucket();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export function tenantObjectKey(
  tenantId: string,
  ...parts: string[]
): string {
  return [tenantId, ...parts].join("/");
}
