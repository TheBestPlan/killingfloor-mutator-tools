# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Lietuvių](./README.lt.md) · [Polski](./README.pl.md) · [Français](./README.fr.md) · [中文](./README.zh.md) · **日本語**

Tripwire 自身の `UCC.exe` を隔離されたワークスペース内で走らせて、**Killing Floor 1** の mutator（UnrealScript、Unreal Engine 2.5）をコンパイルします。ゲームクライアントがパッケージとコンテンツを供給し、専用サーバーがコンパイラを供給し、**ゲームフォルダは読み取られるだけ**です — そこに何かが追加・変更・削除されることはありません。

ビルドは一つ、フロントエンドは三つ: CLI、ブラウザ UI、そして Windows / macOS / Linux 向けのデスクトップアプリ。

> `ucc make` はどこにも文書化されておらず、いくつかの失敗でも `0` を返し、パッケージをまとめて一度に流すと名前解決を黙って変えてしまいます。ビルドが回避しなければならない挙動はすべて実測して [`docs/GOTCHAS.md`](../GOTCHAS.md) に記録してあります。コンパイラをどう駆動しているか、なぜゲームクライアントが必要で SDK は不要なのかは [`docs/RESEARCH.md`](../RESEARCH.md) にあります。

## 必要なもの

- ローカルにインストールした **Killing Floor** クライアント（[appid 1250](https://store.steampowered.com/app/1250/)）— DLL、標準の `.u` パッケージ、そして全コンテンツ。`gamePath` が指すのはこれです。
- **`UCC.exe`**、つまり [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/)（appid 1273、Steam ライブラリ → Tools、ゲームに付属して無料）。すでに別経路でこのバイナリを持っているなら不要です。
- **Windows**、または Linux / macOS では [Wine](https://www.winehq.org/)。
- CLI のみ: [Node.js](https://nodejs.org) 18 以上。デスクトップアプリは自前のランタイムを同梱しています。

このリポジトリにはゲームコンテンツも `UCC.exe` も含まれていません — 後者は Tripwire のバイナリです。すでに所有しているコピーにツールを向けて使います。

Killing Floor SDK は**不要**です。コンパイラが必要とするものは何も増えません。専用サーバーはクライアントの**代わりになりません** — コンテンツはおよそ半分しかなく、`2K4Menus` が欠けているだけでビルドは壊れます。どちらの結論も [`docs/RESEARCH.md`](../RESEARCH.md) で追っています。

## デスクトップアプリ（Windows / macOS / Linux）

ビルド済みの自己完結型アプリは [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases) ページにあります:

- **Windows** — `…-setup.exe`（インストーラ）または `…-portable.exe`（インストール不要で実行）。
- **macOS** — `…-mac-x64.dmg`（Intel）または `…-mac-arm64.dmg`（Apple Silicon）。
- **Linux** — `…-linux-x86_64.AppImage`（どこでも実行可）または `…-linux-amd64.deb`。
- **CLI のみ** — `killingfloor-mutator-tools-<version>.tgz`、Electron なしの同じツール: `npm install -g killingfloor-mutator-tools-<version>.tgz`。

インストール済みの Killing Floor を指定し（あるいは **Detect** を押し）、自分のパッケージフォルダを追加して Build を押すと、コンパイラのログがそのまま流れます。ヘッダーにはこの README と同じ 9 言語の言語切り替えがあります。選択は記憶されます。ビルドは署名されていないため、初回起動時に OS が警告することがあります（Windows SmartScreen → *詳細情報 → 実行*、macOS → 右クリック → *開く*）。

### 自分でビルドする

```bash
pnpm install
pnpm start          # ソースからアプリを起動する
pnpm run dist       # 現在の OS 向けインストーラを dist/ に生成する
```

## CLI

```bash
pnpm run detect                                  # ローカルの Steam ライブラリから gamePath/uccPath を埋める
pnpm run check                                   # コンパイルせずに設定を検証する
pnpm run build                                   # 設定にある全パッケージをコンパイルする
pnpm run gui                                     # ブラウザ UI を http://127.0.0.1:7331 で提供する

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # そのうち一つだけをコンパイルする
```

`--config=<dir>` は `killingfloor-mutator-tools.config.json` を置いたディレクトリを指します（既定はカレントディレクトリ）。これにより、ツール自体はどこにあってもよく、別の場所にある mutator リポジトリをビルドできます。

## 設定

`killingfloor-mutator-tools.config.json` を、コマンドを実行する場所の隣に置きます。`killingfloor-mutator-tools.config.example.json` をコピーして始めてください。二つのパスは `detect` が埋めてくれます。スラッシュは Windows でも通り、JSON のエスケープを避けられます。

| キー | 意味 |
| --- | --- |
| `gamePath` | Killing Floor のインストールルート |
| `uccPath` | `UCC.exe`。空 = Steam ライブラリを自動探索、専用サーバーを優先 |
| `workspace` | 隔離されたコンパイル用フォルダ。削除して構わない。UCC は長いパスに対応していないので名前は短く保つこと |
| `packages` | mutator のソースフォルダ（各々が `Classes/` を持つ）、**ビルド順に** |
| `resourcePaths` | 自作コンテンツ、ビルド済み依存パッケージ、ビルドに焼き込まれるパッケージの `.ini` を収めた `System/`、`Textures/`、`Sounds/`、`StaticMeshes/`、`Animations/` を持つルート |
| `outputPath` | `.u`、`.ucl`、`.uz2` の出力先 |
| `copyTo` | `.u`/`.ucl` を追加で受け取るフォルダ。サーバーの `System/` や docker のリソースフォルダなど |
| `strip` | `Editor.StripSourceCommandlet` を実行する。`.u` がおよそ半分になる |
| `compress` | HTTP リダイレクト用の `.uz2` を生成する |
| `buildInfoClass` | `Version` の既定値にビルド時刻と git ハッシュを刻むクラス。`""` で無効 |
| `wine` | Windows 以外のホストで使う Wine コマンド |

全キーと例は [`docs/USAGE.md`](../USAGE.md) にあります。

## ビルドが隔離を保つ仕組み

ツールは**ワークスペース**を組み立てます。`UCC.exe`、ゲームの DLL と `.int` ファイル、そして `[Core.System] Paths` がゲームの `Textures/`、`Sounds/`、`StaticMeshes/`、`Animations/`、`Maps/`、`System/` を直接指す生成済みの `KillingFloor.ini` を収めた、専用の `System/` フォルダです。ソースはその中へコピーされ、コンパイラはそこで走り、成果物は外へ運び出されます。

```
<workspace>/
  System/          UCC.exe + ゲームの DLL + *.int + 生成された KillingFloor.ini   (~19 MB)
  <Package>/       あなたの Classes/ ソースのコピー
```

DLL は参照ではなくコピーしなければなりません。UCC は `Core.dll` がどこから読み込まれたかで自身の基準ディレクトリを決めるため、ゲームフォルダに置いたままにすると、コンパイラは出力もログもゲームのインストール先へ書き戻してしまいます。

## 構成

| パス | 何か |
|------|-----------|
| `src/build.js` | 中核: Steam の探索、ワークスペースの準備、ini の生成、UCC の実行とそのエラー検出 |
| `src/gui.js` | UI の背後にあるローカルサーバー（`127.0.0.1` のみ） |
| `src/gui.html` | ビルド UI: 設定フォーム、Detect / Save / Check / Build ボタン、コンパイラログのライブ表示 |
| `src/i18n.js` | README の 9 言語ぶんの UI 翻訳。その場で切り替え可能 |
| `bin/killingfloor-mutator-tools.js` | CLI フロントエンド |
| `electron/main.js` | 同じ UI をデスクトップアプリとして表示する Electron シェル |
| `test/smoke.js` | ini 生成、依存の配置、エラー検出のオフライン検査 |

## ドキュメント

- **[docs/RESEARCH.md](../RESEARCH.md)** — `ucc make` がどうビルドし、実際に何を必要とするか: 四つの入力、なぜ素のクライアントインストールがそのすべてを備えているのか、なぜ SDK は何も足さず専用サーバーは代わりにならないのか、ワークスペースの設計と DLL をコピーしなければならない理由、Linux と macOS での Wine、そして commandlet リファレンス。
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — このツールが回避しているコンパイラの挙動: パッケージごとに一回ずつ、再ビルドを黙って取り消すビルド済み依存、次の実行を汚染する成果物、嘘をつく終了コード、そしてパッケージ修飾が受け付けられるたった二箇所。`UCC.exe` を手で叩く前に必読。
- **[docs/USAGE.md](../USAGE.md)** — すべてのコマンドと設定キー、例つき。

## テスト

```bash
pnpm test
```

ini 生成、依存の配置、エラー検出をオフラインでカバーします。コンパイルそのものには実際のインストールが必要なので、それはビルドを一度走らせてください。

## 免責事項

研究および教育目的で公開している個人のツールプロジェクトです。ゲームコンテンツも Tripwire のバイナリも含みません。すでにあなたが所有している `UCC.exe` のコピーを、すでにあなたが所有しているゲームのインストールに対して実行するだけです。**現状のまま**、いかなる保証もなく提供されます（ライセンス参照）。Tripwire Interactive および Epic Games とは無関係です。

## ライセンス

Copyright (c) 2026 TheBestPlan.

**GNU General Public License v3.0 以降**（GPL-3.0-or-later）のもとで公開しています。全文は [LICENSE](../../LICENSE) にあります。本プログラムはフリーソフトウェアです。その条件のもとで再配布および改変ができ、**無保証**で提供されます。

## 商標について

Killing Floor と Unreal は Tripwire Interactive および Epic Games の商標です。これは非公式のファンメイドツールであり、いずれとも提携しておらず、承認も受けていません。`UCC.exe` および本ツールが駆動するエンジンパッケージはそれぞれの所有物です。そのいずれもこのリポジトリには含まれず、共に配布されることもありません。
