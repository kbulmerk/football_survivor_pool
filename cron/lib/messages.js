// messages.js — Send a text via macOS Messages, iMessage first then SMS
//
// iPhone recipients get a blue-bubble iMessage. Recipients who aren't on
// iMessage (e.g. Android) can't be reached that way, so this falls back to
// the Mac's SMS account, which only exists if this Mac has Text Message
// Forwarding turned on via a paired iPhone (Messages > Settings > iMessage >
// "Text Message Forwarding" on the iPhone). Without that, the SMS attempt
// will fail too and the caller sees a clear error either way.

const { execSync, execFileSync } = require('child_process');

const CHAT_DB_PATH = `${process.env.HOME}/Library/Messages/chat.db`;
const APPLE_EPOCH_OFFSET_SEC = 978307200; // seconds between 1970-01-01 and 2001-01-01 (chat.db's date epoch)
const DELIVERY_POLL_ATTEMPTS = 8;
const DELIVERY_POLL_INTERVAL_SEC = 1;

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

// AppleScript's `send` only confirms Messages queued the outgoing message —
// not that it was actually delivered. For a recipient who isn't reachable on
// iMessage (e.g. Android), `send` still returns success and the failure only
// shows up later as "Not Delivered" in the Messages database. Poll chat.db
// briefly so we can catch that and fall back to SMS instead of reporting a
// false success.
function checkImessageDelivery(phone, sentAtMs) {
  const last10 = phone.replace(/\D/g, '').slice(-10);
  if (!last10) return 'unknown';

  const dateThreshold = Math.round((sentAtMs / 1000 - APPLE_EPOCH_OFFSET_SEC - 2) * 1e9);
  const sql = `SELECT error, is_delivered FROM message m
    JOIN handle h ON h.ROWID = m.handle_id
    WHERE m.is_from_me = 1 AND m.date >= ${dateThreshold}
      AND replace(replace(replace(h.id,'+',''),'-',''),' ','') LIKE '%${last10}'
    ORDER BY m.date DESC LIMIT 1;`;

  for (let attempt = 0; attempt < DELIVERY_POLL_ATTEMPTS; attempt++) {
    let rows;
    try {
      const out = execFileSync('sqlite3', ['-readonly', '-json', CHAT_DB_PATH, sql], {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();
      rows = out ? JSON.parse(out) : [];
    } catch {
      // No Full Disk Access or chat.db unreadable — can't verify, don't block sending.
      return 'unknown';
    }

    if (rows.length > 0) {
      if (rows[0].error) return 'failed';
      if (rows[0].is_delivered === 1) return 'delivered';
    }

    execFileSync('sleep', [String(DELIVERY_POLL_INTERVAL_SEC)]);
  }

  return 'unknown';
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
    const sentAtMs = Date.now();
    sendViaService(safePhone, safeMessage, 'iMessage');

    if (checkImessageDelivery(safePhone, sentAtMs) === 'failed') {
      throw new Error('iMessage was not delivered (recipient likely not reachable via iMessage)');
    }
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
