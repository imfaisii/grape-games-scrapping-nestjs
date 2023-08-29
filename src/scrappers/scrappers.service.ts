import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { createFile, getFile } from 'src/helpers/storage';
import {
  BROWSER_OPTIONS,
  COOKIES_PATH,
  FACEBOOK_COOKIES_FILE_NAME,
  FACEBOOK_STORY_VIDEO,
  INSTAGRAM_COOKIES_FILE_NAME,
  REEL,
} from './constants';
import { Platform } from './interfaces';
import { FACEBOOK, INSTAGRAM, STORIES, VIDEO } from './constants';
import { getStringsBetween } from '@src/helpers/global';

@Injectable()
export class ScrappersService {
  async scrap(
    url: string,
    platform: Platform,
    showBrower: boolean = false,
  ): Promise<any> {
    // declarations
    let response: any;

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
    await this.enableIntercepter(page);

    // loading cookies
    await this.loadCookies(page);

    if (platform.name === FACEBOOK) {
      await page.goto(url, { waitUntil: 'networkidle2' });

      if ((await page.$('input[name="email"]')) !== null) {
        await this.login(page, platform);
        page.goto(url);
      }
    } else {
      if (platform.type == STORIES) {
        await page.goto('https://instagram.com', { waitUntil: 'networkidle2' });
        const content = await page.content();

        if (content.includes('name="username"')) {
          await this.login(page, platform);
          page.goto(url);
        } else {
          page.goto(url);
        }
      } else {
        page.goto(url);
      }
    }

    if (platform.name == INSTAGRAM) {
      if (platform.type == STORIES) {
        const { data } = await this.getInstagramStoriesLinks(page);

        response = data;
      }

      if ([REEL, VIDEO].includes(platform.type)) {
        const { data } = await this.getInstagramVideoLinks(page);

        response = data;
      }
    }

    if (platform.name == FACEBOOK) {
      if ([REEL, VIDEO].includes(platform.type)) {
        const { data } = await this.getFacebookVideoLink(page);

        response = data;
        if (platform.name === FACEBOOK) {
          await page.goto(url, { waitUntil: 'networkidle2' });

          if ((await page.$('input[name="email"]')) !== null) {
            await this.login(page, platform);
            page.goto(url);
          }
        } else {
          await page.goto(url, { waitUntil: 'networkidle2' });

          if ((await page.$('input[name="email"]')) !== null) {
            await this.login(page, platform);
            page.goto(url);
          }
        }
      }

      if (platform.type == STORIES) {
        const { data } = await this.getFacebookStoriesLink(page);

        response = data;
      }
    }

    // stopping explicit page load as the api data is already fetched
    await page.evaluate(() => window.stop());

    // closing browser
    await browser.close();

    console.log(`Scrapping successfull. URL: ${url}`);
    return { data: response };
  }

  async login(page: any, platform: Platform): Promise<any> {
    if (platform.name == INSTAGRAM) {
      // Navigate to the target page
      await page.goto('https://instagram.com');

      // Wait for the input fields to load
      await page.waitForSelector('input[name="username"]');
      await page.waitForSelector('input[name="password"]');

      // Enter the username and password
      await page.type('input[name="username"]', 'imfaisii4');
      await page.type('input[name="password"]', 'Pakistan2021');

      // Find and click the submit button
      await page.click('button[type="submit"]');
    }

    if (platform.name == FACEBOOK) {
      // Navigate to the target page
      await page.goto('https://web.facebook.com/?_rdc=1&_rdr');

      await page.waitForSelector('input[name="email"]');
      await page.waitForSelector('input[name="pass"]');

      await page.type('input[name="email"]', 'cfaysal044@gmail.com');
      await page.type('input[name="pass"]', 'Pakistan2021');

      await page.click('button[name="login"]');
    }

    // Wait for the next page to load (you might need to adjust the selector)
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
    });

    await this.saveCookies(page, platform);
  }

  async getFacebookVideoLink(page: any): Promise<{ data: string }> {
    const xpath = '//video';

    const element = await page.waitForXPath(xpath, {
      visible: true,
      timeout: 10000,
    });

    // Get the 'src' attribute of the video element
    const videoSrc = await page.evaluate(
      (el: any) => el.getAttribute('src'),
      element,
    );

    return { data: videoSrc };
  }

  async getFacebookStoriesLink(page: any): Promise<any> {
    const videos: any = [];
    const photos: any = [];

    const content = await page.content();

    const result: any = getStringsBetween(
      content,
      'attachments',
      'story_card_seen_state',
    );

    result.forEach((entry: any) => {
      const modifiedString = entry.slice(2, -2);
      const json = JSON.parse(modifiedString);
      const media = json[0].media;

      media.__typename == FACEBOOK_STORY_VIDEO
        ? videos.push({
            thumbnail: media.previewImage.uri,
            url: media.browser_native_sd_url,
          })
        : photos.push({
            url: media.previewImage.uri,
          });
    });

    return {
      data: {
        photos,
        videos,
      },
    };
  }

  async getInstagramVideoLinks(page: any): Promise<{ data: object | string }> {
    const content = await page.content();
    await createFile('public', 'test.html', content);
    // Wait for the video element to appear
    const videoElement = await page.waitForSelector('video');

    // Get the src attribute of the video element
    const videoSrc = await videoElement.evaluate((element) => element.src);

    return { data: videoSrc };
  }

  async getInstagramStoriesLinks(page: any): Promise<{ data: object | any }> {
    const mediaApiResponse = await page.waitForResponse((response: any) => {
      return response.url().includes('api/v1/feed/reels_media');
    });

    // storing result to return to api
    const { data } = await this.getInstagramStoriesProcessedData(
      await mediaApiResponse.json(),
    );

    return { data };
  }

  async getInstagramStoriesProcessedData(data: any): Promise<{ data: any }> {
    //! UNCOMMENT TO WRITE FOR DEUGGING
    // await createFile('src', 'test.json', JSON.stringify(data));

    // if the link is wrong or there is no story
    if (data['reels_media'].length === 0) {
      return { data: [] };
    }

    // processing the data
    const processedData = data['reels_media'][0]['items'].map((item: any) => {
      const isImage = !item.hasOwnProperty('video_versions');

      let url: string;

      if (isImage) {
        const firstImageCandidate = item.image_versions2.candidates[0];
        url = firstImageCandidate ? firstImageCandidate.url : null;
      } else {
        const firstVideoVersion = item.video_versions[0];
        url = firstVideoVersion ? firstVideoVersion.url : null;
      }

      return { is_image: isImage, url };
    });

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
  }

  async saveCookies(page: any, platform: Platform): Promise<any> {
    // Get cookies after logging in
    const cookies = await page.cookies();

    if (platform.name == INSTAGRAM) {
      // Use cookies in other tab or browser
      await createFile(
        COOKIES_PATH,
        INSTAGRAM_COOKIES_FILE_NAME,
        JSON.stringify(cookies),
      );
    }

    if (platform.name == FACEBOOK) {
      // Use cookies in other tab or browser
      await createFile(
        COOKIES_PATH,
        FACEBOOK_COOKIES_FILE_NAME,
        JSON.stringify(cookies),
      );
    }
  }

  async loadCookies(page: any): Promise<any> {
    // Check if cookies file exists and load cookies if present
    const cookieFiles = [
      INSTAGRAM_COOKIES_FILE_NAME,
      FACEBOOK_COOKIES_FILE_NAME,
    ];

    const cookies = [];

    for (const cookieFile of cookieFiles) {
      const path = COOKIES_PATH + '/' + cookieFile;

      try {
        const cookiesString: any = await getFile(path, 'utf8');
        cookies.push(...JSON.parse(cookiesString));
      } catch (error) {
        console.log("Cookies file doesn't exist or couldn't be loaded.", path);
      }
    }

    await page.setCookie(...cookies);
  }
}
