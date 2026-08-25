# Killing Floor Mutator Tools

[English](../../README.md) · [Русский](./README.ru.md) · [Español](./README.es.md) · **Português** · [Lietuvių](./README.lt.md) · [Polski](./README.pl.md) · [Français](./README.fr.md) · [中文](./README.zh.md) · [日本語](./README.ja.md)

Compila mutadores de **Killing Floor 1** (UnrealScript, Unreal Engine 2.5) executando o próprio `UCC.exe` da Tripwire dentro de um espaço de trabalho isolado. O cliente do jogo fornece os pacotes e o conteúdo, o servidor dedicado fornece o compilador, e **a pasta do jogo é apenas lida** — nada é acrescentado, alterado ou apagado ali.

Uma única compilação, três interfaces: uma CLI, uma interface de navegador e uma aplicação de ambiente de trabalho para Windows, macOS e Linux.

> O `ucc make` não está documentado, devolve `0` em várias falhas e altera silenciosamente a resolução de nomes quando se agrupam pacotes numa mesma passagem. Tudo aquilo que uma compilação tem de contornar está medido e registado em [`docs/GOTCHAS.md`](../GOTCHAS.md); como o compilador é conduzido, e porque é preciso o cliente do jogo enquanto o SDK não é, está em [`docs/RESEARCH.md`](../RESEARCH.md).

## O que é preciso

- Uma instalação local do cliente do **Killing Floor** ([appid 1250](https://store.steampowered.com/app/1250/)) — as DLL, os pacotes `.u` de origem e todo o conteúdo. É para aqui que aponta o `gamePath`.
- Um **`UCC.exe`**, ou seja o [Killing Floor Beta Dedicated Server](https://steamdb.info/app/1273/) (appid 1273, biblioteca Steam → Tools, gratuito com o jogo), a não ser que já tenhas o binário por outra via.
- **Windows**, ou [Wine](https://www.winehq.org/) em Linux e macOS.
- Só para a CLI: [Node.js](https://nodejs.org) 18 ou superior. A aplicação de ambiente de trabalho traz o seu próprio runtime.

Este repositório não inclui conteúdo do jogo nem o `UCC.exe` — é um binário da Tripwire. A ferramenta é apontada a uma cópia que já tens.

O SDK do Killing Floor **não** é necessário; não acrescenta nada de que o compilador precise. O servidor dedicado **não** substitui o cliente — leva cerca de metade do conteúdo, e só a falta do `2K4Menus` já parte a compilação. Ambas as conclusões estão desenvolvidas em [`docs/RESEARCH.md`](../RESEARCH.md).

## Aplicação de ambiente de trabalho (Windows / macOS / Linux)

As aplicações pré-compiladas e autossuficientes estão na página de [Releases](https://github.com/TheBestPlan/killingfloor-mutator-tools/releases):

- **Windows** — `…-setup.exe` (instalador) ou `…-portable.exe` (correr sem instalar).
- **macOS** — `…-mac-x64.dmg` (Intel) ou `…-mac-arm64.dmg` (Apple Silicon).
- **Linux** — `…-linux-x86_64.AppImage` (corre em qualquer lado) ou `…-linux-amd64.deb`.
- **Só CLI** — `killingfloor-mutator-tools-<version>.tgz`, a mesma ferramenta sem Electron: `npm install -g killingfloor-mutator-tools-<version>.tgz`.

Aponta-a à tua instalação do Killing Floor (ou carrega em **Detect**), acrescenta as pastas dos teus pacotes, carrega em Build e vê o log do compilador a correr ao vivo. O cabeçalho tem um seletor de idioma com os mesmos nove idiomas deste README; a escolha fica memorizada. As compilações não estão assinadas, por isso o sistema pode avisar no primeiro arranque (Windows SmartScreen → *Mais informações → Executar mesmo assim*; macOS → clique direito → *Abrir*).

### Compilar tu mesmo

```bash
pnpm install
pnpm start          # correr a aplicação a partir do código
pnpm run dist       # gerar os instaladores do sistema atual em dist/
```

## CLI

```bash
pnpm run detect                                  # preencher gamePath/uccPath a partir das bibliotecas locais da Steam
pnpm run check                                   # validar a configuração sem compilar
pnpm run build                                   # compilar todos os pacotes da configuração
pnpm run gui                                     # a interface de navegador em http://127.0.0.1:7331

node bin/killingfloor-mutator-tools.js build KF15BetaMutators   # compilar apenas um deles
```

`--config=<dir>` aponta para a pasta que contém o `killingfloor-mutator-tools.config.json` (por omissão, a pasta atual), de modo que a ferramenta pode viver num sítio e compilar um repositório de mutadores noutro.

## Configuração

`killingfloor-mutator-tools.config.json`, ao lado do sítio de onde corres o comando. Copia o `killingfloor-mutator-tools.config.example.json` para começar; o `detect` preenche os dois caminhos por ti. As barras normais funcionam no Windows e evitam o escape de JSON.

| chave | significado |
| --- | --- |
| `gamePath` | raiz da instalação do Killing Floor |
| `uccPath` | `UCC.exe`; vazio = deteção automática pelas bibliotecas Steam, primeiro o servidor dedicado |
| `workspace` | pasta de compilação isolada, pode ser apagada sem risco; mantém o nome curto, porque o UCC não suporta caminhos longos |
| `packages` | pastas de código dos mutadores (cada uma com o seu `Classes/`), **por ordem de compilação** |
| `resourcePaths` | raízes com `System/`, `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/` que contêm conteúdo próprio, pacotes de dependências já compilados e os `.ini` de pacote embutidos na compilação |
| `outputPath` | onde acabam os `.u`, `.ucl` e `.uz2` |
| `copyTo` | pastas adicionais que recebem os `.u`/`.ucl`, como o `System/` de um servidor ou uma pasta de recursos de docker |
| `strip` | correr o `Editor.StripSourceCommandlet`, que reduz o `.u` a cerca de metade |
| `compress` | produzir `.uz2` para redirecionamento HTTP |
| `buildInfoClass` | classe em cujo `Version` por omissão são gravados a hora da compilação e o hash de git; `""` desativa |
| `wine` | comando Wine usado em sistemas que não são Windows |

Todas as chaves, com exemplos, estão em [`docs/USAGE.md`](../USAGE.md).

## Como a compilação se mantém isolada

A ferramenta constrói um **espaço de trabalho**: uma pasta `System/` privada com o `UCC.exe`, as DLL e os ficheiros `.int` do jogo, e um `KillingFloor.ini` gerado cujos `[Core.System] Paths` apontam diretamente para os `Textures/`, `Sounds/`, `StaticMeshes/`, `Animations/`, `Maps/` e `System/` do jogo. O código é copiado para dentro, o compilador corre ali, e os artefactos são levados para fora.

```
<workspace>/
  System/          UCC.exe + DLL do jogo + *.int + KillingFloor.ini gerado   (~19 MB)
  <Package>/       cópia do teu código Classes/
```

As DLL têm de ser copiadas em vez de referenciadas: o UCC deduz a sua pasta base de onde a `Core.dll` foi carregada, por isso deixá-las na pasta do jogo faria o compilador escrever a sua saída, e os seus logs, dentro da instalação.

## Estrutura

| Caminho | O que é |
|------|-----------|
| `src/build.js` | o núcleo: descoberta da Steam, preparação do espaço de trabalho, geração do ini, a execução do UCC e a deteção dos seus erros |
| `src/gui.js` | o servidor local por trás da interface (só `127.0.0.1`) |
| `src/gui.html` | a interface de compilação: formulário de configuração, botões Detect / Save / Check / Build, log do compilador ao vivo |
| `src/i18n.js` | traduções da interface para os nove idiomas do README, com troca ao vivo |
| `bin/killingfloor-mutator-tools.js` | a CLI |
| `electron/main.js` | invólucro Electron que mostra a mesma interface como aplicação de ambiente de trabalho |
| `test/smoke.js` | verificações offline da geração do ini, da preparação de dependências e da deteção de erros |

## Documentação

- **[docs/RESEARCH.md](../RESEARCH.md)** — como o `ucc make` compila e do que precisa realmente: as quatro entradas, porque uma instalação normal do cliente as tem todas, porque o SDK não acrescenta nada e o servidor dedicado não o substitui, o desenho do espaço de trabalho e porque as DLL têm de ser copiadas, Wine em Linux e macOS, e a referência de commandlets.
- **[docs/GOTCHAS.md](../GOTCHAS.md)** — os comportamentos do compilador que esta ferramenta contorna: uma passagem por pacote, dependências pré-compiladas que cancelam silenciosamente uma recompilação, saídas que envenenam a execução seguinte, um código de saída que mente, e os dois únicos sítios onde a qualificação por pacote é aceite. Leitura obrigatória antes de conduzir o `UCC.exe` à mão.
- **[docs/USAGE.md](../USAGE.md)** — todos os comandos e chaves de configuração, com exemplos.

## Testes

```bash
pnpm test
```

Cobrem a geração do ini, a preparação de dependências e a deteção de erros offline. Compilar a sério precisa de uma instalação real, por isso para isso lança uma compilação.

## Aviso

Um projeto pessoal de ferramentas, publicado para fins de investigação e educação. Não inclui conteúdo do jogo nem binários da Tripwire; executa uma cópia do `UCC.exe` que já possuis, sobre uma instalação do jogo que já possuis. Fornecido **como está**, sem qualquer garantia (ver a licença). Sem qualquer afiliação com a Tripwire Interactive ou a Epic Games.

## Licença

Copyright (c) 2026 TheBestPlan.

Publicado sob a **Licença Pública Geral GNU v3.0 ou posterior** (GPL-3.0-or-later). O texto completo está em [LICENSE](../../LICENSE). Este programa é software livre: podes redistribuí-lo e modificá-lo nesses termos, e é fornecido **sem garantia**.

## Aviso de marcas

Killing Floor e Unreal são marcas da Tripwire Interactive e da Epic Games. Esta é uma ferramenta não oficial, feita por fãs, sem afiliação nem aprovação de nenhuma delas. O `UCC.exe` e os pacotes do motor que esta ferramenta conduz são propriedade delas; nenhum deles está contido neste repositório nem é distribuído com ele.
