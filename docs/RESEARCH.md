# How `ucc make` builds, and what it actually needs

Notes on the Killing Floor / Unreal Engine 2.5 script compiler as this tool drives it. Everything here was established against a retail Steam install; where a claim is a measurement rather than documentation, the numbers are given.

## The four things a compile needs

`ucc make` will not run without all of:

1. **The native engine DLLs** — `Core.dll`, `Engine.dll` and the rest of the `System/` set.
2. **The stock `.u` script packages** — `Core.u`, `Engine.u`, `KFmod.u`, `KFGui.u` and the others a mutator extends.
3. **Every content package referenced from `defaultproperties`** — textures, sounds, static meshes, animations. A missing one is a load failure, not a warning.
4. **An ini whose `[Editor.EditorEngine] EditPackages` lists the package to compile**, and whose `[Core.System] Paths` reach all of the above.

**A plain Steam install of the Killing Floor client already has all four.** The Killing Floor SDK adds nothing the compiler needs: with the SDK installed, the client still holds exactly two executables, `KillingFloor.exe` and `Setup.exe`.

The one missing piece is `UCC.exe` itself, which ships only with the Killing Floor dedicated server (Steam library → Tools, free with the game). Install it once and `detect` finds the compiler automatically; any other `UCC.exe` works too, via `uccPath`. The server build may differ from the client build, which is fine — a dedicated-server `UCC.exe` compiles against retail client packages and produces a byte-identical result.

`UCC.exe` is Tripwire's binary, so it is deliberately not shipped here.

## The dedicated server cannot replace the client

This is worth stating plainly, because pointing `gamePath` at the server install is the obvious first thing to try and it fails in a way that does not name its cause.

The server carries roughly half the content: **97 texture packages against the client's 176**, and no `Music/` at all. The missing `2K4Menus` package alone is enough to break a build. The chain is:

1. `KFGui.u` references `2K4Menus`, which the server does not ship.
2. `KFGui.u` therefore fails to load.
3. UCC decides a package it cannot load must be rebuilt, and looks for `KFGui`'s sources.
4. The server does not ship those either, and the run dies on `Can't find files matching KFGui\Classes\*.uc`.

Point `gamePath` at the client and let the server contribute only `UCC.exe`.

## How the build stays isolated

The tool builds a **workspace**: a private `System/` folder holding `UCC.exe`, the game's DLLs and `.int` files, and a generated `KillingFloor.ini` whose `[Core.System] Paths` point straight at the game's `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` and `System/`. Sources are copied in, the compiler runs there, and the artifacts are moved out.

```
<workspace>/
  System/          UCC.exe + game DLLs + *.int + generated KillingFloor.ini   (~19 MB)
  <Package>/       copy of your Classes/ sources
```

**The DLLs have to be copied rather than referenced.** UCC derives its base directory from wherever `Core.dll` was loaded from, not from the path of the `.exe`. Leaving the DLLs in the game folder would therefore make the compiler write its output — and its logs — back into the game install.

The game folder is only ever read. Nothing is added, changed or deleted there.

The workspace name is kept short on purpose (`.ucc` by default): UCC predates long-path support, and the staged `<workspace>/<Package>/Classes/<Class>.uc` paths have to stay under `MAX_PATH`.

## Wine on Linux and macOS

`UCC.exe` runs through Wine, because the native `ucc-bin` shipped with the Linux dedicated server cannot compile UnrealScript at all.

Wine also needs the **Windows** files of the game (`Core.dll`, `Engine.dll` and the rest), so `gamePath` has to point at a Windows install of Killing Floor. A native Linux install has `.so` libraries the compiler cannot load.

This path is implemented but has not been tested on a Linux host.

## UCC commandlets

```
ucc make                                     compile every EditPackages entry that has no .u
ucc Editor.StripSourceCommandlet <Pkg.u>     remove script source from a compiled package
ucc IpDrv.CompressCommandlet <File>          produce <File>.uz2 for HTTP redirect
ucc IpDrv.DecompressCommandlet <File.uz2>    restore the original file (no wildcards)
ucc dumpint <Pkg.ext>                        write the .int localization table
ucc exportcache <Pkg.ext>                    write the .ucl so classes show in the menus
ucc BatchExport <Pkg.u> class uc <path>      dump all UnrealScript classes back to source
```

Short aliases such as `compress` and `decompress` do not resolve in this setup. Use the full `Package.Commandlet` name.

Stripping source roughly halves the size of a `.u`.

## See also

- [`GOTCHAS.md`](./GOTCHAS.md) — the compiler behaviours this tool works around, and what happens if you do not.
- [`USAGE.md`](./USAGE.md) — configuration keys and commands.
