import { INestApplication, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Connect to the database
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Listen for shutdown events and close the database connection
    process.on('beforeExit', async () => {
      await app.close();
      await this.$disconnect();
    });

    process.on('SIGTERM', async () => {
      await app.close();
      await this.$disconnect();
    });

    process.on('SIGINT', async () => {
      await app.close();
      await this.$disconnect();
    });
  }
}
