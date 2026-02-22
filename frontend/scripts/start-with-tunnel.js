const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");

const ENV_PATH = path.join(__dirname, "..", ".env");
const BACKEND_PORT = 8000;
const NGROK_API_PORT = 4041;

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

function writeEnv(env) {
  const content = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";
  fs.writeFileSync(ENV_PATH, content);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

function createNgrokConfig() {
  const env = readEnv();
  const authtoken = env.NGROK_AUTHTOKEN || process.env.NGROK_AUTHTOKEN || "";
  const configPath = path.join(os.tmpdir(), "guidio-ngrok-backend.yml");
  const yaml = [
    `version: "2"`,
    `web_addr: 127.0.0.1:${NGROK_API_PORT}`,
    authtoken ? `authtoken: ${authtoken}` : "",
  ].filter(Boolean).join("\n") + "\n";
  fs.writeFileSync(configPath, yaml);
  return configPath;
}

async function waitForTunnel(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await fetchJson(`http://127.0.0.1:${NGROK_API_PORT}/api/tunnels`);
      const tunnel = resp.tunnels?.find((t) => t.proto === "https") || resp.tunnels?.[0];
      if (tunnel) return tunnel.public_url;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timed out waiting for backend ngrok tunnel");
}

async function main() {
  console.log("[tunnel] Starting ngrok tunnel for backend on port", BACKEND_PORT);

  const configPath = createNgrokConfig();
  const ngrok = spawn(
    "ngrok",
    ["http", String(BACKEND_PORT), `--config=${configPath}`],
    { stdio: ["ignore", "ignore", "inherit"], windowsHide: true }
  );

  ngrok.on("error", (err) => {
    console.error("[tunnel] Failed to start ngrok:", err.message);
    process.exit(1);
  });

  try {
    const publicUrl = await waitForTunnel();
    console.log("[tunnel] Backend tunnel ready:", publicUrl);

    const env = readEnv();
    env.SERVER_URL = publicUrl;
    writeEnv(env);
    console.log("[tunnel] Updated .env with SERVER_URL =", publicUrl);

    const expo = spawn("npx", ["expo", "start", "--tunnel"], {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, SERVER_URL: publicUrl },
    });

    expo.on("exit", (code) => {
      ngrok.kill();
      process.exit(code ?? 0);
    });

    process.on("SIGINT", () => {
      expo.kill("SIGINT");
      ngrok.kill();
    });
    process.on("SIGTERM", () => {
      expo.kill("SIGTERM");
      ngrok.kill();
    });
  } catch (err) {
    console.error("[tunnel]", err.message);
    ngrok.kill();
    process.exit(1);
  }
}

main();
