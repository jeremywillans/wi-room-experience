//
// Cache Service Module
//

const { cleanEnv, bool, str } = require('envalid');
const fs = require('fs/promises');
const logger = require('./logger')(__filename.slice(__dirname.length + 1, -3));

// Process ENV Parameters
const e = cleanEnv(process.env, {
  LOG_DETAILED: bool({ default: true }),
  APP_PLATFORM: str({ default: 'local' }),
  // Device Cache JSON
  RE_DEVICE_JSON: str({ default: 'cache/devices.json' }),
});

let cachePath;
if (e.APP_PLATFORM === 'container') {
  cachePath = `${__dirname}/../../${e.RE_DEVICE_JSON}`;
} else {
  cachePath = `${__dirname}/../${e.RE_DEVICE_JSON}`;
}

let memCache;
let fileCache;
let validCache = false;

// Sleep Function
async function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function needsUpdate() {
  return memCache.sort().join(',') !== fileCache.sort().join(',');
}

async function update(cache) {
  if (!validCache) return;
  if (!needsUpdate()) return;
  const data = { devices: cache };
  try {
    await fs.writeFile(cachePath, JSON.stringify(data));
    fileCache = JSON.parse(JSON.stringify(memCache));
    logger.debug('Cache file updated');
  } catch (error) {
    logger.error('Unable to update cache');
    logger.debug(error.message);
  }
}
exports.update = update;

async function init() {
  try {
    try {
      await fs.access(cachePath, fs.constants.F_OK);
    } catch (err) {
      try {
        logger.warn('Device Cache does not exist.. attempting to create');
        logger.warn(`Location: ${cachePath}`);
        const initCache = { devices: [] };
        await fs.writeFile(cachePath, JSON.stringify(initCache));
      } catch (error) {
        logger.error('Unable to create cache...');
        logger.debug(error.message);
        logger.error('--- DELAY 10 SEC ---');
        await sleep(10000);
        throw new Error('NO_CACHE');
      }
    }
    validCache = true;
    memCache = JSON.parse(await fs.readFile(cachePath)).devices;
    // update running file instance for comparison
    fileCache = JSON.parse(JSON.stringify(memCache));
    logger.info('Device cache loaded successfully');
    return memCache;
  } catch (error) {
    logger.error('Unable to load Device cache');
    logger.debug(error.message);
    return [];
  }
}
exports.init = init;
