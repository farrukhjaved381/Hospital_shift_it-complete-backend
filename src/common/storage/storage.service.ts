import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private s3: any | null = null;
  private bucket: string | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const region = process.env.S3_REGION || 'us-east-1';
      this.s3 = { client: new S3Client({ region }), PutObjectCommand };
      this.bucket = process.env.S3_BUCKET_REPORTS || process.env.S3_BUCKET || null;
    } catch (e) {
      this.s3 = null;
      this.bucket = null;
    }
  }

  async putObject(key: string, body: Buffer | Uint8Array | string, contentType = 'application/octet-stream'): Promise<string> {
    if (this.s3 && this.bucket) {
      await this.s3.client.send(new this.s3.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
      return `s3://${this.bucket}/${key}`;
    }
    // Fallback: write to local temp folder
    const outDir = path.join(process.cwd(), 'dist', 'reports');
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, key.replace(/[\\/]/g, '_'));
    fs.writeFileSync(filePath, body);
    return `file://${filePath}`;
  }
}

