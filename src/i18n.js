// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 TheBestPlan

"use strict";
// UI translations + live language switching. English is the source and the fallback: a missing key
// in any locale falls back to en, so a partial translation never blanks the window.
//
// Static markup carries the keys: data-i18n (textContent), data-i18n-title (title),
// data-i18n-ph (placeholder). Text written from script goes through setText(), which stores the
// key (and its {vars}) on the element, so apply() re-renders live strings too.
//
// Compiler output and the config problems reported by src/build.js stay in English: they are the
// CLI's output too, and UCC's own log lines are not ours to translate.
window.KFI18N = (function () {
  // Order and names follow the README's translation row.
  const LANGS = [
    ["en", "English"], ["ru", "Русский"], ["es", "Español"], ["pt", "Português"], ["lt", "Lietuvių"],
    ["pl", "Polski"], ["fr", "Français"], ["zh", "中文"], ["ja", "日本語"],
  ];

  const en = {
    "ui.language": "Language",
    "label.gamePath": "Killing Floor folder",
    "title.detect": "Find via Steam libraries",
    "btn.detect": "Detect",
    "label.uccPath": "UCC.exe (blank = auto)",
    "ph.auto": "auto",
    "label.packages": "Mutator source folders (one per line, build order)",
    "label.resourcePaths": "Resource roots (System / Textures / Sounds / …)",
    "label.outputPath": "Output folder",
    "label.copyTo": "Also copy .u/.ucl to (one per line)",
    "label.workspace": "Workspace (isolated System)",
    "chk.strip": "strip source",
    "chk.compress": "compress .uz2",
    "btn.build": "Build",
    "btn.save": "Save",
    "btn.check": "Check",
    "status.ready": "ready",
    "status.building": "building…",
    "status.built": "built {packages} in {seconds}s",
    "status.detected": "detected — press Save",
    "status.noInstall": "no Killing Floor install found in the Steam libraries",
  };

  const ru = {
    "ui.language": "Язык",
    "label.gamePath": "Папка Killing Floor",
    "title.detect": "Найти через библиотеки Steam",
    "btn.detect": "Найти",
    "label.uccPath": "UCC.exe (пусто = авто)",
    "ph.auto": "авто",
    "label.packages": "Папки исходников мутаторов (по одной в строке, в порядке сборки)",
    "label.resourcePaths": "Корни ресурсов (System / Textures / Sounds / …)",
    "label.outputPath": "Папка вывода",
    "label.copyTo": "Также копировать .u/.ucl в (по одной в строке)",
    "label.workspace": "Рабочая папка (изолированный System)",
    "chk.strip": "убрать исходники",
    "chk.compress": "сжать в .uz2",
    "btn.build": "Собрать",
    "btn.save": "Сохранить",
    "btn.check": "Проверить",
    "status.ready": "готово",
    "status.building": "сборка…",
    "status.built": "собрано {packages} за {seconds} с",
    "status.detected": "найдено — нажми Сохранить",
    "status.noInstall": "установленный Killing Floor не найден в библиотеках Steam",
  };

  const es = {
    "ui.language": "Idioma",
    "label.gamePath": "Carpeta de Killing Floor",
    "title.detect": "Buscar en las bibliotecas de Steam",
    "btn.detect": "Detectar",
    "label.uccPath": "UCC.exe (vacío = automático)",
    "ph.auto": "automático",
    "label.packages": "Carpetas de código de los mutadores (una por línea, en orden de compilación)",
    "label.resourcePaths": "Raíces de recursos (System / Textures / Sounds / …)",
    "label.outputPath": "Carpeta de salida",
    "label.copyTo": "Copiar también los .u/.ucl a (una por línea)",
    "label.workspace": "Espacio de trabajo (System aislado)",
    "chk.strip": "quitar el código",
    "chk.compress": "comprimir a .uz2",
    "btn.build": "Compilar",
    "btn.save": "Guardar",
    "btn.check": "Validar",
    "status.ready": "listo",
    "status.building": "compilando…",
    "status.built": "compilado {packages} en {seconds} s",
    "status.detected": "detectado — pulsa Guardar",
    "status.noInstall": "no se encontró ninguna instalación de Killing Floor en las bibliotecas de Steam",
  };

  const pt = {
    "ui.language": "Idioma",
    "label.gamePath": "Pasta do Killing Floor",
    "title.detect": "Procurar nas bibliotecas Steam",
    "btn.detect": "Detetar",
    "label.uccPath": "UCC.exe (vazio = automático)",
    "ph.auto": "automático",
    "label.packages": "Pastas de código dos mutadores (uma por linha, por ordem de compilação)",
    "label.resourcePaths": "Raízes de recursos (System / Textures / Sounds / …)",
    "label.outputPath": "Pasta de saída",
    "label.copyTo": "Copiar também os .u/.ucl para (uma por linha)",
    "label.workspace": "Espaço de trabalho (System isolado)",
    "chk.strip": "remover o código",
    "chk.compress": "comprimir para .uz2",
    "btn.build": "Compilar",
    "btn.save": "Guardar",
    "btn.check": "Validar",
    "status.ready": "pronto",
    "status.building": "a compilar…",
    "status.built": "compilado {packages} em {seconds} s",
    "status.detected": "detetado — carrega em Guardar",
    "status.noInstall": "não foi encontrada nenhuma instalação do Killing Floor nas bibliotecas Steam",
  };

  const lt = {
    "ui.language": "Kalba",
    "label.gamePath": "Killing Floor aplankas",
    "title.detect": "Ieškoti Steam bibliotekose",
    "btn.detect": "Rasti",
    "label.uccPath": "UCC.exe (tuščia = automatiškai)",
    "ph.auto": "automatiškai",
    "label.packages": "Mutatorių pirminio kodo aplankai (po vieną eilutėje, kompiliavimo eiliškumu)",
    "label.resourcePaths": "Išteklių šaknys (System / Textures / Sounds / …)",
    "label.outputPath": "Išvesties aplankas",
    "label.copyTo": "Taip pat kopijuoti .u/.ucl į (po vieną eilutėje)",
    "label.workspace": "Darbo sritis (izoliuotas System)",
    "chk.strip": "pašalinti pirminį kodą",
    "chk.compress": "suglaudinti į .uz2",
    "btn.build": "Kompiliuoti",
    "btn.save": "Įrašyti",
    "btn.check": "Patikrinti",
    "status.ready": "pasiruošęs",
    "status.building": "kompiliuojama…",
    "status.built": "sukompiliuota {packages} per {seconds} s",
    "status.detected": "rasta — spausk Įrašyti",
    "status.noInstall": "Steam bibliotekose nerasta įdiegto Killing Floor",
  };

  const pl = {
    "ui.language": "Język",
    "label.gamePath": "Katalog Killing Floor",
    "title.detect": "Szukaj w bibliotekach Steam",
    "btn.detect": "Wykryj",
    "label.uccPath": "UCC.exe (puste = automatycznie)",
    "ph.auto": "automatycznie",
    "label.packages": "Katalogi źródeł mutatorów (jeden na linię, w kolejności budowania)",
    "label.resourcePaths": "Katalogi zasobów (System / Textures / Sounds / …)",
    "label.outputPath": "Katalog wyjściowy",
    "label.copyTo": "Kopiuj .u/.ucl także do (jeden na linię)",
    "label.workspace": "Katalog roboczy (odizolowany System)",
    "chk.strip": "usuń źródła",
    "chk.compress": "spakuj do .uz2",
    "btn.build": "Buduj",
    "btn.save": "Zapisz",
    "btn.check": "Sprawdź",
    "status.ready": "gotowe",
    "status.building": "budowanie…",
    "status.built": "zbudowano {packages} w {seconds} s",
    "status.detected": "wykryto — naciśnij Zapisz",
    "status.noInstall": "nie znaleziono instalacji Killing Floor w bibliotekach Steam",
  };

  const fr = {
    "ui.language": "Langue",
    "label.gamePath": "Dossier Killing Floor",
    "title.detect": "Chercher dans les bibliothèques Steam",
    "btn.detect": "Détecter",
    "label.uccPath": "UCC.exe (vide = automatique)",
    "ph.auto": "automatique",
    "label.packages": "Dossiers sources des mutateurs (un par ligne, dans l'ordre de compilation)",
    "label.resourcePaths": "Racines de ressources (System / Textures / Sounds / …)",
    "label.outputPath": "Dossier de sortie",
    "label.copyTo": "Copier aussi les .u/.ucl vers (un par ligne)",
    "label.workspace": "Espace de travail (System isolé)",
    "chk.strip": "retirer les sources",
    "chk.compress": "compresser en .uz2",
    "btn.build": "Compiler",
    "btn.save": "Enregistrer",
    "btn.check": "Vérifier",
    "status.ready": "prêt",
    "status.building": "compilation…",
    "status.built": "compilé {packages} en {seconds} s",
    "status.detected": "détecté — appuyez sur Enregistrer",
    "status.noInstall": "aucune installation de Killing Floor trouvée dans les bibliothèques Steam",
  };

  const zh = {
    "ui.language": "语言",
    "label.gamePath": "Killing Floor 目录",
    "title.detect": "在 Steam 库中查找",
    "btn.detect": "检测",
    "label.uccPath": "UCC.exe（留空 = 自动）",
    "ph.auto": "自动",
    "label.packages": "mutator 源码目录（每行一个，按构建顺序）",
    "label.resourcePaths": "资源根目录（System / Textures / Sounds / …）",
    "label.outputPath": "输出目录",
    "label.copyTo": "同时把 .u/.ucl 复制到（每行一个）",
    "label.workspace": "工作目录（隔离的 System）",
    "chk.strip": "剥离源码",
    "chk.compress": "压缩为 .uz2",
    "btn.build": "构建",
    "btn.save": "保存",
    "btn.check": "校验",
    "status.ready": "就绪",
    "status.building": "构建中…",
    "status.built": "已构建 {packages}，用时 {seconds} 秒",
    "status.detected": "已检测 — 请点保存",
    "status.noInstall": "在 Steam 库中没有找到已安装的 Killing Floor",
  };

  const ja = {
    "ui.language": "言語",
    "label.gamePath": "Killing Floor フォルダ",
    "title.detect": "Steam ライブラリから探す",
    "btn.detect": "検出",
    "label.uccPath": "UCC.exe（空 = 自動）",
    "ph.auto": "自動",
    "label.packages": "mutator のソースフォルダ（1 行に 1 つ、ビルド順）",
    "label.resourcePaths": "リソースのルート（System / Textures / Sounds / …）",
    "label.outputPath": "出力フォルダ",
    "label.copyTo": ".u/.ucl の追加コピー先（1 行に 1 つ）",
    "label.workspace": "ワークスペース（隔離された System）",
    "chk.strip": "ソースを削除",
    "chk.compress": ".uz2 に圧縮",
    "btn.build": "ビルド",
    "btn.save": "保存",
    "btn.check": "検査",
    "status.ready": "準備完了",
    "status.building": "ビルド中…",
    "status.built": "{packages} を {seconds} 秒でビルドしました",
    "status.detected": "検出しました — 保存を押してください",
    "status.noInstall": "Steam ライブラリに Killing Floor のインストールが見つかりません",
  };

  const DICT = { en, ru, es, pt, lt, pl, fr, zh, ja };
  // English is the source of truth. Every other locale inherits any key it has not translated, so a
  // new label only has to be written in en - the rest fall back to English text with the same
  // {placeholders}, keeping the window whole without nine hand edits per new string.
  for (const code of Object.keys(DICT)) {
    if (code === "en") continue;
    for (const k of Object.keys(en)) if (!(k in DICT[code])) DICT[code][k] = en[k];
  }

  let cur = "en";

  // {name} placeholders are filled from vars; an unknown key renders itself, so a typo is visible
  // rather than silently blank.
  function t(key, vars) {
    let s = DICT[cur][key];
    if (s == null) s = en[key];
    if (s == null) return key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s;
  }

  const argsOf = (node) => {
    try { return node.dataset.i18nArgs ? JSON.parse(node.dataset.i18nArgs) : null; } catch (e) { return null; }
  };

  // Script-written text keeps its key on the element, so a language switch re-renders it too.
  function setText(node, key, vars) {
    if (!node) return;
    node.dataset.i18n = key;
    if (vars) node.dataset.i18nArgs = JSON.stringify(vars); else delete node.dataset.i18nArgs;
    node.textContent = t(key, vars);
  }

  // Server-provided text (config problems, compiler errors) has no key; drop any stale one so the
  // next apply() does not overwrite it with a translation of whatever was shown before.
  function setRaw(node, text) {
    if (!node) return;
    delete node.dataset.i18n;
    delete node.dataset.i18nArgs;
    node.textContent = text;
  }

  function apply(lang) {
    cur = DICT[lang] ? lang : "en";
    document.documentElement.lang = cur;
    document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n, argsOf(n)); });
    document.querySelectorAll("[data-i18n-title]").forEach((n) => { n.title = t(n.dataset.i18nTitle); });
    document.querySelectorAll("[data-i18n-ph]").forEach((n) => { n.placeholder = t(n.dataset.i18nPh); });
  }

  return {
    LANGS, DICT, t, apply, setText, setRaw,
    get lang() { return cur; },
  };
})();
