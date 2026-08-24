# Usage

## Commands

```bash
pnpm run detect      # fill gamePath/uccPath from the local Steam libraries
pnpm run check       # validate the config without compiling
pnpm run build       # compile every package in the config
pnpm run gui         # serve the browser UI on http://127.0.0.1:7331
pnpm start           # the same UI as a desktop window
```

Directly, which is also how you compile a single package:

```bash
node bin/killingfloor-mutator-tools.js build KF15BetaMutators
node bin/killingfloor-mutator-tools.js --help
```

Installed from the release tarball, the same commands are available as one binary:

```bash
npm install -g killingfloor-mutator-tools-<version>.tgz
killingfloor-mutator-tools detect
killingfloor-mutator-tools build
```

| command | what it does |
| --- | --- |
| `build [Package...]` | compile every package in the config, or only the named ones |
| `detect` | fill `gamePath`/`uccPath` from the local Steam libraries and write them back |
| `check` | validate the config and report every problem, without compiling |
| `gui [port]` | serve the browser UI (default port `7331`) |

### `--config=<dir>`

Every command takes `--config=<dir>`, the directory holding `killingfloor-mutator-tools.config.json` (default: the current directory). This is what lets the tool live in one place and build a mutator repository somewhere else:

```bash
node bin/killingfloor-mutator-tools.js build --config=../killingfloor-mutators
```

The desktop app takes the same directory as its first argument. Without one, a packaged build uses its per-user app data folder, and a build run from source uses the current directory.

## Configuration

`killingfloor-mutator-tools.config.json`, next to wherever you run the command. Copy `killingfloor-mutator-tools.config.example.json` to start. Forward slashes work on Windows and avoid JSON escaping.

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

### Example

```json
{
  "gamePath": "D:/games/SteamLibrary/steamapps/common/KillingFloor",
  "uccPath": "",
  "workspace": ".ucc",
  "packages": ["../killingfloor-mutators/KF15BetaMutators"],
  "resourcePaths": ["../killingfloor-mutators/KF15BetaMutators-resources"],
  "outputPath": "dist",
  "copyTo": [],
  "strip": true,
  "compress": true,
  "buildInfoClass": "BuildInfo",
  "wine": "wine"
}
```

`packages` is ordered: a package that another one depends on has to come first. `resourcePaths` is where custom content and prebuilt dependency packages live — see [`GOTCHAS.md`](./GOTCHAS.md#prebuilt-dependencies-are-linked-in-never-put-on-the-search-path) for why prebuilt `.u` files are linked into the workspace rather than added to the search path.

## The GUI

`pnpm run gui` serves the same UI the desktop app shows, on `127.0.0.1` only. It edits the config on disk and starts compilers, so it is deliberately not reachable from another machine.

It gives you the config form, a **Detect** button for the Steam paths, **Save** and **Check**, a **Build** button that compiles every configured package in order, and the compiler log streamed live.

### Language

The header has a language picker covering the same nine languages as the README (English, Русский, Español, Português, Lietuvių, Polski, Français, 中文, 日本語). Switching repaints the window immediately, and the choice is remembered in the browser's local storage — it is a UI preference, so it is deliberately not written into `killingfloor-mutator-tools.config.json`, which is the CLI's input.

Two things stay in English by design: the compiler log, which is UCC's own output, and the configuration problems reported by `check`, which are the CLI's output too.

## Tests

```bash
pnpm test
```

Covers ini generation, dependency staging and error detection offline. Compiling itself needs a real install, so run a build for that.
