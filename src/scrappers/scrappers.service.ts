import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { createFile, deleteFile, getFile } from 'src/helpers/storage';
import {
  BROWSER_OPTIONS,
  COOKIES_PATH,
  FACEBOOK_COOKIES_FILE_NAME,
  FACEBOOK_STORY_PHOTO,
  FACEBOOK_STORY_VIDEO,
  INSTAGRAM_COOKIES_FILE_NAME,
  REEL,
} from './constants';
import { Platform } from './interfaces';
import { FACEBOOK, INSTAGRAM, STORIES, VIDEO } from './constants';
import { extractSubstring } from '@src/helpers/global';

@Injectable()
export class ScrappersService {
  async downloadFile(url, filePath) {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  async scrap(
    url: string,
    platform: Platform,
    showBrower: boolean = false,
    hostName: string,
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
    this.enableIntercepter(page);

    //! to save cookies
    // await this.login(page, platform);
    // await this.saveCookies(page, platform);

    // loading cookies
    console.log('Loading cookies');
    await this.loadCookies(page);

    // visiting story link
    console.log('Visiting link');
    page.goto(url);

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
      const content = await page.content();

      if (platform.type == VIDEO) {
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const { data } = await this.getFacebookVideoLink(content, hostName);

        response = data;
      }

      if (platform.type == STORIES) {
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        const content = await page.content();

        const { data } = await this.getFacebookStoriesLink(content);

        return { data };
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
      await page.type('input[name="username"]', 'imfaisii7');
      await page.type('input[name="password"]', 'Pakistan2021');

      // Find and click the submit button
      await page.click('button[type="submit"]');

      // Wait for the next page to load (you might need to adjust the selector)
      await page.waitForNavigation({
        waitUntil: 'networkidle0',
      });
    }

    if (platform.name == FACEBOOK) {
      // Navigate to the target page
      await page.goto('https://web.facebook.com/?_rdc=1&_rdr');

      //! maunally login
      // console.log('Waiting for login..');
      // await sleep(30000);
      // console.log('Done Waiting for login..');
    }
  }

  async getFacebookVideoLink(
    content: any,
    hostname: string,
  ): Promise<{ data: string }> {
    const result: any = extractSubstring(
      content,
      '[{"representations":',
      ',"video_id"',
    );

    const jsonParsed = JSON.parse(result);

    let video = null;
    let audio = null;
    const outputFilename = `${uuidv4()}.mp4`;
    const audioInputFileName = `a-${outputFilename}`;
    const videoInputFileName = `v-${outputFilename}`;

    for (const obj of jsonParsed) {
      if (obj.mime_type.startsWith('video/')) {
        video = obj.base_url;
      } else if (obj.mime_type.startsWith('audio/')) {
        audio = obj.base_url;
      }
    }

    if (!audio) {
      return { data: video };
    }

    await this.downloadFile(audio, `public/${audioInputFileName}`);
    await this.downloadFile(video, `public/${videoInputFileName}`);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(`public/${audioInputFileName}`)
        .input(`public/${videoInputFileName}`)
        .outputOptions('-c:v copy')
        .outputOptions('-c:a aac')
        .save(`public/${outputFilename}`)
        .on('end', resolve)
        .on('error', reject);
    });

    await deleteFile(`public/${audioInputFileName}`);
    await deleteFile(`public/${videoInputFileName}`);

    return { data: `${hostname}/public/${outputFilename}` };
  }

  async getFacebookStoriesLink(content: any): Promise<any> {
    const photos: any = [];
    const videos: any = [];

    const result: any = extractSubstring(
      content,
      ',"unified_stories":{"edges":',
      '},"owner":',
    );

    const jsonParsed = JSON.parse(result);

    console.log(jsonParsed);

    jsonParsed.forEach((edge: any) => {
      console.log('in');
      console.log(edge);
      edge.attachments.forEach((attachment: any) => {
        if (attachment.media.__typename == FACEBOOK_STORY_PHOTO) {
          photos.push(attachment.media.image.uri);
        }

        if (attachment.media.__typename == FACEBOOK_STORY_VIDEO) {
          videos.push({
            sd: attachment.media.browser_native_sd_url,
            hd: attachment.media.browser_native_hd_url,
          });
        }
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
    try {
      const cookieFiles = [
        INSTAGRAM_COOKIES_FILE_NAME,
        FACEBOOK_COOKIES_FILE_NAME,
      ];

      const cookies = [];

      for (const cookieFile of cookieFiles) {
        const path = COOKIES_PATH + '/' + cookieFile;
        const cookiesString: any = await getFile(path, 'utf8');
        cookies.push(...JSON.parse(cookiesString));
      }

      await page.setCookie(...cookies);
    } catch (error) {
      console.log("Cookies file doesn't exist or couldn't be loaded.");
    }
  }
}
