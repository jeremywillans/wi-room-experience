//
// Util Module
//

// Parse and return JWT decoded integration credentials
function parseJwt(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}
exports.parseJwt = parseJwt;

// Abbreviate Device Id
function shortName(deviceId) {
  return `${deviceId.slice(0, 8)}...${deviceId.slice(-8)}`;
}
exports.shortName = shortName;

// Generate Unique Identifier for each Device (used in Logs)
function uniqueId(d, deviceId) {
  const result = deviceId.slice(-4);
  const existing = Object.keys(d).map((j) => d[j].id).includes(result);
  if (!existing) return result;
  return uniqueId(d, deviceId.slice(0, deviceId.length - 1));
}
exports.uniqueId = uniqueId;

// String Title Case Formatter
function toTitleCase(str) {
  const src = str.toString();
  return src.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
}
exports.toTitleCase = toTitleCase;

// Sleepy Time
async function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.sleep = sleep;
