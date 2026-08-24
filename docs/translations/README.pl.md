# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Lietuvių](./README.lt.md) · **Polski** · [Français](./README.fr.md) · [中文](./README.zh.md) · [日本語](./README.ja.md)

Kompiluje mutatory do **Killing Floor 1** (UnrealScript, Unreal Engine 2.5), uruchamiając własny `UCC.exe` Tripwire w odizolowanym katalogu roboczym. Klient gry dostarcza pakiety i zawartość, serwer dedykowany dostarcza kompilator, a **katalog gry jest wyłącznie odczytywany** — nic nie jest tam dodawane, zmieniane ani usuwane.

Jedna kompilacja, trzy interfejsy: CLI, interfejs przeglądarkowy i aplikacja desktopowa dla Windows, macOS i Linuksa.

> `ucc make` nie jest nigdzie udokumentowany, przy części błędów zwraca `0` i po cichu zmienia rozstrzyganie nazw, gdy pakiety kompiluje się hurtem. Wszystko, co kompilacja musi obejść, zostało zmierzone i spisane w [`docs/GOTCHAS.md`](../GOTCHAS.md); jak steruje się kompilatorem i dlaczego potrzebny jest klient gry, a SDK nie — w [`docs/RESEARCH.md`](../RESEARCH.md).

## Czego potrzebujesz

- Lokalnej instalacji klienta **Killing Floor** ([appid 1250](https://store.steampowered.com/app/1250/)) — bibliotek DLL, standardowych pakietów `.u` i całej zawartości. To na nią wskazuje `gamePath`.
- **`UCC.exe`**, czyli [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/) (appid 1273, biblioteka Steam → Tools, za darmo z grą), o ile nie masz już tego pliku skądinąd.
- **Windows** albo [Wine](https://www.winehq.org/) na Linuksie i macOS.
- Tylko dla CLI: [Node.js](https://nodejs.org) 18 lub nowszy. Aplikacja desktopowa niesie własne środowisko uruchomieniowe.

Repozytorium nie zawiera ani zawartości gry, ani `UCC.exe` — to plik binarny Tripwire. Narzędzie kierujesz na kopię, którą już masz.

Killing Floor SDK **nie jest** potrzebny: nie dodaje niczego, czego wymagałby kompilator. Serwer dedykowany **nie zastąpi** klienta — ma mniej więcej połowę zawartości, a sam brak `2K4Menus` wystarczy, by kompilacja się rozsypała. Oba ustalenia rozpisane są w [`docs/RESEARCH.md`](../RESEARCH.md).

## Aplikacja desktopowa (Windows / macOS / Linux)

Gotowe, samowystarczalne wydania są na stronie [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases):

- **Windows** — `…-setup.exe` (instalator) lub `…-portable.exe` (uruchomienie bez instalacji).
- **macOS** — `…-mac-x64.dmg` (Intel) lub `…-mac-arm64.dmg` (Apple Silicon).
- **Linux** — `…-linux-x86_64.AppImage` (działa wszędzie) lub `…-linux-amd64.deb`.
- **Samo CLI** — `killingfloor-mutator-tools-<version>.tgz`, to samo narzędzie bez Electrona: `npm install -g killingfloor-mutator-tools-<version>.tgz`.

Wskaż jej swoją instalację Killing Floor (albo naciśnij **Detect**), dodaj katalogi swoich pakietów, naciśnij Build i patrz, jak na żywo leci log kompilatora. W nagłówku jest przełącznik języka z tymi samymi dziewięcioma językami co ten README; wybór jest zapamiętywany. Wydania nie są podpisane, więc przy pierwszym uruchomieniu system może ostrzec (Windows SmartScreen → *Więcej informacji → Uruchom mimo to*; macOS → prawy przycisk → *Otwórz*).

### Zbuduj samodzielnie

```bash
pnpm install
pnpm start          # uruchomić aplikację ze źródeł
pnpm run dist       # zbudować instalatory dla bieżącego systemu do dist/
```

## CLI

```bash
pnpm run detect                                  # wypełnić gamePath/uccPath z lokalnych bibliotek Steam
pnpm run check                                   # sprawdzić konfigurację bez kompilowania
pnpm run build                                   # skompilować wszystkie pakiety z konfiguracji
pnpm run gui                                     # interfejs przeglądarkowy pod http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # skompilować tylko jeden z nich
```

`--config=<dir>` wskazuje katalog zawierający `killingfloor-mutator-tools.config.json` (domyślnie bieżący), dzięki czemu samo narzędzie może leżeć gdziekolwiek i kompilować repozytorium mutatorów w innym miejscu.

## Konfiguracja

`killingfloor-mutator-tools.config.json` obok miejsca, z którego uruchamiasz polecenie. Zacznij od kopii `killingfloor-mutator-tools.config.example.json`; `detect` wypełni za ciebie dwie ścieżki. Ukośniki w przód działają na Windowsie i pozwalają uniknąć escapowania w JSON-ie.

| klucz | znaczenie |
| --- | --- |
| `gamePath` | katalog główny instalacji Killing Floor |
| `uccPath` | `UCC.exe`; pusty = automatyczne szukanie w bibliotekach Steam, najpierw serwer dedykowany |
| `workspace` | odizolowany katalog kompilacji, można go bezpiecznie usunąć; trzymaj krótką nazwę, bo UCC nie obsługuje długich ścieżek |
| `packages` | katalogi ze źródłami mutatorów (każdy zawiera `Classes/`), **w kolejności kompilacji** |
| `resourcePaths` | katalogi główne z `System/`, `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, w których leży własna zawartość i gotowe pakiety zależności |
| `outputPath` | gdzie lądują `.u`, `.ucl` i `.uz2` |
| `copyTo` | dodatkowe katalogi otrzymujące `.u`/`.ucl`, na przykład `System/` serwera albo katalog zasobów dockera |
| `strip` | uruchomić `Editor.StripSourceCommandlet`, który zmniejsza `.u` mniej więcej o połowę |
| `compress` | wytworzyć `.uz2` na potrzeby przekierowania HTTP |
| `buildInfoClass` | klasa, w której domyślne `Version` stemplowane jest czasem kompilacji i hashem gita; `""` wyłącza |
| `wine` | polecenie Wine używane na systemach innych niż Windows |

Wszystkie klucze wraz z przykładami są w [`docs/USAGE.md`](../USAGE.md).

## Jak kompilacja pozostaje odizolowana

Narzędzie buduje **katalog roboczy**: prywatny `System/` z `UCC.exe`, bibliotekami DLL i plikami `.int` gry oraz wygenerowanym `KillingFloor.ini`, którego `[Core.System] Paths` wskazują prosto na growe `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` i `System/`. Źródła są kopiowane do środka, kompilator pracuje tam, a artefakty wynoszone są na zewnątrz.

```
<workspace>/
  System/          UCC.exe + biblioteki DLL gry + *.int + wygenerowany KillingFloor.ini   (~19 MB)
  <Package>/       kopia twoich źródeł Classes/
```

Biblioteki DLL trzeba kopiować, a nie się do nich odwoływać: UCC wyznacza swój katalog bazowy z tego, skąd wczytano `Core.dll`, więc zostawienie ich w katalogu gry sprawiłoby, że kompilator zacząłby pisać swoje wyniki i logi z powrotem do instalacji.

## Układ

| Ścieżka | Co to jest |
|------|-----------|
| `src/build.js` | rdzeń: wyszukiwanie w Steamie, przygotowanie katalogu roboczego, generowanie ini, uruchomienie UCC i wykrywanie jego błędów |
| `src/gui.js` | lokalny serwer stojący za interfejsem (tylko `127.0.0.1`) |
| `src/gui.html` | interfejs kompilacji: formularz konfiguracji, przyciski Detect / Save / Check / Build, log kompilatora na żywo |
| `src/i18n.js` | tłumaczenia interfejsu na dziewięć języków README, z przełączaniem na żywo |
| `bin/killingfloor-mutator-tools.js` | CLI |
| `electron/main.js` | powłoka Electrona pokazująca ten sam interfejs jako aplikację desktopową |
| `test/smoke.js` | offline'owe testy generowania ini, przygotowania zależności i wykrywania błędów |

## Dokumentacja

- **[docs/RESEARCH.md](../RESEARCH.md)** — jak kompiluje `ucc make` i czego naprawdę potrzebuje: cztery wejścia, dlaczego zwykła instalacja klienta ma je wszystkie, dlaczego SDK nic nie wnosi, a serwer dedykowany nie zastępuje klienta, budowa katalogu roboczego i dlaczego DLL-e muszą być kopiowane, Wine na Linuksie i macOS oraz spis commandletów.
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — zachowania kompilatora, które to narzędzie obchodzi: jeden przebieg na pakiet, gotowe zależności po cichu anulujące przebudowę, wyniki zatruwające następne uruchomienie, kłamiący kod wyjścia i dwa jedyne miejsca, w których przyjmowana jest kwalifikacja pakietem. Lektura obowiązkowa przed ręcznym sterowaniem `UCC.exe`.
- **[docs/USAGE.md](../USAGE.md)** — wszystkie polecenia i klucze konfiguracji, z przykładami.

## Testy

```bash
pnpm test
```

Pokrywają generowanie ini, przygotowanie zależności i wykrywanie błędów offline. Sama kompilacja wymaga prawdziwej instalacji, więc do tego po prostu uruchom budowanie.

## Zastrzeżenie

Osobisty projekt narzędziowy, opublikowany w celach badawczych i edukacyjnych. Nie zawiera ani zawartości gry, ani plików binarnych Tripwire; uruchamia kopię `UCC.exe`, którą już masz, na instalacji gry, którą już masz. Dostarczany **tak jak jest**, bez jakiejkolwiek gwarancji (patrz licencja). Niepowiązany z Tripwire Interactive ani Epic Games.

## Licencja

Copyright (c) 2026 TheBestPlan.

Wydane na **Powszechnej Licencji Publicznej GNU v3.0 lub nowszej** (GPL-3.0-or-later). Pełny tekst znajduje się w [LICENSE](../../LICENSE). Ten program jest wolnym oprogramowaniem: możesz go rozpowszechniać i modyfikować na tych warunkach, i jest dostarczany **bez gwarancji**.

## Znaki towarowe

Killing Floor i Unreal to znaki towarowe Tripwire Interactive i Epic Games. To nieoficjalne, fanowskie narzędzie, niepowiązane z nimi ani przez nie niewspierane. `UCC.exe` i pakiety silnika, którymi to narzędzie steruje, są ich własnością; żadne z nich nie jest zawarte w tym repozytorium ani z nim dystrybuowane.
