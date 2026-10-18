// db-tunnel.js — SSH local port-forward to the Raspberry Pi's Postgres
//
// The Pi's docker-compose binds Postgres to 127.0.0.1:5432 on the Pi itself
// (not exposed to the LAN), so scripts running on the Mac need an SSH tunnel
// to reach it. DATABASE_URL in .env.local should point at localhost — this
// module makes that address real for the duration of the DB work.

const { spawn } = require('child_process');
const net = require('net');

const SSH_USER = 'kbulmer';
// Tried in order. The Mac's mDNS lookup of raspberrypi.local fails now and
// then ("Could not resolve hostname"), so fall back to the Pi's LAN address
// and then its Tailscale address (stable, and works away from home too).
// Override with PI_SSH_HOSTS=host1,host2 in .env.local.
const SSH_HOSTS = (process.env.PI_SSH_HOSTS || 'raspberrypi.local,192.168.1.195,100.109.98.112')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);
// Verify every address against the host key already saved for
// raspberrypi.local, so the IP fallbacks don't fail on an unknown-host prompt.
const HOST_KEY_ALIAS = 'raspberrypi.local';
const REMOTE_DB_PORT = 5432;
const ROUNDS = 3;
const ROUND_DELAY_MS = 30 * 1000;

function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for SSH tunnel on port ${port}`));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

// Tries each host in SSH_HOSTS, and if all fail, waits and tries the whole
// list again, up to ROUNDS times.
async function startTunnel(localPort) {
  const errors = [];
  for (let round = 1; round <= ROUNDS; round++) {
    for (const host of SSH_HOSTS) {
      try {
        const proc = await startTunnelTo(host, localPort);
        console.log(`SSH tunnel up via ${host}.`);
        return proc;
      } catch (err) {
        console.warn(`SSH tunnel via ${host} failed (round ${round}/${ROUNDS}): ${err.message}`);
        errors.push(`${host}: ${err.message}`);
      }
    }
    if (round < ROUNDS) await new Promise((r) => setTimeout(r, ROUND_DELAY_MS));
  }
  throw new Error(`Could not open SSH tunnel to the Pi after ${ROUNDS} rounds:\n  ${errors.join('\n  ')}`);
}

function startTunnelTo(host, localPort) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ssh', [
      '-N',
      '-L', `${localPort}:localhost:${REMOTE_DB_PORT}`,
      '-o', 'ExitOnForwardFailure=yes',
      '-o', 'ConnectTimeout=10',
      '-o', 'BatchMode=yes', // never hang on a password/host-key prompt under cron
      '-o', `HostKeyAlias=${HOST_KEY_ALIAS}`,
      '-o', 'AddressFamily=inet', // raspberrypi.local's IPv6 route is flaky/slow; force IPv4
      `${SSH_USER}@${host}`,
    ]);

    let settled = false;
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Failed to start SSH tunnel: ${err.message}`));
      }
    });
    proc.on('exit', (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`SSH tunnel exited before it was ready (code ${code}): ${stderr.trim()}`));
      }
    });

    waitForPort(localPort, 20000)
      .then(() => {
        if (!settled) {
          settled = true;
          resolve(proc);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          proc.kill();
          reject(err);
        }
      });
  });
}

function stopTunnel(proc) {
  if (proc && !proc.killed) {
    proc.kill();
  }
}

module.exports = { startTunnel, stopTunnel };
