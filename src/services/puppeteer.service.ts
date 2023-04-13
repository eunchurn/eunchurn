import puppeteer, { Browser, ElementHandle, Page } from "puppeteer";

class PuppeteerService {
  browser: Promise<Browser>;
  page: Promise<Page>;
  constructor() {
    this.browser = puppeteer.launch({
      // args: [
      //   "--no-sandbox",
      //   "--disable-setuid-sandbox",
      //   "--disable-infobars",
      //   "--window-position=0,0",
      //   "--ignore-certifcate-errors",
      //   "--ignore-certifcate-errors-spki-list",
      //   "--incognito",
      //   "--proxy-server=http=194.67.37.90:3128",
      // ],
    });
    this.page = this.browser.then((browser) => browser.newPage());
  }

  /**
   *
   * @param {string} url
   */
  async goToPage(url: string) {
    const thisPage = await this.page;
    await thisPage.setExtraHTTPHeaders({
      "Accept-Language": "en-US",
    });

    await thisPage.goto(url, {
      waitUntil: `networkidle0`,
    });
  }

  async close() {
    const thisPage = await this.page;
    const thisBrowser = await this.browser;
    await thisPage.close();
    await thisBrowser.close();
  }

  /**
   *
   * @param {string} acc Account to crawl
   * @param {number} n Qty of image to fetch
   */
  async getLatestInstagramPostsFromAccount(acc: string, n: number) {
    const thisPage = await this.page;
    const page = `https://www.picuki.com/profile/${acc}`;
    console.log({ page });
    await this.goToPage(page);
    let previousHeight;

    try {
      // previousHeight = await thisPage.evaluate(`document.body.scrollHeight`);
      // await thisPage.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
      // Wait for the page to load
      await thisPage.waitForSelector(".post-container");

      // Get the first 4 images
      const images = await thisPage.$$eval(
        ".post-container .post-image img",
        (imgs) => {
          return imgs.slice(0, 4).map((img) => img.getAttribute("src"));
        }
      );
      console.log({ images });
      const nodes = await thisPage.evaluate(() => {
        const images = Array.from(
          document.querySelectorAll(`img.post-image`)
        ) as HTMLImageElement[];
        return images.map((img: HTMLImageElement) => img.src);
        // return [].map.call(images, (img: HTMLImageElement) => img.src);
      });
      console.log({ nodes });
      return nodes.slice(0, n);
    } catch (error) {
      console.log("Error", error);
      process.exit();
    }
  }

  // async getLatestMediumPublications(acc, n) {
  //   const page = `https://medium.com/${acc}`;

  //   await this.goToPage(page);

  //   console.log('PP', page);
  //   let previousHeight;

  //   try {
  //     previousHeight = await this.page.evaluate(`document.body.scrollHeight`);
  //     console.log('MED1');
  //     await this.page.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
  //     console.log('MED2', previousHeight);
  //     await this.page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
  //     console.log('MED3');
  //     await this.page.waitFor(1000);
  //     console.log('MED4');

  //     const nodes = await this.page.evaluate(() => {
  //       const posts = document.querySelectorAll('.fs.ft.fu.fv.fw.z.c');
  //       return [].map.call(posts);
  //     });
  //     console.log('POSTS', nodes);
  //     return;
  //   } catch (error) {
  //     console.log('Error', error);
  //     process.exit();
  //   }
  // }
}

const wait = (ms: number): Promise<boolean> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });

export const puppeteerService = new PuppeteerService();
