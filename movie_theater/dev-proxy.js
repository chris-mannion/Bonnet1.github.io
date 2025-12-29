const http = require("node:http");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { URL } = require("node:url");

const ROOT_DIR = __dirname;
const ENV_PATH = join(ROOT_DIR, ".env");

if (existsSync(ENV_PATH)) {
  const envFile = readFileSync(ENV_PATH, "utf8");
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!key) {
      return;
    }
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

const port = Number(process.env.TMDB_PROXY_PORT || 8787);
const bearerToken = process.env.TMDB_BEARER_TOKEN;
const apiKey = process.env.TMDB_API_KEY;

if (!bearerToken && !apiKey) {
  console.error("Missing TMDB_BEARER_TOKEN or TMDB_API_KEY in movie_theater/.env");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);
  if (!requestUrl.pathname.startsWith("/tmdb/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const tmdbPath = requestUrl.pathname.replace("/tmdb", "");
  const targetUrl = new URL(`https://api.themoviedb.org/3${tmdbPath}`);

  requestUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  if (apiKey && !targetUrl.searchParams.has("api_key")) {
    targetUrl.searchParams.set("api_key", apiKey);
  }

  const headers = {
    Accept: "application/json",
  };

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  try {
    const response = await fetch(targetUrl, { headers });
    const body = Buffer.from(await response.arrayBuffer());

    res.writeHead(response.status, {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy request failed" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`TMDb local proxy running on http://127.0.0.1:${port}/tmdb/`);
});
