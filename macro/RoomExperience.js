/* eslint-disable no-useless-escape */
/* eslint-disable no-console */
/*
# Room Experience Macro
# Written by Jeremy Willans
# https://github.com/jeremywillans/wi-room-experience
#
# USE AT OWN RISK, MACRO NOT FULLY TESTED NOR SUPPLIED WITH ANY GUARANTEE
#
# Usage -
#  This macro will show a survey at the end of each call to capture user perception
#  The data can be made available to the following destinations
#  Webex Space, MS Teams, HTTP Server (POST) and/or Service Now Incident.
#
*/
// eslint-disable-next-line import/no-unresolved
import xapi from 'xapi';

const version = '0.1.0';
// Define Room Experience options
const reOptions = {
  // App Parameters
  appName: 'room-experience', // Name used for panel prefixes and loki app name
  // Call Parameters
  callEnabled: true, // Should calls be processed (disable to only use button)
  minDuration: 10, // Minimum call duration (seconds) before Survey is displayed
  // Panel Parameters
  panelRemove: true, // Remove panels prefixed with appName not matching version
  panelEmoticons: true, // Show emoticons on the panel
  // Button Parameters
  buttonEnabled: true, // Include a report issue button on screen
  buttonColor: '#1170CF', // Color of button, default blue
  buttonLocation: 'HomeScreen', // Valid HomeScreen,HomeScreenAndCallControls,ControlPanel
  // Logging Parameters
  logDetailed: true, // Enable detailed logging
  logUnknownResponses: false, // Show unknown extension responses in the log
  // Webex Space Parameters
  webexEnabled: false, // Enable for Webex Space Message Logging
  webexLogExcellent: false, // Optionally log excellent results to Webex Space
  webexBotToken: '', // Webex Bot Token for sending messages
  webexRoomId: '', // Webex Room Id for sending messages
  webexReportRoomId: '', // If defined, report messages will be sent here.
  // MS Teams Channel Parameters
  teamsEnabled: false, // Send message to MS Teams channel when room released
  teamsLogExcellent: false, // Optionally log excellent results to MS Teams channel
  teamsWebhook: '', // URL for Teams Channel Incoming Webhook
  teamsReportWebhook: '', // If defined, report messages will be sent here.
  // HTTP JSON Post Parameters
  httpEnabled: false, // Enable for JSON HTTP POST Destination
  httpUrl: 'http://localhost:3000', // HTTP Server POST URL
  httpAuth: false, // Destination requires HTTP Header for Authentication
  httpHeader: 'Authorization: XXXX', // Header Content for HTTP POST Authentication
  httpFormat: 'none', // HTTP Custom Formatting - none,loki,powerBi
  // Service Now Parameters
  snowEnabled: false, // Enable for Service NOW Incident Raise
  snowRaiseAvg: true, // Raise SNOW Incident for Average Responses
  snowInstance: 'instance-name.service-now.com', // Specify the base url for Service Now
  snowCredentials: 'base-64-encoded-username:password', // Basic Auth format is "username:password" base64-encoded
  snowCallerId: '', // Default Caller for Incidents, needs to be sys_id of Caller
  snowCmdbCi: '', // Default CMDB CI, needs to be sys_id of CI
  snowCmdbLookup: false, // Lookup Device using Serial Number in Service Now
  snowExtra: { // Any extra parameters to pass to Service Now
    // assignment_group: 'sys_id-of-assignment-group',
  },
  // Global Parameters
  defaultSubmit: true, // Send result if not explicitly submitted (timeout).
  promptTitle: 'Room Experience', // Title prefix shown on displayed prompts.
  debugButtons: true, // Enables use of debugging Actions buttons designed for testing
  // Timeout Parameters
  timeoutSurvey: 15, // Timeout before initial survey panel is dismissed (seconds)
  timeoutPopup: 20, // Timeout before survey popups are dismissed (seconds)
};

// Max 4 Issues per Category, and Cancel options on Prompt.
const categories = {
  video: {
    text: 'Video Issue',
    prompt: `${reOptions.panelEmoticons ? '📺 ' : ''}Video`,
    issues: [
      { id: 'inbound-video', text: 'Issue with remote video' },
      { id: 'outbound-video', text: 'Remote participants cant see me' },
      { id: 'video-quality', text: 'Bad video quality' },
      { id: 'other', text: 'Other' },
    ],
    snowExtra: {
      // assignment_group: 'sys_id-of-assignment-group',
    },
  },
  audio: {
    text: 'Audio Issue',
    prompt: `${reOptions.panelEmoticons ? '🎙️ ' : ''}Audio`,
    issues: [
      { id: 'inbound-audio', text: 'Issue with remote audio' },
      { id: 'outbound-audio', text: 'Remote participants cant hear me' },
      { id: 'audio-quality', text: 'Bad audio quality' },
      { id: 'other', text: 'Other' },
    ],
    snowExtra: {
      // assignment_group: 'sys_id-of-assignment-group',
    },
  },
  equipment: {
    text: 'Room Equipment',
    prompt: `${reOptions.panelEmoticons ? '🍿 ' : ''}Equipment`,
    issues: [
      { id: 'equipment-issue', text: 'Equipment not working' },
      { id: 'missing-equipment', text: 'Missing equipment' },
      // { id: 'third-item', text: 'Third Item Here' },
      { id: 'other', text: 'Other' },
    ],
    snowExtra: {
      // assignment_group: 'sys_id-of-assignment-group',
    },
  },
  cleanliness: {
    text: 'Room Cleanliness',
    prompt: `${reOptions.panelEmoticons ? '🧹 ' : ''}Cleanliness`,
    issues: [
      { id: 'left-items', text: 'Items left in room' },
      { id: 'table-equipment', text: 'Dirty table or chairs' },
      // { id: 'third-item', text: 'Third Item Here' },
      { id: 'other', text: 'Other' },
    ],
    snowExtra: {
      // assignment_group: 'sys_id-of-assignment-group',
    },
  },
};

const ratings = [
  // 1 and 2 Stars
  {
    survey: 'Poor',
    id: 'major',
    report: 'Major',
    prompt: `${reOptions.panelEmoticons ? '🤬 ' : ''}Major`,
    rating: 2,
    snowExtra: {
      // urgency: 2,
    },
  },
  // 3 and 4 Stars
  {
    survey: 'Average',
    id: 'minor',
    report: 'Minor',
    prompt: `${reOptions.panelEmoticons ? '😕 ' : ''}Minor`,
    rating: 4,
    snowExtra: {
      // urgency: 3,
    },
  },
  // 5 Stars,
  { survey: 'Excellent' },
];

// ----- EDIT BELOW THIS LINE AT OWN RISK ----- //

const Header = [
  'Content-Type: application/json',
  'Accept: application/json',
];
const webexHeader = [...Header, `Authorization: Bearer ${reOptions.webexBotToken}`];
const snowHeader = [...Header, `Authorization: Basic ${reOptions.snowCredentials}`];
const httpHeader = reOptions.httpAuth ? [...Header, reOptions.httpHeader] : [...Header];
const snowIncidentUrl = `https://${reOptions.snowInstance}/api/now/table/incident`;
const snowUserUrl = `https://${reOptions.snowInstance}/api/now/table/sys_user`;
const snowCMDBUrl = `https://${reOptions.snowInstance}/api/now/table/cmdb_ci`;
const panelId = `${reOptions.appName}-${version.replaceAll('.', '')}${reOptions.panelEmoticons ? 'e' : ''}`;
const buttonId = `b-${reOptions.appName}-${version.replaceAll('.', '')}`;
const catArray = Object.keys(categories);

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

// Category Formatter
function formatCategory(category, type = 'text') {
  if (!categories[category]) return 'Unknown';
  return categories[category][type];
}

// Issue Formatter
function formatIssue(category, issue, type = 'text') {
  if (!categories[category]) return 'Unknown';
  const result = categories[category].issues.find((item) => item.id === issue);
  if (result) {
    return result[type];
  }
  return 'Unknown';
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
const defVersion = '11.0.0.0';
function versionCheck(sysVersion, minVersion = defVersion) {
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

// Room Experience Class
class RoomExperience {
  constructor() {
    this.xapi = xapi;
    this.o = reOptions;
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
    this.callInfo = {};
    this.callType = '';
    this.callMatched = false;
    this.panelTimeout = null;
    this.issueReport = false;
  }

  // Reset variables
  async resetVariables() {
    if (this.o.logDetailed) console.debug('Init Variables');
    this.qualityInfo = {
      rating: 5,
      comments: '',
      email: '',
    };
    this.showFeedback = true;
    this.voluntaryRating = false;
    this.errorResult = false;
    this.skipLog = false;
    this.userInfo = {};
    this.callDestination = false;
    this.callInfo = {};
    this.callType = '';
    this.callMatched = false;
    this.panelTimeout = null;
    if (this.issueReport) {
      await this.removePanel(panelId, false);
      await this.addPanel(true, false);
      this.issueReport = false;
    }
    this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: '🌑 🌑 🌑 🌑 🌑', WidgetId: 'rating_text' });
    this.xapi.command('UserInterface.Extensions.Widget.UnsetValue', { WidgetId: 'category_select' });
    this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Select Issue >', WidgetId: 'issue_text' });
    this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Comments >', WidgetId: 'comments_text' });
    this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Email >', WidgetId: 'email_text' });
  }

  // Remove Panel from UI
  async removePanel(PanelId, showLog = true) {
    if (this.o.logDetailed && showLog) console.debug(`Removing Panel: ${PanelId}`);
    try {
      await this.xapi.command('UserInterface.Extensions.Panel.Remove', { PanelId });
    } catch (error) {
      console.error('Unable to remove Panel');
      console.debug(error.message);
    }
  }

  // Check Survey Panel UI status
  async checkPanel() {
    let match = false;
    const config = await this.xapi.command('UserInterface.Extensions.List');
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
  async addPanel(rating = true, showLog = true) {
    if (this.o.logDetailed && showLog) console.debug(`Adding Room Experience Panel: ${panelId}`);
    const xml = `<?xml version="1.0"?>
    <Extensions>
      <Version>1.11</Version>
      <Panel>
        <Order>1</Order>
        <PanelId>${panelId}</PanelId>
        <Origin>local</Origin>
        <Location>Hidden</Location>
        <Icon>Lightbulb</Icon>
        <Name>${this.o.promptTitle}${rating ? ' Feedback' : ' Report Issue'}</Name>
        <ActivityType>Custom</ActivityType>
        <Page>
          <Name>${this.o.promptTitle}${rating ? ' Feedback' : ' Report Issue'}</Name>
          ${rating ? `<Row>
            <Name>${this.o.panelEmoticons ? '💡 ' : ''}Overall Rating</Name>
            <Widget>
              <WidgetId>rating_text</WidgetId>
              <Name>🌟 🌟 🌟 🌟 🌟</Name>
              <Type>Text</Type>
              <Options>size=3;fontSize=normal;align=center</Options>
            </Widget>
            <Widget>
              <WidgetId>rating_edit</WidgetId>
              <Name>Edit</Name>
              <Type>Button</Type>
              <Options>size=1</Options>
            </Widget>
          </Row>` : `<Row>
            <Name>${this.o.panelEmoticons ? '💡 ' : ''}Issue Severity</Name>
            <Widget>
              <WidgetId>severity_select</WidgetId>
              <Type>GroupButton</Type>
              <Options>size=3;columns=2</Options>
              <ValueSpace>
                <Value>
                  <Key>${ratings[0].id}</Key>
                  <Name>${ratings[0].prompt}</Name>
                </Value>
                <Value>
                  <Key>${ratings[1].id}</Key>
                  <Name>${ratings[1].prompt}</Name>
                </Value>
              </ValueSpace>
            </Widget>
          </Row>`}
          <Row>
            <Name>${this.o.panelEmoticons ? '📝 ' : ''}${rating ? 'Feedback ' : ' Issue '}Category</Name>
            <Widget>
              <WidgetId>category_select</WidgetId>
              <Type>GroupButton</Type>
              <Options>size=4;columns=2</Options>
              <ValueSpace>
                <Value>
                  <Key>${catArray[0]}</Key>
                  <Name>${categories[catArray[0]].prompt}</Name>
                </Value>
                <Value>
                  <Key>${catArray[1]}</Key>
                  <Name>${categories[catArray[1]].prompt}</Name>
                </Value>
                <Value>
                  <Key>${catArray[2]}</Key>
                  <Name>${categories[catArray[2]].prompt}</Name>
                </Value>
                <Value>
                  <Key>${catArray[3]}</Key>
                  <Name>${categories[catArray[3]].prompt}</Name>
                </Value>
              </ValueSpace>
            </Widget>
          </Row>
          <Row>
            <Name>${this.o.panelEmoticons ? '🎯 ' : ''}Issue (Optional)</Name>
            <Widget>
              <WidgetId>issue_text</WidgetId>
              <Name>Select Issue &gt;</Name>
              <Type>Text</Type>
              <Options>size=3;fontSize=normal;align=right</Options>
            </Widget>
            <Widget>
              <WidgetId>issue_select</WidgetId>
              <Name>Select</Name>
              <Type>Button</Type>
              <Options>size=1</Options>
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

    await this.xapi.command('UserInterface.Extensions.Panel.Save', { PanelId: panelId }, xml);
  }

  // Check Report Issue button UI Status
  async checkButton() {
    let match = false;
    const config = await this.xapi.command('UserInterface.Extensions.List');
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

  // Add Report Issue button to UI
  async addButton(isRoomOS) {
    if (this.o.logDetailed) console.debug(`Adding Room Experience Button: ${buttonId}`);
    const xml = `<?xml version="1.0"?>
    <Extensions>
      <Version>1.11</Version>
      <Panel>
        <Order>1</Order>
        <PanelId>${buttonId}</PanelId>
        <Location>${isRoomOS ? this.o.buttonLocation : 'ControlPanel'}</Location>
        <Icon>Concierge</Icon>
        <Color>${this.o.buttonColor}</Color>
        <Name>Report Issue</Name>
        <ActivityType>Custom</ActivityType>
      </Panel>
    </Extensions>`;

    await this.xapi.command('UserInterface.Extensions.Panel.Save', { PanelId: buttonId }, xml);
  }

  // Rating Formatter
  formatRating(rating, type = false) {
    let field = type;
    if (!type) field = this.issueReport ? 'report' : 'survey';
    switch (rating) {
      case 5:
        return ratings[2][field];
      case 4:
      case 3:
        return ratings[1][field];
      case 2:
      case 1:
        return ratings[0][field];
      default:
        return 'Unknown';
    }
  }

  // Post content to Webex Space
  async postWebex() {
    if (this.o.logDetailed) console.debug('Process postWebex function');
    let blockquote;
    switch (this.qualityInfo.rating) {
      case 5:
        blockquote = '<blockquote class=success>';
        break;
      case 4:
      case 3:
        blockquote = '<blockquote class=warning>';
        break;
      case 2:
      case 1:
        blockquote = '<blockquote class=danger>';
        break;
      default:
        console.debug('Unhandled Response');
    }

    let html = (`<b>Room Experience ${this.issueReport ? 'Issue ' : 'Call Survey'} Report - ${this.formatRating(this.qualityInfo.rating)}</b>${blockquote}<b>System Name:</b> ${this.sysInfo.name}<br><b>Serial Number:</b> ${this.sysInfo.serial}<br><b>SW Release:</b> ${this.sysInfo.version}`);
    html += `<br><b>Source:</b> ${this.issueReport ? 'Report Issue Button' : 'Call Survey'}`;
    if (this.callType) { html += `<br><b>Call Type:</b> ${formatType(this.callType)}`; }
    if (this.callDestination) { html += `<br><b>Destination:</b> ${this.callDestination}`; }
    if (this.callInfo.Duration) { html += `<br><b>Call Duration:</b> ${formatTime(this.callInfo.Duration)}`; }
    if (this.callInfo.CauseType) { html += `<br><b>Disconnect Cause:</b> ${this.callInfo.CauseType}`; }
    if (this.qualityInfo.rating) { html += `<br><b>Rating:</b> ${this.formatRating(this.qualityInfo.rating)} (${this.qualityInfo.rating})`; }
    if (this.qualityInfo.category) { html += `<br><b>Category:</b> ${formatCategory(this.qualityInfo.category)}`; }
    if (this.qualityInfo.issue) { html += `<br><b>Issue:</b> ${formatIssue(this.qualityInfo.category, this.qualityInfo.issue)}`; }
    if (this.qualityInfo.comments) { html += `<br><b>Comments:</b> ${this.qualityInfo.comments}`; }
    if (this.o.defaultSubmit) { html += `<br><b>Voluntary Rating:</b> ${this.voluntaryRating ? 'Yes' : 'No'}`; }
    if (this.qualityInfo.incident) { html += `<br><b>Incident Reference:</b> ${this.qualityInfo.incident}`; }
    if (this.userInfo.sys_id) {
      html += `<br><b>Reporter:</b>  <a href=webexteams://im?email=${this.userInfo.email}>${this.userInfo.name}</a> (${this.userInfo.email})`;
    } else if (this.qualityInfo.email) {
      // Include Provided Email if not matched in SNOW
      html += `<br><b>Provided Email:</b> ${this.qualityInfo.email}`;
    }
    html += '</blockquote>';

    let roomId = this.o.webexRoomId;
    if (this.issueReport && (this.o.webexReportRoomId && this.o.webexReportRoomId !== '')) {
      roomId = this.o.webexReportRoomId;
    }

    const messageContent = { roomId, html };

    try {
      const result = await this.xapi.command('HttpClient.Post', { Header: webexHeader, Url: 'https://webexapis.com/v1/messages' }, JSON.stringify(messageContent));
      if (/20[04]/.test(result.StatusCode)) {
        if (this.o.logDetailed) console.debug('postWebex message sent.');
        return;
      }
      console.error(`postWebex status: ${result.StatusCode}`);
      this.errorResult = true;
      if (result.message && this.o.logDetailed) {
        console.debug(`${result.message}`);
      }
    } catch (error) {
      console.error('postWebex error');
      console.debug(error.message);
      this.errorResult = true;
    }
  }

  // Post content to MS Teams Channel
  async postTeams() {
    if (this.o.logDetailed) console.debug('Process postTeams function');
    let color;
    switch (this.qualityInfo.rating) {
      case 5:
        color = 'Good';
        break;
      case 4:
      case 3:
        color = 'Warning';
        break;
      case 2:
      case 1:
        color = 'Attention';
        break;
      default:
        console.debug('Unhandled Response');
    }

    const cardBody = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.3',
            body: [
              {
                type: 'TextBlock',
                text: `Room Experience ${this.issueReport ? 'Issue ' : 'Call Survey'} Report - ${this.formatRating(this.qualityInfo.rating)}`,
                weight: 'Bolder',
                size: 'Medium',
                color,
              },
              {
                type: 'FactSet',
              },
            ],
          },

        },
      ],
    };

    const facts = [
      {
        title: 'System Name',
        value: this.sysInfo.name,
      },
      {
        title: 'Serial Number',
        value: this.sysInfo.serial,
      },
      {
        title: 'SW Release',
        value: this.sysInfo.version,
      },
      {
        title: 'Source',
        value: this.issueReport ? 'Issue Report Button' : 'Call Survey',
      },
    ];

    if (this.callType) facts.push({ title: 'Call Type', value: formatType(this.callType) });
    if (this.callDestination) facts.push({ title: 'Destination', value: this.callDestination });
    if (this.callInfo.Duration) facts.push({ title: 'Call Duration', value: formatTime(this.callInfo.Duration) });
    if (this.callInfo.CauseType) facts.push({ title: 'Disconnect Cause', value: this.callInfo.CauseType });
    if (this.qualityInfo.rating) facts.push({ title: 'Rating', value: `${this.formatRating(this.qualityInfo.rating)} (${this.qualityInfo.rating})` });
    if (this.qualityInfo.category) facts.push({ title: 'Category', value: `${formatCategory(this.qualityInfo.category)}` });
    if (this.qualityInfo.issue) facts.push({ title: 'Issue', value: `${formatIssue(this.qualityInfo.category, this.qualityInfo.issue)}` });
    if (this.o.defaultSubmit) facts.push({ title: 'Voluntary Rating', value: this.voluntaryRating ? 'Yes' : 'No' });
    if (this.qualityInfo.incident) facts.push({ title: 'Incident Reference', value: this.qualityInfo.incident });

    if (this.userInfo.sys_id) {
      facts.push({ title: 'Reporter', value: `${this.userInfo.name} (${this.userInfo.email})` });
    } else if (this.qualityInfo.email) {
      // Include Provided Email if not matched in SNOW
      facts.push({ title: 'Provided Email', value: this.qualityInfo.email });
    }

    cardBody.attachments[0].content.body[1].facts = facts;

    if (this.qualityInfo.comments) {
      cardBody.attachments[0].content.body.push({ type: 'TextBlock', text: 'Comments', weight: 'Bolder' });
      cardBody.attachments[0].content.body.push({ type: 'TextBlock', text: this.qualityInfo.comments, wrap: true });
    }

    let webhook = this.o.teamsWebhook;
    if (this.issueReport && (this.o.teamsReportWebhook && this.o.teamsReportWebhook !== '')) {
      webhook = this.o.teamsReportWebhook;
    }

    try {
      const result = await this.xapi.command('HttpClient.Post', { Header, Url: webhook }, JSON.stringify(cardBody));
      if (/20[04]/.test(result.StatusCode)) {
        if (this.o.logDetailed) console.debug('postTeams message sent.');
        return;
      }
      console.error(`postTeams status: ${result.StatusCode}`);
      if (result.message && this.o.logDetailed) {
        console.debug(`${result.message}`);
      }
    } catch (error) {
      console.error('postTeams error');
      console.debug(error.message);
    }
  }

  // Post JSON content to Http Server
  async postHttp() {
    console.debug('Process postHttp function');
    let messageContent = {
      timestamp: Date.now(),
      system: this.sysInfo.name,
      serial: this.sysInfo.serial,
      version: this.sysInfo.version,
      source: this.issueReport ? 'report' : 'call',
      rating: this.qualityInfo.rating,
      rating_fmt: this.formatRating(this.qualityInfo.rating),
      category: this.qualityInfo.category ? this.qualityInfo.category : '',
      category_fmt: this.qualityInfo.category ? formatCategory(this.qualityInfo.category) : '',
      issue: this.qualityInfo.issue ? this.qualityInfo.issue : '',
      issue_fmt: this.qualityInfo.issue ? formatIssue(this.qualityInfo.category, this.qualityInfo.issue) : '',
      destination: this.callDestination ? this.callDestination : '',
      type: this.callType ? this.callType : '',
      type_fmt: this.callType !== '' ? formatType(this.callType) : '',
      duration: this.callInfo.Duration || 0,
      duration_fmt: formatTime(this.callInfo.Duration),
      cause: this.callInfo.CauseType ? this.callInfo.CauseType : '',
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
      const result = await this.xapi.command('HttpClient.Post', { Header: httpHeader, Url: this.o.httpUrl }, JSON.stringify(messageContent));
      if (/20[04]/.test(result.StatusCode)) {
        if (this.o.logDetailed) console.debug('postHttp message sent.');
        return;
      }
      console.error(`postHttp status: ${result.StatusCode}`);
      if (result.message && this.o.logDetailed) {
        console.debug(result.message);
      }
    } catch (error) {
      console.error('postHttp error encountered');
      console.debug(JSON.stringify(error));
    }
  }

  // Raise ticket in Service Now
  async raiseTicket() {
    if (this.o.logDetailed) console.debug('Process raiseTicket function');
    let description = `Room Experience ${this.issueReport ? 'Report Issue ' : 'Call Survey'} Report - ${this.formatRating(this.qualityInfo.rating)}\n\nSystem Name: ${this.sysInfo.name}\nSerial Number: ${this.sysInfo.serial}\nVersion: ${this.sysInfo.version}`;
    description += `\nSource: ${this.issueReport ? 'Report Issue Button' : 'Call Survey'}`;
    if (this.callType) { description += `\nCall Type: ${formatType(this.callType)}`; }
    if (this.callDestination) { description += `\nDestination: \`${this.callDestination}\``; }
    if (this.callInfo.Duration) { description += `\nCall Duration: ${formatTime(this.callInfo.Duration)}`; }
    if (this.callInfo.CauseType) { description += `\nDisconnect Cause: ${this.callInfo.CauseType}`; }
    if (this.qualityInfo.rating) { description += `\n\nRating: ${this.formatRating(this.qualityInfo.rating)} (${this.qualityInfo.rating})`; }
    if (this.qualityInfo.category) { description += `\nCategory: ${formatCategory(this.qualityInfo.category)}`; }
    if (this.qualityInfo.issue) { description += `\nIssue: ${formatIssue(this.qualityInfo.category, this.qualityInfo.issue)}`; }
    if (this.qualityInfo.comments) { description += `\nComments: ${this.qualityInfo.comments}`; }
    if (this.o.defaultSubmit) { description += `\nVoluntary Rating: ${this.voluntaryRating ? 'Yes' : 'No'}`; }
    const shortDescription = `${this.sysInfo.name}: ${this.formatRating(this.qualityInfo.rating)} Room Experience ${this.issueReport ? 'Issue ' : 'Call Survey'} Report`;

    // Initial Construct Incident
    let messageContent = { short_description: shortDescription, description };
    // Add Default Caller, if defined.
    if (this.o.snowCallerId) {
      messageContent.caller_id = this.o.snowCallerId;
    }

    // SNOW Email Lookup, or append to description.
    if (this.qualityInfo.email) {
      try {
        let result = await this.xapi.command('HttpClient.Get', { Header: snowHeader, Url: `${snowUserUrl}?sysparm_limit=1&email=${this.qualityInfo.email}` });
        result = JSON.parse(result.Body).result;
        // Validate User Data
        if (result.length === 1) {
          [this.userInfo] = result;
          messageContent.caller_id = this.userInfo.sys_id;
          if (this.o.logDetailed) console.debug(`SNOW User Found - ${messageContent.caller_id}`);
        } else {
          messageContent.description += `\nProvided Email: ${this.qualityInfo.email}}`;
        }
      } catch (error) {
        console.error('raiseTicket getUser error encountered');
        console.debug(error.message);
      }
    }

    if (this.o.snowCmdbCi) {
      messageContent.cmdb_ci = this.o.snowCmdbCi;
    }

    if (this.o.snowCmdbLookup) {
      try {
        let result = await this.xapi.command('HttpClient.Get', { Header: snowHeader, Url: `${snowCMDBUrl}?sysparm_limit=1&serial_number=${this.sysInfo.serial}` });
        result = JSON.parse(result.Body).result;
        // Validate CI Data
        if (result && result.length === 1) {
          const [ciInfo] = result;
          messageContent.cmdb_ci = ciInfo.sys_id;
          if (this.o.logDetailed) console.debug(`SNOW CI Found - ${messageContent.cmdb_ci}`);
        }
      } catch (error) {
        console.error('raiseTicket getCMDBCi error encountered');
        console.debug(error.message);
      }
    }

    // Merge Extra Params from Default Options
    if (this.o.snowExtra) {
      messageContent = { ...messageContent, ...this.o.snowExtra };
    }

    // Merge Extra Params from Selected Category
    if (this.qualityInfo.category && categories[this.qualityInfo.category].snowExtra) {
      messageContent = { ...messageContent, ...categories[this.qualityInfo.category].snowExtra };
    }

    // Merge Extra Params from Selected Rating
    const ratingSnowExtra = this.formatRating(this.qualityInfo.rating, 'snowExtra');
    if (ratingSnowExtra) {
      messageContent = { ...messageContent, ...ratingSnowExtra };
    }

    try {
      let result = await this.xapi.command('HttpClient.Post', { Header: snowHeader, Url: snowIncidentUrl }, JSON.stringify(messageContent));
      const incidentUrl = result.Headers.find((x) => x.Key === 'Location').Value;
      result = await this.xapi.command('HttpClient.Get', { Header: snowHeader, Url: incidentUrl });
      this.qualityInfo.incident = JSON.parse(result.Body).result.number;
      if (this.o.logDetailed) console.debug(`raiseTicket successful: ${this.qualityInfo.incident}`);
    } catch (error) {
      console.error('raiseTicket error encountered');
      console.debug(error.message);
      this.errorResult = true;
    }
  }

  // Show Rating Prompt
  showRating(updateRating = false) {
    if (updateRating) clearTimeout(this.panelTimeout);
    const Text = updateRating ? 'Please select a new rating' : 'How was your call?';
    const Title = `${this.o.promptTitle} Feedback`;
    xapi.command('UserInterface.Message.Rating.Display', {
      Duration: 20, FeedbackId: updateRating ? 'rating_update' : 'rating_submit', Text, Title,
    });
  }

  // Process after Call Disconnect
  processDisconnect() {
    if (this.callInfo.Duration > this.o.minDuration || this.issueReport) {
      this.showRating();
    } else {
      this.resetVariables();
      /*
      this.xapi.command('UserInterface.Message.Prompt.Display', {
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
    if (this.o.logDetailed) console.debug('Processing Request');
    clearTimeout(this.panelTimeout);
    await this.xapi.command('UserInterface.Extensions.Panel.Close');
    if (this.o.httpEnabled) {
      this.postHttp(); // Always post result to HTTP Server if enabled
    }
    if (this.o.snowEnabled && (
      this.qualityInfo.rating < 3 // Raise ticket if rating is Poor
      // Raise ticket for Average rating if enabled)
      || (this.qualityInfo.rating < 5 && this.o.snowRaiseAvg))) {
      await this.raiseTicket();
    }
    if (this.o.webexEnabled && (
      // Post if rating is Excellent and logging is enabled
      (this.qualityInfo.rating === 5 && this.o.webexLogExcellent)
      || this.issueReport // Post if Issue is reported
      || this.qualityInfo.rating !== 5 // Post if rating is Average or Poor Rating
      || this.qualityInfo.comments !== '') // Always post if contains Comments
    ) {
      await this.postWebex();
    }
    if (this.o.teamsEnabled && (
      // Post if rating is Excellent and logging is enabled (not Report button)
      (this.qualityInfo.rating === 5 && this.o.teamsLogExcellent && !this.issueReport)
      || this.qualityInfo.rating !== 5 // Post if rating is Average or Poor Rating
      || this.qualityInfo.comments !== '') // Always post if contains Comments
    ) {
      await this.postTeams();
    }
    await sleep(600);
    if (this.showFeedback) {
      let Title = 'Acknowledgement';
      let Text = 'Thanks for your feedback!';
      let Duration = 15;
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
    // await sleep(3000)
    this.resetVariables();
  }

  // Define timeout before processing Survey panel
  setPanelTimeout() {
    clearTimeout(this.panelTimeout);
    this.panelTimeout = setTimeout(() => {
      this.xapi.command('UserInterface.Extensions.Panel.Close');
    }, this.o.timeoutSurvey * 1000);
  }

  // Process call data
  async processCall() {
    if (this.callMatched) {
      return;
    }
    let call;
    try {
      [call] = await this.xapi.status.get('Call');
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
        if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
        return;
      }
      if (call.CallbackNumber.match(googleDomain)) {
        // Matched Google Call
        this.callType = 'google';
        this.callMatched = true;
        if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
        return;
      }
      // Fallback WebRTC Call
      if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
      return;
    }

    // Default Call Type
    this.callType = 'sip';
    this.callDestination = call.CallbackNumber;
    if (call.CallbackNumber.match(vimtDomain)) {
      // Matched VIMT Call
      this.callType = 'vimt';
      this.callMatched = true;
      if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
      return;
    }
    if (call.CallbackNumber.match('.webex.com')) {
      // Matched Webex Call
      this.callType = 'webex';
      this.callMatched = true;
      if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
      return;
    }
    if (call.CallbackNumber.match(zoomDomain)) {
      // Matched Zoom Call
      this.callType = 'zoom';
      this.callMatched = true;
      if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
      return;
    }
    if (call.DeviceType === 'Endpoint' && call.CallbackNumber.match('^[^.]*$')) {
      // Matched Endpoint/User Call
      this.callType = 'endpoint';
      this.callDestination = `${call.DisplayName}: ${call.CallbackNumber})`;
      if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
      return;
    }
    // Fallback SIP Call
    if (this.o.logDetailed) console.debug(`[${this.callType}] ${this.callDestination}`);
  }

  // Configure Codec
  async configureCodec() {
    try {
      const systemUnit = await this.xapi.status.get('SystemUnit');
      this.sysInfo.version = systemUnit.Software.Version;
      // verify supported version
      if (!versionCheck(this.sysInfo.version)) throw new Error('Unsupported RoomOS');
      // Determine device mode
      // eslint-disable-next-line no-nested-ternary
      const mtrSupported = /^true$/i.test(systemUnit.Extensions ? systemUnit.Extensions.Microsoft ? systemUnit.Extensions.Microsoft.Supported : false : false);
      if (mtrSupported) {
        const mtrStatus = await this.xapi.command('MicrosoftTeams.List');
        this.isRoomOS = !mtrStatus.Entry.some((i) => i.Status === 'Installed');
        if (!this.isRoomOS) { console.info('Device in Microsoft Mode'); }
        // verify supported mtr version
        if (!this.isRoomOS && !versionCheck(this.sysInfo.version, '11.14.0.0')) throw new Error('Unsupported MTR RoomOS');
      }
      // Get System Name / Contact Name
      this.sysInfo.name = await this.xapi.status.get('UserInterface.ContactInfo.Name');
      // Get System SN
      this.sysInfo.serial = systemUnit.Hardware.Module.SerialNumber;
      if (!this.sysInfo.name || this.sysInfo.name === '') {
        this.sysInfo.name = this.sysInfo.serial;
      }
      // HTTP Client needed for sending outbound requests
      await this.xapi.config.set('HttpClient.Mode', 'On');
      // Validate Survey Panel
      if (!await this.checkPanel()) { await this.addPanel(); }
      // Validate Survey Button
      const buttonStatus = await this.checkButton();
      if (buttonStatus && !this.o.buttonEnabled) { await this.removePanel(buttonId); }
      if (!buttonStatus && this.o.buttonEnabled) { await this.addButton(this.isRoomOS); }
      // Close any lingering dialogs
      this.xapi.command('UserInterface.Extensions.Panel.Close');
      this.xapi.command('UserInterface.Message.TextInput.Clear');
      // Reset variables
      this.resetVariables();
    } catch (error) {
      console.debug(error.message);
      throw new Error('Config Error');
    }
  }

  // Update Rating Icons
  updateRating() {
    let Value = '';
    switch (this.qualityInfo.rating) {
      case 1:
        Value = '🌟 🌑 🌑 🌑 🌑';
        break;
      case 2:
        Value = '🌟 🌟 🌑 🌑 🌑';
        break;
      case 3:
        Value = '🌟 🌟 🌟 🌑 🌑';
        break;
      case 4:
        Value = '🌟 🌟 🌟 🌟 🌑';
        break;
      default:
    }
    this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value, WidgetId: 'rating_text' });
  }

  // Show Text Input to User
  showTextInput(promptId, overrideTitle = false) {
    // Prevent Survey from closing when prompt open
    clearTimeout(this.panelTimeout);
    const promptBody = {
      Duration: this.o.timeoutPopup,
      InputType: 'SingleLine',
      KeyboardState: 'Open',
      SubmitText: 'Submit',
      Title: `${this.o.promptTitle}${this.issueReport ? ' Issue' : ' Feedback'}`,
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
    this.xapi.command('UserInterface.Message.TextInput.Display', promptBody);
  }

  // Show Prompt to User
  showPrompt() {
    // Prevent Survey from closing when prompt open
    clearTimeout(this.panelTimeout);
    const promptBody = {
      Duration: this.o.timeoutPopup,
      Text: 'Select the most appropriate issue?',
      FeedbackId: 'issue_submit',
      Title: `${this.o.promptTitle}${this.issueReport ? ' Issue' : ' Feedback'}`,
    };
    if (this.qualityInfo.category) {
      const { category } = this.qualityInfo;
      if (categories[category].issues[0]) promptBody['Option.1'] = categories[category].issues[0].text;
      if (categories[category].issues[1]) promptBody['Option.2'] = categories[category].issues[1].text;
      if (categories[category].issues[2]) promptBody['Option.3'] = categories[category].issues[2].text;
      if (categories[category].issues[3]) promptBody['Option.4'] = categories[category].issues[3].text;
      promptBody[`Option.${categories[category].issues.length + 1}`] = 'Cancel';
    } else {
      promptBody.Text = 'Please select a category first';
      promptBody.FeedbackId = 'category_submit';
      promptBody['Option.1'] = categories[catArray[0]].prompt;
      promptBody['Option.2'] = categories[catArray[1]].prompt;
      promptBody['Option.3'] = categories[catArray[2]].prompt;
      promptBody['Option.4'] = categories[catArray[3]].prompt;
      promptBody['Option.5'] = 'Cancel';
    }
    this.xapi.command('UserInterface.Message.Prompt.Display', promptBody);
  }

  // Process Category Selection
  categorySelect(category) {
    if (this.qualityInfo.category === category) return;
    this.qualityInfo.category = category;
    this.qualityInfo.issue = '';
    this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Select Issue >', WidgetId: 'issue_text' });
    if (this.o.logDetailed) console.debug(`Selected Category: ${category}`);
  }

  // ----- xAPI Handle Functions ----- //

  handleCallDisconnect(event) {
    if (!this.callEnabled) return;
    this.callInfo = event;
    this.callInfo.Duration = Number(event.Duration);
    this.processDisconnect();
  }

  handleActiveCall(status) {
    if (!this.callEnabled) return;
    let result = status;
    if (result && !Number.isNaN(result)) {
      result = Number(result);
    }
    if (result > 0) {
      this.processCall();
    }
  }

  handleMTRCall(status) {
    if (!this.callEnabled) return;
    const result = /^true$/i.test(status);
    if (result) {
      this.callType = 'mtr';
      this.callInfo.startTime = Date.now();
    } else {
      if (this.callInfo.startTime) {
        try {
          this.callInfo.Duration = Math.floor(Number(Date.now() - this.callInfo.startTime) / 1000);
          if (this.o.logDetailed) console.debug(`${this.id}: MTR Call calculated duration ${this.callInfo.Duration}s`);
        } catch (error) {
          console.debug('Error calculating MTR Call Duration');
        }
      }
      this.processDisconnect();
    }
  }

  handleOutgoingCallIndication() {
    if (!this.callEnabled) return;
    this.processCall();
  }

  handleTextInputResponse(event) {
    switch (event.FeedbackId) {
      case 'comments_submit':
        if (event.Text !== '') {
          this.qualityInfo.comments = event.Text;
          this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Edit Comments >', WidgetId: 'comments_text' });
        }
        if (event.Text === '' && this.qualityInfo.comments !== '') {
          this.qualityInfo.comments = '';
          this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Comments >', WidgetId: 'comments_text' });
        }
        this.setPanelTimeout();
        break;
      case 'email_submit':
        if (event.Text !== '') {
          if (!/^.*@.*\..*$/.test(event.Text)) {
            console.warn('Invalid Email Address, re-prompting user...');
            this.xapi.command('Audio.Sound.Play', { Sound: 'Binding' });
            this.showTextInput('email_edit', '⚠️ Invalid Email Address ⚠️');
            return;
          }
          this.qualityInfo.email = event.Text;
          this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Edit Email >', WidgetId: 'email_text' });
        }
        if (event.Text === '' && this.qualityInfo.email !== '') {
          this.qualityInfo.email = '';
          this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Add Email >', WidgetId: 'email_text' });
        }
        this.setPanelTimeout();
        break;
      default:
        if (this.logUnknownResponses) console.warn(`Unexpected TextInput.Response: ${event.FeedbackId}`);
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
        if (this.logUnknownResponses) console.warn(`Unexpected TextInput.Clear: ${event.FeedbackId}`);
    }
  }

  handleRatingResponse(event) {
    switch (event.FeedbackId) {
      case 'rating_submit':
      case 'rating_update':
        if (Number.isNaN(event.Rating)) return;
        this.qualityInfo.rating = Number(event.Rating);
        this.updateRating();
        if (this.qualityInfo.rating === 5) {
          this.processRequest();
          return;
        }
        this.xapi.command('UserInterface.Message.Rating.Clear', { FeedbackId: event.FeedbackId });
        if (event.FeedbackId === 'rating_submit') {
          this.xapi.command('UserInterface.Extensions.Panel.Open', { PanelId: panelId });
        }
        this.setPanelTimeout();
        break;
      default:
        if (this.logUnknownResponses) console.warn(`Unexpected Rating.Response: ${event.FeedbackId}`);
    }
  }

  handleRatingCleared(event) {
    if (event.FeedbackId === '') return;
    switch (event.FeedbackId) {
      case 'rating_submit':
      case 'rating_update':
        this.setPanelTimeout();
        break;
      default:
        if (this.logUnknownResponses) console.warn(`Unexpected Rating.Clear: ${event.FeedbackId}`);
    }
  }

  handlePromptResponse(event) {
    if (!event.OptionId) return;
    const index = (Number(event.OptionId) - 1);
    let item;
    switch (event.FeedbackId) {
      case 'category_submit':
        if (index === 5) return;
        item = catArray[index];
        if (!item) {
          console.warn(`Unknown Category Option: ${event.OptionId}`);
          return;
        }
        this.categorySelect(catArray[index]);
        this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: catArray[index], WidgetId: 'category_select' });
        this.showPrompt();
        break;
      case 'issue_submit': {
        const { issues } = categories[this.qualityInfo.category];
        if (!issues) {
          console.warn(`Unable to get Category Issues for ${this.qualityInfo.category}`);
          return;
        }
        // Match on defined Issues or Cancel
        if (index < issues.length) {
          item = categories[this.qualityInfo.category].issues[index].id;
        } else {
          return;
        }
        if (!item) {
          console.warn(`Unknown Issue Option: ${event.OptionId}`);
          return;
        }
        this.qualityInfo.issue = item;
        if (this.o.logDetailed) console.debug(`Selected Issue: ${item}`);
        this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: 'Change Selected Issue >', WidgetId: 'issue_text' });
        this.setPanelTimeout();
        break;
      }
      default:
        if (this.logUnknownResponses) console.warn(`Unexpected Prompt.Response: ${event.FeedbackId}`);
    }
  }

  handlePromptCleared(event) {
    if (event.FeedbackId === '') return;
    switch (event.FeedbackId) {
      case 'category_submit':
      case 'issue_select':
        this.setPanelTimeout();
        break;
      default:
        if (this.logUnknownResponses) console.warn(`Unexpected Prompt.Cleared: ${event.FeedbackId}`);
    }
  }

  async handlePanelClicked(event) {
    if (event.PanelId === buttonId) {
      this.issueReport = true;
      await this.removePanel(panelId, false);
      await this.addPanel(false, false);
      this.qualityInfo.rating = 4;
      await this.xapi.command('UserInterface.Extensions.Widget.SetValue', { Value: ratings[1].id, WidgetId: 'severity_select' });
      this.xapi.command('UserInterface.Extensions.Panel.Open', { PanelId: panelId });
      this.setPanelTimeout();
      return;
    }
    // Continue for Test Buttons only
    if (!/(test_services|test_survey)/.test(event.PanelId)) return;
    if (!this.o.debugButtons) return;
    this.callType = this.isRoomOS ? 'webex' : 'mtr';
    this.callInfo.Duration = 17;
    if (this.isRoomOS) {
      this.callInfo.CauseType = 'LocalDisconnect';
      this.callDestination = 'spark:123456789@webex.com';
    }
    if (event.PanelId === 'test_services') {
      this.qualityInfo.email = 'aileen.mottern@example.com';
      this.qualityInfo.rating = Math.floor((Math.random() * 4) + 1);
      console.debug(`Test Rating - ${this.formatRating(this.qualityInfo.rating)} (${this.qualityInfo.rating})`);
      this.voluntaryRating = true;
      this.skipLog = true;
      this.processRequest();
      return;
    }
    this.showRating();
  }

  handlePageClosed(event) {
    // ignore other page events
    if (event.PageId !== `${panelId}-survey`) return;
    // ignore if survey was submitted
    if (this.voluntaryRating) return;
    // Don't process timed out report issue
    if (this.issueReport) {
      clearTimeout(this.panelTimeout);
      this.resetVariables();
      return;
    }
    if (this.o.defaultSubmit) {
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
      case 'issue_select':
        this.showPrompt();
        break;
      case 'comments_edit':
      case 'email_edit': {
        this.showTextInput(event.WidgetId);
        break;
      }
      case 'rating_edit': {
        this.showRating(true);
        break;
      }
      case 'category_select':
        this.setPanelTimeout();
        this.categorySelect(event.Value);
        break;
      case 'severity_select': {
        this.setPanelTimeout();
        const item = ratings.find((i) => i.id === event.Value);
        if (this.qualityInfo.rating === item.rating) return;
        this.qualityInfo.rating = item.rating;
        if (this.o.logDetailed) console.debug(`Selected Severity: ${item.id}`);
        break;
      }
      default:
        if (this.logUnknownResponses) console.warn(`Unexpected Widget.Action: ${event.WidgetId}`);
    }
  }
}

function processCategories() {
  let result = true;
  Object.keys(categories).forEach((category) => {
    if (!categories[category].issues || categories[category].issues.length === 0) {
      console.error(`Missing Issues for Category: ${category}`);
      result = false;
    }
    if (categories[category].issues.length > 4) {
      console.error(`Too Many Issues for Category: ${category}`);
      result = false;
    }
  });
  return result;
}

// Init function
async function init() {
  console.info(`Room Experience Macro v${version}`);
  if (!processCategories()) return;
  // Declare Class
  const re = new RoomExperience();
  try {
    // perform codec configuration
    await re.configureCodec();

    console.info('--- Processing Subscriptions');
    // Process call disconnect
    xapi.event.on('CallDisconnect', (event) => {
      re.handleCallDisconnect(event);
    });
    // Process outgoing call indication
    xapi.event.on('OutgoingCallIndication', () => {
      re.handleOutgoingCallIndication();
    });
    // Process text input response
    xapi.event.on('UserInterface.Message.TextInput.Response', (event) => {
      re.handleTextInputResponse(event);
    });
    // Process text input clear
    xapi.event.on('UserInterface.Message.TextInput.Clear', (event) => {
      re.handleTextInputClear(event);
    });
    // Process prompt response
    xapi.event.on('UserInterface.Message.Prompt.Response', (event) => {
      re.handlePromptResponse(event);
    });
    // Process prompt clear
    xapi.event.on('UserInterface.Message.Prompt.Cleared', (event) => {
      re.handlePromptCleared(event);
    });
    // Process rating response
    xapi.event.on('UserInterface.Message.Rating.Response', (event) => {
      re.handleRatingResponse(event);
    });
    // Process rating clear
    xapi.event.on('UserInterface.Message.Rating.Cleared', (event) => {
      re.handleRatingCleared(event);
    });
    // Process panel clicked
    xapi.event.on('UserInterface.Extensions.Panel.Clicked', (event) => {
      re.handlePanelClicked(event);
    });
    // Process page closed
    xapi.event.on('UserInterface.Extensions.Event.PageClosed', (event) => {
      re.handlePageClosed(event);
    });
    // Process widget action
    xapi.event.on('UserInterface.Extensions.Widget.Action', (event) => {
      re.handleWidgetAction(event);
    });
    // Process active call
    xapi.status.on('SystemUnit.State.NumberOfActiveCalls', (status) => {
      re.handleActiveCall(status);
    });
    // Process MTR active call
    xapi.status.on('MicrosoftTeams.Calling.InCall', (status) => {
      re.handleMTRCall(status);
    });
  } catch (error) {
    console.error('Error during device and subscription processing');
    console.debug(error.message);
  }
}

init();
