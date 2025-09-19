import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { VerificationsRepository } from './verifications.repository';
import { UploadPresignDto } from './dto/upload-presign.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ChangeDocumentStatusDto, DTOStatus as DocStatus } from './dto/change-document-status.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { ChangeVerificationStatusDto, DTOStatus as VerStatus } from './dto/change-verification-status.dto';
import { ItemType, Role } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { S3Service } from './storage/s3.service';
import { InvoicesService } from '../billing/invoices.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationsService {
  constructor(
    private readonly repo: VerificationsRepository,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
    private readonly invoices: InvoicesService,
    private readonly prisma: PrismaService,
  ) {}

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
    await this.audit.log(user.id || null, 'DOCUMENT_PRESIGNED_REQUESTED', { documentId: doc.id, userId: dto.userId, type: dto.type });
    return { presignedUrl, document: doc };
  }

  async confirmUpload(dto: ConfirmUploadDto, user: any) {
    const uploadedAt = dto.uploadedAt ? new Date(dto.uploadedAt) : new Date();
    const doc = await this.repo.updateDocument(dto.documentId, { uploadedAt });
    await this.audit.log(user.id || null, 'DOCUMENT_CONFIRMED', { documentId: dto.documentId });
    return { document: doc };
  }

  async listDocuments(userId: string, user: any) {
    this.assertSelfOrAdmin(user, userId);
    return this.repo.findDocumentsByUser(userId);
  }

  async changeDocumentStatus(docId: string, body: ChangeDocumentStatusDto, user: any) {
    if (![Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN].includes(user.role)) throw new ForbiddenException();
    if (body.status === DocStatus.PENDING) throw new BadRequestException('Cannot set PENDING');
    const updated = await this.repo.updateDocument(docId, { status: body.status });
    await this.audit.log(user.id || null, 'DOCUMENT_STATUS_CHANGED', { documentId: docId, status: body.status });
    return updated;
  }

  async requestVerification(dto: CreateVerificationDto, user: any) {
    this.assertSelfOrAdmin(user, dto.userId);
    const ver = await this.repo.createVerification({
      userId: dto.userId,
      type: dto.type,
      status: 'PENDING',
      partnerMeta: dto.metadata || {},
    });
    await this.audit.log(user.id || null, 'VERIFICATION_REQUESTED', { verificationId: ver.id, userId: dto.userId, type: dto.type });
    return ver;
  }

  async changeVerificationStatus(id: string, body: ChangeVerificationStatusDto, user: any) {
    if (![Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN].includes(user.role)) throw new ForbiddenException();
    if (body.status === VerStatus.PENDING) throw new BadRequestException('Cannot set PENDING');
    const data: any = { status: body.status };
    if (body.cost != null) data.cost = body.cost;
    const updatedVer = await this.repo.updateVerification(id, data);
    // If approved, attach to invoice (one-per-verification simplified flow)
    if (body.status === VerStatus.APPROVED) {
      // Determine student's school: using user's affiliation if SCHOOL
      // Fallback: require that user has affiliationId to a SCHOOL org
      const v = await this.repo.findVerificationById(id);
      const user = v ? await this.prisma.user.findUnique({ where: { id: v.userId } }) : null;
      const schoolId = user?.affiliationId || null;
      if (schoolId) {
        const amount = body.cost != null ? body.cost : v?.cost || parseFloat(process.env.DEFAULT_VERIFICATION_PRICE || '55');
        const inv = await this.invoices.attachItemForVerification({
          schoolId,
          description: `Verification ${v?.type || ''} for user ${v?.userId}`,
          amount,
          type: ItemType.VERIFICATION,
          meta: { verificationId: id },
        });
        await this.repo.updateVerification(id, { invoiceId: inv.id });
        await this.audit.log(user?.id || null, 'INVOICE_ITEM_ADDED', { verificationId: id, invoiceId: inv.id });
      }
    }
    await this.audit.log(user.id || null, 'VERIFICATION_STATUS_CHANGED', { verificationId: id, status: body.status, cost: body.cost });
    return updatedVer;
  }

  async listVerifications(userId: string, user: any) {
    this.assertSelfOrAdmin(user, userId);
    return this.repo.findVerificationsByUser(userId);
  }

  async stats(yearMonth: string) {
    return this.repo.statsByMonth(yearMonth);
  }

  async overdue(days: number) {
    return this.repo.overdue(days);
  }
}
