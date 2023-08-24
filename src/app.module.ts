import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrappersModule } from './scrappers/scrappers.module';

@Module({
  imports: [ScrappersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
