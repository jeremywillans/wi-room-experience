//
// Room Experience - Workspace Integration
//
// Copyright (c) 2024 Jeremy Willans
// Licensed under the MIT License
//
// App Entrypoint
//

/* eslint-disable no-param-reassign */
const wi = require('workspace-integrations');
const { bootstrap } = require('global-agent');
const schedule = require('node-schedule');
const { cleanEnv, str, bool } = require('envalid');
const logger = require('./src/logger')('app');
const utils = require('./src/utils');
const roomExperience = require('./src/roomExperience');
const httpService = require('./src/httpService');
const cacheService = require('./src/cacheService');
const { name, version } = require('./package.json');

// Process ENV Parameters
const e = cleanEnv(process.env, {
  // Integration Options
  DEVICE_TAG: str({ default: name }),
  WI_LOGGING: str({ default: 'error' }),
  CLIENT_ID: str(),
  CLIENT_SECRET: str(),
  // Enabled Services
  RE_WEBEX_ENABLED: bool({ default: false }),
  RE_HTTP_ENABLED: bool({ default: false }),
  RE_SNOW_ENABLED: bool({ default: false }),
  RE_MACRO_LOCAL: bool({ default: false }),
  // Integration Credentials
  CODE: str({ default: undefined }),
  OAUTH_URL: str({ default: undefined }),
  REFRESH_TOKEN: str({ default: undefined }),
  WEBEXAPIS_BASE_URL: str({ default: undefined }),
  APP_URL: str({ default: undefined }),
  // Global Agent Proxy
  GLOBAL_AGENT_HTTP_PROXY: str({ default: undefined }),
  GLOBAL_AGENT_NO_PROXY: str({ default: undefined }),
});

// Initialize Proxy Server, if defined.
if (e.GLOBAL_AGENT_HTTP_PROXY) {
  logger.info('invoke global agent proxy');
  bootstrap();
}

// Define WI Configuration from ENV Parameters
const wiConfig = {
  clientId: e.CLIENT_ID,
  clientSecret: e.CLIENT_SECRET,
  activationCode: {
    oauthUrl: e.OAUTH_URL,
    refreshToken: e.REFRESH_TOKEN,
    webexapisBaseUrl: e.WEBEXAPIS_BASE_URL,
    appUrl: e.APP_URL,
  },
  notifications: 'longpolling',
  logLevel: e.WI_LOGGING,
};

// Setup Device Cache
let deviceCache;

// Check and process new device
async function processDevice(i, d, deviceId, deviceObj) {
  let device = deviceObj;
  // Get Device object to obtain status and tag info
  if (!device) {
    try {
      device = await i.devices.getDevice(deviceId);
    } catch (error) {
      logger.warn(`Unable to get device: ${utils.shortName(deviceId)}`);
      logger.debug(deviceId);
      logger.debug(error.message);
      return;
    }
  }
  // Check device has correct tag
  if (!device.tags.includes(e.DEVICE_TAG)) return;
  // Ensure device is online before processing
  if (!device.connectionStatus.match(/^connected/)) return;
  // Ensure device meets version requirement
  if (!roomExperience.versionCheck(device.software)) return;
  // Declare Class
  const id = utils.uniqueId(d, deviceId.replace('=', ''));
  d[deviceId] = new roomExperience.Init(i, id, deviceId, httpService);
  logger.info(`${d[deviceId].id}: ${utils.shortName(deviceId)}`);
  logger.info(`${d[deviceId].id}: Creating Instance for ${device.displayName}.`);
  try {
    // configure codec
    await d[deviceId].configureCodec();
    d[deviceId].active = true;
  } catch (error) {
    logger.warn(`${d[deviceId].id}: Unable to process Device!`);
    logger.debug(`${d[deviceId].id}: ${error.message}`);
    // Attempt cleanup from failed device
    await roomExperience.removeAllPanels(i, d[deviceId].id, deviceId);
    await roomExperience.removeAllMacros(i, d[deviceId].id, deviceId);
  }
  // Add to device cache
  if (!deviceCache.includes(deviceId)) {
    deviceCache.push(deviceId);
  }
  // Update Cache file
  if (!deviceObj) {
    cacheService.update(deviceCache);
  }
}

async function cleanupDevice(i, id, deviceId) {
  try {
    let device;
    try {
      device = await i.devices.getDevice(deviceId);
    } catch (error) {
      logger.warn(`${id} Unable to get device to cleanup`);
      logger.debug(error.message);
      return;
    }
    // Ensure device is online before processing
    if (!device.connectionStatus.match(/^connected/)) return;
    // Attempt cleanup
    await roomExperience.removeAllPanels(i, id, deviceId);
    await roomExperience.removeAllMacros(i, id, deviceId);
    // remove from cache
    deviceCache.splice(deviceCache.indexOf(deviceId), 1);
  } catch (error) {
    logger.error(`${id}: Unable to cleanup device`);
    logger.debug(error.message);
  }
}

// Process devices based on tag
async function processDevices(i, d) {
  try {
    // Get devices from xapi
    const devices = await i.devices.getDevices({ tag: e.DEVICE_TAG });
    if (!devices.length) {
      logger.warn('No Matching Devices found!');
    }

    // Split into 20 Device Chunks to reduce load on API Servers during Startup
    const deviceGroups = devices.reduce((all, one, k) => {
      const ch = Math.floor(k / 20);
      // eslint-disable-next-line no-param-reassign
      all[ch] = [].concat((all[ch] || []), one);
      return all;
    }, []);

    // eslint-disable-next-line no-plusplus
    for (let k = 0; k < deviceGroups.length; k++) {
      const id = k + 1;
      if (deviceGroups.length > 1) logger.debug(`process group ${id} of ${deviceGroups.length}`);
      // Process tagged devices
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        deviceGroups[k].map(async (device) => {
          // skip if instance exists
          if (d[device.id]) return;
          await processDevice(i, d, device.id, device);
        }),
      );
    }

    // Update Cache file
    await cacheService.update(deviceCache);

    // Remove untagged / cache entry devices
    const toRemove = Object.keys(d).filter((j) => !devices.map((k) => k.id).includes(j));
    await Promise.all(
      toRemove.map(async (deviceId) => {
        logger.info(`${d[deviceId].id}: Device no longer tagged, removing Instance.`);
        await cleanupDevice(i, d[deviceId].id, deviceId);
        d[deviceId] = null;
        delete d[deviceId];
      }),
    );

    const cacheRemove = deviceCache.filter((j) => !devices.map((k) => k.id).includes(j));
    await Promise.all(
      cacheRemove.map(async (deviceId) => {
        const id = utils.uniqueId(d, deviceId.replace('=', ''));
        logger.info(`${id}: Device listed in cache, performing cleanup.`);
        logger.info(`${id}: ${utils.shortName(deviceId)}`);
        await cleanupDevice(i, id, deviceId);
      }),
    );

    logger.info(`Active Device Class Instances: ${Object.keys(d).filter((k) => d[k].active).length}`);
    const inactiveDevices = Object.keys(d).filter((k) => !d[k].active).length;
    if (inactiveDevices > 0) logger.warn(`Inactive Device Class Instances: ${inactiveDevices}`);
  } catch (error) {
    logger.warn('Unable to process devices');
    logger.debug(error.message);
  }
  // Update Cache file
  cacheService.update(deviceCache);
}

function deviceActive(sys) {
  if (!sys) return false;
  if (!sys.active) {
    logger.warn(`Notification detected from inactive device - ${sys.id}`);
    return false;
  }
  return true;
}

// Init integration
async function init(json) {
  logger.info(`Room Experience Workspace Integration, v${version}`);
  const webex = utils.toTitleCase(e.RE_WEBEX_ENABLED);
  const http = utils.toTitleCase(e.RE_HTTP_ENABLED);
  const snow = utils.toTitleCase(e.RE_SNOW_ENABLED);
  logger.info(`Destinations - Webex: ${webex} | HTTP: ${http} | Service Now: ${snow}`);
  logger.info(`Companion Macro Enabled: ${utils.toTitleCase(e.RE_MACRO_LOCAL)}`);
  let i;
  const d = {}; // Device Entities Object
  // Process integration credentials
  if (!e.OAUTH_URL) {
    try {
      wiConfig.activationCode = utils.parseJwt(e.CODE);
    } catch (error) {
      logger.error('Unable to decode token');
      logger.debug(error.message);
      process.exit(1);
    }
  }
  // Initialize Device Cache
  deviceCache = await cacheService.init();
  try {
    i = await wi.connect(json);
    i.onError(logger.error);
    i.onAction((action) => logger.info(`Integration action: ${JSON.stringify(action)}`));
    logger.info('Integration activation successful!');
  } catch (error) {
    logger.error('Not able to connect to Integration');
    logger.debug(error.message);
    process.exit(1);
  }

  try {
    // Process devices on startup
    logger.info('--- Processing Devices');
    await processDevices(i, d);

    // Periodically re-process devices to capture tag changes (every 30 mins)
    schedule.scheduleJob('*/30 * * * *', async () => {
      logger.info('--- Periodic Device Processing');
      await processDevices(i, d);
    });

    logger.info('--- Processing WI Subscriptions');
    // Process device ready
    i.xapi.status.on('SystemUnit.State.System', async (deviceId, _path, result) => {
      const sys = d[deviceId];
      if (!sys && result === 'Initialized') {
        await processDevice(i, d, deviceId);
      }
    });
    // Process reboot event
    i.xapi.event.on('BootEvent', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (sys) {
        logger.info(`${sys.id}: Device ${event.Action}, Removing Instance.`);
        d[deviceId] = null;
        delete d[deviceId];
      }
    });

    logger.info('--- Processing Subscriptions');
    // Process call disconnect event
    i.xapi.event.on('CallDisconnect', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleCallDisconnect(event);
    });
    // Process call indication event
    i.xapi.event.on('OutgoingCallIndication', (deviceId) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleOutgoingCallIndication();
    });
    // Process text input response
    i.xapi.event.on('UserInterface.Message.TextInput.Response', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleTextInputResponse(event);
    });
    // Process text input clear
    i.xapi.event.on('UserInterface.Message.TextInput.Clear', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleTextInputClear(event);
    });
    // Process panel clicked
    i.xapi.event.on('UserInterface.Extensions.Panel.Clicked', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handlePanelClicked(event);
    });
    // Process page closed
    i.xapi.event.on('UserInterface.Extensions.Event.PageClosed', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handlePageClosed(event);
    });
    // Process widget action
    i.xapi.event.on('UserInterface.Extensions.Widget.Action', (deviceId, _path, event) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleWidgetAction(event);
    });
    // Process active call
    i.xapi.status.on('SystemUnit.State.NumberOfActiveCalls', (deviceId, _path, status) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleActiveCall(status);
    });
    // Process MTR active call
    i.xapi.status.on('MicrosoftTeams.Calling.InCall', (deviceId, _path, status) => {
      const sys = d[deviceId];
      if (!deviceActive(sys)) return;
      sys.handleMTRCall(status);
    });
  } catch (error) {
    logger.error('Error during device and subscription processing');
    logger.debug(error.message);
  }
}

init(wiConfig);
