import { IgApiClient } from "instagram-private-api";
import { saveImage } from "./saveImage";

const ig = new IgApiClient();

export const getImageUrl = async (count: number) => {
  // 로그인
  // ig.state.generateDevice(process.env.IG_USER);
  // await ig.simulate.preLoginFlow();
  // const loggedInUser = await ig.account.login(
  //   process.env.IG_USER,
  //   process.env.IG_PASSWORD
  // ); // 6507186
  // console.log({ loggedInUser }); //
  // process.nextTick(async () => await ig.simulate.postLoginFlow());
  let imgUrls: string[] = [];
  try {
    const result = await ig.feed.user(6507186).items();
    imgUrls = result
      .filter((item) => item.media_type === 1)
      .map((item) => item.image_versions2.candidates[0].url)
      .slice(0, 4);
  } catch (error) {
    // console.log(error);
  }
  if (imgUrls.length === 0) return [];
  const promises = imgUrls.map((url, index) => {
    return saveImage(url, `images/instagram-${index}.jpeg`);
  });
  const savedImage = await Promise.all(promises);
  return savedImage;
};
