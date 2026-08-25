# Gotchas

Compiler behaviours that cost time to find. Each one is worked around by the tool; they are written down because the failure modes do not name their cause, and because anyone driving `UCC.exe` by hand will meet them.

## One `ucc make` per package

Classes compiled in the same pass shadow same-named classes from other packages, so batching several packages into one pass silently changes name resolution.

The tool runs one `ucc make` per package, in the order `packages` lists them. Packages already built in the current run keep their `.u` and are skipped by the next pass.

## Prebuilt dependencies are linked in, never put on the search path

`ucc make` skips any package whose `.u` it can already see. A prebuilt copy sitting on the search path would therefore *silently cancel* a rebuild — no error, no output, the old `.u` survives.

So prebuilt dependencies from `resourcePaths/System` are linked into the workspace instead of being added to `Paths`. A prebuilt copy of a package you are also building from source is ignored.

## A package ini is compiled *into* the `.u`

`ucc make` calls `LoadConfig` on every class it compiles, so whatever `<Package>.ini` holds at
compile time becomes the `.u`'s default for each `var config` variable. Compile with the ini
present and the shipped configuration is baked in; compile without it and those defaults fall
back to whatever the source happens to declare — same sources, different artifact, no warning
either way.

So `resourcePaths/System/*.ini` is staged into the workspace, and unlike a prebuilt `.u` it is
staged even for the package being built. It is **copied, not linked**: the engine rewrites a
package ini whenever a compiled class saves config, and a hard link would carry that back into
your sources. The engine's own `KillingFloor.ini`, `Default.ini`, `DefUser.ini` and `User.ini`
are generated per workspace and are never taken from a resource folder.

The corollary is worth stating: an ini that is not in `resourcePaths` does not participate.
A stray `<Package>.ini` in some local toolchain folder cannot leak its values into a release.

## Build outputs never stay in the workspace

A stripped `.u` left next to its `Classes/` folder makes the next `ucc make` try to re-parse sourceless classes, and the run fails with `Missing 'Class' definition`.

Artifacts are moved out of the workspace as soon as they are produced.

## UCC exits 0 on several failures

The exit code is not a reliable success signal. Success is decided by reading `UCC.log` and by checking whether the `.u` actually appeared.

## Package qualification is only accepted in two places

The compiler accepts a package-qualified name after `extends`, and inside `class'Pkg.Class'`. It rejects both of these:

```unrealscript
var Pkg.Class X;
class<Pkg.Class> Y;
```

Which means a class name shared with another package you also build has to be **renamed**, not qualified.

## `BuildInfo` is stamped in two places

The version is written into the workspace copy *and* into your own sources, so the version that shipped stays visible and diffable in the mutator repository rather than existing only inside a compiled `.u`. Set `buildInfoClass` to `""` to disable.

## The workspace path has to stay short

UCC has no long-path support. The staged `<workspace>/<Package>/Classes/<Class>.uc` paths must stay under `MAX_PATH`, so keep the `workspace` value short — the default is `.ucc`.

## The dedicated server is not a substitute for the client

Pointing `gamePath` at the server install fails on `Can't find files matching KFGui\Classes\*.uc`, which does not mention the real cause: the server ships roughly half the content and is missing `2K4Menus`. The full chain is in [`RESEARCH.md`](./RESEARCH.md#the-dedicated-server-cannot-replace-the-client).

## Wine needs the Windows game files

On Linux and macOS the compiler runs under Wine and needs the **Windows** DLLs. A native Linux install of Killing Floor ships `.so` libraries the compiler cannot load, so `gamePath` has to point at a Windows install even on a Linux host.
