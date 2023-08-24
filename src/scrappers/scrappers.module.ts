import { Module } from '@nestjs/common';
import { ScrappersService } from './scrappers.service';
import { ScrappersController } from './scrappers.controller';

@Module({
  controllers: [ScrappersController],
  providers: [ScrappersService]
})
export class ScrappersModule {}
