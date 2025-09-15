import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class S3Service {
  private s3: any | null = null;
  private presigner: any | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const region = process.env.S3_REGION || 'us-east-1';
      this.s3 = { client: new S3Client({ region }), PutObjectCommand };
      this.presigner = { getSignedUrl };
    } catch (e) {
      this.s3 = null;
      this.presigner = null;
    }
  }

  async getPresignedPutUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    ttlSeconds?: number;
  }): Promise<string> {
    const { bucket, key, contentType, ttlSeconds = 600 } = params;
    if (!bucket) throw new InternalServerErrorException('S3 bucket is not configured');
    if (this.s3 && this.presigner) {
      const cmd = new this.s3.PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
      return this.presigner.getSignedUrl(this.s3.client, cmd, { expiresIn: ttlSeconds });
    }
    // Fallback (dev): return a mock URL so local can proceed without AWS SDK
    return `https://mock-s3-presign.local/${bucket}/${encodeURIComponent(key)}?contentType=${encodeURIComponent(contentType)}&ttl=${ttlSeconds}`;
  }
}

