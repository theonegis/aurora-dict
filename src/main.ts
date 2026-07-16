import "./style.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getSystemFonts } from "tauri-plugin-system-fonts-api";

type SourceId = "local" | "youdao" | "dictionary" | "vocabulary";
type ThemeId = "purple" | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "violet" | "black";
type UiLanguage = "zh" | "en";
type FontId = string;

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  ukAudio?: string;
  usAudio?: string;
  translation?: string;
  definition?: string;
  pos?: string;
  exchange?: string;
}

interface LocalLookup {
  query: string;
  entries: DictionaryEntry[];
  suggestions: string[];
  sampleData: boolean;
}

interface LocalSuggestions {
  suggestions: string[];
  correction: boolean;
}

interface DictionaryStatus {
  entryCount: number;
  sampleData: boolean;
}

interface OnlineSense {
  partOfSpeech: string;
  definitions: string[];
}

interface OnlineExample {
  english: string;
  translation?: string;
  source?: string;
}

interface OnlinePhrase {
  term: string;
  translation?: string;
}

interface OnlineContentSection {
  id: "simple" | "collins" | string;
  senses: OnlineSense[];
  examples: OnlineExample[];
  phrases: OnlinePhrase[];
}

interface OnlineLookup {
  source: string;
  word: string;
  pronunciation?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  ukAudio?: string;
  usAudio?: string;
  senses: OnlineSense[];
  examples: OnlineExample[];
  sections: OnlineContentSection[];
  note?: string;
  sourceUrl: string;
}

interface SenseGroup {
  label: string;
  definitions: string[];
}

interface WordForm {
  code: string;
  value: string;
}

interface DisplaySettings {
  theme: ThemeId;
  language: UiLanguage;
  scale: number;
  opacity: number;
  blur: number;
  font: FontId;
  enabledSources: SourceId[];
  cacheLimit: number;
}

type SourceLookupResult =
  | { type: "local"; result: LocalLookup }
  | { type: "online"; result: OnlineLookup };

interface QueryCacheRecord {
  query: string;
  accessedAt: number;
  results: Partial<Record<SourceId, SourceLookupResult>>;
}

const copy = {
  zh: {
    titlebarCaption: "中英词典", closeWindow: "关闭窗口", minimiseWindow: "最小化窗口", maximiseWindow: "最大化或还原窗口",
    localSourceTitle: "本地查询", localSourceSubtitle: "ECDICT · 离线优先", youdaoSourceTitle: "有道词典", youdaoSourceSubtitle: "中英双向",
    dictionarySourceTitle: "Dictionary", dictionarySourceSubtitle: "Free Dictionary API", vocabularySourceTitle: "Vocabulary.com", vocabularySourceSubtitle: "英语学习",
    themeRed: "赤", themeOrange: "橙", themeYellow: "黄", themeGreen: "绿", themeCyan: "青", themeBlue: "蓝", themePurple: "紫", themeViolet: "罗兰", themeBlack: "黑",
    systemDefault: "系统默认", heroBefore: "让每一个词，", heroEmphasis: "恰好被理解。", heroCopy: "中英双向、离线优先。一个安静而专注的桌面字典。",
    openSettings: "打开显示与主题设置", settingsTitle: "显示与主题", settingsCopy: "调整只保存在这台设备。主题色同时会用于标签、按钮和 Fluent 滚动条。",
    settingsCaption: "显示设置", lookupAria: "词典查询", searchPlaceholder: "输入英文查中文，输入中文查英文", searchInputAria: "查询单词", search: "查询", searchHint: "支持中文释义检索、英文拼写提示",
    selectSource: "选择词典来源", footerLocalFirst: "离线优先字典", footerLearning: "为从容学习而设计", noDefinition: "暂无释义", definition: "释义", wordForms: "词形式变化：",
    formPastTense: "过去式", formPastParticiple: "过去分词", formPresentParticiple: "现在分词", formThirdPerson: "第三人称单数", formComparative: "比较级", formSuperlative: "最高级", formPlural: "名词复数", formLemma: "原型词", formLemmaForm: "原型词的词形", formUnknown: "词形变化",
    british: "英", american: "美", britishPronunciation: "播放英式发音", americanPronunciation: "播放美式发音", localMark: "本地", onlineMark: "在线", structuredSource: "来自 {source} 的结构化释义",
    examples: "双语例句", phrases: "相关短语", simpleYoudao: "简明", collinsYoudao: "柯林斯", collinsMeaning: "柯林斯释义", showMore: "查看更多", showLess: "收起",
    noMatch: "没有找到完全匹配的结果", startWord: "从一个词开始", localEmpty: "可以试试更短的词根，或检查拼写。完整 ECDICT 离线词库已随应用提供。", onlineEmpty: "换一个更具体的英文单词，或切换到本地词典继续查询。",
    queryFailed: "这次查询没有完成", retry: "再试一次", loading: "正在轻轻翻阅词页…", databasePreparing: "离线词库正在准备中，请稍后再试。", suggestion: "你是否想查询", inputSuggestions: "输入建议", spellingCorrection: "拼写纠正",
    closeSettings: "关闭设置窗口", appearance: "外观", uiLanguage: "界面语言", chinese: "中文（简体）", english: "English", interfaceTheme: "界面主题", interfaceFont: "界面字体", interfaceScale: "界面缩放", interfaceOpacity: "界面透明度", materialBlur: "材质模糊",
    displayedDictionaries: "显示的词典", defaultFour: "默认 4 个", queryCache: "查询缓存", cacheWords: "{count} 个单词", cacheOff: "关闭", reset: "恢复默认", done: "完成", youdaoNote: "在线内容经结构化提取后呈现；释义以原网页为准。", dictionaryNote: "通过无需 API Key 的 Free Dictionary API 查询。", genericOnlineNote: "在线内容经结构化提取后呈现；释义以原网页为准。",
  },
  en: {
    titlebarCaption: "Chinese–English Dictionary", closeWindow: "Close window", minimiseWindow: "Minimise window", maximiseWindow: "Maximise or restore window",
    localSourceTitle: "Local", localSourceSubtitle: "ECDICT · Offline first", youdaoSourceTitle: "Youdao", youdaoSourceSubtitle: "Chinese–English",
    dictionarySourceTitle: "Dictionary", dictionarySourceSubtitle: "Free Dictionary API", vocabularySourceTitle: "Vocabulary.com", vocabularySourceSubtitle: "English learning",
    themeRed: "Red", themeOrange: "Orange", themeYellow: "Yellow", themeGreen: "Green", themeCyan: "Cyan", themeBlue: "Blue", themePurple: "Purple", themeViolet: "Violet", themeBlack: "Black",
    systemDefault: "System default", heroBefore: "Every word, ", heroEmphasis: "clearly understood.", heroCopy: "Chinese–English, offline first. A calm, focused desktop dictionary.",
    openSettings: "Open appearance settings", settingsTitle: "Appearance", settingsCopy: "These preferences stay on this device. The theme colour also styles tabs, buttons, and Fluent scrollbars.",
    settingsCaption: "Appearance", lookupAria: "Dictionary lookup", searchPlaceholder: "Enter English for Chinese, or Chinese for English", searchInputAria: "Look up a word", search: "Search", searchHint: "Chinese definition search and English spelling hints",
    selectSource: "Select a dictionary source", footerLocalFirst: "Local-first dictionary", footerLearning: "Designed for unhurried learning", noDefinition: "No definition available", definition: "Definition", wordForms: "Word forms:",
    formPastTense: "Past tense", formPastParticiple: "Past participle", formPresentParticiple: "Present participle", formThirdPerson: "Third-person singular", formComparative: "Comparative", formSuperlative: "Superlative", formPlural: "Plural", formLemma: "Lemma", formLemmaForm: "Lemma form", formUnknown: "Word form",
    british: "UK", american: "US", britishPronunciation: "Play British pronunciation", americanPronunciation: "Play American pronunciation", localMark: "LOCAL", onlineMark: "ONLINE", structuredSource: "Structured definition from {source}",
    examples: "Bilingual examples", phrases: "Related phrases", simpleYoudao: "Concise", collinsYoudao: "Collins", collinsMeaning: "Collins definitions", showMore: "Show more", showLess: "Show less",
    noMatch: "No exact result found", startWord: "Start with a word", localEmpty: "Try a shorter stem or check the spelling. The complete ECDICT offline dictionary is included.", onlineEmpty: "Try a more specific English word, or switch to the local dictionary.",
    queryFailed: "This lookup did not finish", retry: "Try again", loading: "Turning through the pages…", databasePreparing: "The offline dictionary is getting ready. Please try again shortly.", suggestion: "Did you mean", inputSuggestions: "Suggestions", spellingCorrection: "Spelling correction",
    closeSettings: "Close settings", appearance: "APPEARANCE", uiLanguage: "Interface language", chinese: "Chinese (Simplified)", english: "English", interfaceTheme: "Interface theme", interfaceFont: "Interface font", interfaceScale: "Interface scale", interfaceOpacity: "Interface opacity", materialBlur: "Material blur",
    displayedDictionaries: "Displayed dictionaries", defaultFour: "4 by default", queryCache: "Query cache", cacheWords: "{count} words", cacheOff: "Off", reset: "Reset", done: "Done", youdaoNote: "Online content is presented after structured extraction; refer to the original page for the source wording.", dictionaryNote: "Queried through the Free Dictionary API with no API key.", genericOnlineNote: "Online content is presented after structured extraction; refer to the original page for the source wording.",
  },
} as const;

type CopyKey = keyof typeof copy.zh;

const sources: Array<{ id: SourceId; title: CopyKey; subtitle: CopyKey; icon: string }> = [
  { id: "local", title: "localSourceTitle", subtitle: "localSourceSubtitle", icon: "book" },
  { id: "youdao", title: "youdaoSourceTitle", subtitle: "youdaoSourceSubtitle", icon: "spark" },
  { id: "dictionary", title: "dictionarySourceTitle", subtitle: "dictionarySourceSubtitle", icon: "globe" },
  { id: "vocabulary", title: "vocabularySourceTitle", subtitle: "vocabularySourceSubtitle", icon: "spark" },
];

const themes: Array<{ id: ThemeId; label: CopyKey; color: string }> = [
  { id: "red", label: "themeRed", color: "#df5d68" },
  { id: "orange", label: "themeOrange", color: "#eb8c43" },
  { id: "yellow", label: "themeYellow", color: "#d9a91c" },
  { id: "green", label: "themeGreen", color: "#49a86e" },
  { id: "cyan", label: "themeCyan", color: "#36a8b4" },
  { id: "blue", label: "themeBlue", color: "#4e86d8" },
  { id: "purple", label: "themePurple", color: "#706bdd" },
  { id: "violet", label: "themeViolet", color: "#9a67cd" },
  { id: "black", label: "themeBlack", color: "#22232c" },
];

const SYSTEM_FONT_ID = "system";
const systemFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", Inter, sans-serif';
let fonts: Array<{ id: FontId; label: string }> = [{ id: SYSTEM_FONT_ID, label: "" }];

const SETTINGS_STORAGE_KEY = "aurora-dictionary-display-settings";
const QUERY_CACHE_DATABASE = "aurora-dictionary-query-cache";
const QUERY_CACHE_STORE = "query-results";
const DEFAULT_CACHE_LIMIT = 100;
const defaultSettings: DisplaySettings = {
  theme: "purple",
  language: "zh",
  scale: 1,
  opacity: 88,
  blur: 28,
  font: SYSTEM_FONT_ID,
  enabledSources: ["local", "youdao", "dictionary", "vocabulary"],
  cacheLimit: DEFAULT_CACHE_LIMIT,
};

const fallbackLookup: LocalLookup = {
  query: "",
  sampleData: true,
  suggestions: [],
  entries: [
    {
      word: "serendipity",
      phonetic: "/ˌserənˈdɪpəti/",
      pos: "n.",
      translation: "n. 意外发现珍奇事物的本领；机缘巧合",
      definition: "the faculty or phenomenon of finding valuable things not sought for",
    },
  ],
};

const state: {
  source: SourceId;
  query: string;
  pendingSources: Set<SourceId>;
  sourceErrors: Partial<Record<SourceId, string>>;
  sourceResults: Partial<Record<SourceId, SourceLookupResult>>;
  showSettings: boolean;
  youdaoSection: string;
  expandedContent: Set<string>;
  settings: DisplaySettings;
} = {
  source: "local",
  query: "",
  pendingSources: new Set(),
  sourceErrors: {},
  sourceResults: {},
  showSettings: false,
  youdaoSection: "simple",
  expandedContent: new Set(),
  settings: loadSettings(),
};

let lookupSerial = 0;
let scrollTimer: number | undefined;
let inputSuggestionTimer: number | undefined;
let inputSuggestionSerial = 0;
const rootNode = document.querySelector<HTMLDivElement>("#app");

if (!rootNode) {
  throw new Error("Unable to mount Aurora Dictionary");
}

const root = rootNode;

function t(key: CopyKey): string {
  return copy[state.settings.language][key];
}

function formatText(key: CopyKey, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), t(key));
}

function cacheLimitLabel(limit: number): string {
  return limit === 0 ? t("cacheOff") : formatText("cacheWords", { count: String(limit) });
}

root.addEventListener(
  "scroll",
  (event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.matches(".content-panel")) return;
    root.classList.add("is-scrolling");
    if (scrollTimer) window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => root.classList.remove("is-scrolling"), 720);
  },
  { capture: true, passive: true },
);

function loadSettings(): DisplaySettings {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}") as Partial<DisplaySettings>;
    const theme = themes.some((item) => item.id === stored.theme) ? stored.theme! : defaultSettings.theme;
    const language: UiLanguage = stored.language === "en" ? "en" : "zh";
    const scale = clamp(Number(stored.scale) || defaultSettings.scale, 1, 2);
    const opacity = clamp(Number(stored.opacity) || defaultSettings.opacity, 64, 100);
    const blur = clamp(Number(stored.blur) || defaultSettings.blur, 0, 48);
    const storedCacheLimit = Number(stored.cacheLimit);
    const cacheLimit = Number.isFinite(storedCacheLimit)
      ? clamp(Math.round(storedCacheLimit / 25) * 25, 0, 300)
      : defaultSettings.cacheLimit;
    const font = typeof stored.font === "string" && stored.font.trim() ? stored.font : defaultSettings.font;
    const enabledSources = Array.isArray(stored.enabledSources)
      ? stored.enabledSources.filter((source): source is SourceId => sources.some((item) => item.id === source))
      : [...defaultSettings.enabledSources];
    return {
      theme,
      language,
      scale,
      opacity,
      blur,
      font,
      enabledSources: enabledSources.length ? enabledSources : ["local"],
      cacheLimit,
    };
  } catch {
    return { ...defaultSettings };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function persistSettings(): void {
  const { theme, language, scale, opacity, blur, font, enabledSources, cacheLimit } = state.settings;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme, language, scale, opacity, blur, font, enabledSources, cacheLimit }));
}

function cacheKey(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openQueryCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = window.indexedDB.open(QUERY_CACHE_DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(QUERY_CACHE_STORE)) {
        database.createObjectStore(QUERY_CACHE_STORE, { keyPath: "query" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open query cache"));
  });
}

async function readCachedQuery(query: string): Promise<QueryCacheRecord | null> {
  const key = cacheKey(query);
  if (!key || state.settings.cacheLimit === 0) return null;
  try {
    const database = await openQueryCache();
    const transaction = database.transaction(QUERY_CACHE_STORE, "readonly");
    const done = transactionDone(transaction);
    const record = await requestResult<QueryCacheRecord | undefined>(transaction.objectStore(QUERY_CACHE_STORE).get(key));
    await done;
    database.close();
    if (!record) return null;
    void touchCachedQuery(record.query);
    return record;
  } catch {
    return null;
  }
}

async function touchCachedQuery(query: string): Promise<void> {
  try {
    const database = await openQueryCache();
    const transaction = database.transaction(QUERY_CACHE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(QUERY_CACHE_STORE);
    const record = await requestResult<QueryCacheRecord | undefined>(store.get(query));
    if (record) store.put({ ...record, accessedAt: Date.now() });
    await done;
    database.close();
  } catch {
    // Cache access is optional: lookup remains fully functional without it.
  }
}

async function cacheSourceResults(query: string, results: Partial<Record<SourceId, SourceLookupResult>>): Promise<void> {
  const key = cacheKey(query);
  if (!key || state.settings.cacheLimit === 0 || !Object.keys(results).length) return;
  try {
    const database = await openQueryCache();
    const transaction = database.transaction(QUERY_CACHE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(QUERY_CACHE_STORE);
    const previous = await requestResult<QueryCacheRecord | undefined>(store.get(key));
    store.put({
      query: key,
      accessedAt: Date.now(),
      results: { ...(previous?.results ?? {}), ...results },
    } satisfies QueryCacheRecord);
    await done;
    database.close();
    await trimQueryCache();
  } catch {
    // IndexedDB can be disabled by a host WebView; never let that block a lookup.
  }
}

async function trimQueryCache(): Promise<void> {
  try {
    const database = await openQueryCache();
    const transaction = database.transaction(QUERY_CACHE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(QUERY_CACHE_STORE);
    const records = await requestResult<QueryCacheRecord[]>(store.getAll());
    records
      .sort((left, right) => right.accessedAt - left.accessedAt)
      .slice(state.settings.cacheLimit)
      .forEach((record) => store.delete(record.query));
    await done;
    database.close();
  } catch {
    // Cache maintenance is deliberately best-effort.
  }
}

function applySettings(): void {
  const documentRoot = document.documentElement;
  documentRoot.dataset.theme = state.settings.theme;
  documentRoot.dataset.platform = isWindows() ? "windows" : isMac() ? "macos" : "linux";
  documentRoot.lang = state.settings.language === "zh" ? "zh-CN" : "en";
  documentRoot.style.setProperty("--ui-scale", state.settings.scale.toFixed(2));
  documentRoot.style.setProperty("--surface-opacity", (state.settings.opacity / 100).toFixed(2));
  documentRoot.style.setProperty("--material-blur", `${state.settings.blur}px`);
  const defaultFont = isWindows() ? '"Aurora Windows Chinese", Aptos, Arial, sans-serif' : systemFontStack;
  const font = state.settings.font === SYSTEM_FONT_ID ? defaultFont : `"${state.settings.font.replaceAll('"', "\\\"")}", ${defaultFont}`;
  documentRoot.style.setProperty("--ui-font", font);
  documentRoot.style.setProperty("--word-font", font);
}

function fontOptions(): Array<{ id: FontId; label: string }> {
  const resolvedFonts = fonts.map((font) => (font.id === SYSTEM_FONT_ID ? { ...font, label: t("systemDefault") } : font));
  return resolvedFonts.some((font) => font.id === state.settings.font)
    ? resolvedFonts
    : [...resolvedFonts, { id: state.settings.font, label: state.settings.font }];
}

async function loadSystemFonts(): Promise<void> {
  if (!isTauri() || fonts.length > 1) return;
  try {
    const systemFonts = await getSystemFonts();
    const names = [...new Set(systemFonts.map((font) => font.name.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right, "zh-Hans-CN"),
    );
    fonts = [{ id: SYSTEM_FONT_ID, label: "" }, ...names.map((name) => ({ id: name, label: name }))];
    if (state.showSettings) render();
  } catch {
    // The system default remains available when a platform declines font enumeration.
  }
}

function availableSources(): Array<(typeof sources)[number]> {
  const visible = sources.filter((source) => state.settings.enabledSources.includes(source.id));
  return visible.length ? visible : [sources[0]];
}

function sourceTitle(source: (typeof sources)[number]): string {
  return t(source.title);
}

function sourceSubtitle(source: (typeof sources)[number]): string {
  return t(source.subtitle);
}

function defaultSource(): SourceId {
  const visibleSources = availableSources();
  if (visibleSources.some((source) => source.id === "local")) return "local";
  return visibleSources[0].id;
}

function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function isMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function isWindows(): boolean {
  return /Win/.test(navigator.platform);
}

function isEnglishInput(value: string): boolean {
  return /^[a-z][a-z' -]*$/i.test(value.trim());
}

function clearInputSuggestions(): void {
  const panel = document.querySelector<HTMLElement>("#input-suggestions");
  if (!panel) return;
  panel.hidden = true;
  panel.replaceChildren();
}

function showInputSuggestions(suggestions: LocalSuggestions): void {
  const panel = document.querySelector<HTMLElement>("#input-suggestions");
  if (!panel || !suggestions.suggestions.length) {
    clearInputSuggestions();
    return;
  }
  panel.hidden = false;
  panel.innerHTML = `
    ${suggestions.correction ? `<span class="input-suggestions-label">${escapeHtml(t("spellingCorrection"))}</span>` : ""}
    <div class="input-suggestions-list">
      ${suggestions.suggestions
        .map((word) => `<button type="button" data-input-suggestion="${escapeHtml(word)}"><span>${escapeHtml(word)}</span></button>`)
        .join("")}
    </div>`;
  panel.querySelectorAll<HTMLButtonElement>("[data-input-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      const word = button.dataset.inputSuggestion ?? "";
      if (!word) return;
      inputSuggestionSerial += 1;
      clearInputSuggestions();
      void lookUp(word);
    });
  });
}

function showSubmittedSpellingSuggestions(): void {
  const localResult = state.sourceResults.local;
  if (localResult?.type !== "local" || !localResult.result.suggestions.length) return;
  showInputSuggestions({
    suggestions: localResult.result.suggestions,
    correction: true,
  });
}

function scheduleInputSuggestions(rawValue: string): void {
  if (inputSuggestionTimer) window.clearTimeout(inputSuggestionTimer);
  const query = rawValue.trim();
  const serial = ++inputSuggestionSerial;
  if (!isEnglishInput(query) || query.length < 3) {
    clearInputSuggestions();
    return;
  }
  inputSuggestionTimer = window.setTimeout(async () => {
    try {
      const suggestions = isTauri()
        ? await invoke<LocalSuggestions>("suggest_local_words", { query })
        : {
            suggestions: fallbackLookup.entries
              .map((entry) => entry.word)
              .filter((word) => word.startsWith(query.toLowerCase())),
            correction: false,
          };
      if (serial !== inputSuggestionSerial) return;
      const currentValue = document.querySelector<HTMLInputElement>("#search-input")?.value.trim() ?? "";
      if (currentValue !== query) return;
      showInputSuggestions(suggestions);
    } catch {
      if (serial === inputSuggestionSerial) clearInputSuggestions();
    }
  }, 65);
}

function escapeHtml(value: string | undefined | null): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name: string, size = 18): string {
  const paths: Record<string, string> = {
    book: '<path d="M4.75 4.75A2.75 2.75 0 0 1 7.5 2H19v17H7.5a2.75 2.75 0 0 0-2.75 2.75M4.75 4.75v15.5M19 2h1v19.75H7.5a2.75 2.75 0 0 0-2.75 2.75"/>',
    spark: '<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.2 4.2"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    minus: '<path d="M6 12h12"/>',
    square: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    import: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    check: '<path d="m6 12 3.8 3.8L18.5 7"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10v5M12 7.25h.01"/>',
    copy: '<rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.13 2.13-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.09h-3.01v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.13-2.13.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.03h-.09v-3.01h.09A1.7 1.7 0 0 0 7 9.93a1.7 1.7 0 0 0-.34-1.88L6.6 7.99l2.13-2.13.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.09h3.01v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.13 2.13-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.09v3.01h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
    reset: '<path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.7M20 4v4.7h-4.7"/>',
    key: '<circle cx="8" cy="15" r="3"/><path d="m10.2 12.8 7.1-7.1 2 2-1.5 1.5 1.2 1.2-2.1 2.1-1.2-1.2-2.4 2.4"/>',
    speaker: '<path d="M5 10v4h3l4 3V7l-4 3H5Z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ""}</svg>`;
}

function renderWindowControls(): string {
  if (isMac()) {
    return `
      <div class="mac-controls" aria-label="${escapeHtml(t("titlebarCaption"))}">
        <button class="traffic traffic-close" data-window-action="close" aria-label="${escapeHtml(t("closeWindow"))}">${icon("close", 10)}</button>
        <button class="traffic traffic-minimise" data-window-action="minimise" aria-label="${escapeHtml(t("minimiseWindow"))}">${icon("minus", 10)}</button>
        <button class="traffic traffic-maximise" data-window-action="maximise" aria-label="${escapeHtml(t("maximiseWindow"))}">${icon("arrow", 10)}</button>
      </div>`;
  }
  return `
    <div class="win-controls" aria-label="${escapeHtml(t("titlebarCaption"))}">
      <button data-window-action="minimise" aria-label="${escapeHtml(t("minimiseWindow"))}">${icon("minus", 13)}</button>
      <button data-window-action="maximise" aria-label="${escapeHtml(t("maximiseWindow"))}">${icon("square", 11)}</button>
      <button class="win-close" data-window-action="close" aria-label="${escapeHtml(t("closeWindow"))}">${icon("close", 13)}</button>
    </div>`;
}

function sourceTabs(): string {
  return availableSources()
    .map(
      (source) => `
        <button class="source-tab ${state.source === source.id ? "is-active" : ""}" data-source="${source.id}" type="button">
          <span class="source-tab-title">${escapeHtml(sourceTitle(source))}</span>
          <span class="source-tab-caption">${escapeHtml(sourceSubtitle(source))}</span>
        </button>`,
    )
    .join("");
}

function splitSenses(entry: DictionaryEntry): SenseGroup[] {
  const translation = entry.translation?.trim() || entry.definition?.trim() || t("noDefinition");
  const partPattern = /(?:^|[；;\n])\s*((?:(?:n|v|vt|vi|adj|adv|prep|pron|conj|art|aux|int|num|phr)\.)+)/gi;
  const matches = [...translation.matchAll(partPattern)];
  if (matches.length === 0) {
    return [{ label: entry.pos?.trim() || t("definition"), definitions: splitDefinitions(translation) }];
  }
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? translation.length : translation.length;
    return {
      label: match[1],
      definitions: splitDefinitions(translation.slice(start, end)),
    };
  });
}

function splitDefinitions(value: string): string[] {
  return value
    .split(/[；;\n]/)
    .map((definition) => definition.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseWordForms(exchange: string | undefined): WordForm[] {
  if (!exchange) return [];
  return exchange
    .split("/")
    .map((item) => {
      const separator = item.indexOf(":");
      if (separator <= 0) return null;
      const code = item.slice(0, separator).trim();
      const value = item.slice(separator + 1).trim();
      return code && value ? { code, value } : null;
    })
    .filter((item): item is WordForm => item !== null);
}

function wordFormDescription(code: string): string {
  const descriptions: Record<string, CopyKey> = {
    p: "formPastTense",
    d: "formPastParticiple",
    i: "formPresentParticiple",
    "3": "formThirdPerson",
    r: "formComparative",
    t: "formSuperlative",
    s: "formPlural",
    "0": "formLemma",
    "1": "formLemmaForm",
  };
  return t(descriptions[code] ?? "formUnknown");
}

function wordFormsRow(exchange: string | undefined): string {
  const forms = parseWordForms(exchange);
  if (!forms.length) return "";
  return `
    <div class="word-forms" aria-label="${escapeHtml(t("wordForms"))}">
      <span class="word-forms-label">${escapeHtml(t("wordForms"))}</span>
      <div class="word-forms-list">
        ${forms
          .map(
            (form) => `<span class="word-form-chip" title="${escapeHtml(wordFormDescription(form.code))}"><b>[${escapeHtml(form.code)}]</b><span>${escapeHtml(form.value)}</span></span>`,
          )
          .join("")}
      </div>
    </div>`;
}

function senseCard(group: SenseGroup, contentKey?: string): string {
  const isExpanded = Boolean(contentKey && state.expandedContent.has(contentKey));
  const definitions = contentKey && !isExpanded ? group.definitions.slice(0, 5) : group.definitions;
  const canExpand = Boolean(contentKey && group.definitions.length > 5);
  return `
    <article class="sense-card">
      <header><span>${escapeHtml(group.label)}</span><i></i></header>
      <div class="definition-stack">
        ${definitions
          .map(
            (definition, index) => `
              <div class="definition-pill">
                <span class="definition-number">${String(index + 1).padStart(2, "0")}</span>
                <p>${escapeHtml(definition)}</p>
              </div>`,
          )
          .join("")}
      </div>
      ${canExpand ? contentToggle(contentKey!, isExpanded) : ""}
    </article>`;
}

function contentToggle(contentKey: string, isExpanded: boolean): string {
  return `<button class="show-more-button" type="button" data-expand-content="${escapeHtml(contentKey)}">${isExpanded ? escapeHtml(t("showLess")) : escapeHtml(t("showMore"))}</button>`;
}

function pronunciationRow(
  word: string,
  fallbackPhonetic: string | undefined,
  ukPhonetic: string | undefined,
  usPhonetic: string | undefined,
  ukAudio: string | undefined,
  usAudio: string | undefined,
  stripOuterSlashes = false,
): string {
  const variants = [
    { label: t("british"), name: t("britishPronunciation"), phonetic: ukPhonetic ?? fallbackPhonetic, audio: ukAudio, lang: "en-GB" },
    { label: t("american"), name: t("americanPronunciation"), phonetic: usPhonetic ?? fallbackPhonetic, audio: usAudio, lang: "en-US" },
  ]
    .map((variant) => ({ ...variant, phonetic: displayPhonetic(variant.phonetic, stripOuterSlashes) }))
    .filter((variant): variant is typeof variant & { phonetic: string } => Boolean(variant.phonetic));
  if (!variants.length) return "";

  const encodedWord = encodeURIComponent(word);
  return `
    <div class="pronunciation-row" aria-label="${escapeHtml(`${t("british")} / ${t("american")}`)}">
      ${variants
        .map(
          (variant) => `
            <span class="pronunciation-variant">
              <b>${variant.label}</b>
              <span class="phonetic">${escapeHtml(variant.phonetic)}</span>
              <button type="button" class="pronunciation-play" data-pronounce-word="${encodedWord}" data-pronounce-lang="${variant.lang}" data-pronounce-audio="${encodeURIComponent(variant.audio ?? "")}" aria-label="${escapeHtml(variant.name)}" title="${escapeHtml(variant.name)}">${icon("speaker", 15)}</button>
            </span>`,
        )
        .join("")}
    </div>`;
}

function displayPhonetic(phonetic: string | undefined, stripOuterSlashes: boolean): string | undefined {
  const value = phonetic?.trim();
  if (!value) return undefined;
  if (stripOuterSlashes && value.length > 1 && value.startsWith("/") && value.endsWith("/")) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function entryCard(entry: DictionaryEntry, index: number): string {
  const groups = splitSenses(entry);
  const englishDefinition = entry.definition?.trim();
  return `
    <section class="entry-card" style="--entry-index:${index}">
      <div class="entry-card-head">
        <div>
          <div class="word-line">
            <h2>${escapeHtml(displayHeadword(entry.word))}</h2>
          </div>
          ${pronunciationRow(entry.word, entry.phonetic, entry.ukPhonetic, entry.usPhonetic, entry.ukAudio, entry.usAudio)}
          ${wordFormsRow(entry.exchange)}
        </div>
        <span class="local-mark">${escapeHtml(t("localMark"))}</span>
      </div>
      <div class="sense-grid">${groups.map((group) => senseCard(group)).join("")}</div>
      ${
        englishDefinition && englishDefinition !== entry.translation
          ? `<div class="english-gloss"><span>EN</span><p>${escapeHtml(englishDefinition)}</p></div>`
          : ""
      }
    </section>`;
}

function displayHeadword(word: string): string {
  const dictionaryWord = word.trim();
  const submittedQuery = state.query.trim();
  // When the resolved entry is the word the user searched for, preserve the
  // exact casing they typed instead of imposing dictionary-title casing.
  return submittedQuery && submittedQuery.toLocaleLowerCase() === dictionaryWord.toLocaleLowerCase()
    ? submittedQuery
    : dictionaryWord;
}

function exampleSection(examples: OnlineExample[], contentKey?: string): string {
  if (!examples.length) return "";
  const isExpanded = Boolean(contentKey && state.expandedContent.has(contentKey));
  const visibleExamples = contentKey && !isExpanded ? examples.slice(0, 3) : examples;
  const canExpand = Boolean(contentKey && examples.length > 3);
  return `
    <section class="examples-section" aria-label="${escapeHtml(t("examples"))}">
      <header class="examples-heading"><span>${escapeHtml(t("examples"))}</span><i></i><small>EXAMPLES</small></header>
      <div class="example-stack">
        ${visibleExamples
          .map(
            (example, index) => `
              <article class="example-card">
                <span class="example-number">${String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p class="example-english">${escapeHtml(example.english)}</p>
                  ${example.translation ? `<p class="example-translation">${escapeHtml(example.translation)}</p>` : ""}
                  ${example.source ? `<small class="example-source">${escapeHtml(example.source)}</small>` : ""}
                </div>
              </article>`,
          )
          .join("")}
      </div>
      ${canExpand ? contentToggle(contentKey!, isExpanded) : ""}
    </section>`;
}

function phraseSection(phrases: OnlinePhrase[], contentKey: string): string {
  if (!phrases.length) return "";
  const isExpanded = state.expandedContent.has(contentKey);
  const visiblePhrases = isExpanded ? phrases : phrases.slice(0, 4);
  return `
    <section class="phrases-section" aria-label="${escapeHtml(t("phrases"))}">
      <header class="examples-heading"><span>${escapeHtml(t("phrases"))}</span><i></i><small>PHRASES</small></header>
      <div class="phrase-stack">
        ${visiblePhrases
          .map(
            (phrase, index) => `
              <article class="phrase-card">
                <span class="example-number">${String(index + 1).padStart(2, "0")}</span>
                <div><b>${escapeHtml(phrase.term)}</b>${phrase.translation ? `<p>${escapeHtml(phrase.translation)}</p>` : ""}</div>
              </article>`,
          )
          .join("")}
      </div>
      ${phrases.length > 4 ? contentToggle(contentKey, isExpanded) : ""}
    </section>`;
}

function onlineSourceNote(result: OnlineLookup): string {
  if (result.source === "有道词典") return t("youdaoNote");
  if (result.source === "Dictionary") return t("dictionaryNote");
  return t("genericOnlineNote");
}

function displayResultSource(source: string): string {
  if (source === "有道词典") return sourceTitle(sources.find((item) => item.id === "youdao")!);
  if (source === "Dictionary") return sourceTitle(sources.find((item) => item.id === "dictionary")!);
  if (source === "Vocabulary.com") return sourceTitle(sources.find((item) => item.id === "vocabulary")!);
  return source;
}

function youdaoSectionLabel(id: string): string {
  return id === "collins" ? t("collinsYoudao") : t("simpleYoudao");
}

function activeOnlineSection(result: OnlineLookup): OnlineContentSection | null {
  if (!result.sections.length) return null;
  return result.sections.find((section) => section.id === state.youdaoSection) ?? result.sections[0];
}

function onlineCard(result: OnlineLookup): string {
  const youdaoSection = state.source === "youdao" ? activeOnlineSection(result) : null;
  const senses = youdaoSection?.senses ?? result.senses;
  const examples = youdaoSection?.examples ?? result.examples;
  const sectionId = youdaoSection?.id;
  return `
    <section class="entry-card online-entry">
      <div class="entry-card-head">
        <div>
          <div class="word-line">
            <h2>${escapeHtml(displayHeadword(result.word))}</h2>
          </div>
          ${pronunciationRow(result.word, result.pronunciation, result.ukPhonetic, result.usPhonetic, result.ukAudio, result.usAudio, true)}
          <p class="source-credit">${escapeHtml(formatText("structuredSource", { source: displayResultSource(result.source) }))}</p>
        </div>
        <span class="online-mark">${escapeHtml(t("onlineMark"))}</span>
      </div>
      ${
        result.sections.length && state.source === "youdao"
          ? `<div class="youdao-tabs" role="tablist" aria-label="${escapeHtml(result.source)}">${result.sections
              .map(
                (section) => `<button type="button" role="tab" data-youdao-section="${escapeHtml(section.id)}" aria-selected="${section.id === sectionId}" class="youdao-tab ${section.id === sectionId ? "is-active" : ""}">${escapeHtml(youdaoSectionLabel(section.id))}</button>`,
              )
              .join("")}</div>`
          : ""
      }
      <div class="sense-grid">${senses
        .map((sense, index) => senseCard({ label: sense.partOfSpeech === "Collins" ? t("collinsMeaning") : sense.partOfSpeech, definitions: sense.definitions }, sectionId ? `${sectionId}:sense:${index}` : undefined))
        .join("")}</div>
      ${youdaoSection ? phraseSection(youdaoSection.phrases, `${sectionId}:phrases`) : ""}
      ${exampleSection(examples, sectionId ? `${sectionId}:examples` : undefined)}
      ${
        result.note
          ? `<div class="source-note">${icon("info", 16)}<span>${escapeHtml(onlineSourceNote(result))}</span></div>`
          : ""
      }
    </section>`;
}

function emptyState(): string {
  const isLocal = state.source === "local";
  const title = state.query ? t("noMatch") : t("startWord");
  const body = isLocal
    ? t("localEmpty")
    : t("onlineEmpty");
  return `
    <div class="empty-state">
      <div class="empty-orbit"><span></span>${icon(isLocal ? "book" : "globe", 28)}</div>
      <h2>${title}</h2>
      <p>${body}</p>
    </div>`;
}

function errorState(error: string): string {
  return `
    <div class="error-state">
      <div class="error-icon">${icon("info", 22)}</div>
      <div><h2>${escapeHtml(t("queryFailed"))}</h2><p>${escapeHtml(error)}</p></div>
      <button class="secondary-button" data-retry>${escapeHtml(t("retry"))}</button>
    </div>`;
}

function resultArea(): string {
  const result = state.sourceResults[state.source];
  const isLoading = state.pendingSources.has(state.source);
  const error = state.sourceErrors[state.source];
  if (isLoading && !result) {
    return `
      <div class="loading-state">
        <div class="aurora-loader"><i></i><i></i><i></i></div>
        <p>${escapeHtml(t("loading"))}</p>
      </div>`;
  }
  if (error && !result) return errorState(error);

  if (result?.type === "local") {
    const localResult = result.result;
    if (!localResult.entries.length) return emptyState();
    return `
      ${
        localResult.sampleData
          ? `<div class="sample-banner">${icon("info", 16)}<span>${escapeHtml(t("databasePreparing"))}</span></div>`
          : ""
      }
      <div class="entries">${localResult.entries.map(entryCard).join("")}</div>`;
  }
  return result?.type === "online" ? `<div class="entries">${onlineCard(result.result)}</div>` : emptyState();
}

function settingsModal(): string {
  if (!state.showSettings) return "";
  const settings = state.settings;
  return `
    <div class="modal-scrim" data-close-settings>
      <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button class="modal-close" data-close-settings aria-label="${escapeHtml(t("closeSettings"))}">${icon("close", 18)}</button>
        <div class="modal-icon settings-icon">${icon("settings", 23)}</div>
        <p class="eyebrow">${escapeHtml(t("appearance"))}</p>
        <h2 id="settings-title">${escapeHtml(t("settingsTitle"))}</h2>
        <p class="modal-copy">${escapeHtml(t("settingsCopy"))}</p>
        <section class="settings-section font-section language-section">
          <label class="settings-label" for="ui-language"><span>${escapeHtml(t("uiLanguage"))}</span><small>${escapeHtml(state.settings.language === "zh" ? t("chinese") : t("english"))}</small></label>
          <div class="native-select-wrap">
            <select id="ui-language" class="settings-select" aria-label="${escapeHtml(t("uiLanguage"))}">
              <option value="zh" ${settings.language === "zh" ? "selected" : ""}>${escapeHtml(t("chinese"))}</option>
              <option value="en" ${settings.language === "en" ? "selected" : ""}>${escapeHtml(t("english"))}</option>
            </select>
          </div>
        </section>
        <section class="settings-section">
          <div class="settings-label"><span>${escapeHtml(t("interfaceTheme"))}</span><small>${escapeHtml(t(themes.find((item) => item.id === settings.theme)?.label ?? "themePurple"))}</small></div>
          <div class="theme-grid" role="radiogroup" aria-label="${escapeHtml(t("interfaceTheme"))}">
            ${themes
              .map(
                (theme) => `
                  <button class="theme-swatch ${settings.theme === theme.id ? "is-selected" : ""}" data-theme-choice="${theme.id}" role="radio" aria-checked="${settings.theme === theme.id}" title="${escapeHtml(t(theme.label))}">
                    <i style="--swatch:${theme.color}"></i><span>${escapeHtml(t(theme.label))}</span>
                  </button>`,
              )
              .join("")}
          </div>
        </section>
        <section class="settings-section font-section">
          <label class="settings-label" for="ui-font"><span>${escapeHtml(t("interfaceFont"))}</span><small>${escapeHtml(fontOptions().find((item) => item.id === settings.font)?.label ?? t("systemDefault"))}</small></label>
          <div class="native-select-wrap">
          <select id="ui-font" class="settings-select" aria-label="${escapeHtml(t("interfaceFont"))}">
            ${fontOptions()
              .map((font) => `<option value="${font.id}" ${settings.font === font.id ? "selected" : ""}>${font.label}</option>`)
              .join("")}
          </select>
          </div>
        </section>
        <section class="settings-section range-section">
          <label class="settings-label" for="ui-scale"><span>${escapeHtml(t("interfaceScale"))}</span><output data-setting-value="scale">${settings.scale.toFixed(2)}×</output></label>
          <input id="ui-scale" class="settings-range" data-display-setting="scale" type="range" min="1" max="2" step="0.05" value="${settings.scale}" />
        </section>
        <section class="settings-section range-section">
          <label class="settings-label" for="ui-opacity"><span>${escapeHtml(t("interfaceOpacity"))}</span><output data-setting-value="opacity">${settings.opacity}%</output></label>
          <input id="ui-opacity" class="settings-range" data-display-setting="opacity" type="range" min="64" max="100" step="1" value="${settings.opacity}" />
        </section>
        <section class="settings-section range-section">
          <label class="settings-label" for="ui-blur"><span>${escapeHtml(t("materialBlur"))}</span><output data-setting-value="blur">${settings.blur}px</output></label>
          <input id="ui-blur" class="settings-range" data-display-setting="blur" type="range" min="0" max="48" step="1" value="${settings.blur}" />
        </section>
        <section class="settings-section range-section">
          <label class="settings-label" for="ui-cache-limit"><span>${escapeHtml(t("queryCache"))}</span><output data-setting-value="cacheLimit">${escapeHtml(cacheLimitLabel(settings.cacheLimit))}</output></label>
          <input id="ui-cache-limit" class="settings-range" data-display-setting="cacheLimit" type="range" min="0" max="300" step="25" value="${settings.cacheLimit}" />
        </section>
        <section class="settings-section source-settings-section">
          <div class="settings-label"><span>${escapeHtml(t("displayedDictionaries"))}</span><small>${escapeHtml(t("defaultFour"))}</small></div>
          <div class="source-settings-grid">
            ${sources
              .map(
                (source) => `
                  <label class="source-setting-option">
                    <input type="checkbox" data-source-enabled="${source.id}" ${settings.enabledSources.includes(source.id) ? "checked" : ""} />
                    <span class="source-setting-check">${icon("check", 13)}</span>
                    <span><b>${escapeHtml(sourceTitle(source))}</b><small>${escapeHtml(sourceSubtitle(source))}</small></span>
                  </label>`,
              )
              .join("")}
          </div>
        </section>
        <div class="modal-actions settings-actions">
          <button class="quiet-button" data-reset-settings>${escapeHtml(t("reset"))}</button>
          <button class="primary-button" data-close-settings>${escapeHtml(t("done"))}</button>
        </div>
      </section>
    </div>`;
}

function render(preserveScroll = true): void {
  const previousScrollTop = preserveScroll ? (document.querySelector<HTMLElement>(".content-panel")?.scrollTop ?? 0) : 0;
  const active = availableSources().find((source) => source.id === state.source) ?? availableSources()[0];
  root.innerHTML = `
    <div class="app-shell">
      <header class="titlebar">
        ${isMac() ? renderWindowControls() : ""}
        <div class="titlebar-drag-area" data-titlebar-drag data-tauri-drag-region>
          <div class="brand">
            <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
            <span>Aurora <em>Dict</em></span>
          </div>
          <div class="titlebar-caption">${escapeHtml(t("titlebarCaption"))}</div>
        </div>
        ${isMac() ? "" : renderWindowControls()}
      </header>
      <div class="content-panel">
      <main>
        <section class="hero">
          <div>
            <p class="eyebrow">SLOW LOOKUP · FAST ANSWER</p>
            <h1>${escapeHtml(t("heroBefore"))}<em>${escapeHtml(t("heroEmphasis"))}</em></h1>
            <p class="hero-copy">${escapeHtml(t("heroCopy"))}</p>
          </div>
          <button class="hero-orb settings-trigger" data-open-settings type="button" aria-label="${escapeHtml(t("openSettings"))}" title="${escapeHtml(t("openSettings"))}"><div class="orb-shine"></div><span>Aa</span><small>${escapeHtml(t("settingsCaption"))}</small></button>
        </section>
        <section class="lookup-zone" aria-label="${escapeHtml(t("lookupAria"))}">
          <form class="search-box" id="search-form">
            <span class="search-icon">${icon("search", 22)}</span>
            <input id="search-input" value="${escapeHtml(state.query)}" autocomplete="off" autofocus placeholder="${escapeHtml(t("searchPlaceholder"))}" aria-label="${escapeHtml(t("searchInputAria"))}" />
            <button class="search-submit" type="submit">${escapeHtml(t("search"))}</button>
            <div class="input-suggestions" id="input-suggestions" role="listbox" aria-label="${escapeHtml(t("inputSuggestions"))}" hidden></div>
          </form>
          <div class="search-hint"><span></span><span>${escapeHtml(t("searchHint"))}</span><kbd>↵</kbd></div>
        </section>
        <section class="source-section" aria-label="${escapeHtml(t("selectSource"))}">
          <div class="source-switcher">${sourceTabs()}</div>
          <div class="active-source-line"><span class="active-dot"></span><span>${escapeHtml(sourceTitle(active))}</span><i></i><span>${escapeHtml(sourceSubtitle(active))}</span></div>
        </section>
        <section class="results-stage" aria-live="polite">${resultArea()}</section>
      </main>
      <footer><span class="footer-pulse"></span><span>${escapeHtml(t("footerLocalFirst"))}</span><i></i><span>${escapeHtml(t("footerLearning"))}</span></footer>
      </div>
    </div>
    ${settingsModal()}`;
  const contentPanel = document.querySelector<HTMLElement>(".content-panel");
  if (contentPanel) contentPanel.scrollTop = previousScrollTop;
  bindEvents();
}

function bindEvents(): void {
  document.querySelector<HTMLFormElement>("#search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>("#search-input");
    void lookUp(input?.value ?? state.query);
  });
  document.querySelector<HTMLInputElement>("#search-input")?.addEventListener("input", (event) => {
    scheduleInputSuggestions((event.target as HTMLInputElement).value);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = button.dataset.source as SourceId;
      if (source !== state.source) {
        state.source = source;
        state.youdaoSection = "simple";
        state.expandedContent.clear();
        render();
        if (state.query.trim()) void ensureSourceLookup(source, state.query);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-window-action]").forEach((button) => {
    button.addEventListener("click", () => void controlWindow(button.dataset.windowAction));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-open-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      state.showSettings = true;
      render();
      void loadSystemFonts();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-close-settings]").forEach((element) => {
    element.addEventListener("click", () => {
      state.showSettings = false;
      if (!availableSources().some((source) => source.id === state.source)) {
        state.source = availableSources()[0].id;
      }
      render();
    });
  });
  document.querySelector<HTMLElement>(".settings-modal")?.addEventListener("click", (event) => event.stopPropagation());
  document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.theme = button.dataset.themeChoice as ThemeId;
      applySettings();
      persistSettings();
      render();
    });
  });
  document.querySelectorAll<HTMLInputElement>("[data-display-setting]").forEach((input) => {
    input.addEventListener("input", () => {
      const setting = input.dataset.displaySetting;
      const value = Number(input.value);
      if (setting === "scale") state.settings.scale = value;
      if (setting === "opacity") state.settings.opacity = value;
      if (setting === "blur") state.settings.blur = value;
      if (setting === "cacheLimit") state.settings.cacheLimit = value;
      applySettings();
      persistSettings();
      if (setting === "cacheLimit") void trimQueryCache();
      const output = document.querySelector<HTMLOutputElement>(`[data-setting-value="${setting}"]`);
      if (output) {
        const displayValue = setting === "scale" ? `${value.toFixed(2)}×` : setting === "opacity" ? `${value}%` : setting === "blur" ? `${value}px` : cacheLimitLabel(value);
        output.value = displayValue;
        output.textContent = displayValue;
      }
    });
  });
  document.querySelector<HTMLSelectElement>("#ui-font")?.addEventListener("change", (event) => {
    state.settings.font = (event.target as HTMLSelectElement).value as FontId;
    applySettings();
    persistSettings();
    render(false);
  });
  document.querySelector<HTMLSelectElement>("#ui-language")?.addEventListener("change", (event) => {
    state.settings.language = (event.target as HTMLSelectElement).value === "en" ? "en" : "zh";
    applySettings();
    persistSettings();
    render();
  });
  document.querySelectorAll<HTMLInputElement>("[data-source-enabled]").forEach((input) => {
    input.addEventListener("change", () => {
      const source = input.dataset.sourceEnabled as SourceId;
      state.settings.enabledSources = input.checked
        ? [...new Set([...state.settings.enabledSources, source])]
        : state.settings.enabledSources.filter((item) => item !== source);
      const visible = availableSources();
      if (!visible.some((item) => item.id === state.source)) {
        state.source = visible[0].id;
      }
      persistSettings();
      render();
    });
  });
  document.querySelector<HTMLButtonElement>("[data-reset-settings]")?.addEventListener("click", () => {
    state.settings = { ...defaultSettings };
    applySettings();
    persistSettings();
    void trimQueryCache();
    render();
  });
  document.querySelector<HTMLButtonElement>("[data-retry]")?.addEventListener("click", () => void lookUp(state.query));
  document.querySelectorAll<HTMLButtonElement>("[data-pronounce-word]").forEach((button) => {
    button.addEventListener("click", () => {
      const word = decodeURIComponent(button.dataset.pronounceWord ?? "");
      const audioUrl = decodeURIComponent(button.dataset.pronounceAudio ?? "");
      void playPronunciation(word, button.dataset.pronounceLang ?? "en-US", audioUrl);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-youdao-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.youdaoSection = button.dataset.youdaoSection ?? "simple";
      render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-expand-content]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.expandContent;
      if (!key) return;
      if (state.expandedContent.has(key)) state.expandedContent.delete(key);
      else state.expandedContent.add(key);
      render();
    });
  });
  document.querySelector<HTMLElement>("[data-titlebar-drag]")?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !isTauri()) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, input, select, a")) return;
    event.preventDefault();
    void getCurrentWindow().startDragging().catch(() => undefined);
  });
}

async function playPronunciation(word: string, language: string, audioUrl: string): Promise<void> {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    try {
      await audio.play();
      return;
    } catch {
      // A remote audio host can decline a request. Fall back to the system voice below.
    }
  }
  if (!("speechSynthesis" in window) || !word) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = language;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language.toLowerCase())) ?? null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function controlWindow(action: string | undefined): Promise<void> {
  if (!isTauri()) return;
  const appWindow = getCurrentWindow();
  if (action === "close") await appWindow.close();
  if (action === "minimise") await appWindow.minimize();
  if (action === "maximise") await appWindow.toggleMaximize();
}

async function fetchSourceLookup(source: SourceId, query: string): Promise<SourceLookupResult> {
  if (source === "local") {
    if (isTauri()) {
      return { type: "local", result: await invoke<LocalLookup>("lookup_local", { query }) };
    }
    return {
      type: "local",
      result: query.toLowerCase() === "serendipity" ? fallbackLookup : { ...fallbackLookup, query, entries: [], suggestions: [] },
    };
  }
  return {
    type: "online",
    result: await invoke<OnlineLookup>("lookup_online", { provider: source, query }),
  };
}

async function ensureSourceLookup(source: SourceId, rawQuery: string): Promise<void> {
  const query = rawQuery.trim();
  if (state.sourceResults[source] || state.pendingSources.has(source)) return;
  const serial = lookupSerial;
  delete state.sourceErrors[source];
  state.pendingSources.add(source);
  if (source === state.source) render();
  try {
    const result = await fetchSourceLookup(source, query);
    if (serial !== lookupSerial) return;
    state.sourceResults[source] = result;
    const cached: Partial<Record<SourceId, SourceLookupResult>> = {};
    cached[source] = result;
    void cacheSourceResults(query, cached);
  } catch (error) {
    if (serial === lookupSerial) state.sourceErrors[source] = error instanceof Error ? error.message : String(error);
  } finally {
    if (serial === lookupSerial) {
      state.pendingSources.delete(source);
      if (source === state.source) render();
      if (source === "local") showSubmittedSpellingSuggestions();
    }
  }
}

async function lookUp(rawQuery: string): Promise<void> {
  inputSuggestionSerial += 1;
  if (inputSuggestionTimer) window.clearTimeout(inputSuggestionTimer);
  const query = rawQuery.trim();
  const serial = ++lookupSerial;
  if (!query) {
    state.query = "";
    state.youdaoSection = "simple";
    state.expandedContent.clear();
    state.sourceErrors = {};
    state.sourceResults = {};
    state.pendingSources = new Set();
    render(false);
    return;
  }
  const sourceIds = availableSources().map((source) => source.id);
  state.query = query;
  state.youdaoSection = "simple";
  state.expandedContent.clear();
  state.sourceErrors = {};
  state.sourceResults = {};
  state.pendingSources = new Set(sourceIds);
  render(false);

  const cached = await readCachedQuery(query);
  if (serial !== lookupSerial) return;
  if (cached) {
    sourceIds.forEach((source) => {
      const result = cached.results[source];
      if (result) state.sourceResults[source] = result;
    });
  }

  const missingSources = sourceIds.filter((source) => !state.sourceResults[source]);
  state.pendingSources = new Set(missingSources);
  render();
  showSubmittedSpellingSuggestions();

  const successfulResults: Partial<Record<SourceId, SourceLookupResult>> = {};
  await Promise.all(
    missingSources.map(async (source) => {
      try {
        const result = await fetchSourceLookup(source, query);
        if (serial !== lookupSerial) return;
        state.sourceResults[source] = result;
        successfulResults[source] = result;
      } catch (error) {
        if (serial === lookupSerial) state.sourceErrors[source] = error instanceof Error ? error.message : String(error);
      } finally {
        if (serial === lookupSerial) {
          state.pendingSources.delete(source);
          // Background dictionaries are preloaded and cached without disturbing
          // the card the user is currently reading.
          if (source === state.source) render();
          if (source === "local") showSubmittedSpellingSuggestions();
        }
      }
    }),
  );
  if (serial === lookupSerial && Object.keys(successfulResults).length) {
    void cacheSourceResults(query, successfulResults);
  }
}

async function initialiseApp(): Promise<void> {
  state.source = defaultSource();
  render();
  // Prepare the local database and its type-ahead index as soon as the window
  // is usable, so the first three-character suggestion is not a cold start.
  if (isTauri()) void invoke<DictionaryStatus>("dictionary_status").catch(() => undefined);
}

applySettings();
void initialiseApp();
