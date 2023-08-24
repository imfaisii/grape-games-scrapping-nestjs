import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { createFile, getFile } from 'src/helpers/storage';
import {
    BROWSER_OPTIONS,
    COOKIES_PATH,
    INSTAGRAM_COOKIES_FILE_NAME,
} from './constants/main';

@Injectable()
export class ScrappersService {
    async scrap(url: string, showBrower: boolean = false): Promise<any> {
        // launch browser
        console.log('Launching browser');
        const browser = await puppeteer.launch({
            headless: showBrower ? false : true,
            args: BROWSER_OPTIONS,
        });

        // Open a new page
        console.log('Creating page');
        const page = await browser.newPage();

        // enable intercepter
        console.log('Enabling intercepter');
        this.enableIntercepter(page);

        // loading cookies
        console.log('Loading cookies');
        await this.loadCookies(page);

        // visiting story link
        console.log('Visiting link');
        page.goto(url);

        const mediaApiResponse = await page.waitForResponse((response: any) => {
            return response.url().includes('api/v1/feed/reels_media');
        });

        // storing result to return to api
        const { data } = await this.getReelMediaApiResponse(
            await mediaApiResponse.json(),
        );

        // stopping explicit page load as the api data is already fetched
        await page.evaluate(() => window.stop());

        // closing browser
        await browser.close();

        console.log('Scrapping successfull.');
        return { data };
    }

    async login(page: any): Promise<any> {
        // Navigate to the target page
        await page.goto('https://instagram.com');

        // Wait for the input fields to load
        await page.waitForSelector('input[name="username"]');
        await page.waitForSelector('input[name="password"]');

        // Enter the username and password
        await page.type('input[name="username"]', 'imfaisii7');
        await page.type('input[name="password"]', 'Pakistan2021');

        // Find and click the submit button
        await page.click('button[type="submit"]');

        // Wait for the next page to load (you might need to adjust the selector)
        await page.waitForNavigation({
            waitUntil: 'networkidle0',
        });
    }

    async getReelMediaApiResponse(data: any): Promise<{ data: any }> {
        //! UNCOMMENT TO WRITE FOR DEUGGING
        // await createFile('src', 'test.json', JSON.stringify(data));

        // if the link is wrong or there is no story
        if (data['reels_media'].length === 0) {
            return { data: [] };
        }

        // processing the data
        const processedData = data['reels_media'][0]['items'].map(
            (item: any) => {
                const isImage = !item.hasOwnProperty('video_versions');

                let url: string;

                if (isImage) {
                    const firstImageCandidate =
                        item.image_versions2.candidates[0];
                    url = firstImageCandidate ? firstImageCandidate.url : null;
                } else {
                    const firstVideoVersion = item.video_versions[0];
                    url = firstVideoVersion ? firstVideoVersion.url : null;
                }

                return { is_image: isImage, url };
            },
        );

        return { data: processedData };
    }

    async enableIntercepter(page: any) {
        // setting up intercepter
        await page.setRequestInterception(true);

        // aborting all requests except document
        page.on('request', (request: any) => {
            if (request.url().includes('login')) {
                console.log('Login request intercepted', request.url());
            }

            if (
                request.resourceType() === 'stylesheet' ||
                request.resourceType() === 'image'
            ) {
                request.abort();
            } else {
                request.continue();
            }
        });

        page.on('response', async (response: any) => {
            const request = response.request();

            if (request.url().includes('api/v1/feed/reels_media')) {
                const data = await response.json();
                return this.getReelMediaApiResponse(data);
            }
        });
    }

    async saveCookies(page: any): Promise<any> {
        // Get cookies after logging in
        const cookies = await page.cookies();

        // Use cookies in other tab or browser
        await createFile(
            COOKIES_PATH,
            INSTAGRAM_COOKIES_FILE_NAME,
            JSON.stringify(cookies),
        );
    }

    async loadCookies(page: any): Promise<any> {
        // Check if cookies file exists and load cookies if present
        try {
            const path = COOKIES_PATH + '/' + INSTAGRAM_COOKIES_FILE_NAME;
            const cookiesString: any = await getFile(path, 'utf8');
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
        } catch (error) {
            console.log("Cookies file doesn't exist or couldn't be loaded.");
        }
    }
}
