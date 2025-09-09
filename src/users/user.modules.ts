import { Module } from '@nestjs/common';
import { UserService } from './user.services';
import { UserController } from './user.controllers';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}