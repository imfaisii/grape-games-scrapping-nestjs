import { Body, Controller, Post, Req } from '@nestjs/common';
import { ScrappersService } from './scrappers.service';
import { createApiResponse } from '@src/helpers/global';
import { INSTAGRAM, REEL, STORIES } from './constants';
import { Request } from 'express';

@Controller('scrappers')
export class ScrappersController {
  constructor(private readonly scrappersService: ScrappersService) {}

  @Post()
  async scrap(@Req() req: Request, @Body() body: any) {
    try {
      const requestHost = this.getHostnameWithScheme(req);
      const { url, platform, showBrowser } = body;

      if (!url || !platform) {
        return createApiResponse(false, 'invalid url or platform');
      }

      if (platform.name == INSTAGRAM) {
        if (platform.type == STORIES && !url.includes(STORIES)) {
          return createApiResponse(false, 'invalid url instagram stories');
        }

        if (platform.type == REEL && !url.includes(REEL)) {
          return createApiResponse(false, 'invalid url instagram reel');
        }
      }

      const { data } = await this.scrappersService.scrap(
        body.url,
        platform,
        showBrowser,
        requestHost,
      );

      return createApiResponse(true, 'success', data);
    } catch (error) {
      return createApiResponse(false, error.message);
    }
  }

  getHostnameWithScheme(@Req() req: Request): string {
    const protocol = req.protocol || 'http';
    const host = req.headers.host || '';
    return `${protocol}://${host}`;
  }
}
