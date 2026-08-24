# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Lietuvių](./README.lt.md) · [Polski](./README.pl.md) · **Français** · [中文](./README.zh.md) · [日本語](./README.ja.md)

Compile les mutateurs **Killing Floor 1** (UnrealScript, Unreal Engine 2.5) en pilotant le `UCC.exe` de Tripwire lui-même dans un espace de travail isolé. Le client du jeu fournit les paquets et le contenu, le serveur dédié fournit le compilateur, et **le dossier du jeu est uniquement lu** — rien n'y est ajouté, modifié ni supprimé.

Une seule compilation, trois interfaces : une CLI, une interface navigateur et une application de bureau pour Windows, macOS et Linux.

> `ucc make` n'est documenté nulle part, renvoie `0` sur plusieurs échecs et change silencieusement la résolution des noms dès qu'on groupe les paquets dans une même passe. Tout ce qu'une compilation doit contourner est mesuré et consigné dans [`docs/GOTCHAS.md`](../GOTCHAS.md) ; la façon dont le compilateur est piloté, et pourquoi le client du jeu est nécessaire alors que le SDK ne l'est pas, se trouve dans [`docs/RESEARCH.md`](../RESEARCH.md).

## Ce qu'il vous faut

- Une installation locale du client **Killing Floor** ([appid 1250](https://store.steampowered.com/app/1250/)) — les DLL, les paquets `.u` d'origine et tout le contenu. C'est ce que `gamePath` désigne.
- Un **`UCC.exe`**, c'est-à-dire le [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/) (appid 1273, bibliothèque Steam → Tools, gratuit avec le jeu), à moins que vous n'ayez déjà ce binaire par ailleurs.
- **Windows**, ou [Wine](https://www.winehq.org/) sous Linux et macOS.
- Pour la CLI seulement : [Node.js](https://nodejs.org) 18 ou plus récent. L'application de bureau embarque son propre runtime.

Ce dépôt ne contient ni contenu du jeu ni `UCC.exe` — c'est un binaire de Tripwire. On dirige l'outil vers une copie que vous possédez déjà.

Le SDK Killing Floor **n'est pas** nécessaire : il n'apporte rien dont le compilateur ait besoin. Le serveur dédié **ne remplace pas** le client — il embarque environ la moitié du contenu, et l'absence du seul `2K4Menus` suffit à casser la compilation. Ces deux constats sont détaillés dans [`docs/RESEARCH.md`](../RESEARCH.md).

## Application de bureau (Windows / macOS / Linux)

Les applications précompilées et autonomes sont sur la page [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases) :

- **Windows** — `…-setup.exe` (installeur) ou `…-portable.exe` (exécution sans installation).
- **macOS** — `…-mac-x64.dmg` (Intel) ou `…-mac-arm64.dmg` (Apple Silicon).
- **Linux** — `…-linux-x86_64.AppImage` (fonctionne partout) ou `…-linux-amd64.deb`.
- **CLI seule** — `killingfloor-mutator-tools-<version>.tgz`, le même outil sans Electron : `npm install -g killingfloor-mutator-tools-<version>.tgz`.

Pointez-la vers votre installation de Killing Floor (ou appuyez sur **Detect**), ajoutez les dossiers de vos paquets, appuyez sur Build et regardez le journal du compilateur défiler en direct. L'en-tête porte un sélecteur de langue avec les neuf mêmes langues que ce README ; le choix est mémorisé. Les builds ne sont pas signés, le système peut donc avertir au premier lancement (Windows SmartScreen → *Informations complémentaires → Exécuter quand même* ; macOS → clic droit → *Ouvrir*).

### La compiler soi-même

```bash
pnpm install
pnpm start          # lancer l'application depuis les sources
pnpm run dist       # produire les installeurs du système courant dans dist/
```

## CLI

```bash
pnpm run detect                                  # remplir gamePath/uccPath depuis les bibliothèques Steam locales
pnpm run check                                   # valider la configuration sans compiler
pnpm run build                                   # compiler tous les paquets de la configuration
pnpm run gui                                     # l'interface navigateur sur http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # n'en compiler qu'un
```

`--config=<dir>` désigne le répertoire contenant `killingfloor-mutator-tools.config.json` (par défaut : le répertoire courant), ce qui permet à l'outil de vivre n'importe où et de compiler un dépôt de mutateurs situé ailleurs.

## Configuration

`killingfloor-mutator-tools.config.json`, à côté de l'endroit d'où vous lancez la commande. Copiez `killingfloor-mutator-tools.config.example.json` pour démarrer ; `detect` remplit les deux chemins pour vous. Les barres obliques fonctionnent sous Windows et évitent l'échappement JSON.

| clé | signification |
| --- | --- |
| `gamePath` | racine de l'installation de Killing Floor |
| `uccPath` | `UCC.exe` ; vide = détection automatique dans les bibliothèques Steam, serveur dédié en premier |
| `workspace` | dossier de compilation isolé, supprimable sans risque ; gardez un nom court, car UCC ne gère pas les chemins longs |
| `packages` | dossiers sources des mutateurs (chacun contient `Classes/`), **dans l'ordre de compilation** |
| `resourcePaths` | racines contenant `System/`, `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/` avec le contenu personnalisé et les paquets de dépendances déjà compilés |
| `outputPath` | où atterrissent les `.u`, `.ucl` et `.uz2` |
| `copyTo` | dossiers supplémentaires recevant les `.u`/`.ucl`, comme le `System/` d'un serveur ou un dossier de ressources docker |
| `strip` | exécuter `Editor.StripSourceCommandlet`, qui réduit le `.u` de moitié environ |
| `compress` | produire les `.uz2` pour la redirection HTTP |
| `buildInfoClass` | classe dont le `Version` par défaut reçoit l'horodatage de compilation et le hash git ; `""` désactive |
| `wine` | commande Wine utilisée sur les hôtes non-Windows |

Toutes les clés, avec exemples, sont dans [`docs/USAGE.md`](../USAGE.md).

## Comment la compilation reste isolée

L'outil construit un **espace de travail** : un dossier `System/` privé contenant `UCC.exe`, les DLL et les fichiers `.int` du jeu, et un `KillingFloor.ini` généré dont les `[Core.System] Paths` pointent directement vers les `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` et `System/` du jeu. Les sources sont copiées à l'intérieur, le compilateur s'exécute là, et les artefacts sont sortis.

```
<workspace>/
  System/          UCC.exe + DLL du jeu + *.int + KillingFloor.ini généré   (~19 Mo)
  <Package>/       copie de vos sources Classes/
```

Les DLL doivent être copiées plutôt que référencées : UCC déduit son répertoire de base de l'endroit d'où `Core.dll` a été chargée, si bien que les laisser dans le dossier du jeu amènerait le compilateur à réécrire sa sortie, et ses journaux, dans l'installation du jeu.

## Organisation

| Chemin | Ce que c'est |
|------|-----------|
| `src/build.js` | le cœur : découverte Steam, préparation de l'espace de travail, génération de l'ini, exécution d'UCC et détection de ses erreurs |
| `src/gui.js` | le serveur local derrière l'interface (`127.0.0.1` uniquement) |
| `src/gui.html` | l'interface de compilation : formulaire de configuration, boutons Detect / Save / Check / Build, journal du compilateur en direct |
| `src/i18n.js` | traductions de l'interface dans les neuf langues du README, avec bascule à chaud |
| `bin/killingfloor-mutator-tools.js` | la CLI |
| `electron/main.js` | enveloppe Electron affichant la même interface en application de bureau |
| `test/smoke.js` | vérifications hors ligne de la génération de l'ini, de la préparation des dépendances et de la détection d'erreurs |

## Documentation

- **[docs/RESEARCH.md](../RESEARCH.md)** — comment `ucc make` compile et ce dont il a réellement besoin : les quatre entrées, pourquoi une simple installation du client les possède toutes, pourquoi le SDK n'apporte rien et le serveur dédié ne remplace pas le client, la conception de l'espace de travail et pourquoi les DLL doivent être copiées, Wine sous Linux et macOS, et la référence des commandlets.
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — les comportements du compilateur que cet outil contourne : une passe par paquet, des dépendances précompilées qui annulent silencieusement une recompilation, des sorties qui empoisonnent l'exécution suivante, un code de retour qui ment, et les deux seuls endroits où la qualification par paquet est acceptée. Lecture obligatoire avant de piloter `UCC.exe` à la main.
- **[docs/USAGE.md](../USAGE.md)** — toutes les commandes et clés de configuration, avec exemples.

## Tests

```bash
pnpm test
```

Couvrent la génération de l'ini, la préparation des dépendances et la détection d'erreurs hors ligne. Compiler pour de vrai demande une installation réelle : lancez une compilation pour cela.

## Avertissement

Projet d'outillage personnel, publié à des fins de recherche et d'enseignement. Il ne contient ni contenu du jeu ni binaire Tripwire ; il exécute une copie de `UCC.exe` que vous possédez déjà, sur une installation du jeu que vous possédez déjà. Fourni **en l'état**, sans aucune garantie (voir la licence). Sans lien avec Tripwire Interactive ni Epic Games.

## Licence

Copyright (c) 2026 TheBestPlan.

Publié sous la **Licence publique générale GNU v3.0 ou ultérieure** (GPL-3.0-or-later). Le texte complet est dans [LICENSE](../../LICENSE). Ce programme est un logiciel libre : vous pouvez le redistribuer et le modifier selon ces termes, et il est fourni **sans aucune garantie**.

## Marques

Killing Floor et Unreal sont des marques de Tripwire Interactive et d'Epic Games. Il s'agit d'un outil non officiel, réalisé par un amateur, sans affiliation ni approbation de leur part. `UCC.exe` et les paquets du moteur que cet outil pilote leur appartiennent ; aucun d'eux n'est contenu dans ce dépôt ni distribué avec lui.
