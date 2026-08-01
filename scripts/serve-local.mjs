import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = resolve(root, "dist/client");
const serverEntry = resolve(root, "dist/server/index.js");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

try {
  await stat(serverEntry);
} catch {
  console.error("Production files are missing. Run `npm run build` once, then retry.");
  process.exit(1);
}

const { default: worker } = await import(serverEntry);

async function fetchAsset(request) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const relativePath = pathname.replace(/^\/+/, "");
  const filePath = resolve(clientRoot, relativePath);
  if (!filePath.startsWith(`${clientRoot}${sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "cache-control": relativePath.startsWith("assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=300",
        "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

const env = { ASSETS: { fetch: fetchAsset } };
const executionContext = {
  passThroughOnException() {},
  waitUntil(promise) {
    Promise.resolve(promise).catch(() => {});
  },
};

const server = createServer(async (incoming, outgoing) => {
  try {
    const requestUrl = `http://${incoming.headers.host || `localhost:${port}`}${incoming.url || "/"}`;
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const init = {
      method: incoming.method,
      headers: incoming.headers,
      body: ["GET", "HEAD"].includes(incoming.method || "GET") ? undefined : body,
    };
    if (init.body) init.duplex = "half";

    const response = await worker.fetch(new Request(requestUrl, init), env, executionContext);
    outgoing.statusCode = response.status;
    outgoing.statusMessage = response.statusText;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));

    if (incoming.method === "HEAD") {
      outgoing.end();
      return;
    }

    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.statusCode = 500;
    outgoing.end("Iran ThermoCalc local server error");
  }
});

const localAddress = Object.values(networkInterfaces())
  .flat()
  .find((entry) => entry?.family === "IPv4" && !entry.internal)?.address;

server.listen(port, host, () => {
  console.log("\nIran ThermoCalc is running:\n");
  console.log(`  This Mac:   http://localhost:${port}`);
  if (localAddress) console.log(`  Same Wi-Fi: http://${localAddress}:${port}`);
  console.log("\nPress Control+C to stop.\n");
});

