import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

export const MONGO_DB = 'MONGO_DB';

@Global()
@Module({
  providers: [
    {
      provide: MONGO_DB,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const uri = config.get<string>('ATYANT_MONGO_URI');
        const conn = await mongoose.createConnection(uri).asPromise();
        console.log('Atyant MongoDB connected');
        return conn;
      },
    },
  ],
  exports: [MONGO_DB],
})
export class MongoModule {}