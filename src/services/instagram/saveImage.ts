import fs from "fs";
import request from "request";
import path from "path";

export const saveImage = (url: string, filename: string): Promise<string> => {
  const fullFilePath = path.resolve(__dirname, "../../../", filename);
  return new Promise((resolve, reject) => {
    request.head(url, (err, res) => {
      if (err) return resolve(err);
      console.log(`content-type: ${res.headers["content-type"]}`);
      console.log(`content-length: ${res.headers["content-length"]}`);
      request(url)
        .pipe(
          fs.createWriteStream(fullFilePath).on("close", () => resolve(filename))
        )
        .on("error", reject);
    });
  });
};
