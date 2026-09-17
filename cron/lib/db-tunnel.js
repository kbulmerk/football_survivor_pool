// db-tunnel.js — SSH local port-forward to the Raspberry Pi's Postgres
//
// The Pi's docker-compose binds Postgres to 127.0.0.1:5432 on the Pi itself
// (not exposed to the LAN), so scripts running on the Mac need an SSH tunnel
// to reach it. DATABASE_URL in .env.local should point at localhost — this
// module makes that address real for the duration of the DB work.

const { spawn } = require('child_process');
const net = require('net');

const SSH_HOST = 'kbulmer@raspberrypi.local';
const REMOTE_DB_PORT = 5432;

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

function startTunnel(localPort) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ssh', [
      '-N',
      '-L', `${localPort}:localhost:${REMOTE_DB_PORT}`,
      '-o', 'ExitOnForwardFailure=yes',
      '-o', 'ConnectTimeout=10',
      '-o', 'AddressFamily=inet', // raspberrypi.local's IPv6 route is flaky/slow; force IPv4
      SSH_HOST,
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
