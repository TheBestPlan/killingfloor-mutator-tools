# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Lietuvių](./README.lt.md) · [Polski](./README.pl.md) · [Français](./README.fr.md) · **中文** · [日本語](./README.ja.md)

在一个隔离的工作目录里调用 Tripwire 自家的 `UCC.exe`，编译 **Killing Floor 1** 的 mutator（UnrealScript，Unreal Engine 2.5）。游戏客户端提供包和内容，专用服务器提供编译器，而**游戏目录只被读取**——不会往里添加、修改或删除任何东西。

一套构建，三个前端：命令行、浏览器界面，以及 Windows、macOS 和 Linux 的桌面应用。

> `ucc make` 没有任何文档，遇到若干种失败仍然返回 `0`，而且把多个包放进同一趟编译时会悄悄改变名字解析。构建必须绕开的每一处都已实测并记录在 [`docs/GOTCHAS.md`](../GOTCHAS.md)；编译器是怎么被驱动的、为什么需要游戏客户端而不需要 SDK，都写在 [`docs/RESEARCH.md`](../RESEARCH.md) 里。

## 你需要什么

- 本地安装的 **Killing Floor** 客户端（[appid 1250](https://store.steampowered.com/app/1250/)）——DLL、原版 `.u` 脚本包和全部内容。`gamePath` 指向的就是它。
- 一份 **`UCC.exe`**，也就是 [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/)（appid 1273，Steam 库 → Tools，随游戏免费），除非你已经从别处拿到了这个可执行文件。
- **Windows**，或者在 Linux 与 macOS 上使用 [Wine](https://www.winehq.org/)。
- 仅命令行需要：[Node.js](https://nodejs.org) 18 或更新版本。桌面应用自带运行时。

本仓库既不包含游戏内容，也不包含 `UCC.exe`——那是 Tripwire 的二进制文件。你把工具指向自己已经拥有的那份副本。

Killing Floor SDK **不是**必需的：它没有提供任何编译器需要的东西。专用服务器**不能**替代客户端——它只带了大约一半的内容，仅仅缺少 `2K4Menus` 就足以让构建失败。这两个结论都在 [`docs/RESEARCH.md`](../RESEARCH.md) 中展开。

## 桌面应用（Windows / macOS / Linux）

预编译的独立应用在 [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases) 页面：

- **Windows** — `…-setup.exe`（安装程序）或 `…-portable.exe`（免安装运行）。
- **macOS** — `…-mac-x64.dmg`（Intel）或 `…-mac-arm64.dmg`（Apple Silicon）。
- **Linux** — `…-linux-x86_64.AppImage`（到处都能跑）或 `…-linux-amd64.deb`。
- **仅命令行** — `killingfloor-mutator-tools-<version>.tgz`，同一个工具，不带 Electron：`npm install -g killingfloor-mutator-tools-<version>.tgz`。

把它指向你安装的 Killing Floor（或者点 **Detect**），加上你的包目录，点 Build，然后看着编译器日志实时滚动。顶栏有语言切换器，语种与本 README 相同（九种）；所选语言会被记住。构建产物没有签名，所以首次启动时系统可能会警告（Windows SmartScreen → *更多信息 → 仍要运行*；macOS → 右键 → *打开*）。

### 自己构建

```bash
pnpm install
pnpm start          # 从源码运行应用
pnpm run dist       # 为当前系统构建安装包到 dist/
```

## 命令行

```bash
pnpm run detect                                  # 从本地 Steam 库填入 gamePath/uccPath
pnpm run check                                   # 只校验配置，不编译
pnpm run build                                   # 编译配置里的所有包
pnpm run gui                                     # 浏览器界面，地址 http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # 只编译其中一个
```

`--config=<dir>` 指向存放 `killingfloor-mutator-tools.config.json` 的目录（默认是当前目录），因此工具本身可以放在任何地方，去构建位于别处的 mutator 仓库。

## 配置

`killingfloor-mutator-tools.config.json`，放在你运行命令的位置旁边。从复制 `killingfloor-mutator-tools.config.example.json` 开始；`detect` 会替你填好那两个路径。正斜杠在 Windows 上同样有效，还能省去 JSON 转义。

| 键 | 含义 |
| --- | --- |
| `gamePath` | Killing Floor 安装根目录 |
| `uccPath` | `UCC.exe`；留空 = 在各个 Steam 库中自动查找，优先专用服务器 |
| `workspace` | 隔离的编译目录，可以随时删除；名字要短，因为 UCC 不支持长路径 |
| `packages` | mutator 源码目录（每个都含有 `Classes/`），**按构建顺序排列** |
| `resourcePaths` | 含有 `System/`、`Textures/`、`Sounds/`、`StaticMeshes/`、`Animations/` 的根目录，里面放自制内容和预先编译好的依赖包 |
| `outputPath` | `.u`、`.ucl` 和 `.uz2` 的落地位置 |
| `copyTo` | 额外接收 `.u`/`.ucl` 的目录，比如服务器的 `System/` 或 docker 资源目录 |
| `strip` | 运行 `Editor.StripSourceCommandlet`，能把 `.u` 大致缩小一半 |
| `compress` | 生成用于 HTTP 重定向的 `.uz2` |
| `buildInfoClass` | 其 `Version` 默认值会被打上构建时间和 git 哈希的类；`""` 表示关闭 |
| `wine` | 非 Windows 主机上使用的 Wine 命令 |

全部配置键和示例都在 [`docs/USAGE.md`](../USAGE.md)。

## 构建如何保持隔离

工具会搭出一个**工作目录**：一个私有的 `System/`，里面放着 `UCC.exe`、游戏的 DLL 和 `.int` 文件，以及一个生成的 `KillingFloor.ini`——它的 `[Core.System] Paths` 直接指向游戏的 `Textures/`、`Sounds/`、`StaticMeshes/`、`Animations/`、`Maps/` 和 `System/`。源码被复制进去，编译器在那里运行，产物再被移出来。

```
<workspace>/
  System/          UCC.exe + 游戏 DLL + *.int + 生成的 KillingFloor.ini   (~19 MB)
  <Package>/       你的 Classes/ 源码副本
```

DLL 必须复制而不能引用：UCC 是根据 `Core.dll` 从哪里加载来确定自己的基准目录的，所以把它们留在游戏目录里，会让编译器把输出和日志写回游戏安装目录。

## 目录结构

| 路径 | 是什么 |
|------|-----------|
| `src/build.js` | 核心：Steam 查找、工作目录准备、ini 生成、UCC 的运行及其错误检测 |
| `src/gui.js` | 界面背后的本地服务器（只监听 `127.0.0.1`） |
| `src/gui.html` | 构建界面：配置表单、Detect / Save / Check / Build 按钮、实时编译器日志 |
| `src/i18n.js` | 界面翻译，覆盖 README 的九种语言，可即时切换 |
| `bin/killingfloor-mutator-tools.js` | 命令行前端 |
| `electron/main.js` | Electron 外壳，把同一个界面变成桌面应用 |
| `test/smoke.js` | ini 生成、依赖准备和错误检测的离线检查 |

## 文档

- **[docs/RESEARCH.md](../RESEARCH.md)** — `ucc make` 如何构建以及它到底需要什么：四项输入、为什么一个普通客户端安装就全都具备、为什么 SDK 毫无帮助而专用服务器又不能替代客户端、工作目录的设计以及为什么 DLL 必须复制、Linux 与 macOS 上的 Wine，还有 commandlet 参考。
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — 本工具绕开的那些编译器行为：一个包一趟、预编译依赖会悄悄取消重新编译、产物会毒害下一次运行、会撒谎的退出码，以及包限定名仅有的两处可用位置。手动驱动 `UCC.exe` 之前必读。
- **[docs/USAGE.md](../USAGE.md)** — 全部命令与配置键，附示例。

## 测试

```bash
pnpm test
```

离线覆盖 ini 生成、依赖准备和错误检测。真正的编译需要一份真实安装，那部分跑一次构建即可。

## 免责声明

一个个人工具项目，出于研究和学习目的发布。它不含游戏内容，也不含 Tripwire 的二进制文件；它运行的是你已经拥有的 `UCC.exe` 副本，作用于你已经拥有的游戏安装。按**原样**提供，不附带任何担保（见许可证）。与 Tripwire Interactive 或 Epic Games 无关。

## 许可证

Copyright (c) 2026 TheBestPlan.

依据 **GNU 通用公共许可证 v3.0 或更高版本**（GPL-3.0-or-later）发布。完整文本见 [LICENSE](../../LICENSE)。本程序是自由软件：你可以按这些条款重新发布和修改它，并且它**不附带任何担保**。

## 商标声明

Killing Floor 和 Unreal 是 Tripwire Interactive 与 Epic Games 的商标。这是一个非官方的粉丝工具，与它们没有关联，也未获其认可。`UCC.exe` 以及本工具所驱动的引擎包归它们所有；这些内容都不包含在本仓库中，也不随本仓库分发。
