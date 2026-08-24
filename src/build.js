// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 TheBestPlan

// The build itself: Steam discovery, the isolated UCC workspace, dependency staging
// and the run. Every path in here reads the game install and writes only into the
// workspace and the configured outputs.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const CONFIG_NAME = "killingfloor-mutator-tools.config.json";

// UCC resolves its base directory from the folder Core.dll was loaded out of, not
// from the .exe path. So the workspace needs its own copy of the native DLLs, and
// nothing may be added to the game's System folder.
const WORKSPACE_FILE_PATTERNS = [/\.dll$/i, /\.int$/i];
const WORKSPACE_REQUIRED_FILES = ["Default.ini", "DefUser.ini"];

const GAME_INI = "KillingFloor.ini";
const CONTENT_DIRS = ["System", "Textures", "Sounds", "StaticMeshes", "Animations", "Music", "Maps", "KarmaData"];
const CONTENT_EXT = {
  System: "*.u",
  Textures: "*.utx",
  Sounds: "*.uax",
  StaticMeshes: "*.usx",
  Animations: "*.ukx",
  Music: "*.umx",
  Maps: "*.rom",
  KarmaData: "*.ka",
};

const DEFAULT_CONFIG = {
  gamePath: "",
  uccPath: "",
  // Short on purpose: UCC predates long-path support, and the staged
  // <workspace>/<Package>/Classes/<Class>.uc paths must stay under MAX_PATH.
  workspace: ".ucc",
  packages: [],
  resourcePaths: [],
  outputPath: "dist",
  copyTo: [],
  strip: true,
  compress: true,
  buildInfoClass: "BuildInfo",
  wine: "wine",
};

/* ------------------------------------------------------------------ config */

function loadConfig(startDir) {
  const file = path.join(startDir, CONFIG_NAME);
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const config = { ...DEFAULT_CONFIG, ...raw };
  config.configDir = startDir;
  config.configFile = file;
  return config;
}

function saveConfig(config) {
  const { configDir, configFile, ...persisted } = config;
  fs.writeFileSync(configFile, JSON.stringify(persisted, null, 2) + "\n", "utf8");
}

function resolveFrom(baseDir, value) {
  return path.resolve(baseDir, value);
}

/* --------------------------------------------------------- game discovery */

function steamLibraryRoots() {
  const candidates = [
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Steam"),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Steam"),
    path.join(os.homedir(), ".steam", "steam"),
    path.join(os.homedir(), ".local", "share", "Steam"),
    path.join(os.homedir(), "Library", "Application Support", "Steam"),
  ].filter(Boolean);

  const roots = new Set();
  for (const steam of candidates) {
    const vdf = path.join(steam, "steamapps", "libraryfolders.vdf");
    if (!fs.existsSync(vdf)) continue;
    roots.add(steam);
    // libraryfolders.vdf lists extra library roots as `"path"   "D:\\games\\SteamLibrary"`
    for (const match of fs.readFileSync(vdf, "utf8").matchAll(/"path"\s+"([^"]+)"/g)) {
      roots.add(match[1].replace(/\\\\/g, "\\"));
    }
  }
  return [...roots];
}

function detectGamePath() {
  for (const root of steamLibraryRoots()) {
    const dir = path.join(root, "steamapps", "common", "KillingFloor");
    if (fs.existsSync(path.join(dir, "System", "Default.ini"))) return dir;
  }
  return "";
}

// The retail client ships every DLL, .u and content package but no UCC.exe — not
// even with the SDK installed. The compiler only comes with the Killing Floor
// dedicated server, so every Steam app folder is checked for one.
function detectUccPath(gamePath = "") {
  const candidates = [];
  if (gamePath) candidates.push(path.join(gamePath, "System", "UCC.exe"));

  for (const root of steamLibraryRoots()) {
    const common = path.join(root, "steamapps", "common");
    if (!fs.existsSync(common)) continue;
    for (const app of fs.readdirSync(common)) {
      candidates.push(path.join(common, app, "System", "UCC.exe"));
    }
  }

  // A Killing Floor server build is a far better match than some other UE2 game's.
  candidates.sort((left, right) => Number(/killingfloor/i.test(right)) - Number(/killingfloor/i.test(left)));
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

/* ------------------------------------------------------------- workspace */

function fingerprint(files) {
  return files
    .map((file) => {
      const stat = fs.statSync(file);
      return `${path.basename(file).toLowerCase()}:${stat.size}:${Math.floor(stat.mtimeMs)}`;
    })
    .join("|");
}

function prepareWorkspace(context) {
  const { gameSystem, workspaceSystem, uccPath, log } = context;

  const sources = fs
    .readdirSync(gameSystem)
    .filter((name) => WORKSPACE_FILE_PATTERNS.some((pattern) => pattern.test(name)))
    .concat(WORKSPACE_REQUIRED_FILES)
    .map((name) => path.join(gameSystem, name))
    .filter((file) => fs.existsSync(file));

  const stampFile = path.join(workspaceSystem, ".toolchain");
  const stamp = fingerprint([...sources, uccPath].sort());

  if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, "utf8") === stamp) return;

  log(`  Syncing toolchain from ${gameSystem}`);
  fs.mkdirSync(workspaceSystem, { recursive: true });
  for (const file of sources) fs.copyFileSync(file, path.join(workspaceSystem, path.basename(file)));
  fs.copyFileSync(uccPath, path.join(workspaceSystem, "UCC.exe"));
  fs.writeFileSync(stampFile, stamp, "utf8");
}

/* -------------------------------------------------------------------- ini */

// The compiler only understands Windows paths; under Wine the host filesystem is
// mounted on Z: by default.
function toEnginePath(absolutePath) {
  const windowsStyle = absolutePath.replace(/\//g, "\\");
  return process.platform === "win32" ? windowsStyle : `Z:${windowsStyle}`;
}

function contentPathsFor(root, dirs = CONTENT_DIRS) {
  return dirs
    .filter((dir) => fs.existsSync(path.join(root, dir)))
    .map((dir) => `Paths=${toEnginePath(path.join(root, dir))}\\${CONTENT_EXT[dir]}`);
}

// Prebuilt dependency packages are linked into the workspace rather than reached
// through Paths: `ucc make` skips any package whose .u it can already see, so a
// prebuilt copy anywhere on the search path would silently cancel the rebuild.
function stageResourcePackages(context, packageNames) {
  const built = new Set(packageNames.map((name) => name.toLowerCase()));

  for (const root of context.resourceRoots) {
    const systemDir = path.join(root, "System");
    if (!fs.existsSync(systemDir)) continue;

    for (const name of fs.readdirSync(systemDir)) {
      if (!/\.(u|ucl)$/i.test(name)) continue;
      if (built.has(name.replace(/\.(u|ucl)$/i, "").toLowerCase())) continue;

      const from = path.join(systemDir, name);
      const to = path.join(context.workspaceSystem, name);
      const source = fs.statSync(from);
      const existing = fs.existsSync(to) && fs.statSync(to);
      if (existing && existing.size === source.size && existing.mtimeMs >= source.mtimeMs) continue;

      fs.rmSync(to, { force: true });
      try {
        fs.linkSync(from, to);
      } catch {
        fs.copyFileSync(from, to); // different volume
      }
      context.log(`  linked ${name}`);
    }
  }
}

function writeIni(context, packageNames) {
  const { gamePath, gameSystem, workspaceSystem, resourceRoots } = context;

  const extraPaths = [
    "Paths=..\\System\\*.u", // freshly built packages win over the game's copies
    ...contentPathsFor(gamePath),
    // resource System/*.u is staged into the workspace instead, see stageResourcePackages
    ...resourceRoots.flatMap((root) => contentPathsFor(root, CONTENT_DIRS.filter((dir) => dir !== "System"))),
  ];

  const lines = [];
  let inCoreSystem = false;
  let pathsWritten = false;

  for (const raw of fs.readFileSync(path.join(gameSystem, "Default.ini"), "latin1").split(/\r?\n/)) {
    const line = raw;

    if (/^\[.*\]/.test(line)) inCoreSystem = /^\[Core\.System\]/i.test(line);

    if (inCoreSystem && /^Paths=/i.test(line)) {
      if (!pathsWritten) {
        lines.push(...extraPaths);
        pathsWritten = true;
      }
      continue; // the game's relative Paths are replaced by the absolute ones above
    }

    lines.push(line);

    if (/^EditPackages=FrightScript/i.test(line)) {
      lines.push(...packageNames.map((name) => `EditPackages=${name}`));
    }
  }

  fs.writeFileSync(path.join(workspaceSystem, GAME_INI), lines.join("\r\n"), "latin1");
}

/* -------------------------------------------------------------- BuildInfo */

function gitShortHash(dir) {
  const result = spawnSync("git", ["-C", dir, "rev-parse", "--short=8", "HEAD"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function buildVersion(sourceDir) {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const hash =
    gitShortHash(sourceDir) ||
    (process.env.CI_COMMIT_SHORT_SHA || process.env.CI_COMMIT_SHA || process.env.GITHUB_SHA || "").slice(0, 8) ||
    "nogit";
  return `${stamp} ${hash}`;
}

// Stamped into the workspace copy *and* back into the developer's own sources, so
// the version that shipped stays visible and diffable in the mutator repository.
function injectBuildInfo(context, stagedDir, sourceDir) {
  if (!context.config.buildInfoClass) return null;

  const relative = path.join("Classes", `${context.config.buildInfoClass}.uc`);
  const files = [path.join(stagedDir, relative), path.join(sourceDir, relative)].filter((file) => fs.existsSync(file));
  if (!files.length) return null;

  const version = buildVersion(sourceDir);
  const stamp = `$1"${version.replace(/"/g, '\\"')}"`;
  let written = false;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (!/^\s*Version\s*=/mi.test(content)) continue;
    fs.writeFileSync(file, content.replace(/^(\s*Version\s*=).*$/mi, stamp), "utf8");
    written = true;
  }

  return written ? version : null;
}

/* -------------------------------------------------------------------- ucc */

// Always the workspace copy, never the configured source: Windows loads Core.dll
// from the executable's own folder first, so running the original UCC.exe out of a
// dedicated server install would make that install the compiler's base directory.
function runUcc(context, args) {
  const uccExe = path.join(context.workspaceSystem, "UCC.exe");
  const command = process.platform === "win32" ? uccExe : context.config.wine;
  const commandArgs = process.platform === "win32" ? args : [uccExe, ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: context.workspaceSystem, windowsHide: true });
    let output = "";
    const capture = (chunk) => {
      output += chunk.toString();
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

// UCC exits 0 for several failure modes (unknown commandlet, missing input), so the
// log is the only reliable error source.
function compileErrors(workspaceSystem) {
  const log = path.join(workspaceSystem, "UCC.log");
  if (!fs.existsSync(log)) return [];
  return fs
    .readFileSync(log, "latin1")
    .split(/\r?\n/)
    .filter((line) => /:\s*Error,/.test(line))
    .map((line) => line.replace(/^Error:\s*/, "").trim());
}

/* ------------------------------------------------------------------ build */

function validate(config) {
  const problems = [];
  const gamePath = config.gamePath && resolveFrom(config.configDir, config.gamePath);

  if (!gamePath) problems.push("gamePath is not set (run `detect` or set it in the GUI)");
  else if (!fs.existsSync(path.join(gamePath, "System", "Default.ini")))
    problems.push(`gamePath has no System/Default.ini: ${gamePath}`);
  else if (!fs.existsSync(path.join(gamePath, "System", "Core.dll")))
    problems.push(`gamePath has no System/Core.dll: ${gamePath}`);

  if (!config.packages.length) problems.push("packages is empty");

  for (const entry of config.packages) {
    const dir = resolveFrom(config.configDir, entry);
    if (!fs.existsSync(path.join(dir, "Classes"))) problems.push(`package has no Classes directory: ${dir}`);
  }

  const uccPath = config.uccPath ? resolveFrom(config.configDir, config.uccPath) : detectUccPath(gamePath);
  if (!uccPath)
    problems.push(
      "UCC.exe not found — install the Killing Floor dedicated server from Steam (Library > Tools), or set uccPath to a UCC.exe you already have"
    );
  else if (!fs.existsSync(uccPath)) problems.push(`uccPath does not exist: ${uccPath}`);

  return { problems, gamePath, uccPath };
}

async function build(config, onLog = () => {}) {
  const log = (message) => onLog(message);
  const started = Date.now();

  const { problems, gamePath, uccPath } = validate(config);
  if (problems.length) throw new Error(problems.join("\n"));

  const workspace = resolveFrom(config.configDir, config.workspace);
  const context = {
    config,
    log,
    gamePath,
    gameSystem: path.join(gamePath, "System"),
    uccPath,
    workspace,
    workspaceSystem: path.join(workspace, "System"),
    resourceRoots: config.resourcePaths.map((entry) => resolveFrom(config.configDir, entry)),
  };

  log(`> Game:      ${gamePath}`);
  log(`> UCC:       ${uccPath}`);
  log(`> Workspace: ${workspace}`);

  prepareWorkspace(context);

  const packages = config.packages.map((entry) => {
    const sourceDir = resolveFrom(config.configDir, entry);
    return { name: path.basename(sourceDir), sourceDir, stagedDir: path.join(workspace, path.basename(sourceDir)) };
  });

  log("\n> Staging sources...");
  for (const pkg of packages) {
    fs.rmSync(pkg.stagedDir, { recursive: true, force: true });
    fs.cpSync(pkg.sourceDir, pkg.stagedDir, { recursive: true });
    const version = injectBuildInfo(context, pkg.stagedDir, pkg.sourceDir);
    log(`  ${pkg.name}${version ? ` (${config.buildInfoClass} "${version}")` : ""}`);
  }

  // ucc make only compiles packages whose .u is absent.
  for (const pkg of packages) {
    for (const ext of [".u", ".ucl", ".u.uz2", ".ucl.uz2"]) {
      fs.rmSync(path.join(context.workspaceSystem, pkg.name + ext), { force: true });
    }
  }

  stageResourcePackages(context, packages.map((pkg) => pkg.name));

  // One make per package: classes compiled in the same pass shadow same-named
  // classes from other packages, so batching them changes name resolution.
  // Already-built packages keep their .u and are skipped by the next pass.
  log("\n> Compiling...");
  for (const [index, pkg] of packages.entries()) {
    writeIni(context, packages.slice(0, index + 1).map((entry) => entry.name));

    const make = await runUcc(context, ["make"]);
    const errors = compileErrors(context.workspaceSystem);
    const produced = fs.existsSync(path.join(context.workspaceSystem, `${pkg.name}.u`));

    if (errors.length || !produced) {
      errors.forEach((line) => log(`  ${line}`));
      if (!produced) log(`  ${pkg.name}.u was not produced`);
      throw new Error(
        errors.length ? `${pkg.name}: ${errors.length} compile error(s)` : `${pkg.name}: UCC produced no output (exit ${make.code})`
      );
    }
    log(`  ${pkg.name} ok`);
  }

  const outputPath = resolveFrom(config.configDir, config.outputPath);
  fs.mkdirSync(outputPath, { recursive: true });
  const copyTargets = config.copyTo.map((entry) => resolveFrom(config.configDir, entry)).filter(fs.existsSync);

  // Post-processing runs in phases: a commandlet loading package B also loads the
  // packages B depends on, so nothing may leave the workspace until every package
  // has been stripped and compressed.
  const artifactsOf = new Map();

  for (const pkg of packages) {
    if (config.strip) {
      log(`\n> Stripping ${pkg.name}...`);
      const result = await runUcc(context, ["Editor.StripSourceCommandlet", `${pkg.name}.u`]);
      if (!/Saving /i.test(result.output)) {
        throw new Error(`${pkg.name}: strip failed — ${result.output.trim().split(/\r?\n/).pop()}`);
      }
    }

    // A .ucl only appears for packages that export cacheable classes (mutators,
    // gametypes, weapons); monster-only packages legitimately have none.
    const artifacts = [`${pkg.name}.u`, `${pkg.name}.ucl`].filter((artifact) =>
      fs.existsSync(path.join(context.workspaceSystem, artifact))
    );
    artifactsOf.set(pkg.name, artifacts);

    if (config.compress) {
      log(`> Compressing ${pkg.name}...`);
      for (const artifact of [...artifacts]) {
        const result = await runUcc(context, ["IpDrv.CompressCommandlet", artifact]);
        if (fs.existsSync(path.join(context.workspaceSystem, `${artifact}.uz2`))) artifacts.push(`${artifact}.uz2`);
        else log(`  compress failed for ${artifact}: ${result.output.trim().split(/\r?\n/).pop()}`);
      }
    }
  }

  log("");
  for (const pkg of packages) {
    for (const artifact of artifactsOf.get(pkg.name)) {
      const from = path.join(context.workspaceSystem, artifact);
      if (!fs.existsSync(from)) continue;
      fs.copyFileSync(from, path.join(outputPath, artifact));
      if (!artifact.endsWith(".uz2")) {
        for (const target of copyTargets) fs.copyFileSync(from, path.join(target, artifact));
      }
      // A stripped .u left behind makes the next `ucc make` re-parse sourceless
      // classes and fail, so build outputs never stay in the workspace.
      fs.rmSync(from, { force: true });
    }

    log(`> ${pkg.name} -> ${path.join(outputPath, `${pkg.name}.u`)}`);
    copyTargets.forEach((target) => log(`  -> ${path.join(target, `${pkg.name}.u`)}`));
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  log(`\nBuild completed in ${seconds}s`);
  return { packages: packages.map((pkg) => pkg.name), outputPath, seconds: Number(seconds) };
}

module.exports = {
  CONFIG_NAME,
  DEFAULT_CONFIG,
  build,
  compileErrors,
  detectGamePath,
  detectUccPath,
  loadConfig,
  saveConfig,
  stageResourcePackages,
  validate,
  writeIni,
};
