import { Module } from '@nestjs/common';
import { AtyantController } from './atyant.controller';
import { AtyantService } from './atyant.service';
import { MongoModule } from '../database/mongo.module';

@Module({
  imports: [MongoModule],
  controllers: [AtyantController],
  providers: [AtyantService],
})
export class AtyantModule {}