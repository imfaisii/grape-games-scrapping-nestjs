import { Injectable } from '@nestjs/common';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-extra';
import UserAgent from 'user-agents';
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
import { extractSubstring } from '@src/helpers/global';

@Injectable()
export class ScrappersService {
  async scrap(
    url: string,
    platform: Platform,
    showBrower: boolean = false,
  ): Promise<any> {
    // declarations
    let response: any;

    const USER_AGENT =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';

    //Randomize User agent or Set a valid one
    const userAgent = new UserAgent();
    const UA = userAgent.toString() || USER_AGENT;

    // launch browser
    console.log('Launching browser');
    const browser = await puppeteer.use(StealthPlugin()).launch({
      headless: showBrower ? false : true,
      args: BROWSER_OPTIONS,
    });

    // Open a new page
    console.log('Creating page');
    const page = await browser.newPage();

    //Randomize viewport size
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 3000 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false,
    });

    await page.setUserAgent(UA);
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(0);

    await page.evaluateOnNewDocument(() => {
      // Pass webdriver check
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    await page.evaluateOnNewDocument(() => {
      // Overwrite the `plugins` property to use a custom getter.
      Object.defineProperty(navigator, 'plugins', {
        // This just needs to have `length > 0` for the current test,
        // but we could mock the plugins too if necessary.
        get: () => [1, 2, 3, 4, 5],
      });
    });

    await page.evaluateOnNewDocument(() => {
      // Overwrite the `languages` property to use a custom getter.
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

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
        const { data } = await this.getInstagramStoriesLinks(page, url);

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
        const { data } = await this.getFacebookStoriesLink(page, url);

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

      await page.type('input[name="email"]', 'cfaysal0077@gmail.com');
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

  async getFacebookStoriesLink(page: any, url: string): Promise<any> {
    const resultArray: any = [];
    const regex = /\/([^/]+)\/\?/;

    // Use the match method to find the matching substring
    const match = url.match(regex);

    // Extract the matched string
    if (match && match[1]) {
      try {
        const storyId = match[1];

        const content = await page.content();

        const result: any = extractSubstring(
          content,
          '"unified_stories":{"edges":',
          '},"owner":{"',
        );

        const json = JSON.parse(result);

        const storyNode = json.filter((i: any) => i.node.id === storyId);
        const media = storyNode[0].node.attachments[0].media;

        if (media.__typename === FACEBOOK_STORY_VIDEO) {
          console.log('inside if');
          resultArray.push({
            is_image: false,
            thumbnail: media.previewImage.uri,
            url: media.browser_native_sd_url,
          });
        } else {
          resultArray.push({
            is_image: true,
            url: media.previewImage.uri,
          });
        }

        return {
          data: resultArray,
        };
      } catch (e) {
        return { data: [], error: e };
      }
    } else {
      return { data: [] };
    }
  }

  async getInstagramVideoLinks(page: any): Promise<{ data: object | string }> {
    // Wait for the video element to appear
    const videoElement = await page.waitForSelector('video');

    // Get the src attribute of the video element
    const videoSrc = await videoElement.evaluate((element) => element.src);

    return { data: videoSrc };
  }

  async getInstagramStoriesLinks(
    page: any,
    url: string,
  ): Promise<{ data: object | any }> {
    const mediaApiResponse = await page.waitForResponse((response: any) => {
      return response.url().includes('api/v1/feed/reels_media');
    });

    // storing result to return to api
    const { data } = await this.getInstagramStoriesProcessedData(
      await mediaApiResponse.json(),
      url,
    );

    return { data };
  }

  async getInstagramStoriesProcessedData(
    data: any,
    url: string,
  ): Promise<{ data: any }> {
    //! UNCOMMENT TO WRITE FOR DEUGGING
    // await createFile('src', 'test.json', JSON.stringify(data));

    // Define a regex pattern to match a number between two slashes
    const regex = /\/(\d+)[^\/]*$/;

    // Use the `exec` method to find the match
    const match = regex.exec(url);

    if (match) {
      // The matched number will be in the first capture group (index 1)
      const postId = match[1];

      // if the link is wrong or there is no story
      if (data['reels_media'].length === 0) {
        return { data: [] };
      }

      // processing the data
      const processedData = data['reels_media'][0]['items']
        .filter((i: any) => i.pk === postId)
        .map((item: any) => {
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
    } else {
      return { data: [] };
    }
  }

  async enableIntercepter(page: any) {
    // setting up intercepter
    await page.setRequestInterception(true);

    // aborting all requests except document
    page.on('request', async (request: any) => {
      if (request.url().includes('login')) {
        console.log('Login request intercepted', request.url());
      }

      if (
        request.resourceType() === 'stylesheet' ||
        request.resourceType() === 'image' ||
        request.resourceType() == 'font'
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
