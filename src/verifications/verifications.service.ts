import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { VerificationsRepository } from './verifications.repository';
import { UploadPresignDto } from './dto/upload-presign.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ChangeDocumentStatusDto, DTOStatus as DocStatus } from './dto/change-document-status.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { ChangeVerificationStatusDto, DTOStatus as VerStatus } from './dto/change-verification-status.dto';
import { Role } from '@prisma/client';
import { S3Service } from './storage/s3.service';

@Injectable()
export class VerificationsService {
  constructor(private readonly repo: VerificationsRepository, private readonly s3: S3Service) {}

  private assertSelfOrAdmin(user: any, targetUserId: string) {
    if (user.role === Role.SUPER_ADMIN) return;
    if (user.role === Role.SCHOOL_ADMIN) return; // later scope to own students
    if (user.role === Role.STUDENT && user.id === targetUserId) return;
    throw new ForbiddenException();
  }

  async presign(dto: UploadPresignDto, user: any) {
    this.assertSelfOrAdmin(user, dto.userId);
    const bucket = process.env.S3_BUCKET || 'local-bucket';
    const key = `uploads/${dto.userId}/${Date.now()}_${dto.filename}`;
    const presignedUrl = await this.s3.getPresignedPutUrl({ bucket, key, contentType: dto.contentType, ttlSeconds: 600 });
    const fakeUrl = `s3://${bucket}/${key}`;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const doc = await this.repo.createDocument({
      userId: dto.userId,
      name: dto.filename,
      url: fakeUrl,
      type: dto.type,
      status: 'PENDING',
      expiresAt,
    });
    return { presignedUrl, document: doc };
  }

  async confirmUpload(dto: ConfirmUploadDto, user: any) {
    const uploadedAt = dto.uploadedAt ? new Date(dto.uploadedAt) : new Date();
    const doc = await this.repo.updateDocument(dto.documentId, { uploadedAt });
    return { document: doc };
  }

  async listDocuments(userId: string, user: any) {
    this.assertSelfOrAdmin(user, userId);
    return this.repo.findDocumentsByUser(userId);
  }

  async changeDocumentStatus(docId: string, body: ChangeDocumentStatusDto, user: any) {
    if (![Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN].includes(user.role)) throw new ForbiddenException();
    if (body.status === DocStatus.PENDING) throw new BadRequestException('Cannot set PENDING');
    return this.repo.updateDocument(docId, { status: body.status });
  }

  async requestVerification(dto: CreateVerificationDto, user: any) {
    this.assertSelfOrAdmin(user, dto.userId);
    return this.repo.createVerification({
      userId: dto.userId,
      type: dto.type,
      status: 'PENDING',
      partnerMeta: dto.metadata || {},
    });
  }

  async changeVerificationStatus(id: string, body: ChangeVerificationStatusDto, user: any) {
    if (![Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN].includes(user.role)) throw new ForbiddenException();
    if (body.status === VerStatus.PENDING) throw new BadRequestException('Cannot set PENDING');
    const data: any = { status: body.status };
    if (body.cost != null) data.cost = body.cost;
    return this.repo.updateVerification(id, data);
  }

  async stats(yearMonth: string) {
    return this.repo.statsByMonth(yearMonth);
  }

  async overdue(days: number) {
    return this.repo.overdue(days);
  }
}
