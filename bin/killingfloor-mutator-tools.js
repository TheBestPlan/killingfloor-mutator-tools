#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 TheBestPlan

// CLI front end. Example:
//   node bin/killingfloor-mutator-tools.js build --config=../killingfloor-mutators
"use strict";

const path = require("path");
const {
  CONFIG_NAME,
  DEFAULT_CONFIG,
  build,
  detectGamePath,
  detectUccPath,
  loadConfig,
  saveConfig,
  validate,
} = require("../src/build");

const USAGE = `killingfloor-mutator-tools — compile Killing Floor mutators without touching the game install

  build [Package...]   compile every package in ${CONFIG_NAME}, or only the named ones
  detect               fill gamePath/uccPath in ${CONFIG_NAME} from the local Steam libraries
  check                validate the config without compiling
  gui [port]           serve the browser UI (default port 7331)

  --config=<dir>       directory holding ${CONFIG_NAME} (default: current directory)
`;

function argValue(args, name) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg === "--help" || arg === "-h")) {
    console.log(USAGE);
    return;
  }

  const command = args.find((arg) => !arg.startsWith("--")) || "build";
  const configDir = path.resolve(argValue(args, "config") || process.cwd());
  const config = loadConfig(configDir);

  if (command === "gui") {
    const port = Number(args.filter((arg) => !arg.startsWith("--"))[1]) || 7331;
    require("../src/gui").serve(configDir, port);
    return;
  }

  if (command === "detect") {
    config.gamePath = config.gamePath || detectGamePath();
    config.uccPath = config.uccPath || (config.gamePath ? detectUccPath(config.gamePath) : "");
    for (const key of Object.keys(DEFAULT_CONFIG)) if (!(key in config)) config[key] = DEFAULT_CONFIG[key];
    saveConfig(config);
    console.log(`gamePath: ${config.gamePath || "not found"}`);
    console.log(`uccPath:  ${config.uccPath || "not found"}`);
    console.log(`written:  ${config.configFile}`);
    return;
  }

  if (command === "check") {
    const { problems, gamePath, uccPath } = validate(config);
    console.log(`gamePath: ${gamePath || "-"}`);
    console.log(`uccPath:  ${uccPath || "-"}`);
    if (problems.length) {
      problems.forEach((problem) => console.error(`  ! ${problem}`));
      process.exitCode = 1;
    } else {
      console.log("ok");
    }
    return;
  }

  if (command !== "build") {
    console.log(USAGE);
    process.exitCode = args.length ? 1 : 0;
    return;
  }

  const only = args.filter((arg) => !arg.startsWith("--")).slice(1);
  if (only.length) {
    config.packages = config.packages.filter((entry) => only.includes(path.basename(path.resolve(configDir, entry))));
    if (!config.packages.length) throw new Error(`no configured package matches: ${only.join(", ")}`);
  }

  await build(config, (message) => console.log(message));
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
