// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 TheBestPlan

// Desktop shell around the same local server the CLI serves:
//   pnpm start [configDir]
"use strict";

const path = require("path");
const { app, BrowserWindow, Menu } = require("electron");
const { serve } = require("../src/gui");

const PORT = 7331;

// No app menu: the default File/Edit/View/Window items don't apply to a build tool.
// Removing it drops the menu bar on Windows/Linux (macOS keeps a minimal one).
Menu.setApplicationMenu(null);

// A packaged build drops the script path from argv, and the folder it is launched
// from is the install directory rather than a project — so the config lives in the
// per-user app data folder unless a directory is passed explicitly.
function resolveConfigDir() {
  const given = process.argv.slice(app.isPackaged ? 1 : 2).find((arg) => !arg.startsWith("-"));
  if (given) return path.resolve(given);
  return app.isPackaged ? app.getPath("userData") : process.cwd();
}

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    backgroundColor: "#14161a",
    title: "Killing Floor Mutator Tools",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  // Wait for the port to accept before navigating, otherwise the window races
  // listen() and lands on ERR_CONNECTION_REFUSED.
  const server = serve(resolveConfigDir(), PORT);
  const open = () => window.loadURL(`http://127.0.0.1:${PORT}`);
  if (server.listening) open();
  else server.once("listening", open);
});

app.on("window-all-closed", () => app.quit());
