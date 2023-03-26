const serverless = require("serverless-http");
const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const app = express();
const axios = require("axios");
var Xray = require("x-ray");
var x = Xray();

async function getpage_91pu(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4668.0 Safari/537.36"
    );
    await page.goto(url);
    const result = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        setInterval(() => {
          try {
            const alllines = document
              .getElementsByClassName("tone")[0]
              .getElementsByTagName("p");
            let result = [];
            for (var j = 0; j < alllines.length; j++)
              result.push({
                body: alllines[j].innerText,
                type:
                  alllines[j].className.indexOf("lyric") != -1
                    ? "lyric"
                    : "chord",
              });
            resolve({
              result: result,
            });
          } catch (e) {
            console.log(e);
          }
        }, 100);
      });
    });
    await browser.close();
    return result;
  } catch (error) {
    return "puppeteer error: " + error;
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

async function spotify_idtodata(id) {
  try {
    const browser = await puppeteer.launch({
      args: [...chromium.args, "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4668.0 Safari/537.36"
    );

    async function waitForNetworkResponse() {
      return new Promise(async (resolve, reject) => {
        await page.setRequestInterception(true);
        page.on("request", (interceptedRequest) => {
          interceptedRequest.continue();
        });
        page.on("response", async (response) => {
          const url = response.url();
          if (url.indexOf("operationName=getTrack") != -1) {
            console.log(url);
            let temp = await response.json();
            temp = temp.data;
            const tempformatted = {
              name: temp.trackUnion.albumOfTrack.name,
              date: temp.trackUnion.albumOfTrack.date.isoString,
              image: temp.trackUnion.albumOfTrack.coverArt.sources[0],
              playcount: temp.trackUnion.playcount,
            };
            resolve(tempformatted);
          }
        });
        await page.goto("https://open.spotify.com/track/" + id);
      });
    }
    const result = await waitForNetworkResponse();

    await browser.close();
    return result;
  } catch (error) {
    return "puppeteer error: " + error;
  }
}

async function soundcloud_idtodata(id) {
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4668.0 Safari/537.36"
    );

    await page.goto("https://soundcloud.com/" + id);
    await page.waitForNetworkIdle();

    const result = await page.evaluate(() => {
      const songname = document
        .getElementById("content")
        .innerText.split("\n")[1];
      let imgurl = "";
      let time;
      try {
        imgurl = document
          .getElementById("content")
          .getElementsByClassName("image")[0]
          .childNodes[1].style.backgroundImage.split('url("')[1]
          .split('")')[0];
      } catch (e) {}
      try {
        time = document.getElementsByTagName("time")[0].dateTime;
      } catch (e) {}
      return {
        songname: songname,
        imgurl: imgurl,
        time: time,
      };
    });

    await browser.close();
    return result;
  } catch (error) {
    return "puppeteer error: " + error;
  }
}

async function soundcloud_idtodata_fast(id) {
  const response = await axios.get("https://soundcloud.com/" + id);

  const image = response.data
    .split("background-image")[1]
    .split("(")[1]
    .split(")")[0];

  return new Promise((resolve, reject) => {
    x("https://soundcloud.com/" + id, {
      main: "h1",
      time: "time",
      icon: "img@src",
    })(function (err, obj) {
      resolve({ ...obj, image: image });
    });
  });
}

async function spotify_idtodata_fast(id) {
  const tokenres = await axios.get("https://open.spotify.com/get_access_token");
  const { accessToken } = tokenres.data;
  console.log(accessToken);
  const response = await axios.get("https://api.spotify.com/v1/tracks/" + id, {
    headers: {
      authority: "api-partner.spotify.com",
      accept: "application/json",
      "accept-language": "zh-TW",
      "app-platform": "WebPlayer",
      authorization: "Bearer " + accessToken,

      "content-type": "application/json;charset=UTF-8",
      origin: "https://open.spotify.com",
      referer: "https://open.spotify.com/",
      "sec-ch-ua":
        '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "spotify-app-version": "1.2.9.81.gdd4d2082",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
  });

  return {
    name: response.data.name,
    artist: response.data.artists[0].name,
    image: response.data.album.images[0],
    date: response.data.album.release_date,
  };
  // return new Promise((resolve, reject) => {
  //   x("https://open.spotify.com/track/" + id, {
  //     main: "h1",
  //     time: "span",
  //     image: "img@src",
  //   })(function (err, obj) {
  //     console.log(obj);
  //     resolve(obj);
  //   });
  // });
}

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

app.get("/getpage", async (req, res, next) => {
  try {
    const result = [];
    if (req.query.url.indexOf("91pu.com") != -1) {
      result = await getpage_91pu(req.query.url);
    }
    return res.status(200).json({
      body: result,
    });
  } catch (e) {
    return res.status(200).json({
      error: e,
    });
  }
});

app.get("/spotify-token", async (req, res, next) => {
  try {
    const tokenres = await axios.get(
      "https://open.spotify.com/get_access_token"
    );
    const { accessToken } = tokenres.data;
    return res.status(200).json({
      body: accessToken,
    });
  } catch (e) {
    return res.status(200).json({
      error: e.toString(),
    });
  }
});

app.get("/spotify", async (req, res, next) => {
  try {
    const result = await spotify_idtodata(req.query.id);
    return res.status(200).json({
      body: result,
    });
  } catch (e) {
    return res.status(200).json({
      error: e.toString(),
    });
  }
});

app.get("/soundcloud", async (req, res, next) => {
  try {
    const result = await soundcloud_idtodata(req.query.id);
    return res.status(200).json({
      body: result,
    });
  } catch (e) {
    return res.status(200).json({
      error: e.toString(),
    });
  }
});

app.get("/spotify-fast", async (req, res, next) => {
  try {
    const result = await spotify_idtodata_fast(req.query.id);
    return res.status(200).json({
      body: result,
    });
  } catch (e) {
    return res.status(200).json({
      error: e.toString(),
    });
  }
});

app.get("/soundcloud-fast", async (req, res, next) => {
  try {
    const result = await soundcloud_idtodata_fast(req.query.id);
    return res.status(200).json({
      body: result,
    });
  } catch (e) {
    return res.status(200).json({
      error: e.toString(),
    });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports.handler = serverless(app);
