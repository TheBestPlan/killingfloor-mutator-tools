# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · [Español](./README.es.md) · [Português](./README.pt.md) · **Lietuvių** · [Polski](./README.pl.md) · [Français](./README.fr.md) · [中文](./README.zh.md) · [日本語](./README.ja.md)

Kompiliuoja **Killing Floor 1** mutatorius (UnrealScript, Unreal Engine 2.5), paleisdamas patį Tripwire `UCC.exe` izoliuotoje darbo srityje. Žaidimo klientas duoda paketus ir turinį, dedikuotas serveris duoda kompiliatorių, o **žaidimo aplankas tik skaitomas** — jame niekas nepridedama, nekeičiama ir netrinama.

Viena kompiliacija, trys sąsajos: CLI, naršyklės sąsaja ir darbalaukio programa Windows, macOS bei Linux sistemoms.

> `ucc make` niekur nedokumentuotas, dalį klaidų grąžina su kodu `0` ir tyliai pakeičia vardų sprendimą, jei paketus kompiliuoji viena krūva. Viskas, ką kompiliacijai tenka apeiti, išmatuota ir surašyta [`docs/GOTCHAS.md`](../GOTCHAS.md); kaip valdomas kompiliatorius ir kodėl reikia žaidimo kliento, o SDK — ne, aprašyta [`docs/RESEARCH.md`](../RESEARCH.md).

## Ko reikia

- Vietoje įdiegtas **Killing Floor** klientas ([appid 1250](https://store.steampowered.com/app/1250/)) — DLL bibliotekos, standartiniai `.u` paketai ir visas turinys. Būtent į jį rodo `gamePath`.
- **`UCC.exe`**, o tai reiškia [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/) (appid 1273, Steam bibliotekoje → Tools, nemokamai su žaidimu), nebent šį dvejetainį failą jau turi iš kitur.
- **Windows** arba [Wine](https://www.winehq.org/) Linux ir macOS sistemose.
- Tik CLI: [Node.js](https://nodejs.org) 18 ar naujesnis. Darbalaukio programa turi savo vykdymo aplinką.

Saugykloje nėra nei žaidimo turinio, nei `UCC.exe` — tai Tripwire dvejetainis failas. Įrankis nukreipiamas į jau turimą kopiją.

Killing Floor SDK **nereikalingas**: jis neprideda nieko, ko reikėtų kompiliatoriui. Dedikuotas serveris **nepakeičia** kliento — jame maždaug pusė turinio, ir vien trūkstamo `2K4Menus` užtenka, kad kompiliacija subyrėtų. Abi išvados išnagrinėtos [`docs/RESEARCH.md`](../RESEARCH.md).

## Darbalaukio programa (Windows / macOS / Linux)

Paruoštos, savarankiškos programos yra [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases) puslapyje:

- **Windows** — `…-setup.exe` (diegimo programa) arba `…-portable.exe` (paleidimas be diegimo).
- **macOS** — `…-mac-x64.dmg` (Intel) arba `…-mac-arm64.dmg` (Apple Silicon).
- **Linux** — `…-linux-x86_64.AppImage` (veikia bet kur) arba `…-linux-amd64.deb`.
- **Tik CLI** — `killingfloor-mutator-tools-<version>.tgz`, tas pats įrankis be Electron: `npm install -g killingfloor-mutator-tools-<version>.tgz`.

Nukreipk ją į savo įdiegtą Killing Floor (arba spausk **Detect**), pridėk savo paketų aplankus, spausk Build ir stebėk gyvą kompiliatoriaus žurnalą. Antraštėje yra kalbos perjungiklis su tomis pačiomis devyniomis kalbomis kaip šiame README; pasirinkimas įsimenamas. Laidos nepasirašytos, todėl pirmą kartą paleidžiant sistema gali įspėti (Windows SmartScreen → *Daugiau informacijos → Vykdyti vis tiek*; macOS → dešinysis pelės klavišas → *Atidaryti*).

### Susikompiliuoti pačiam

```bash
pnpm install
pnpm start          # paleisti programą iš pirminio kodo
pnpm run dist       # sukurti dabartinės OS diegimo programas į dist/
```

## CLI

```bash
pnpm run detect                                  # užpildyti gamePath/uccPath iš vietinių Steam bibliotekų
pnpm run check                                   # patikrinti konfigūraciją nekompiliuojant
pnpm run build                                   # sukompiliuoti visus konfigūracijos paketus
pnpm run gui                                     # naršyklės sąsaja adresu http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # sukompiliuoti tik vieną iš jų
```

`--config=<dir>` nurodo aplanką, kuriame yra `killingfloor-mutator-tools.config.json` (numatytasis — dabartinis), todėl pats įrankis gali gyventi bet kur ir kompiliuoti kitur esančią mutatorių saugyklą.

## Konfigūracija

`killingfloor-mutator-tools.config.json` šalia tos vietos, iš kurios paleidi komandą. Pradėk nuo `killingfloor-mutator-tools.config.example.json` kopijos; `detect` du kelius užpildys už tave. Pasvirieji brūkšniai į priekį veikia ir Windows sistemoje ir leidžia išvengti JSON kaitos simbolių.

| raktas | ką reiškia |
| --- | --- |
| `gamePath` | Killing Floor diegimo šaknis |
| `uccPath` | `UCC.exe`; tuščia = automatinė paieška Steam bibliotekose, pirmiausia dedikuotame serveryje |
| `workspace` | izoliuotas kompiliavimo aplankas, saugu ištrinti; laikyk pavadinimą trumpą, nes UCC nepalaiko ilgų kelių |
| `packages` | mutatorių pirminio kodo aplankai (kiekviename yra `Classes/`), **kompiliavimo eiliškumu** |
| `resourcePaths` | šaknys su `System/`, `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, kuriose laikomas savas turinys ir iš anksto sukompiliuoti priklausomybių paketai |
| `outputPath` | kur atsiduria `.u`, `.ucl` ir `.uz2` |
| `copyTo` | papildomi aplankai, į kuriuos nukopijuojami `.u`/`.ucl` — pavyzdžiui serverio `System/` ar docker išteklių aplankas |
| `strip` | paleisti `Editor.StripSourceCommandlet`, kuris sumažina `.u` maždaug perpus |
| `compress` | sukurti `.uz2` HTTP peradresavimui |
| `buildInfoClass` | klasė, į kurios numatytąjį `Version` įrašomas kompiliavimo laikas ir git maiša; `""` išjungia |
| `wine` | Wine komanda ne Windows sistemose |

Visi raktai su pavyzdžiais — [`docs/USAGE.md`](../USAGE.md).

## Kaip kompiliacija lieka izoliuota

Įrankis sukuria **darbo sritį**: privatų `System/` aplanką su `UCC.exe`, žaidimo DLL bibliotekomis bei `.int` failais ir sugeneruotu `KillingFloor.ini`, kurio `[Core.System] Paths` rodo tiesiai į žaidimo `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` ir `System/`. Pirminis kodas nukopijuojamas vidun, kompiliatorius dirba ten, o rezultatai išnešami laukan.

```
<workspace>/
  System/          UCC.exe + žaidimo DLL + *.int + sugeneruotas KillingFloor.ini   (~19 MB)
  <Package>/       tavo Classes/ pirminio kodo kopija
```

DLL bibliotekas tenka būtent kopijuoti, o ne į jas nurodyti: UCC savo bazinį aplanką nustato pagal tai, iš kur buvo įkelta `Core.dll`, tad palikus jas žaidimo aplanke kompiliatorius rašytų savo rezultatus ir žurnalus atgal į žaidimo diegimą.

## Struktūra

| Kelias | Kas tai |
|------|-----------|
| `src/build.js` | branduolys: Steam paieška, darbo srities paruošimas, ini generavimas, UCC paleidimas ir jo klaidų aptikimas |
| `src/gui.js` | vietinis serveris už sąsajos (tik `127.0.0.1`) |
| `src/gui.html` | kompiliavimo sąsaja: konfigūracijos forma, Detect / Save / Check / Build mygtukai, gyvas kompiliatoriaus žurnalas |
| `src/i18n.js` | sąsajos vertimai į devynias README kalbas, su gyvu perjungimu |
| `bin/killingfloor-mutator-tools.js` | CLI |
| `electron/main.js` | Electron apvalkalas, rodantis tą pačią sąsają kaip darbalaukio programą |
| `test/smoke.js` | ini generavimo, priklausomybių paruošimo ir klaidų aptikimo patikros neprisijungus |

## Dokumentacija

- **[docs/RESEARCH.md](../RESEARCH.md)** — kaip kompiliuoja `ucc make` ir ko jam iš tikrųjų reikia: keturi įvesties dalykai, kodėl paprastas kliento diegimas turi juos visus, kodėl SDK neprideda nieko, o dedikuotas serveris kliento nepakeičia, darbo srities sandara ir kodėl DLL reikia kopijuoti, Wine Linux ir macOS sistemose bei commandlet'ų žinynas.
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — kompiliatoriaus elgsena, kurią šis įrankis apeina: vienas praėjimas vienam paketui, iš anksto sukompiliuotos priklausomybės, tyliai atšaukiančios perkompiliavimą, rezultatai, nuodijantys kitą paleidimą, meluojantis grąžos kodas ir dvi vienintelės vietos, kur priimama paketo kvalifikacija. Būtina perskaityti prieš valdant `UCC.exe` rankomis.
- **[docs/USAGE.md](../USAGE.md)** — visos komandos ir konfigūracijos raktai su pavyzdžiais.

## Testai

```bash
pnpm test
```

Apima ini generavimą, priklausomybių paruošimą ir klaidų aptikimą neprisijungus. Pačiai kompiliacijai reikia tikro žaidimo diegimo, tad tam tiesiog paleisk kompiliavimą.

## Atsakomybės atsisakymas

Asmeninis įrankių projektas, paskelbtas tyrimų ir mokymosi tikslais. Jame nėra nei žaidimo turinio, nei Tripwire dvejetainių failų; jis paleidžia jau tavo turimą `UCC.exe` kopiją ant jau tavo turimo žaidimo diegimo. Teikiamas **toks, koks yra**, be jokių garantijų (žr. licenciją). Nesusijęs su Tripwire Interactive ar Epic Games.

## Licencija

Copyright (c) 2026 TheBestPlan.

Platinama pagal **GNU General Public License v3.0 arba naujesnę** (GPL-3.0-or-later). Visas tekstas — [LICENSE](../../LICENSE). Ši programa yra laisva programinė įranga: gali ją platinti ir keisti šiomis sąlygomis, ir ji pateikiama **be garantijų**.

## Prekių ženklai

Killing Floor ir Unreal — Tripwire Interactive ir Epic Games prekių ženklai. Tai neoficialus gerbėjų įrankis, su jais nesusijęs ir jų nepatvirtintas. `UCC.exe` ir variklio paketai, kuriuos šis įrankis valdo, priklauso jiems; nė vieno iš jų šioje saugykloje nėra ir su ja jie neplatinami.
