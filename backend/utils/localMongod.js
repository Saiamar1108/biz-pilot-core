const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const { spawn, execSync } = require("child_process");

const MONGO_PORT = 27018;

let mongodProcess = null;

function clearMacQuarantine(target) {
  try {
    execSync(`xattr -cr "${target}"`, { stdio: "ignore" });
  } catch {
    // ignore
  }
}

function findMongodBinary() {
  const cacheDir = path.join(__dirname, "../node_modules/.cache/mongodb-memory-server");
  if (!fs.existsSync(cacheDir)) return null;

  const arch = os.arch() === "arm64" ? "arm64" : "x64";
  const candidates = fs
    .readdirSync(cacheDir)
    .filter((f) => f.startsWith(`mongod-${arch}-darwin-`) && !f.endsWith(".tgz"))
    .sort()
    .reverse();

  for (const file of candidates) {
    const binary = path.join(cacheDir, file);
    try {
      clearMacQuarantine(binary);
      execSync(`"${binary}" --version`, { stdio: "ignore", timeout: 5000 });
      return binary;
    } catch {
      // try next version
    }
  }

  return null;
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      isPortOpen(port).then((open) => {
        if (open) return resolve();
        if (Date.now() - start > timeoutMs) {
          return reject(new Error(`MongoDB did not start on port ${port} within ${timeoutMs}ms`));
        }
        setTimeout(check, 200);
      });
    };
    check();
  });
}

async function startLocalMongod() {
  const uri = `mongodb://127.0.0.1:${MONGO_PORT}/shoppilot`;

  if (await isPortOpen(MONGO_PORT)) {
    return uri;
  }

  const binary = findMongodBinary();
  if (!binary) {
    throw new Error(
      "MongoDB binary not found. Run: cd backend && npm install mongodb-memory-server --save-dev"
    );
  }

  const dbPath = path.join(__dirname, "../.mongo-data");
  fs.mkdirSync(dbPath, { recursive: true });

  mongodProcess = spawn(
    binary,
    ["--port", String(MONGO_PORT), "--dbpath", dbPath, "--bind_ip", "127.0.0.1", "--noauth"],
    { stdio: "ignore", detached: false }
  );

  mongodProcess.on("error", (err) => {
    console.error("Failed to spawn mongod:", err.message);
  });

  if (!process.listenerCount("exit")) {
    process.on("exit", stopLocalMongod);
    process.on("SIGINT", () => {
      stopLocalMongod();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      stopLocalMongod();
      process.exit(0);
    });
  }

  await waitForPort(MONGO_PORT);
  return uri;
}

function stopLocalMongod() {
  if (mongodProcess && !mongodProcess.killed) {
    mongodProcess.kill();
    mongodProcess = null;
  }
}

module.exports = { startLocalMongod, stopLocalMongod };
