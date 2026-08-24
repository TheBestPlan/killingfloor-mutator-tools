// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 TheBestPlan

// Local server behind the build UI. Bound to 127.0.0.1: it edits the config on disk
// and starts compilers, so it is never exposed beyond the machine running it.
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { build, detectGamePath, detectUccPath, loadConfig, saveConfig, validate } = require("./build");

const PAGE = path.join(__dirname, "gui.html");
const I18N = path.join(__dirname, "i18n.js");

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function json(response, payload, status = 200) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  response.end(body);
}

function serve(configDir, port) {
  const listeners = new Set();
  let building = false;

  const broadcast = (event, data) => {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const listener of listeners) listener.write(frame);
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    try {
      if (url.pathname === "/") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(fs.readFileSync(PAGE));
        return;
      }

      if (url.pathname === "/i18n.js") {
        response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        response.end(fs.readFileSync(I18N));
        return;
      }

      if (url.pathname === "/api/events") {
        response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
        response.write("retry: 2000\n\n");
        listeners.add(response);
        request.on("close", () => listeners.delete(response));
        return;
      }

      if (url.pathname === "/api/config" && request.method === "GET") {
        const config = loadConfig(configDir);
        const { problems, gamePath, uccPath } = validate(config);
        json(response, { config, problems, resolved: { gamePath, uccPath }, configDir });
        return;
      }

      if (url.pathname === "/api/config" && request.method === "POST") {
        const config = { ...loadConfig(configDir), ...(await readBody(request)) };
        saveConfig(config);
        json(response, { ok: true });
        return;
      }

      if (url.pathname === "/api/detect" && request.method === "POST") {
        const gamePath = detectGamePath();
        json(response, { gamePath, uccPath: gamePath ? detectUccPath(gamePath) : "" });
        return;
      }

      if (url.pathname === "/api/build" && request.method === "POST") {
        if (building) {
          json(response, { error: "a build is already running" }, 409);
          return;
        }
        const { packages } = await readBody(request);
        const config = loadConfig(configDir);
        if (packages && packages.length) config.packages = packages;

        building = true;
        json(response, { started: true });
        broadcast("start", { packages: config.packages });
        build(config, (message) => broadcast("log", message))
          .then((result) => broadcast("done", result))
          .catch((error) => broadcast("fail", error.message))
          .finally(() => {
            building = false;
          });
        return;
      }

      response.writeHead(404).end("not found");
    } catch (error) {
      json(response, { error: error.message }, 500);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`killingfloor-mutator-tools GUI: http://127.0.0.1:${port}  (config: ${configDir})`);
  });
  return server;
}

module.exports = { serve };
