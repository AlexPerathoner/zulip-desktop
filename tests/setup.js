"use strict";
const path = require("path");

const rimraf = require("rimraf");
const {Application} = require("spectron");

const testsPkg = require("./package.json");

module.exports = {
  createApp,
  endTest,
  waitForLoad,
  wait,
  resetTestDataDir,
};

// Runs Zulip Desktop.
// Returns a promise that resolves to a Spectron Application once the app has loaded.
// Takes a Tape test. Makes some basic assertions to verify that the app loaded correctly.
function createApp() {
  return new Application({
    path: path.join(
      __dirname,
      "..",
      "node_modules",
      ".bin",
      "electron" + (process.platform === "win32" ? ".cmd" : ""),
    ),
    args: [path.join(__dirname)], // Ensure this dir has a package.json file with a 'main' entry piont
    env: {NODE_ENV: "test"},
    waitTimeout: 10e3,
  });
}

// Starts the app, waits for it to load, returns a promise
async function waitForLoad(app, t, options) {
  if (!options) {
    options = {};
  }

  await app.start();
  await app.client.waitUntilWindowLoaded();
  await app.client.pause(2000);
  const title = await app.webContents.getTitle();
  t.equal(title, "Zulip", "html title");
}

// Returns a promise that resolves after 'ms' milliseconds. Default: 1 second
async function wait(ms) {
  if (ms === undefined) {
    ms = 1000;
  } // Default: wait long enough for the UI to update

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Quit the app, end the test, either in success (!err) or failure (err)
async function endTest(app, t, error) {
  await app.client.windowByIndex(0);
  await app.stop();
  t.end(error);
}

function getAppDataDir() {
  let base;

  switch (process.platform) {
    case "darwin":
      base = path.join(process.env.HOME, "Library", "Application Support");
      break;
    case "linux":
      base = process.env.XDG_CONFIG_HOME
        ? process.env.XDG_CONFIG_HOME
        : path.join(process.env.HOME, ".config");
      break;
    case "win32":
      base = process.env.APPDATA;
      break;
    default:
      throw new Error("Could not detect app data dir base.");
  }

  console.log("Detected App Data Dir base:", base);
  return path.join(base, testsPkg.productName);
}

// Resets the test directory, containing domain.json, window-state.json, etc
function resetTestDataDir() {
  const appDataDir = getAppDataDir();
  rimraf.sync(appDataDir);
}
