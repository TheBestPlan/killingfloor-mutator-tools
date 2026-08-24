# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · **Español** · [Português](./README.pt.md) · [Lietuvių](./README.lt.md) · [Polski](./README.pl.md) · [Français](./README.fr.md) · [中文](./README.zh.md) · [日本語](./README.ja.md)

Compila mutadores de **Killing Floor 1** (UnrealScript, Unreal Engine 2.5) ejecutando el propio `UCC.exe` de Tripwire dentro de un espacio de trabajo aislado. El cliente del juego aporta los paquetes y el contenido, el servidor dedicado aporta el compilador, y **la carpeta del juego solo se lee**: allí no se añade, cambia ni borra nada.

Una sola compilación, tres interfaces: una CLI, una interfaz de navegador y una aplicación de escritorio para Windows, macOS y Linux.

> `ucc make` no está documentado, devuelve `0` en varios fallos y cambia silenciosamente la resolución de nombres si agrupas paquetes en una misma pasada. Todo lo que una compilación tiene que sortear está medido y anotado en [`docs/GOTCHAS.md`](../GOTCHAS.md); cómo se maneja el compilador, y por qué hace falta el cliente del juego mientras que el SDK no, está en [`docs/RESEARCH.md`](../RESEARCH.md).

## Qué necesitas

- Una instalación local del cliente de **Killing Floor** ([appid 1250](https://store.steampowered.com/app/1250/)): las DLL, los paquetes `.u` de serie y todo el contenido. Esto es a lo que apunta `gamePath`.
- Un **`UCC.exe`**, es decir el [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/) (appid 1273, biblioteca de Steam → Tools, gratuito con el juego), salvo que ya tengas el binario por otra vía.
- **Windows**, o [Wine](https://www.winehq.org/) en Linux y macOS.
- Solo para la CLI: [Node.js](https://nodejs.org) 18 o superior. La aplicación de escritorio trae su propio runtime.

Este repositorio no incluye contenido del juego ni `UCC.exe`: es un binario de Tripwire. Apuntas la herramienta a una copia que ya posees.

El SDK de Killing Floor **no** es necesario; no aporta nada que el compilador requiera. El servidor dedicado **no** sustituye al cliente: lleva aproximadamente la mitad del contenido, y solo con que falte `2K4Menus` la compilación se rompe. Ambos hallazgos se desarrollan en [`docs/RESEARCH.md`](../RESEARCH.md).

## Aplicación de escritorio (Windows / macOS / Linux)

Las aplicaciones precompiladas y autocontenidas están en la página de [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases):

- **Windows** — `…-setup.exe` (instalador) o `…-portable.exe` (ejecutar sin instalar).
- **macOS** — `…-mac-x64.dmg` (Intel) o `…-mac-arm64.dmg` (Apple Silicon).
- **Linux** — `…-linux-x86_64.AppImage` (se ejecuta en cualquier sitio) o `…-linux-amd64.deb`.
- **Solo CLI** — `killingfloor-mutator-tools-<version>.tgz`, la misma herramienta sin Electron: `npm install -g killingfloor-mutator-tools-<version>.tgz`.

Apúntala a tu instalación de Killing Floor (o pulsa **Detect**), añade las carpetas de tus paquetes, pulsa Build y observa el log del compilador en directo. La cabecera lleva un selector de idioma con los mismos nueve idiomas que este README; la elección se recuerda. Las compilaciones no están firmadas, así que el sistema puede avisar en el primer arranque (Windows SmartScreen → *Más información → Ejecutar de todas formas*; macOS → clic derecho → *Abrir*).

### Compilarla tú mismo

```bash
pnpm install
pnpm start          # ejecutar la aplicación desde el código
pnpm run dist       # generar los instaladores del sistema actual en dist/
```

## CLI

```bash
pnpm run detect                                  # rellenar gamePath/uccPath desde las bibliotecas locales de Steam
pnpm run check                                   # validar la configuración sin compilar
pnpm run build                                   # compilar todos los paquetes de la configuración
pnpm run gui                                     # la interfaz de navegador en http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # compilar solo uno de ellos
```

`--config=<dir>` apunta al directorio que contiene `killingfloor-mutator-tools.config.json` (por defecto, el directorio actual), de modo que la herramienta puede vivir en cualquier parte y compilar un repositorio de mutadores que esté en otra.

## Configuración

`killingfloor-mutator-tools.config.json`, junto al lugar desde el que ejecutas el comando. Copia `killingfloor-mutator-tools.config.example.json` para empezar; `detect` rellena las dos rutas por ti. Las barras normales funcionan en Windows y evitan el escapado de JSON.

| clave | significado |
| --- | --- |
| `gamePath` | raíz de la instalación de Killing Floor |
| `uccPath` | `UCC.exe`; vacío = detección automática por las bibliotecas de Steam, primero el servidor dedicado |
| `workspace` | carpeta de compilación aislada, se puede borrar sin riesgo; mantén el nombre corto, porque UCC no admite rutas largas |
| `packages` | carpetas de código de los mutadores (cada una con su `Classes/`), **en orden de compilación** |
| `resourcePaths` | raíces con `System/`, `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/` que contienen contenido propio y paquetes de dependencias ya compilados |
| `outputPath` | dónde acaban los `.u`, `.ucl` y `.uz2` |
| `copyTo` | carpetas adicionales que reciben los `.u`/`.ucl`, como el `System/` de un servidor o una carpeta de recursos de docker |
| `strip` | ejecutar `Editor.StripSourceCommandlet`, que reduce el `.u` aproximadamente a la mitad |
| `compress` | producir `.uz2` para redirección HTTP |
| `buildInfoClass` | clase en cuyo `Version` por defecto se estampan la hora de compilación y el hash de git; `""` lo desactiva |
| `wine` | comando de Wine usado en sistemas que no son Windows |

Todas las claves, con ejemplos, están en [`docs/USAGE.md`](../USAGE.md).

## Cómo se mantiene aislada la compilación

La herramienta construye un **espacio de trabajo**: una carpeta `System/` privada con `UCC.exe`, las DLL y los ficheros `.int` del juego, y un `KillingFloor.ini` generado cuyas `[Core.System] Paths` apuntan directamente a los `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` y `System/` del juego. El código se copia dentro, el compilador se ejecuta allí y los artefactos se sacan fuera.

```
<workspace>/
  System/          UCC.exe + DLL del juego + *.int + KillingFloor.ini generado   (~19 MB)
  <Package>/       copia de tu código Classes/
```

Las DLL hay que copiarlas en lugar de referenciarlas: UCC deduce su directorio base de allí donde se cargó `Core.dll`, así que dejarlas en la carpeta del juego haría que el compilador escribiera su salida, y sus logs, dentro de la instalación.

## Estructura

| Ruta | Qué es |
|------|-----------|
| `src/build.js` | el núcleo: descubrimiento de Steam, preparación del espacio de trabajo, generación del ini, la ejecución de UCC y la detección de sus errores |
| `src/gui.js` | el servidor local detrás de la interfaz (solo `127.0.0.1`) |
| `src/gui.html` | la interfaz de compilación: formulario de configuración, botones Detect / Save / Check / Build, log del compilador en vivo |
| `src/i18n.js` | traducciones de la interfaz a los nueve idiomas del README, con cambio en vivo |
| `bin/killingfloor-mutator-tools.js` | la CLI |
| `electron/main.js` | envoltorio de Electron que muestra la misma interfaz como aplicación de escritorio |
| `test/smoke.js` | comprobaciones offline de la generación del ini, la preparación de dependencias y la detección de errores |

## Documentación

- **[docs/RESEARCH.md](../RESEARCH.md)** — cómo compila `ucc make` y qué necesita realmente: las cuatro entradas, por qué una instalación normal del cliente las tiene todas, por qué el SDK no aporta nada y el servidor dedicado no lo sustituye, el diseño del espacio de trabajo y por qué hay que copiar las DLL, Wine en Linux y macOS, y la referencia de commandlets.
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — los comportamientos del compilador que esta herramienta sortea: una pasada por paquete, dependencias precompiladas que cancelan silenciosamente una recompilación, salidas que envenenan la siguiente ejecución, un código de salida que miente y los dos únicos sitios donde se acepta la cualificación por paquete. Lectura obligada antes de manejar `UCC.exe` a mano.
- **[docs/USAGE.md](../USAGE.md)** — todos los comandos y claves de configuración, con ejemplos.

## Pruebas

```bash
pnpm test
```

Cubren la generación del ini, la preparación de dependencias y la detección de errores sin conexión. Compilar de verdad necesita una instalación real, así que para eso lanza una compilación.

## Aviso

Un proyecto personal de herramientas, publicado con fines de investigación y educativos. No incluye contenido del juego ni binarios de Tripwire; ejecuta una copia de `UCC.exe` que ya posees, contra una instalación del juego que ya posees. Se ofrece **tal cual**, sin garantía alguna (véase la licencia). No está afiliado a Tripwire Interactive ni a Epic Games.

## Licencia

Copyright (c) 2026 TheBestPlan.

Publicado bajo la **Licencia Pública General de GNU v3.0 o posterior** (GPL-3.0-or-later). El texto completo está en [LICENSE](../../LICENSE). Este programa es software libre: puedes redistribuirlo y modificarlo bajo esos términos, y se entrega **sin garantía**.

## Aviso de marcas

Killing Floor y Unreal son marcas de Tripwire Interactive y Epic Games. Esta es una herramienta no oficial hecha por aficionados, sin afiliación ni respaldo de ninguna de ellas. `UCC.exe` y los paquetes del motor que esta herramienta maneja son propiedad suya; ninguno de ellos se incluye ni se distribuye con este repositorio.
