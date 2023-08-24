import { Body, Controller, Post } from '@nestjs/common';
import { ScrappersService } from './scrappers.service';
import { containsStories, createApiResponse } from '@src/helpers/global';

@Controller('scrappers')
export class ScrappersController {
    constructor(private readonly scrappersService: ScrappersService) {}

    @Post()
    async scrap(@Body() body: any) {
        try {
            const { url, showBrowser } = body;

            if (!url || !containsStories(url)) {
                return createApiResponse(false, 'invalid url');
            }

            const { data } = await this.scrappersService.scrap(
                body.url,
                showBrowser,
            );

            return createApiResponse(true, 'success', data);
        } catch (error) {
            return createApiResponse(false, error.message);
        }
    }
}
