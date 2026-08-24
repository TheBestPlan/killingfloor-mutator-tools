# Killing Floor Mutator Tools

**English** · [Русский](./docs/translations/README.ru.md) · [Español](./docs/translations/README.es.md) · [Português](./docs/translations/README.pt.md) · [Lietuvių](./docs/translations/README.lt.md) · [Polski](./docs/translations/README.pl.md) · [Français](./docs/translations/README.fr.md) · [中文](./docs/translations/README.zh.md) · [日本語](./docs/translations/README.ja.md)

Compiles **Killing Floor 1** mutators (UnrealScript, Unreal Engine 2.5) by driving Tripwire's own `UCC.exe` inside an isolated workspace. The game client supplies the packages and the content, the dedicated server supplies the compiler, and **the game folder is only ever read** — nothing is added, changed or deleted there.

One build, three front ends: a CLI, a browser UI, and a desktop app for Windows, macOS and Linux.

> `ucc make` is undocumented, exits `0` on several failures, and silently changes name resolution when you batch packages. Everything it does that a build has to work around is measured and written down in [`docs/GOTCHAS.md`](./docs/GOTCHAS.md); how the compiler is driven, and why the client install is required while the SDK is not, is in [`docs/RESEARCH.md`](./docs/RESEARCH.md).

## What you need

- A local **Killing Floor** client install ([appid 1250](https://store.steampowered.com/app/1250/)) — the DLLs, the stock `.u` packages and all the content. This is what `gamePath` points at.
- A **`UCC.exe`**, which means the [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/) (appid 1273, Steam library → Tools, free with the game) unless you already have the binary from elsewhere.
- **Windows**, or [Wine](https://www.winehq.org/) on Linux and macOS.
- For the CLI only: [Node.js](https://nodejs.org) 18 or newer. The desktop app brings its own runtime.

No game content ships with this repo, and neither does `UCC.exe` — it is Tripwire's binary. You point the tool at a copy you already own.

The Killing Floor SDK is **not** required; it adds nothing the compiler needs. The dedicated server is **not** a substitute for the client — it carries roughly half the content, and the missing `2K4Menus` alone breaks the build. Both findings are worked through in [`docs/RESEARCH.md`](./docs/RESEARCH.md).

## Desktop app (Windows / macOS / Linux)

Prebuilt, self-contained apps are on the [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases) page:

- **Windows** — `…-setup.exe` (installer) or `…-portable.exe` (run without installing).
- **macOS** — `…-mac-x64.dmg` (Intel) or `…-mac-arm64.dmg` (Apple Silicon).
- **Linux** — `…-linux-x86_64.AppImage` (run anywhere) or `…-linux-amd64.deb`.
- **CLI only** — `killingfloor-mutator-tools-<version>.tgz`, the same tool without Electron: `npm install -g killingfloor-mutator-tools-<version>.tgz`.

Point it at your Killing Floor install (or press **Detect**), add your package folders, press Build, and watch the compiler log stream in. The header carries a language picker with the same nine languages as this README; the choice is remembered. The builds are unsigned, so the OS may warn on first launch (Windows SmartScreen → *More info → Run anyway*; macOS → right-click → *Open*).

### Build it yourself

```bash
pnpm install
pnpm start          # run the app from source
pnpm run dist       # build installers for the current OS into dist/
```

## CLI

```bash
pnpm run detect                                  # fill gamePath/uccPath from the local Steam libraries
pnpm run check                                   # validate the config without compiling
pnpm run build                                   # compile every package in the config
pnpm run gui                                     # the browser UI on http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # compile one of them
```

`--config=<dir>` points at the directory holding `killingfloor-mutator-tools.config.json` (default: the current directory), so the tool can live anywhere and build a mutator repository elsewhere.

## Configuration

`killingfloor-mutator-tools.config.json`, next to wherever you run the command. Copy `killingfloor-mutator-tools.config.example.json` to start; `detect` fills in the two paths for you. Forward slashes work on Windows and avoid JSON escaping.

| key | meaning |
| --- | --- |
| `gamePath` | Killing Floor install root |
| `uccPath` | `UCC.exe`; blank = auto-detect across the Steam libraries, dedicated server first |
| `workspace` | isolated compile folder, safe to delete; keep the name short, because UCC has no long-path support |
| `packages` | mutator source folders (each holds `Classes/`), **in build order** |
| `resourcePaths` | roots with `System/`, `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/` holding custom content and prebuilt dependency packages |
| `outputPath` | where `.u`, `.ucl` and `.uz2` land |
| `copyTo` | extra folders to receive `.u`/`.ucl`, such as a server `System/` or a docker resources folder |
| `strip` | run `Editor.StripSourceCommandlet`, which roughly halves the `.u` |
| `compress` | produce `.uz2` for HTTP redirect |
| `buildInfoClass` | class whose `Version` default is stamped with build time and git hash; `""` disables |
| `wine` | Wine command used on non-Windows hosts |

Every key, with examples, is in [`docs/USAGE.md`](./docs/USAGE.md).

## How the build stays isolated

The tool builds a **workspace**: a private `System/` folder holding `UCC.exe`, the game's DLLs and `.int` files, and a generated `KillingFloor.ini` whose `[Core.System] Paths` point straight at the game's `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` and `System/`. Sources are copied in, the compiler runs there, and the artifacts are moved out.

```
<workspace>/
  System/          UCC.exe + game DLLs + *.int + generated KillingFloor.ini   (~19 MB)
  <Package>/       copy of your Classes/ sources
```

The DLLs have to be copied rather than referenced: UCC derives its base directory from wherever `Core.dll` was loaded from, so leaving them in the game folder would make the compiler write its output, and its logs, back into the game install.

## Layout

| Path | What it is |
|------|-----------|
| `src/build.js` | the core: Steam discovery, workspace staging, ini generation, the UCC run and its error detection |
| `src/gui.js` | the local server behind the UI (`127.0.0.1` only) |
| `src/gui.html` | the build UI: config form, Detect / Save / Check / Build buttons, live compiler log |
| `src/i18n.js` | UI translations for the nine README languages, with live switching |
| `bin/killingfloor-mutator-tools.js` | the CLI front end |
| `electron/main.js` | Electron shell hosting the same UI as a desktop app |
| `test/smoke.js` | offline checks for ini generation, dependency staging and error detection |

## Documentation

- **[docs/RESEARCH.md](./docs/RESEARCH.md)** — how `ucc make` builds and what it actually needs: the four inputs, why a plain client install has all of them, why the SDK adds nothing and the dedicated server is not a substitute, the workspace design and why the DLLs must be copied, Wine on Linux and macOS, and the commandlet reference.
- **[docs/GOTCHAS.md](./docs/GOTCHAS.md)** — the compiler behaviours this tool works around: one pass per package, prebuilt dependencies that silently cancel a rebuild, outputs that poison the next run, an exit code that lies, and the two places package qualification is accepted. Required reading before driving `UCC.exe` by hand.
- **[docs/USAGE.md](./docs/USAGE.md)** — every command and configuration key, with examples.

## Tests

```bash
pnpm test
```

Covers ini generation, dependency staging and error detection offline. Compiling itself needs a real install, so run a build for that.

## Disclaimer

A personal tooling project, published for research and educational purposes. It ships no game content and no Tripwire binary; it drives a copy of `UCC.exe` you already own, against a game install you already own. Provided **as is**, without any warranty (see the license). Not affiliated with Tripwire Interactive or Epic Games.

## License

Copyright (c) 2026 TheBestPlan.

Released under the **GNU General Public License v3.0 or later** (GPL-3.0-or-later). See [LICENSE](./LICENSE) for the full text. This program is free software: you can redistribute it and/or modify it under those terms, and it comes with **no warranty**.

## Trademark notice

Killing Floor and Unreal are trademarks of Tripwire Interactive and Epic Games. This is an unofficial, fan-made tool, not affiliated with or endorsed by either of them. `UCC.exe` and the engine packages this tool drives are their property; none of them are contained in or distributed with this repository.
