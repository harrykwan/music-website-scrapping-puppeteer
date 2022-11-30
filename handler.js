const serverless = require("serverless-http");
const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const app = express();

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

    await page.goto("https://open.spotify.com/track/" + id);
    await page.waitForNetworkIdle();

    const result = await page.evaluate(() => {
      const songname = document
        .getElementsByTagName("section")[0]
        .childNodes[0].innerText.split("\n")[1];
      const imgurl = document
        .getElementsByTagName("section")[0]
        .childNodes[0].getElementsByTagName("img")[0].src;
      return {
        songname: songname,
        imgurl: imgurl,
      };
    });

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
      const imgurl = document
        .getElementById("content")
        .getElementsByClassName("image")[0]
        .childNodes[1].style.backgroundImage.split('url("')[1]
        .split('")')[0];
      const time = document.getElementsByTagName("time")[0].dateTime;
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

app.get("/spotify", async (req, res, next) => {
  try {
    const result = await spotify_idtodata(req.query.id);
    return res.status(200).json({
      body: result,
    });
  } catch (e) {
    return res.status(200).json({
      error: e,
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
      error: e,
    });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports.handler = serverless(app);
