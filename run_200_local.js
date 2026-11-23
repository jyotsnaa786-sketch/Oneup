const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 8011;
process.env.BASE_URL = `http://127.0.0.1:${PORT}`;
process.env.PORT = String(PORT);

console.log(`Starting local server on port ${PORT}...`);
const server = spawn(process.execPath, [path.join(__dirname, 'backend/server.js')], {
  cwd: path.join(__dirname, 'backend'),
  env: { ...process.env, PORT: String(PORT) }
});

function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (count) => {
      http.get(`http://127.0.0.1:${PORT}/api/ping`, (res) => {
        if (res.statusCode === 200) resolve();
        else if (count > 0) setTimeout(() => check(count - 1), 300);
        else reject(new Error("Server start timeout"));
      }).on('error', () => {
        if (count > 0) setTimeout(() => check(count - 1), 300);
        else reject(new Error("Server start timeout"));
      });
    };
    check(retries);
  });
}

waitForServer().then(() => {
  console.log("Server ready! Launching 200 tests against local server...");
  const tests = spawn(process.execPath, [path.join(__dirname, 'run_200_tests.js')], {
    cwd: __dirname,
    env: { ...process.env, BASE_URL: `http://127.0.0.1:${PORT}` },
    stdio: 'inherit'
  });

  tests.on('exit', (code) => {
    server.kill();
    process.exit(code || 0);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
  server.kill();
  process.exit(1);
});
