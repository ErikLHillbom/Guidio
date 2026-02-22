const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ngrokBinIndex = path.join(
  __dirname, "..", "node_modules", "@expo", "ngrok-bin", "index.js"
);
const ngrokIndex = path.join(
  __dirname, "..", "node_modules", "@expo", "ngrok", "index.js"
);

if (!fs.existsSync(ngrokBinIndex)) {
  console.log("[fix-ngrok] @expo/ngrok-bin not found, skipping.");
  process.exit(0);
}

// 1. Patch @expo/ngrok-bin to use system ngrok v3
let ngrokPath;
try {
  ngrokPath = execSync(
    process.platform === "win32" ? "where.exe ngrok" : "which ngrok",
    { encoding: "utf8" }
  ).trim().split("\n")[0].trim();
} catch {
  console.error("[fix-ngrok] System ngrok not found. Install ngrok v3.");
  process.exit(1);
}

fs.writeFileSync(
  ngrokBinIndex,
  `// Patched: use system ngrok v3 instead of bundled v2\nmodule.exports = ${JSON.stringify(ngrokPath)};\n`
);
console.log(`[fix-ngrok] Patched @expo/ngrok-bin -> ${ngrokPath}`);

// 2. Patch @expo/ngrok/index.js to strip fields ngrok v3 rejects
if (fs.existsSync(ngrokIndex)) {
  const VALID_TUNNEL_FIELDS = [
    "name", "proto", "addr", "inspect", "host_header",
    "bind_tls", "schemes", "subdomain", "hostname", "auth",
    "ip_restriction", "mutual_tls_cas",
  ];

  const patched = `// Patched by fix-ngrok.js for ngrok v3 compatibility
const { NgrokClient, NgrokClientError } = require("./src/client");
const uuid = require("uuid");
const {
  getProcess,
  getActiveProcess,
  killProcess,
  setAuthtoken,
  getVersion,
} = require("./src/process");
const { defaults, validate, isRetriable } = require("./src/utils");

const VALID_TUNNEL_FIELDS = new Set(${JSON.stringify(VALID_TUNNEL_FIELDS)});

function tunnelOpts(opts) {
  const cleaned = {};
  for (const key of Object.keys(opts)) {
    if (VALID_TUNNEL_FIELDS.has(key)) cleaned[key] = opts[key];
  }
  return cleaned;
}

let processUrl = null;
let ngrokClient = null;

async function connect(opts) {
  opts = defaults(opts);
  validate(opts);
  if (opts.authtoken) {
    await setAuthtoken(opts);
  }
  processUrl = await getProcess(opts);
  ngrokClient = new NgrokClient(processUrl);
  return connectRetry(opts);
}

async function connectRetry(opts, retryCount = 0) {
  opts.name = String(opts.name || uuid.v4());
  const apiOpts = tunnelOpts(opts);
  try {
    const response = await ngrokClient.startTunnel(apiOpts);
    return response.public_url;
  } catch (err) {
    if (!isRetriable(err) || retryCount >= 100) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return connectRetry(opts, ++retryCount);
  }
}

async function disconnect(publicUrl) {
  if (!ngrokClient) return;
  const tunnels = (await ngrokClient.listTunnels()).tunnels;
  if (!publicUrl) {
    const disconnectAll = tunnels.map((tunnel) =>
      disconnect(tunnel.public_url)
    );
    return Promise.all(disconnectAll);
  }
  const tunnelDetails = tunnels.find(
    (tunnel) => tunnel.public_url === publicUrl
  );
  if (!tunnelDetails) {
    throw new Error(\`there is no tunnel with url: \${publicUrl}\`);
  }
  return ngrokClient.stopTunnel(tunnelDetails.name);
}

async function kill() {
  if (!ngrokClient) return;
  await killProcess();
  ngrokClient = null;
}

function getUrl() { return processUrl; }
function getApi() { return ngrokClient; }

module.exports = {
  connect, disconnect, authtoken: setAuthtoken, kill,
  getUrl, getApi, getVersion, getActiveProcess, NgrokClientError,
};
`;

  fs.writeFileSync(ngrokIndex, patched);
  console.log("[fix-ngrok] Patched @expo/ngrok/index.js for v3 API compatibility");
}
