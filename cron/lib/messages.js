// messages.js — Send a text via macOS Messages, iMessage first then SMS
//
// iPhone recipients get a blue-bubble iMessage. Recipients who aren't on
// iMessage (e.g. Android) can't be reached that way, so this falls back to
// the Mac's SMS account, which only exists if this Mac has Text Message
// Forwarding turned on via a paired iPhone (Messages > Settings > iMessage >
// "Text Message Forwarding" on the iPhone). Without that, the SMS attempt
// will fail too and the caller sees a clear error either way.

const { execSync } = require('child_process');

function escapeForAppleScript(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function sendViaService(phone, message, serviceType) {
  const lines = [
    'tell application "Messages"',
    `  set targetService to id of 1st account whose service type = ${serviceType}`,
    `  set theBuddy to participant "${phone}" of account id targetService`,
    `  send "${message}" to theBuddy`,
    'end tell'
  ];

  const args = lines.map(line => `-e ${JSON.stringify(line)}`).join(' ');
  execSync(`osascript ${args}`, { stdio: ['ignore', 'ignore', 'pipe'] });
}

/**
 * Sends `message` to `phoneNumber`, trying iMessage first and falling back
 * to SMS if the recipient isn't reachable on iMessage. Throws if both fail.
 * Returns which service the message actually went out on.
 */
function sendMessage(phoneNumber, message) {
  const safeMessage = escapeForAppleScript(message);
  const safePhone = phoneNumber.trim();

  try {
    sendViaService(safePhone, safeMessage, 'iMessage');
    return 'iMessage';
  } catch (iMessageErr) {
    try {
      sendViaService(safePhone, safeMessage, 'SMS');
      return 'SMS';
    } catch (smsErr) {
      const iMessageReason = (iMessageErr.stderr || iMessageErr.message).toString().trim().split('\n').pop();
      const smsReason = (smsErr.stderr || smsErr.message).toString().trim().split('\n').pop();
      throw new Error(`iMessage failed (${iMessageReason}); SMS fallback also failed (${smsReason})`);
    }
  }
}

module.exports = { sendMessage };
