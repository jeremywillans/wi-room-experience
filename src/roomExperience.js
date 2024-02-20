/* eslint-disable no-useless-escape */
//
// RoomExperience Module
//

// eslint-disable-next-line object-curly-newline
const { cleanEnv, str, bool, num, json } = require('envalid');
const { name, version } = require('../package.json');
const logger = require('./logger')(__filename.slice(__dirname.length + 1, -3));

// Process ENV Parameters
const e = cleanEnv(process.env, {
  // App Parameters
  APP_NAME: str({ default: name }),
  // Panel Parameters
  RE_PANEL_REMOVE: bool({ default: true }),
  RE_PANEL_EMOTICONS: bool({ default: true }),
  // Button Parameters
  RE_FEEDBACK_ENABLED: bool({ default: true }),
  RE_FEEDBACK_COLOR: str({ default: '#1170CF' }),
  RE_FEEDBACK_LOCATION: str({ default: 'HomeScreen' }),
  // Macro Parameters
  RE_MACRO_LOCAL: bool({ default: false }),
  RE_MACRO_REMOVE: bool({ default: true }),
  // Log Parameters
  LOG_DETAILED: bool({ default: true }),
  LOG_UNKNOWN_RESPONSES: bool({ default: false }),
  // Webex Space Parameters
  RE_WEBEX_ENABLED: bool({ default: false }),
  RE_WEBEX_LOG_EXCELLENT: bool({ default: false }),
  RE_WEBEX_BOT_TOKEN: str({ default: undefined }),
  RE_WEBEX_ROOM_ID: str({ default: undefined }),
  RE_WEBEX_FEEDBACK_ID: str({ default: undefined }),
  // HTTP JSON Post Parameters
  RE_HTTP_ENABLED: bool({ default: false }),
  RE_HTTP_URL: str({ default: 'http://localhost:3000' }),
  RE_HTTP_AUTH_ENABLED: bool({ default: false }),
  RE_HTTP_AUTH_HEADER: str({ default: 'Authorization: xxxxx' }),
  RE_HTTP_FORMAT: str({ default: 'none' }),
  // Service Now Parameters
  RE_SNOW_ENABLED: bool({ default: false }),
  RE_SNOW_RAISE_AVERAGE: bool({ default: true }),
  RE_SNOW_INSTANCE: str({ default: undefined }),
  RE_SNOW_CREDENTIALS: str({ default: undefined }),
  RE_SNOW_CALLED_ID: str({ default: undefined }),
  RE_SNOW_CMDB_CI: str({ default: undefined }),
  RE_SNOW_CMDB_LOOKUP: bool({ default: false }),
  RE_SNOW_EXTRA: json({ default: {} }),
  // Global Parameters
  RE_MIN_DURATION: num({ default: 10 }),
  RE_DEFAULT_SUBMIT: bool({ default: true }),
  RE_PROMPT_TITLE: str({ default: 'Room Experience Feedback' }),
  RE_DEBUG_BUTTONS: bool({ default: false }),
  // Timeout Parameters
  RE_TIMEOUT_SURVEY: num({ default: 20 }),
  RE_TIMEOUT_POPUP: num({ default: 20 }),
});

// Define Room Experience options from ENV Parameters
const reOptions = {
  // App Parameters
  appName: e.APP_NAME.replace('wi-', ''), // Name used for panel prefixes and loki app name
  // Panel Parameters
  panelRemove: e.RE_PANEL_REMOVE, // Remove panels prefixed with appName not matching version
  panelEmoticons: e.RE_PANEL_EMOTICONS, // Show emoticons on the panel
  // Button Parameters
  buttonEnabled: e.RE_FEEDBACK_ENABLED, // Include a report issue button on screen
  buttonColor: e.RE_FEEDBACK_COLOR, // Color of button, default blue
  buttonLocation: e.RE_FEEDBACK_LOCATION, // Valid HomeScreen,HomeScreenAndCallControls,ControlPanel
  // Macro Parameters
  macroLocal: e.RE_MACRO_LOCAL, // Use local companion macro for responsive UI interactions
  macroRemove: e.RE_MACRO_REMOVE, // Remove macro prefixed with appName not matching version
  // Logging Parameters
  logDetailed: e.LOG_DETAILED, // Enable detailed logging
  logUnknownResponses: e.LOG_UNKNOWN_RESPONSES, // Show unknown extension responses in the log
  // Webex Space Parameters
  webexEnabled: e.RE_WEBEX_ENABLED, // Enable for Webex Space Message Logging
  webexLogExcellent: e.RE_WEBEX_LOG_EXCELLENT, // Optionally log excellent results to Webex Space
  webexBotToken: e.RE_WEBEX_BOT_TOKEN, // Webex Bot Token for sending messages
  webexRoomId: e.RE_WEBEX_ROOM_ID, // Webex Room Id for sending messages
  webexFeedbackId: e.RE_WEBEX_FEEDBACK_ID, // If defined, feedback messages will be sent here.
  // HTTP JSON Post Parameters
  httpEnabled: e.RE_HTTP_ENABLED, // Enable for JSON HTTP POST Destination
  httpUrl: e.RE_HTTP_URL, // HTTP Server POST URL
  httpAuth: e.RE_HTTP_AUTH_ENABLED, // Destination requires HTTP Header for Authentication
  httpHeader: e.RE_HTTP_AUTH_HEADER, // Header Content for HTTP POST Authentication
  httpFormat: e.RE_HTTP_FORMAT, // HTTP Custom Formatting - none,loki,powerBi
  // Service Now Parameters
  snowEnabled: e.RE_SNOW_ENABLED, // Enable for Service NOW Incident Raise
  snowRaiseAvg: e.RE_SNOW_RAISE_AVERAGE, // Raise SNOW Incident for Average Responses
  snowInstance: e.RE_SNOW_INSTANCE, // Specify the base url for Service Now
  snowCredentials: e.RE_SNOW_CREDENTIALS, // Basic Auth format is "username:password" base64-encoded
  snowCallerId: e.RE_SNOW_CALLED_ID, // Default Caller for Incidents, needs to be sys_id of Caller
  snowCmdbCi: e.RE_SNOW_CMDB_CI, // Default CMDB CI, needs to be sys_id of CI
  snowCmdbLookup: e.RE_SNOW_CMDB_LOOKUP, // Lookup Device using Serial Number in Service Now
  snowExtra: e.RE_SNOW_EXTRA, // Any extra parameters to pass to Service Now
  // Global Parameters
  minDuration: e.RE_MIN_DURATION, // Minimum call duration (seconds) before Survey is displayed
  defaultSubmit: e.RE_DEFAULT_SUBMIT, // Send result if not explicitly submitted (timeout).
  promptTitle: e.RE_PROMPT_TITLE, // Title shown on displayed prompts.
  debugButtons: e.RE_DEBUG_BUTTONS, // Enables use of debugging Actions buttons designed for testing
  // Timeout Parameters
  timeoutSurvey: e.RE_TIMEOUT_SURVEY, // Timeout before initial survey panel is dismissed (seconds)
  timeoutPopup: e.RE_TIMEOUT_POPUP, // Timeout before survey popups are dismissed (seconds)
};

const header = [
  'Content-Type: application/json',
  'Accept: application/json',
];
const webexHeader = [...header, `Authorization: Bearer ${reOptions.webexBotToken}`];
const snowHeader = [...header, `Authorization: Basic ${reOptions.snowCredentials}`];
const httpHeader = reOptions.httpAuth ? [...header, reOptions.httpHeader] : [...header];
const snowIncidentUrl = `https://${reOptions.snowInstance}/api/now/table/incident`;
const snowUserUrl = `https://${reOptions.snowInstance}/api/now/table/sys_user`;
const snowCMDBUrl = `https://${reOptions.snowInstance}/api/now/table/cmdb_ci`;
const panelId = `${reOptions.appName}-${version.replaceAll('.', '')}${reOptions.panelEmoticons ? 'e' : ''}`;
const buttonId = `b-${reOptions.appName}-${version.replaceAll('.', '')}`;
const macroId = `m-${reOptions.appName}-${version.replaceAll('.', '')}`;

// Call Domains
const vimtDomain = '@m.webex.com';
const googleDomain = 'meet.google.com';
const msftDomain = 'teams.microsoft.com';
const zoomDomain = '(@zm..\.us|@zoomcrc.com)';

// Time Formatter
function formatTime(seconds) {
  const d = Math.floor((seconds / 3600) / 24);
  const h = Math.floor((seconds / 3600) % 24);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 3600 % 60);
  // eslint-disable-next-line no-nested-ternary
  const dDisplay = d > 0 ? d + (d === 1 ? (h > 0 || m > 0 ? ' day, ' : ' day') : (h > 0 || m > 0 ? ' days, ' : ' days')) : '';
  // eslint-disable-next-line no-nested-ternary
  const hDisplay = h > 0 ? h + (h === 1 ? (m > 0 || s > 0 ? ' hour, ' : ' hour') : (m > 0 || s > 0 ? ' hours, ' : ' hours')) : '';
  const mDisplay = m > 0 ? m + (m === 1 ? ' minute' : ' minutes') : '';
  const sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';

  if (m < 1) {
    return `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`;
  }

  return `${dDisplay}${hDisplay}${mDisplay}`;
}

// Sleep Function
async function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rating Formatter
function formatRating(rating) {
  switch (rating) {
    case 1:
      return 'Excellent';
    case 2:
      return 'Average';
    case 3:
      return 'Poor';
    case 4:
      return 'Not-Applicable';
    default:
      return 'Unknown';
  }
}

// Call Type Formatter
function formatType(type) {
  switch (type) {
    case 'webex':
      return 'Webex';
    case 'endpoint':
      return 'Device/User';
    case 'vimt':
      return 'Teams VIMT';
    case 'msft':
      return 'Teams WebRTC';
    case 'google':
      return 'Google WebRTC';
    case 'zoom':
      return 'Zoom';
    case 'mtr':
      return 'Microsoft Teams Call';
    default:
      return 'Unknown';
  }
}

// RoomOS Version Check
const minVersion = '11.0.0.0';
async function versionCheck(sysVersion) {
  const reg = /^\D*(?<MAJOR>\d*)\.(?<MINOR>\d*)\.(?<EXTRA>\d*)\.(?<BUILD>\d*).*$/i;
  const x = (reg.exec(sysVersion)).groups;
  const y = (reg.exec(minVersion)).groups;
  if (Number(x.MAJOR) > Number(y.MAJOR)) return true;
  if (Number(x.MAJOR) < Number(y.MAJOR)) return false;
  if (Number(x.MINOR) > Number(y.MINOR)) return true;
  if (Number(x.MINOR) < Number(y.MINOR)) return false;
  if (Number(x.EXTRA) > Number(y.EXTRA)) return true;
  if (Number(x.EXTRA) < Number(y.EXTRA)) return false;
  if (Number(x.BUILD) > Number(y.BUILD)) return true;
  if (Number(x.BUILD) < Number(y.BUILD)) return false;
  return false;
}
exports.versionCheck = versionCheck;

// Cleanup Panels after Untagged
async function removeAllPanels(i, id, deviceId) {
  let errorOutcome = false;
  const config = await i.xapi.command(deviceId, 'UserInterface.Extensions.List');
  if (config.Extensions && config.Extensions.Panel) {
    const { Panel } = config.Extensions;
    const regex = new RegExp(`^(${reOptions.appName}|b-${reOptions.appName})`);
    const panels = Panel.filter((panel) => panel.PanelId.match(regex));
    if (reOptions.panelRemove && panels.length > 0) {
      await Promise.all(
        panels.map(async (panel) => {
          if (reOptions.logDetailed) logger.debug(`${id}: Removing Panel: ${panel.PanelId}`);
          try {
            await i.xapi.command(deviceId, 'UserInterface.Extensions.Panel.Remove', { PanelId: panel.PanelId });
          } catch (error) {
            logger.error(`${id}: Unable to remove Panel`);
            logger.debug(`${id}: ${error.message}`);
            errorOutcome = true;
          }
        }),
      );
    }
  }
  if (errorOutcome) {
    throw new Error('UNSUCCESSFUL');
  }
}
exports.removeAllPanels = removeAllPanels;

// Cleanup Macros after Untagged
async function removeAllMacros(i, id, deviceId) {
  let errorOutcome = false;
  const config = await i.xapi.command(deviceId, 'Macros.Macro.Get');
  if (config && config.Macro) {
    const legacy = config.Macro.filter((macro) => macro.Name.startsWith(`m-${reOptions.appName}`));
    if (reOptions.macroRemove && legacy.length > 0) {
      await Promise.all(
        legacy.map(async (macro) => {
          if (reOptions.logDetailed) logger.debug(`${id}: Removing Macro: ${macro.Name}`);
          try {
            await i.xapi.command(deviceId, 'Macros.Macro.Remove', { Name: macro.Name });
          } catch (error) {
            logger.error(`${id}: Unable to remove Macro`);
            logger.debug(`${id}: ${error.message}`);
            errorOutcome = true;
          }
        }),
      );
      await this.xapi.command(this.deviceId, 'Macros.Runtime.Restart');
    }
  }
  if (errorOutcome) {
    throw new Error('UNSUCCESSFUL');
  }
}
exports.removeAllMacros = removeAllMacros;

// Room Experience Class
class RoomExperience {
  constructor(i, id, deviceId, httpService) {
    this.id = id;
    this.deviceId = deviceId;
    this.h = httpService;
    this.active = false;
    this.xapi = i.xapi;
    this.o = reOptions;
    this.callInfo = {};
    this.sysInfo = {};
    this.isRoomOS = true;

    // Initial variables
    this.qualityInfo = {};
    this.showFeedback = true;
    this.voluntaryRating = false;
    this.errorResult = false;
    this.skipLog = false;
    this.userInfo = {};
    this.callDestination = false;
    this.callType = '';
    this.callMatched = false;
    this.panelTimeout = null;
    this.feedbackReport = false;
  }

  // Reset variables
  resetVariables() {
    if (this.o.logDetailed) logger.debug('Init Variables');
    this.qualityInfo = {
      rating: 1,
      audio: 1,
      video: 1,
      equipment: 1,
      cleanliness: 1,
      comments: '',
      email: '',
    };
    this.showFeedback = true;
    this.voluntaryRating = false;
    this.errorResult = false;
    this.skipLog = false;
    this.userInfo = {};
    this.callDestination = false;
    this.callType = '';
    this.callMatched = false;
    this.panelTimeout = null;
    this.feedbackReport = false;
    if (!this.o.macroLocal) {
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'video_rating' });
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'audio_rating' });
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'room_equipment' });
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'room_cleanliness' });
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: 'Add Comments >', WidgetId: 'comments_text' });
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: 'Add Email >', WidgetId: 'email_text' });
    }
  }

  // Remove Macro from Device
  async removeMacro(Name) {
    if (this.o.logDetailed) logger.debug(`${this.id}: Removing Macro: ${Name}`);
    try {
      await this.xapi.command(this.deviceId, 'Macros.Macro.Remove', { Name });
    } catch (error) {
      logger.error(`${this.id}: Unable to remove Macro`);
      logger.debug(`${this.id}: ${error.message}`);
    }
  }

  // Check Macro Status
  async checkMacro() {
    let match = false;
    const config = await this.xapi.command(this.deviceId, 'Macros.Macro.Get');
    if (config && config.Macro) {
      const current = config.Macro.find((macro) => macro.Name === macroId);
      if (current) {
        match = true;
      }
      let legacy = config.Macro.filter((macro) => macro.Name.startsWith(`m-${this.o.appName}`));
      legacy = legacy.filter((macro) => macro.Name !== macroId);
      if (this.o.macroRemove && legacy.length > 0) {
        legacy.forEach(async (macro) => {
          await this.removeMacro(macro.Name);
        });
        await this.xapi.command(this.deviceId, 'Macros.Runtime.Restart');
      }
    }
    return match;
  }

  // Add Macro to Device
  async addMacro() {
    if (this.o.logDetailed) logger.debug(`${this.id}: Adding Macro: ${macroId}`);

    // eslint-disable-next-line no-use-before-define
    await this.xapi.command(this.deviceId, 'Macros.Macro.Save', { Name: macroId }, companionMacro);
    await this.xapi.command(this.deviceId, 'Macros.Macro.Activate', { Name: macroId });
    await sleep(2000);
    await this.xapi.command(this.deviceId, 'Macros.Runtime.Restart');
  }

  // Remove Panel from UI
  async removePanel(PanelId) {
    if (this.o.logDetailed) logger.debug(`${this.id}: Removing Panel: ${PanelId}`);
    try {
      await this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Remove', { PanelId });
    } catch (error) {
      logger.error(`${this.id}: Unable to remove Panel`);
      logger.debug(`${this.id}: ${error.message}`);
    }
  }

  // Check Survey Panel UI status
  async checkPanel() {
    let match = false;
    const config = await this.xapi.command(this.deviceId, 'UserInterface.Extensions.List');
    if (config.Extensions && config.Extensions.Panel) {
      const { Panel } = config.Extensions;
      const current = Panel.find((panel) => panel.PanelId === panelId);
      if (current) {
        match = true;
      }
      let legacy = Panel.filter((panel) => panel.PanelId.startsWith(this.o.appName));
      legacy = legacy.filter((panel) => panel.PanelId !== panelId);
      if (this.o.panelRemove && legacy.length > 0) {
        legacy.forEach(async (panel) => {
          await this.removePanel(panel.PanelId);
        });
      }
    }
    return match;
  }

  // Add Survey Panel to UI
  async addPanel() {
    if (this.o.logDetailed) logger.debug(`${this.id}: Adding Room Experience Panel: ${panelId}`);
    const xml = `<?xml version="1.0"?>
    <Extensions>
      <Version>1.11</Version>
      <Panel>
        <Order>1</Order>
        <PanelId>${panelId}</PanelId>
        <Origin>local</Origin>
        <Location>Hidden</Location>
        <Icon>Lightbulb</Icon>
        <Name>${this.o.promptTitle}</Name>
        <ActivityType>Custom</ActivityType>
        <Page>
          <Name>${this.o.promptTitle}</Name>
          <Row>
            <Name>${this.o.panelEmoticons ? '📺 ' : ''}Video Rating</Name>
            <Widget>
              <WidgetId>video_rating</WidgetId>
              <Type>GroupButton</Type>
              <Options>size=4</Options>
              <ValueSpace>
                <Value>
                  <Key>1</Key>
                  <Name>${formatRating(1)}${this.o.panelEmoticons ? ' 🎉' : ''}</Name>
                </Value>
                <Value>
                  <Key>2</Key>
                  <Name>${formatRating(2)}${this.o.panelEmoticons ? ' 😐' : ''}</Name>
                </Value>
                <Value>
                  <Key>3</Key>
                  <Name>${formatRating(3)}${this.o.panelEmoticons ? ' 👎' : ''}</Name>
                </Value>
                <Value>
                  <Key>4</Key>
                  <Name>N/A${this.o.panelEmoticons ? ' 🚫' : ''}</Name>
                </Value>
              </ValueSpace>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '🎙️ ' : ''}Audio Rating</Name>
            <Widget>
              <WidgetId>audio_rating</WidgetId>
              <Type>GroupButton</Type>
              <Options>size=4</Options>
              <ValueSpace>
                <Value>
                  <Key>1</Key>
                  <Name>${formatRating(1)}${this.o.panelEmoticons ? ' 🎉' : ''}</Name>
                </Value>
                <Value>
                  <Key>2</Key>
                  <Name>${formatRating(2)}${this.o.panelEmoticons ? ' 😐' : ''}</Name>
                </Value>
                <Value>
                  <Key>3</Key>
                  <Name>${formatRating(3)}${this.o.panelEmoticons ? ' 👎' : ''}</Name>
                </Value>
                <Value>
                  <Key>4</Key>
                  <Name>N/A${this.o.panelEmoticons ? ' 🚫' : ''}</Name>
                </Value>
              </ValueSpace>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '🍿 ' : ''}Room Equipment</Name>
            <Widget>
              <WidgetId>room_equipment</WidgetId>
              <Type>GroupButton</Type>
              <Options>size=4</Options>
              <ValueSpace>
                <Value>
                  <Key>1</Key>
                  <Name>${formatRating(1)}${this.o.panelEmoticons ? ' 🎉' : ''}</Name>
                </Value>
                <Value>
                  <Key>2</Key>
                  <Name>${formatRating(2)}${this.o.panelEmoticons ? ' 😐' : ''}</Name>
                </Value>
                <Value>
                  <Key>3</Key>
                  <Name>${formatRating(3)}${this.o.panelEmoticons ? ' 👎' : ''}</Name>
                </Value>
                <Value>
                  <Key>4</Key>
                  <Name>N/A${this.o.panelEmoticons ? ' 🚫' : ''}</Name>
                </Value>
              </ValueSpace>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '🧹 ' : ''}Room Cleanliness</Name>
            <Widget>
              <WidgetId>room_cleanliness</WidgetId>
              <Type>GroupButton</Type>
              <Options>size=4;columns=4</Options>
              <ValueSpace>
                <Value>
                  <Key>1</Key>
                  <Name>${formatRating(1)}${this.o.panelEmoticons ? ' 🎉' : ''}</Name>
                </Value>
                <Value>
                  <Key>2</Key>
                  <Name>${formatRating(2)}${this.o.panelEmoticons ? ' 😐' : ''}</Name>
                </Value>
                <Value>
                  <Key>3</Key>
                  <Name>${formatRating(3)}${this.o.panelEmoticons ? ' 👎' : ''}</Name>
                </Value>
                <Value>
                  <Key>4</Key>
                  <Name>N/A${this.o.panelEmoticons ? ' 🚫' : ''}</Name>
                </Value>
              </ValueSpace>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '💬 ' : ''}Comments (Optional)</Name>
            <Widget>
              <WidgetId>comments_text</WidgetId>
              <Name>Add Comments &gt;</Name>
              <Type>Text</Type>
              <Options>size=3;fontSize=normal;align=right</Options>
            </Widget>
            <Widget>
              <WidgetId>comments_edit</WidgetId>
              <Name>Edit</Name>
              <Type>Button</Type>
              <Options>size=1</Options>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '📧 ' : ''}Email (Optional)</Name>
            <Widget>
              <WidgetId>email_text</WidgetId>
              <Name>Add Email &gt;</Name>
              <Type>Text</Type>
              <Options>size=3;fontSize=normal;align=right</Options>
            </Widget>
            <Widget>
              <WidgetId>email_edit</WidgetId>
              <Name>Edit</Name>
              <Type>Button</Type>
              <Options>size=1</Options>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '🚀 ' : ''}Submit Feedback</Name>
            <Widget>
              <WidgetId>survey_submit</WidgetId>
              <Name>- Submit -</Name>
              <Type>Button</Type>
              <Options>size=4</Options>
            </Widget>
          </Row>
          <PageId>${panelId}-survey</PageId>
          <Options>hideRowNames=0</Options>
        </Page>
      </Panel>
    </Extensions>`;

    await this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Save', { PanelId: panelId }, xml);
  }

  // Check Feedback button UI Status
  async checkButton() {
    let match = false;
    const config = await this.xapi.command(this.deviceId, 'UserInterface.Extensions.List');
    if (config.Extensions && config.Extensions.Panel) {
      const { Panel } = config.Extensions;
      const current = Panel.find((panel) => panel.PanelId === buttonId);
      if (current) {
        match = true;
      }
      let legacy = Panel.filter((panel) => panel.PanelId.startsWith(`b-${this.o.appName}`));
      legacy = legacy.filter((panel) => panel.PanelId !== buttonId);
      if (this.o.panelRemove && legacy.length > 0) {
        legacy.forEach(async (panel) => {
          await this.removePanel(panel.PanelId);
        });
      }
    }
    return match;
  }

  // Add Feedback button to UI
  async addButton(isRoomOS) {
    if (this.o.logDetailed) logger.debug(`${this.id}: Adding Room Experience Button: ${buttonId}`);
    const xml = `<?xml version="1.0"?>
    <Extensions>
      <Version>1.11</Version>
      <Panel>
        <Order>1</Order>
        <PanelId>${buttonId}</PanelId>
        <Location>${isRoomOS ? this.o.buttonLocation : 'ControlPanel'}</Location>
        <Icon>Concierge</Icon>
        <Color>${this.o.buttonColor}</Color>
        <Name>Feedback</Name>
        <ActivityType>Custom</ActivityType>
      </Panel>
    </Extensions>`;

    await this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Save', { PanelId: buttonId }, xml);
  }

  // Post content to Webex Space
  async postWebex() {
    if (this.o.logDetailed) logger.debug(`${this.id}: Process postWebex function`);
    let blockquote;
    switch (this.qualityInfo.rating) {
      case 1:
        blockquote = '<blockquote class=success>';
        break;
      case 2:
        blockquote = '<blockquote class=warning>';
        break;
      case 3:
        blockquote = '<blockquote class=danger>';
        break;
      default:
        logger.debug(`${this.id}: Unhandled Response`);
    }

    let html = (`<b>Room Experience ${this.feedbackReport ? 'Feedback ' : 'Call Survey'} Report - ${formatRating(this.qualityInfo.rating)}</b>${blockquote}<b>System Name:</b> ${this.sysInfo.name}<br><b>Serial Number:</b> ${this.sysInfo.serial}<br><b>SW Release:</b> ${this.sysInfo.version}`);
    html += `<br><b>Source:</b> ${this.feedbackReport ? 'Feedback Button' : 'Call Survey'}`;
    if (this.callType) { html += `<br><b>Call Type:</b> ${formatType(this.callType)}`; }
    if (this.callDestination) { html += `<br><b>Destination:</b> ${this.callDestination}`; }
    if (this.callInfo.Duration) { html += `<br><b>Call Duration:</b> ${formatTime(this.callInfo.Duration)}`; }
    if (this.callInfo.CauseType) { html += `<br><b>Disconnect Cause:</b> ${this.callInfo.CauseType}`; }
    if (this.qualityInfo.video) { html += `<br><b>Video Rating:</b> ${formatRating(this.qualityInfo.video)}`; }
    if (this.qualityInfo.audio) { html += `<br><b>Audio Rating:</b> ${formatRating(this.qualityInfo.audio)}`; }
    if (this.qualityInfo.equipment) { html += `<br><b>Equipment Rating:</b> ${formatRating(this.qualityInfo.equipment)}`; }
    if (this.qualityInfo.cleanliness) { html += `<br><b>Cleanliness Rating:</b> ${formatRating(this.qualityInfo.cleanliness)}`; }
    if (this.qualityInfo.comments) { html += `<br><b>Quality Comments:</b> ${this.qualityInfo.comments}`; }
    const voluntary = this.voluntaryRating ? 'Yes' : 'No';
    if (this.o.defaultSubmit) { html += `<br><b>Voluntary Rating:</b> ${voluntary}`; }
    if (this.qualityInfo.incident) { html += `<br><b>Incident Reference:</b> ${this.qualityInfo.incident}`; }
    if (this.userInfo.sys_id) {
      html += `<br><b>Reporter:</b>  <a href=webexteams://im?email=${this.userInfo.email}>${this.userInfo.name}</a> (${this.userInfo.email})`;
    } else if (this.qualityInfo.email) {
      // Include Provided Email if not matched in SNOW
      html += `<br><b>Provided Email:</b> ${this.qualityInfo.email}`;
    }
    html += '</blockquote>';

    let roomId = this.o.webexRoomId;
    if (this.o.webexFeedbackId && this.o.webexFeedbackId !== '') {
      roomId = this.o.webexFeedbackId;
    }

    const messageContent = { roomId, html };

    try {
      const result = await this.h.postHttp(this.id, webexHeader, 'https://webexapis.com/v1/messages', messageContent);
      if (/20[04]/.test(result.StatusCode)) {
        if (this.o.logDetailed) logger.debug(`${this.id}: postWebex message sent.`);
        return;
      }
      logger.error(`${this.id}: postWebex status: ${result.StatusCode}`);
      this.errorResult = true;
      if (result.message && this.o.logDetailed) {
        logger.debug(`${this.id}: ${result.message}`);
      }
    } catch (error) {
      logger.error(`${this.id}: postWebex error`);
      logger.debug(`${this.id}: ${error.message}`);
      this.errorResult = true;
    }
  }

  // Post JSON content to Http Server
  async postHttp() {
    logger.debug(`${this.id}: Process postHttp function`);
    let messageContent = {
      timestamp: Date.now(),
      system: this.sysInfo.name,
      serial: this.sysInfo.serial,
      version: this.sysInfo.version,
      source: this.feedbackReport ? 'feedback' : 'call',
      rating: this.qualityInfo.rating,
      rating_fmt: formatRating(this.qualityInfo.rating),
      destination: this.callDestination || '',
      type: this.callType || '',
      type_fmt: this.callType !== '' ? formatType(this.callType) : '',
      duration: this.callInfo.Duration || 0,
      duration_fmt: formatTime(this.callInfo.Duration),
      cause: this.callInfo.CauseType || '',
      video: this.qualityInfo.video,
      video_fmt: formatRating(this.qualityInfo.video),
      audio: this.qualityInfo.audio,
      audio_fmt: formatRating(this.qualityInfo.audio),
      equipment: this.qualityInfo.equipment,
      equipment_fmt: formatRating(this.qualityInfo.equipment),
      cleanliness: this.qualityInfo.cleanliness,
      cleanliness_fmt: formatRating(this.qualityInfo.cleanliness),
      comments: this.qualityInfo.comments,
      email: this.qualityInfo.email,
      voluntary: this.voluntaryRating ? 1 : 0,
    };

    switch (this.o.httpFormat) {
      case 'loki':
        messageContent = {
          streams: [
            {
              stream: {
                app: this.o.appName,
              },
              values: [[`${messageContent.timestamp}000000`, messageContent]],
            },
          ],
        };
        // Append Loki API path if missing.
        if (!this.o.httpUrl.match('/loki/api/v1/push')) {
          this.o.httpUrl = this.o.httpUrl.replace(/\/$/, '');
          this.o.httpUrl = `${this.o.httpUrl}/loki/api/v1/push`;
        }
        break;
      case 'powerBi': {
        const ts = new Date(messageContent.timestamp);
        messageContent.timestamp = ts.toISOString();
        messageContent = [messageContent];
        break;
      }
      default:
    }

    try {
      const result = await this.h.postHttp(this.id, httpHeader, this.o.httpUrl, messageContent);
      if (/20[04]/.test(result.StatusCode)) {
        if (this.o.logDetailed) logger.debug(`${this.id}: postHttp message sent.`);
        return;
      }
      logger.error(`${this.id}: postHttp status: ${result.StatusCode}`);
      if (result.message && this.o.logDetailed) {
        logger.debug(`${this.id}: ${result.message}`);
      }
    } catch (error) {
      logger.error(`${this.id}: postHttp error encountered`);
      logger.debug(`${this.id}: ${JSON.stringify(error.errors)}`);
    }
  }

  // Raise ticket in Service Now
  async raiseTicket() {
    if (this.o.logDetailed) logger.debug(`${this.id}: Process raiseTicket function`);
    let description = `Room Experience ${this.feedbackReport ? 'Feedback ' : 'Call Survey'} Report - ${formatRating(this.qualityInfo.rating)}\n\nSystem Name: ${this.sysInfo.name}\nSerial Number: ${this.sysInfo.serial}\nVersion: ${this.sysInfo.version}`;
    description += `\nSource: ${this.feedbackReport ? 'Report Issue Button' : 'Call Survey'}`;
    if (this.callDestination) { description += `\nCall Type: ${formatType(this.callType)}`; }
    if (this.callDestination) { description += `\nDestination: \`${this.callDestination}\``; }
    if (this.callInfo.Duration) { description += `\nCall Duration: ${formatTime(this.callInfo.Duration)}`; }
    if (this.callInfo.CauseType) { description += `\nDisconnect Cause: ${this.callInfo.CauseType}`; }
    if (this.qualityInfo.video) { description += `\n\nVideo Rating: ${formatRating(this.qualityInfo.video)}`; }
    if (this.qualityInfo.audio) { description += `\nAudio Rating: ${formatRating(this.qualityInfo.audio)}`; }
    if (this.qualityInfo.equipment) { description += `\nEquipment Rating: ${formatRating(this.qualityInfo.equipment)}`; }
    if (this.qualityInfo.cleanliness) { description += `\nCleanliness Rating: ${formatRating(this.qualityInfo.cleanliness)}`; }
    if (this.qualityInfo.comments) { description += `\nFeedback Comments: ${this.qualityInfo.comments}`; }
    const shortDescription = `${this.sysInfo.name}: ${formatRating(this.qualityInfo.rating)} Room Experience ${this.feedbackReport ? 'Feedback ' : 'Call Survey'} Report`;

    // Initial Construct Incident
    let messageContent = { short_description: shortDescription, description };
    // Add Default Caller, if defined.
    if (this.o.snowCallerId) {
      messageContent.caller_id = this.o.snowCallerId;
    }

    // SNOW Email Lookup, or append to description.
    if (this.qualityInfo.email) {
      try {
        let result = await this.h.getHttp(this.id, snowHeader, `${snowUserUrl}?sysparm_limit=1&email=${this.qualityInfo.email}`);
        result = result.data.result;
        // Validate User Data
        if (result.length === 1) {
          [this.userInfo] = result;
          messageContent.caller_id = this.userInfo.sys_id;
        } else {
          messageContent.description += `\nProvided Email: ${this.qualityInfo.email}}`;
        }
      } catch (error) {
        logger.error(`${this.id}: raiseTicket getUser error encountered`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }

    if (this.o.snowCmdbCi) {
      messageContent.cmdb_ci = this.o.snowCmdbCi;
    }

    if (this.o.snowCmdbLookup) {
      try {
        let result = await this.h.getHttp(this.id, snowHeader, `${snowCMDBUrl}?sysparm_limit=1&serial_number=${this.sysInfo.serial}`);
        result = result.data.result;
        // Validate CI Data
        if (result.length === 1) {
          const [ciInfo] = result;
          messageContent.cmdb_ci = ciInfo.sys_id;
        }
      } catch (error) {
        logger.error(`${this.id}: raiseTicket getCMDBCi error encountered`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }

    // Merge Extra Params
    if (this.o.snowExtra) {
      messageContent = { ...messageContent, ...this.o.snowExtra };
    }

    try {
      let result = await this.h.postHttp(this.id, snowHeader, snowIncidentUrl, messageContent);
      const incidentUrl = result.headers.location;
      result = await this.h.getHttp(this.id, snowHeader, incidentUrl);
      this.qualityInfo.incident = result.data.result.number;
      if (this.o.logDetailed) logger.debug(`raiseTicket successful: ${this.qualityInfo.incident}`);
    } catch (error) {
      logger.error(`${this.id}: raiseTicket error encountered`);
      logger.debug(`${this.id}: ${error.message}`);
      this.errorResult = true;
    }
  }

  // Show Survey Panel shown after call disconnect
  showSurvey() {
    if (this.callInfo.Duration > this.o.minDuration) {
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Open', { PanelId: panelId });
      this.setPanelTimeout();
    } else if (this.feedbackReport) {
      if (!this.o.macroLocal) this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Open', { PanelId: panelId });
      this.setPanelTimeout();
    } else {
      this.resetVariables();
      /*
      this.xapi.command(this.deviceId, 'UserInterface.Message.Prompt.Display', {
        Title: promptTitle,
        Text: 'Call did not complete. What happened?',
        FeedbackId: 'no_call_rating',
        'Option.1': 'I dialled the wrong number!',
        'Option.2': 'Call did not answer',
        'Option.3': 'Oops, wrong button',
      });
      */
    }
  }

  // Close panel and Process enabled services
  async processRequest() {
    clearTimeout(this.panelTimeout);
    await this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Close');
    if (this.o.httpEnabled) {
      this.postHttp(); // Always post result to HTTP Server if enabled
    }
    if (this.o.snowEnabled && (
      this.qualityInfo.rating === 3 // Raise ticket if rating is Poor
      // Raise ticket for Average rating if enabled)
      || (this.qualityInfo.rating === 2 && this.o.snowRaiseAvg))) {
      await this.raiseTicket();
    }
    if (this.o.webexEnabled && (
      // Post if rating is Excellent and logging is enabled (not Feedback button)
      (this.qualityInfo.rating === 1 && this.o.webexLogExcellent && !this.feedbackReport)
      || this.qualityInfo.rating !== 1 // Post if rating is Average or Poor Rating
      || this.qualityInfo.comments !== '') // Always post if contains Comments
    ) {
      await this.postWebex();
    }
    await sleep(600);
    if (this.showFeedback) {
      let Title = 'Acknowledgement';
      let Text = 'Thanks for your feedback!';
      let Duration = 20;
      if (this.errorResult) {
        Title = 'Error Encountered';
        Text = 'Sorry we were unable to submit your feedback.<br>Please advise your IT Support team of this error.';
        Duration = 20;
      }
      if (this.qualityInfo.incident) {
        Text += `<br>Incident ${this.qualityInfo.incident} raised.`;
      }
      this.xapi.command('UserInterface.Message.Alert.Display', {
        Title,
        Text,
        Duration,
      });
    }
    await sleep(3000);
    this.resetVariables();
  }

  // Define timeout before processing Survey panel
  setPanelTimeout() {
    clearTimeout(this.panelTimeout);
    this.panelTimeout = setTimeout(() => {
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Close');
    }, this.o.timeoutSurvey * 1000);
  }

  // Process call data
  async processCall() {
    if (this.callMatched) {
      return;
    }
    let call;
    try {
      [call] = await this.xapi.status.get(this.deviceId, 'Call');
    } catch (error) {
      // No Active Call
      return;
    }

    if (call.Protocol === 'WebRTC') {
      this.callType = 'webrtc';
      this.callDestination = call.CallbackNumber;
      // Matched WebRTC Call
      if (call.CallbackNumber.match(msftDomain)) {
        // Matched Teams Call
        this.callType = 'msft';
        this.callMatched = true;
        if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
        return;
      }
      if (call.CallbackNumber.match(googleDomain)) {
        // Matched Google Call
        this.callType = 'google';
        this.callMatched = true;
        if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
        return;
      }
      // Fallback WebRTC Call
      if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
      return;
    }

    // Default Call Type
    this.callType = 'sip';
    this.callDestination = call.CallbackNumber;
    if (call.CallbackNumber.match(vimtDomain)) {
      // Matched VIMT Call
      this.callType = 'vimt';
      this.callMatched = true;
      if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
      return;
    }
    if (call.CallbackNumber.match('.webex.com')) {
      // Matched Webex Call
      this.callType = 'webex';
      this.callMatched = true;
      if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
      return;
    }
    if (call.CallbackNumber.match(zoomDomain)) {
      // Matched Zoom Call
      this.callType = 'zoom';
      this.callMatched = true;
      if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
      return;
    }
    if (call.DeviceType === 'Endpoint' && call.CallbackNumber.match('^[^.]*$')) {
      // Matched Endpoint/User Call
      this.callType = 'endpoint';
      this.callDestination = `${call.DisplayName}: ${call.CallbackNumber})`;
      if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
      return;
    }
    // Fallback SIP Call
    if (this.o.logDetailed) logger.debug(`${this.id}: [${this.callType}] ${this.callDestination}`);
  }

  // Configure Codec
  async configureCodec() {
    try {
      const systemUnit = await this.xapi.status.get(this.deviceId, 'SystemUnit.*');
      this.sysInfo.version = systemUnit.Software.Version;
      // verify supported version
      if (!await versionCheck(this.sysInfo.version)) throw new Error('Unsupported RoomOS');
      // Determine device mode
      // eslint-disable-next-line no-nested-ternary
      const mtrSupported = /^true$/i.test(systemUnit.Extensions ? systemUnit.Extensions.Microsoft ? systemUnit.Extensions.Microsoft.Supported : false : false);
      if (mtrSupported) {
        const mtrStatus = await this.xapi.command(this.deviceId, 'MicrosoftTeams.List');
        this.isRoomOS = !mtrStatus.Entry.some((i) => i.Status === 'Installed');
        if (!this.isRoomOS) { logger.info(`${this.id}: Device in Microsoft Mode`); }
      }
      // Get System Name / Contact Name
      if (this.isRoomOS) this.sysInfo.name = await this.xapi.status.get(this.deviceId, 'UserInterface.ContactInfo.Name');
      // Get System SN
      this.sysInfo.serial = systemUnit.Hardware.Module.SerialNumber;
      if (!this.sysInfo.name || this.sysInfo.name === '') {
        this.sysInfo.name = this.sysInfo.serial;
      }
      if (this.o.macroLocal) {
        // Macro Mode is needed
        await this.xapi.config.set(this.deviceId, 'Macros.Mode', 'On');
        // Validate Companion Macro
        if (!await this.checkMacro()) { await this.addMacro(); }
      } else if (await this.checkMacro()) {
        await this.removeMacro(macroId);
        await this.xapi.command(this.deviceId, 'Macros.Runtime.Restart');
      }
      // HTTP Client needed for sending outbound requests
      // await this.xapi.config.set(this.deviceId, 'HttpClient.Mode', 'On');
      // Validate Survey Panel
      if (!await this.checkPanel()) { await this.addPanel(); }
      // Validate Survey Button
      const buttonStatus = await this.checkButton();
      if (buttonStatus && !this.o.buttonEnabled) { await this.removePanel(buttonId); }
      if (!buttonStatus && this.o.buttonEnabled) { await this.addButton(this.isRoomOS); }
      // Close any lingering dialogs
      this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Close');
      this.xapi.command(this.deviceId, 'UserInterface.Message.TextInput.Clear');
      // Reset variables
      this.resetVariables();
    } catch (error) {
      logger.debug(`${this.id}: ${error.message}`);
      throw new Error('Config Error');
    }
  }

  calculateRating() {
    const items = Object.keys(this.qualityInfo);
    let rating = 1;
    items.forEach((item) => {
      // Skip overall rating
      if (item === 'rating') return;
      const i = this.qualityInfo[item];
      // Skip non-number entries
      if (Number.isNaN(i)) { return; }
      // Skip N/A items
      if (i === 4) { return; }
      // Compare ratings
      if (this.qualityInfo[item] > rating) {
        rating = i;
      }
    });
    if (this.qualityInfo.rating !== rating) {
      logger.debug(`${this.id}: Rating Change: ${this.qualityInfo.rating} to ${rating}`);
    }
    this.qualityInfo.rating = rating;
  }

  showPrompt(promptId, overrideTitle = false) {
    // Prevent Survey from closing when prompt open
    clearTimeout(this.panelTimeout);
    const promptBody = {
      Duration: this.o.timeoutPopup,
      InputType: 'SingleLine',
      KeyboardState: 'Open',
      SubmitText: 'Submit',
      Title: this.o.promptTitle,
    };
    switch (promptId) {
      case 'comments_edit': {
        promptBody.FeedbackId = 'comments_submit';
        promptBody.Placeholder = 'Additional Comments';
        promptBody.Text = 'Please provide any additional details';
        // Populate Comments if previously added
        if (this.qualityInfo.comments !== '') {
          promptBody.InputText = this.qualityInfo.comments;
        }
        break;
      }
      case 'email_edit': {
        promptBody.FeedbackId = 'email_submit';
        promptBody.Placeholder = 'Enter your email address';
        promptBody.Text = 'Please provide your email address';
        // Populate email if previously added
        if (this.qualityInfo.email !== '') {
          promptBody.InputText = this.qualityInfo.email;
        }
        break;
      }
      default:
        return;
    }
    if (overrideTitle) {
      promptBody.Title = overrideTitle;
    }
    this.xapi.command(this.deviceId, 'UserInterface.Message.TextInput.Display', promptBody);
  }

  // ----- xAPI Handle Functions ----- //

  handleCallDisconnect(event) {
    this.callInfo = event;
    this.callInfo.Duration = Number(event.Duration);
    this.showSurvey();
  }

  handleActiveCall(status) {
    let result = status;
    if (result && !Number.isNaN(result)) {
      result = Number(result);
    }
    if (result > 0) {
      this.processCall();
    }
  }

  handleMTRCall(status) {
    const result = /^true$/i.test(status);
    if (result) {
      this.callType = 'mtr';
      this.callInfo.startTime = Date.now();
    } else {
      if (this.callInfo.startTime) {
        try {
          this.callInfo.Duration = Number(Date.now() - this.callInfo.startTime);
        } catch (error) {
          logger.debug(`${this.id}: Error calculating MTR Call Duration`);
        }
      }
      this.showSurvey();
    }
  }

  handleOutgoingCallIndication() {
    this.processCall();
  }

  handleTextInputResponse(event) {
    switch (event.FeedbackId) {
      case 'comments_submit':
        if (event.Text !== '') {
          this.voluntaryRating = true;
          this.qualityInfo.comments = event.Text;
          this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: 'Edit Comments >', WidgetId: 'comments_text' });
        }
        if (event.Text === '' && this.qualityInfo.comments !== '') {
          this.qualityInfo.comments = '';
          this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: 'Add Comments >', WidgetId: 'comments_text' });
        }
        this.setPanelTimeout();
        break;
      case 'email_submit':
        if (event.Text !== '') {
          this.voluntaryRating = true;
          if (!/^.*@.*\..*$/.test(event.Text)) {
            logger.warn(`${this.id}: Invalid Email Address, re-prompting user...`);
            this.xapi.command(this.deviceId, 'Audio.Sound.Play', { Sound: 'Binding' });
            this.showPrompt('email_edit', '⚠️ Invalid Email Address ⚠️');
            return;
          }
          this.qualityInfo.email = event.Text;
          this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: 'Edit Email >', WidgetId: 'email_text' });
        }
        if (event.Text === '' && this.qualityInfo.email !== '') {
          this.qualityInfo.email = '';
          this.xapi.command(this.deviceId, 'UserInterface.Extensions.Widget.SetValue', { Value: 'Add Email >', WidgetId: 'email_text' });
        }
        this.setPanelTimeout();
        break;
      default:
        if (this.logUnknownResponses) logger.warn(`${this.id}: Unexpected TextInput.Response: ${event.FeedbackId}`);
    }
  }

  handleTextInputClear(event) {
    if (event.FeedbackId === '') return;
    switch (event.FeedbackId) {
      case 'comments_submit':
      case 'email_submit':
        this.setPanelTimeout();
        break;
      default:
        if (this.logUnknownResponses) logger.warn(`${this.id}: Unexpected TextInput.Clear: ${event.FeedbackId}`);
    }
  }

  handlePanelClicked(event) {
    if (event.PanelId === buttonId) {
      this.feedbackReport = true;
      this.showSurvey();
      return;
    }
    if (!/(test_services|test_survey)/.test(event.PanelId)) return;
    if (!this.o.debugButtons) return;
    this.callType = this.isRoomOS ? 'webex' : 'mtr';
    this.callInfo.Duration = 17;
    // this.durationMet = true;
    if (this.isRoomOS) {
      this.callInfo.CauseType = 'LocalDisconnect';
      this.callDestination = 'spark:123456789@webex.com';
    }
    if (event.PanelId === 'test_services') {
      this.qualityInfo.email = 'aileen.mottern@example.com';
      this.qualityInfo.video = Math.floor(Math.random() * (4 - 1 + 1) + 1);
      this.qualityInfo.audio = Math.floor(Math.random() * (4 - 1 + 1) + 1);
      this.qualityInfo.equipment = Math.floor(Math.random() * (4 - 1 + 1) + 1);
      this.qualityInfo.cleanliness = Math.floor(Math.random() * (4 - 1 + 1) + 1);
      const q = this.qualityInfo;
      logger.debug(`${this.id}: Test Ratings - V:${q.video} | A:${q.audio} | E:${q.equipment} | C:${q.cleanliness}`);
      this.calculateRating();
      this.voluntaryRating = true;
      this.skipLog = true;
      this.processRequest();
      return;
    }
    this.showSurvey();
  }

  handlePageClosed(event) {
    // ignore other page events
    if (event.PageId !== `${panelId}-survey`) return;
    // ignore if survey was submitted
    if (this.voluntaryRating) return;
    // Don't process timed out report issue
    if (this.feedbackReport) {
      clearTimeout(this.panelTimeout);
      this.resetVariables();
      return;
    }
    if (this.defaultSubmit) {
      this.showFeedback = false;
      this.processRequest();
    }
  }

  handleWidgetAction(event) {
    if (event.Type !== 'pressed') return;
    let result = event.Value;
    if (result && !Number.isNaN(result)) {
      result = Number(result);
    }
    switch (event.WidgetId) {
      case 'survey_submit':
        this.voluntaryRating = true;
        this.processRequest();
        break;
      case 'comments_edit':
      case 'email_edit': {
        if (!this.o.macroLocal) this.showPrompt(event.WidgetId);
        break;
      }
      case 'video_rating':
        this.setPanelTimeout();
        if (this.qualityInfo.video !== result) {
          this.qualityInfo.video = result;
          this.calculateRating();
        }
        break;
      case 'audio_rating':
        this.setPanelTimeout();
        if (this.qualityInfo.audio !== result) {
          this.qualityInfo.audio = result;
          this.calculateRating();
        }
        break;
      case 'room_equipment':
        this.setPanelTimeout();
        if (this.qualityInfo.equipment !== result) {
          this.qualityInfo.equipment = result;
          this.calculateRating();
        }
        break;
      case 'room_cleanliness':
        this.setPanelTimeout();
        if (this.qualityInfo.cleanliness !== result) {
          this.qualityInfo.cleanliness = result;
          this.calculateRating();
        }
        break;
      default:
        if (this.logUnknownResponses) logger.warn(`${this.id}: Unexpected Widget.Action: ${event.WidgetId}`);
    }
  }
}
exports.Init = RoomExperience;

const companionMacro = `/*
# Room Experience Companion Macro
#
# This companion macro accompanies a Control Hub Workspace Integration
#
# MACRO IS AUTO GENERATED AND DEPLOYED
#
*/
// eslint-disable-next-line import/no-unresolved
import xapi from 'xapi';

let localVariables = {};
function resetVariables() {
  if (true) console.debug('Init Variables');
  localVariables = {
    comments: '',
    email: '',
  };
  xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'video_rating' });
  xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'audio_rating' });
  xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'room_equipment' });
  xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: '1', WidgetId: 'room_cleanliness' });
  xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Comments >', WidgetId: 'comments_text' });
  xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Email >', WidgetId: 'email_text' });
};

// Process text input response
xapi.event.on('UserInterface.Message.TextInput.Response', (event) => {
  switch (event.FeedbackId) {
    case 'comments_submit':
      if (event.Text !== '') {
        localVariables.comments = event.Text;
        xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Edit Comments >', WidgetId: 'comments_text' });
      }
      if (event.Text === '' && localVariables.comments !== '') {
        localVariables.comments = '';
        xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Comments >', WidgetId: 'comments_text' });
      }
      break;
    case 'email_submit':
      if (event.Text !== '') {
        if (!/^.*@.*\..*$/.test(event.Text)) { return; }
        localVariables.email = event.Text;
        xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Edit Email >', WidgetId: 'email_text' });
      }
      if (event.Text === '' && localVariables.email !== '') {
        localVariables.email = '';
        xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Email >', WidgetId: 'email_text' });
      }
      break;
    default:
  }
});

// Process panel clicked
xapi.event.on('UserInterface.Extensions.Panel.Clicked', (event) => {
  if (event.PanelId === '${buttonId}') {
    xapi.command('UserInterface.Extensions.Panel.Open', { PanelId: '${panelId}' });
  }
});

// Process page closed
xapi.event.on('UserInterface.Extensions.Event.PageClosed', (event) => {
  if (event.PageId !== '${panelId}-survey') return;
  resetVariables();
});

// Process widget action
xapi.event.on('UserInterface.Extensions.Widget.Action', (event) => {
  if (event.Type !== 'pressed') return;
  let result = event.Value;
  if (result && !Number.isNaN(result)) {
    result = Number(result);
  }
  switch (event.WidgetId) {
    case 'survey_submit':
      xapi.command('UserInterface.Extensions.Panel.Close');
      break;
    case 'comments_edit': {
      const commentsBody = {
        Duration: ${reOptions.timeoutPopup},
        FeedbackId: 'comments_submit',
        InputType: 'SingleLine',
        KeyboardState: 'Open',
        Placeholder: 'Additional Comments',
        SubmitText: 'Submit',
        Text: 'Please provide any additional details',
        Title: '${reOptions.promptTitle}',
      };
      // Populate Comments if previously added
      if (localVariables.comments !== '') {
        commentsBody.InputText = localVariables.comments;
      }
      xapi.command('UserInterface.Message.TextInput.Display', commentsBody);
      break;
    }
    case 'email_edit': {
      const emailBody = {
        Duration: ${reOptions.timeoutPopup},
        FeedbackId: 'email_submit',
        InputType: 'SingleLine',
        KeyboardState: 'Open',
        Placeholder: 'Enter your email address',
        SubmitText: 'Submit',
        Text: 'Please provide your email address',
        Title: '${reOptions.promptTitle}',
      };
      // Populate email if previously added
      if (localVariables.email !== '') {
        emailBody.InputText = localVariables.email;
      }
      xapi.command('UserInterface.Message.TextInput.Display', emailBody);
      break;
    }
    default:
  }
});

console.info('Room Experience Companion Macro v0.0.1');
resetVariables();
`;
