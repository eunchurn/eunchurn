import puppeteer from "puppeteer";

export const getImageUrl = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
  await page.goto("https://www.picuki.com/profile/eunchurn");

  // Wait for the page to load
  await page.waitForSelector(".post-container");

  // Get the first 4 images
  const images = await page.$$eval(
    ".post-container .post-image img",
    (imgs) => {
      return imgs.slice(0, 4).map((img) => img.getAttribute("src"));
    }
  );

  console.log(images);

  await browser.close();
};
