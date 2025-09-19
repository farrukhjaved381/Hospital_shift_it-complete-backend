import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/user.modules';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { VerificationsModule } from './verifications/verifications.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Loads .env file and makes it globally available
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
      },
    ]),
    AuthModule,
    UsersModule,
    PrismaModule,
    OrganizationsModule,
    SchedulingModule,
    VerificationsModule,
    BillingModule,
    ReportsModule,
    JobsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
  // Optionally apply rate limiting globally; auth endpoints also use method-level throttles
  // providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
