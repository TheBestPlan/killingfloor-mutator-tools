// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 TheBestPlan
"use strict";

// Offline checks for the parts that decide whether a build is correct: the
// generated ini, dependency staging, and error detection. Compiling itself needs
// a real Killing Floor install, so that is covered by a real `build` run.
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { compileErrors, stageResourcePackages, validate, writeIni } = require("../src/build");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mutator-tools-test-"));
const gamePath = path.join(root, "game");
const gameSystem = path.join(gamePath, "System");
const workspaceSystem = path.join(root, "ws", "System");
const resourceRoot = path.join(root, "res");

for (const dir of [gameSystem, workspaceSystem, path.join(gamePath, "Textures"), path.join(resourceRoot, "System"), path.join(resourceRoot, "Sounds")]) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(
  path.join(gameSystem, "Default.ini"),
  [
    "[Core.System]",
    "CacheRecordPath=../System/*.ucl",
    "Paths=../System/*.u",
    "Paths=../Textures/*.utx",
    "Suppress=DevLoad",
    "",
    "[Editor.EditorEngine]",
    "EditPackages=KFMod",
    "EditPackages=FrightScript",
    "CutdownPackages=Core",
  ].join("\r\n"),
  "latin1"
);
fs.writeFileSync(path.join(gameSystem, "Core.dll"), "stub");
fs.writeFileSync(path.join(resourceRoot, "System", "DepPackage.u"), "prebuilt");
fs.writeFileSync(path.join(resourceRoot, "System", "MyMutator.u"), "stale prebuilt copy");

const context = {
  gamePath,
  gameSystem,
  workspaceSystem,
  resourceRoots: [resourceRoot],
  log: () => {},
};

/* ---------------------------------------------------------------- the ini */

writeIni(context, ["MyMutator"]);
const ini = fs.readFileSync(path.join(workspaceSystem, "KillingFloor.ini"), "latin1");
const paths = ini.split(/\r?\n/).filter((line) => line.startsWith("Paths="));

assert.strictEqual(paths[0], "Paths=..\\System\\*.u", "workspace System must win over the game copies");
assert.ok(
  paths.some((line) => line.endsWith("Textures\\*.utx") && line.includes(path.basename(gamePath))),
  "game content must be referenced absolutely, never copied"
);
assert.ok(!paths.some((line) => line.includes(`${path.basename(resourceRoot)}`) && line.endsWith("System\\*.u")),
  "resource System/*.u must not be on the search path — it would cancel the rebuild");
assert.ok(paths.some((line) => line.endsWith("Sounds\\*.uax")), "resource content dirs must be on the search path");
assert.ok(/EditPackages=FrightScript\r\nEditPackages=MyMutator/.test(ini), "target package must follow the stock list");
assert.ok(!/Paths=\.\.\/Textures/.test(ini), "relative game paths must be rewritten");

/* --------------------------------------------------------------- staging */

stageResourcePackages(context, ["MyMutator"]);
assert.ok(fs.existsSync(path.join(workspaceSystem, "DepPackage.u")), "prebuilt dependency must be staged");
assert.ok(
  !fs.existsSync(path.join(workspaceSystem, "MyMutator.u")),
  "a prebuilt copy of a package being built from source must not be staged"
);

/* ---------------------------------------------------------------- errors */

fs.writeFileSync(
  path.join(workspaceSystem, "UCC.log"),
  ["Log: Analyzing...", "Error: C:\\src\\Foo.uc(75) : Error, Type mismatch in '='", "Log: Compile aborted due to errors."].join("\r\n"),
  "latin1"
);
assert.deepStrictEqual(compileErrors(workspaceSystem), ["C:\\src\\Foo.uc(75) : Error, Type mismatch in '='"]);

/* -------------------------------------------------------------- validate */

const problems = validate({ ...require("../src/build").DEFAULT_CONFIG, configDir: root }).problems;
assert.ok(problems.some((problem) => problem.includes("gamePath")), "missing gamePath must be reported");
assert.ok(problems.some((problem) => problem.includes("packages")), "empty package list must be reported");

fs.rmSync(root, { recursive: true, force: true });
console.log("smoke: 10 assertions passed");
