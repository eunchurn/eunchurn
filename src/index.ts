import "dotenv/config";
import Mustache from "mustache";
import { dynamicImport } from "tsimportlib";
import fs from "fs";
// import fetch from "node-fetch";
import { puppeteerService } from "./services/puppeteer.service";
import { Weather } from "./weatherTypes";
import { wakatime } from "./services/wakatime";

const MUSTACHE_MAIN_DIR = "./main.mustache";

async function setWeatherInformation() {
  const { default: fetch } = (await dynamicImport(
    "node-fetch",
    module
  )) as typeof import("node-fetch");
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=seoul&appid=${process.env.OPEN_WEATHER_MAP_KEY}&units=metric`
  );
  const weatherRes = (await response.json()) as Weather;
  const {
    main: { temp },
    weather,
    sys: { sunrise, sunset },
  } = weatherRes;
  const [{ description, icon }] = weather;
  return {
    city_temperature: Math.round(temp),
    city_weather: description,
    city_weather_icon: `http://openweathermap.org/img/wn/${icon}@2x.png`,
    sun_rise: new Date(sunrise * 1000).toLocaleString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    }),
    sun_set: new Date(sunset * 1000).toLocaleString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    }),
  };
}

async function setInstagramPosts() {
  const instagramImages =
    await puppeteerService.getLatestInstagramPostsFromAccount("eunchurn", 4);
  return {
    img1: instagramImages[0],
    img2: instagramImages[1],
    img3: instagramImages[2],
    img4: instagramImages[3],
  };
}

async function action() {
  /**
   * Fetch Weather
   */
  const weatherInfo = await setWeatherInformation();

  /**
   * Get pictures
   */
  const instaPics = await setInstagramPosts();
  /**
   * Generate README
   */
  const DATA = {
    refresh_date: new Date().toLocaleDateString("ko-KR", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      timeZoneName: "short",
      timeZone: "Asia/Seoul",
    }),
    ...weatherInfo,
    ...instaPics,
  };
  console.log(DATA);
  async function generateReadMe() {
    await fs.readFile(MUSTACHE_MAIN_DIR, (err, data) => {
      if (err) throw err;
      const output = Mustache.render(data.toString(), DATA);
      fs.writeFileSync("README.md", output);
    });
  }
  await generateReadMe();

  await puppeteerService.close();
  await wakatime();
}

action();
