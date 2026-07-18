import "./style.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getSystemFonts } from "tauri-plugin-system-fonts-api";

type SourceId = "local" | "local_llm" | "youdao" | "dictionary" | "vocabulary";
type ThemeId = "purple" | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "violet" | "black";
type UiLanguage = "zh" | "en";
type FontId = string;
type LocalModelId = "qwen3-0.6b" | "qwen3-1.7b" | "qwen3-4b";
type DownloadSourceId = "mirror" | "official";
type PanelId = "dictionary" | "translation" | "settings";
type SettingsTabId = "appearance" | "dictionary" | "software";

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

interface LlmLookup {
  word: string;
  modelId: LocalModelId;
  modelName: string;
  content: string;
  note: string;
  promptFingerprint?: string;
}

interface LlmTranslation {
  source: string;
  translation: string;
  modelId: LocalModelId;
  modelName: string;
  note: string;
}

interface LlmModelStatus {
  modelId: LocalModelId;
  installed: boolean;
  sizeBytes: number;
}

interface LlmStatus {
  engineAvailable: boolean;
  message: string;
  models: LlmModelStatus[];
}

interface DownloadProgress {
  modelId: LocalModelId;
  downloadedBytes: number;
  totalBytes?: number;
  complete: boolean;
}

interface LlmActionError {
  modelId: LocalModelId;
  message: string;
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
  font: FontId;
  enabledSources: SourceId[];
  sourceOrder: SourceId[];
  localModel: LocalModelId;
  llmDownloadSource: DownloadSourceId;
  dictionarySystemPrompt: string;
  translationSystemPrompt: string;
  cacheLimit: number;
}

type SourceLookupResult =
  | { type: "local"; result: LocalLookup }
  | { type: "llm"; result: LlmLookup }
  | { type: "online"; result: OnlineLookup };

interface QueryCacheRecord {
  query: string;
  accessedAt: number;
  results: Partial<Record<SourceId, SourceLookupResult>>;
}

const copy = {
  zh: {
    titlebarCaption: "中英词典", closeWindow: "关闭窗口", minimiseWindow: "最小化窗口", maximiseWindow: "最大化或还原窗口",
    localSourceTitle: "本地查询", localSourceSubtitle: "ECDICT · 离线优先", localLlmSourceTitle: "本地 AI", localLlmSourceSubtitle: "Qwen · 离线解释", youdaoSourceTitle: "有道词典", youdaoSourceSubtitle: "中英双向",
    dictionarySourceTitle: "Dictionary", dictionarySourceSubtitle: "Free Dictionary API", vocabularySourceTitle: "Vocabulary.com", vocabularySourceSubtitle: "英语学习",
    themeRed: "赤", themeOrange: "橙", themeYellow: "黄", themeGreen: "绿", themeCyan: "青", themeBlue: "蓝", themePurple: "紫", themeViolet: "罗兰", themeBlack: "黑",
    systemDefault: "系统默认", heroBefore: "让每一个词，", heroEmphasis: "恰好被理解。", heroCopy: "中英双向、离线优先。一个安静而专注的桌面字典。",
    openSettings: "打开应用设置", settingsTitle: "设置", settingsCopy: "外观与词典偏好仅保存在这台设备。界面固定采用高不透明度的 Mica 材质，以保持阅读清晰。",
    settingsCaption: "显示设置", lookupAria: "词典查询", searchPlaceholder: "输入英文查中文，输入中文查英文", searchInputAria: "查询单词", search: "查询", searchHint: "支持中文释义检索、英文拼写提示",
    selectSource: "选择词典来源", footerLocalFirst: "离线优先字典", footerLearning: "为从容学习而设计", noDefinition: "暂无释义", definition: "释义", wordForms: "词形式变化：",
    formPastTense: "过去式", formPastParticiple: "过去分词", formPresentParticiple: "现在分词", formThirdPerson: "第三人称单数", formComparative: "比较级", formSuperlative: "最高级", formPlural: "名词复数", formLemma: "原型词", formLemmaForm: "原型词的词形", formUnknown: "词形变化",
    british: "英", american: "美", britishPronunciation: "播放英式发音", americanPronunciation: "播放美式发音", localMark: "本地", onlineMark: "在线", structuredSource: "来自 {source} 的结构化释义",
    examples: "双语例句", phrases: "相关短语", simpleYoudao: "简明", collinsYoudao: "柯林斯", collinsMeaning: "柯林斯释义", showMore: "查看更多", showLess: "收起",
    noMatch: "没有找到完全匹配的结果", startWord: "从一个词开始", localEmpty: "可以试试更短的词根，或检查拼写。完整 ECDICT 离线词库已随应用提供。", onlineEmpty: "换一个更具体的英文单词，或切换到本地词典继续查询。",
    queryFailed: "这次查询没有完成", retry: "再试一次", loading: "正在轻轻翻阅词页…", databasePreparing: "离线词库正在准备中，请稍后再试。", suggestion: "你是否想查询", inputSuggestions: "输入建议", spellingCorrection: "拼写纠正",
    closeSettings: "关闭设置窗口", appearance: "外观", dictionarySettings: "字典", softwareInformation: "软件信息", uiLanguage: "界面语言", chinese: "中文（简体）", english: "English", interfaceTheme: "界面主题", interfaceFont: "界面字体", interfaceScale: "界面缩放", home: "主页", translation: "翻译", translationTitle: "本地 AI 翻译", translationCopy: "使用当前选择的本地模型，在设备上完成中英翻译。", translationPlaceholder: "输入需要翻译的中文或英文文本", translate: "翻译", translationResult: "译文", translationEmpty: "输入文本后，即可获得本地 AI 翻译。", backToDictionary: "返回词典", localAiPromptSettings: "本地 AI 提示词", localAiPromptHint: "修改后会用于下一次本地 AI 查询；留空将恢复系统默认提示词。", dictionarySystemPrompt: "词典查询提示词", translationSystemPrompt: "中英翻译提示词", restoreDefaultPrompt: "恢复默认",
    displayedDictionaries: "显示的词典", defaultFour: "拖动右侧手柄调整 Tab 顺序", cacheStorage: "缓存存储", cacheWords: "{count} 个查询结果", localAiModels: "本地 AI 模型", localAiModelsHint: "选择 Local LLM 默认使用的模型", modelDownloadSource: "模型下载地址", mirrorDownloadSource: "中国大陆镜像 · hf-mirror.com", officialDownloadSource: "官方地址 · huggingface.co", mirrorDownloadHint: "中国大陆用户建议关闭代理，使用镜像地址加速下载。", localModelReadyLater: "推理引擎随应用提供；模型按需下载到这台设备。", modelRecommended: "推荐", modelLightweight: "轻量 · 查询更快", modelBalanced: "均衡 · 解释更完整", modelHighQuality: "高质量 · 需要更好的硬件", qwen3_0_6bDescription: "日常查词与双语解释的默认选择。", qwen3_1_7bDescription: "更适合词义辨析、例句和搭配说明。", qwen3_4bDescription: "提供更丰富的语言解释，适合性能较好的设备。", modelDownloaded: "模型已下载", downloadModel: "下载模型", downloadingModel: "正在下载", connectingDownload: "正在连接下载源", deleteModel: "删除模型", localAiUnavailable: "本地 AI 引擎不可用，请重新安装 Aurora Dict。", localAiGenerated: "本地 AI 生成", localAiNote: "内容由本地 AI 模型生成，仅供语言学习参考。", reset: "恢复默认", done: "完成", author: "作者", contact: "联系方式", homepage: "个人主页", supportAuthor: "支持作者", supportMessage: "创作不易，如果您觉得该软件对您的工作学习有所帮助，请考虑打赏作者支持他继续完善该工具。", wechatPay: "微信", alipayPay: "支付宝", license: "使用许可", licenseText: "本软件可免费用于个人学习、教学、研究与非营利交流。任何商业使用、再分发或将其用于营利性服务前，均须事先获得作者书面同意。", youdaoNote: "在线内容经结构化提取后呈现；释义以原网页为准。", dictionaryNote: "通过无需 API Key 的 Free Dictionary API 查询。", genericOnlineNote: "在线内容经结构化提取后呈现；释义以原网页为准。",
  },
  en: {
    titlebarCaption: "Chinese–English Dictionary", closeWindow: "Close window", minimiseWindow: "Minimise window", maximiseWindow: "Maximise or restore window",
    localSourceTitle: "Local", localSourceSubtitle: "ECDICT · Offline first", localLlmSourceTitle: "Local LLM", localLlmSourceSubtitle: "Qwen · Offline explanation", youdaoSourceTitle: "Youdao", youdaoSourceSubtitle: "Chinese–English",
    dictionarySourceTitle: "Dictionary", dictionarySourceSubtitle: "Free Dictionary API", vocabularySourceTitle: "Vocabulary.com", vocabularySourceSubtitle: "English learning",
    themeRed: "Red", themeOrange: "Orange", themeYellow: "Yellow", themeGreen: "Green", themeCyan: "Cyan", themeBlue: "Blue", themePurple: "Purple", themeViolet: "Violet", themeBlack: "Black",
    systemDefault: "System default", heroBefore: "Every word, ", heroEmphasis: "clearly understood.", heroCopy: "Chinese–English, offline first. A calm, focused desktop dictionary.",
    openSettings: "Open application settings", settingsTitle: "Settings", settingsCopy: "Appearance and dictionary preferences stay on this device. A high-opacity Mica material is used throughout to keep reading clear.",
    settingsCaption: "Appearance", lookupAria: "Dictionary lookup", searchPlaceholder: "Enter English for Chinese, or Chinese for English", searchInputAria: "Look up a word", search: "Search", searchHint: "Chinese definition search and English spelling hints",
    selectSource: "Select a dictionary source", footerLocalFirst: "Local-first dictionary", footerLearning: "Designed for unhurried learning", noDefinition: "No definition available", definition: "Definition", wordForms: "Word forms:",
    formPastTense: "Past tense", formPastParticiple: "Past participle", formPresentParticiple: "Present participle", formThirdPerson: "Third-person singular", formComparative: "Comparative", formSuperlative: "Superlative", formPlural: "Plural", formLemma: "Lemma", formLemmaForm: "Lemma form", formUnknown: "Word form",
    british: "UK", american: "US", britishPronunciation: "Play British pronunciation", americanPronunciation: "Play American pronunciation", localMark: "LOCAL", onlineMark: "ONLINE", structuredSource: "Structured definition from {source}",
    examples: "Bilingual examples", phrases: "Related phrases", simpleYoudao: "Concise", collinsYoudao: "Collins", collinsMeaning: "Collins definitions", showMore: "Show more", showLess: "Show less",
    noMatch: "No exact result found", startWord: "Start with a word", localEmpty: "Try a shorter stem or check the spelling. The complete ECDICT offline dictionary is included.", onlineEmpty: "Try a more specific English word, or switch to the local dictionary.",
    queryFailed: "This lookup did not finish", retry: "Try again", loading: "Turning through the pages…", databasePreparing: "The offline dictionary is getting ready. Please try again shortly.", suggestion: "Did you mean", inputSuggestions: "Suggestions", spellingCorrection: "Spelling correction",
    closeSettings: "Close settings", appearance: "Appearance", dictionarySettings: "Dictionary", softwareInformation: "Software information", uiLanguage: "Interface language", chinese: "Chinese (Simplified)", english: "English", interfaceTheme: "Interface theme", interfaceFont: "Interface font", interfaceScale: "Interface scale", home: "Home", translation: "Translate", translationTitle: "Local AI translation", translationCopy: "Translate Chinese and English on this device with the selected local model.", translationPlaceholder: "Enter Chinese or English text to translate", translate: "Translate", translationResult: "Translation", translationEmpty: "Enter text to receive a local AI translation.", backToDictionary: "Back to dictionary", localAiPromptSettings: "Local AI prompts", localAiPromptHint: "Changes apply to the next local AI request. Leaving a prompt empty restores the built-in default.", dictionarySystemPrompt: "Dictionary lookup prompt", translationSystemPrompt: "Chinese–English translation prompt", restoreDefaultPrompt: "Restore default",
    displayedDictionaries: "Displayed dictionaries", defaultFour: "Drag the right-hand grip to order tabs", cacheStorage: "Cache storage", cacheWords: "{count} query results", localAiModels: "Local AI model", localAiModelsHint: "Choose the default model for Local LLM", modelDownloadSource: "Model download source", mirrorDownloadSource: "China mirror · hf-mirror.com", officialDownloadSource: "Official · huggingface.co", mirrorDownloadHint: "Users in mainland China are advised to disable proxies and use the mirror for faster downloads.", localModelReadyLater: "The inference engine is included with the app; download models when needed.", modelRecommended: "Recommended", modelLightweight: "Lightweight · faster lookup", modelBalanced: "Balanced · fuller explanations", modelHighQuality: "High quality · needs stronger hardware", qwen3_0_6bDescription: "The default for everyday lookups and bilingual explanations.", qwen3_1_7bDescription: "Better for sense distinctions, examples, and collocations.", qwen3_4bDescription: "Richer language explanations for more capable devices.", modelDownloaded: "Model downloaded", downloadModel: "Download model", downloadingModel: "Downloading", connectingDownload: "Connecting to download source", deleteModel: "Delete model", localAiUnavailable: "The local AI engine is unavailable. Please reinstall Aurora Dict.", localAiGenerated: "LOCAL AI", localAiNote: "Generated by a local AI model for language-learning reference only.", reset: "Reset", done: "Done", author: "Author", contact: "Contact", homepage: "Homepage", supportAuthor: "Support the author", supportMessage: "Independent software takes time to create. If Aurora Dict helps your work or studies, please consider supporting the author as he continues to improve it.", wechatPay: "WeChat Pay", alipayPay: "Alipay", license: "License", licenseText: "This software is free for personal learning, teaching, research, and non-profit exchange. Prior written permission from the author is required for any commercial use, redistribution, or use in a revenue-generating service.", youdaoNote: "Online content is presented after structured extraction; refer to the original page for the source wording.", dictionaryNote: "Queried through the Free Dictionary API with no API key.", genericOnlineNote: "Online content is presented after structured extraction; refer to the original page for the source wording.",
  },
} as const;

type CopyKey = keyof typeof copy.zh;

const sources: Array<{ id: SourceId; title: CopyKey; subtitle: CopyKey; icon: string }> = [
  { id: "local", title: "localSourceTitle", subtitle: "localSourceSubtitle", icon: "book" },
  { id: "local_llm", title: "localLlmSourceTitle", subtitle: "localLlmSourceSubtitle", icon: "spark" },
  { id: "youdao", title: "youdaoSourceTitle", subtitle: "youdaoSourceSubtitle", icon: "spark" },
  { id: "dictionary", title: "dictionarySourceTitle", subtitle: "dictionarySourceSubtitle", icon: "globe" },
  { id: "vocabulary", title: "vocabularySourceTitle", subtitle: "vocabularySourceSubtitle", icon: "spark" },
];

const localModels: Array<{ id: LocalModelId; name: string; description: CopyKey; footprint: CopyKey; recommended?: boolean }> = [
  { id: "qwen3-0.6b", name: "Qwen3-0.6B", description: "qwen3_0_6bDescription", footprint: "modelLightweight", recommended: true },
  { id: "qwen3-1.7b", name: "Qwen3-1.7B", description: "qwen3_1_7bDescription", footprint: "modelBalanced" },
  { id: "qwen3-4b", name: "Qwen3-4B", description: "qwen3_4bDescription", footprint: "modelHighQuality" },
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
const CACHE_LIMIT_OPTIONS = [50, 100, 200, 500] as const;
const DEFAULT_DICTIONARY_SYSTEM_PROMPT = "你是 Aurora Dict 的离线中英学习词典。用户会提交一个词、短语或极短的中文词组。请仅依据可靠的常见语言知识作答，不编造词源、引文、语料来源或罕见用法。使用简体中文，并严格按以下顺序输出有内容的项目：\n释义：给出核心义项；\n用法：说明词性、典型搭配或语境；\n例句：给出三条简短双语例句；\n易混：仅在确有常见易混词时说明。\n每项不要寒暄、追问、免责声明、思考过程或 Markdown 表格。";
const DEFAULT_TRANSLATION_SYSTEM_PROMPT = "你是 Aurora Dict 的离线中英翻译器。自动识别输入为中文或英文，并翻译为另一种语言。忠实保留段落、项目符号、数字、专有名词、标点和原文语气；不擅自扩写、解释或改写。只输出译文，不要标题、前缀、注释、Markdown 代码围栏或思考过程。";
const defaultSettings: DisplaySettings = {
  theme: "purple",
  language: "zh",
  scale: 1,
  font: SYSTEM_FONT_ID,
  enabledSources: ["local", "local_llm", "youdao", "dictionary"],
  sourceOrder: sources.map((source) => source.id),
  localModel: "qwen3-0.6b",
  llmDownloadSource: "mirror",
  dictionarySystemPrompt: DEFAULT_DICTIONARY_SYSTEM_PROMPT,
  translationSystemPrompt: DEFAULT_TRANSLATION_SYSTEM_PROMPT,
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
  panel: PanelId;
  settingsTab: SettingsTabId;
  youdaoSection: string;
  expandedContent: Set<string>;
  settings: DisplaySettings;
  llmStatus: LlmStatus | null;
  llmDownload: DownloadProgress | null;
  llmActionPending: boolean;
  llmActionError: LlmActionError | null;
  translationInput: string;
  translationResult: LlmTranslation | null;
  translationPending: boolean;
  translationError: string;
} = {
  source: "local",
  query: "",
  pendingSources: new Set(),
  sourceErrors: {},
  sourceResults: {},
  panel: "dictionary",
  settingsTab: "appearance",
  youdaoSection: "simple",
  expandedContent: new Set(),
  settings: loadSettings(),
  llmStatus: null,
  llmDownload: null,
  llmActionPending: false,
  llmActionError: null,
  translationInput: "",
  translationResult: null,
  translationPending: false,
  translationError: "",
};

let lookupSerial = 0;
let scrollTimer: number | undefined;
let inputSuggestionTimer: number | undefined;
let inputSuggestionSerial = 0;
let draggedSource: SourceId | null = null;
let sourceOrderChanged = false;
let sourceOrderHoverTarget: SourceId | null = null;
let llmDownloadRenderFrame: number | undefined;
const rootNode = document.querySelector<HTMLDivElement>("#app");

if (!rootNode) {
  throw new Error("Unable to mount Aurora Dictionary");
}

const root = rootNode;
const appIconUrl = new URL("../src-tauri/icons/icon.png", import.meta.url).href;
const wechatDonationUrl = new URL("../src-tauri/resources/IMG_2816.JPG", import.meta.url).href;
const alipayDonationUrl = new URL("../src-tauri/resources/IMG_2817.JPG", import.meta.url).href;

function t(key: CopyKey): string {
  return copy[state.settings.language][key];
}

function formatText(key: CopyKey, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), t(key));
}

function normaliseCacheLimit(value: number): number {
  return CACHE_LIMIT_OPTIONS.includes(value as (typeof CACHE_LIMIT_OPTIONS)[number]) ? value : DEFAULT_CACHE_LIMIT;
}

function cacheLimitLabel(limit: number): string {
  return formatText("cacheWords", { count: String(limit) });
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
    const scale = clamp(Number(stored.scale) || defaultSettings.scale, 0.5, 2);
    const cacheLimit = normaliseCacheLimit(Number(stored.cacheLimit));
    const font = typeof stored.font === "string" && stored.font.trim() ? stored.font : defaultSettings.font;
    const localModel = localModels.some((model) => model.id === stored.localModel) ? stored.localModel! : defaultSettings.localModel;
    const llmDownloadSource: DownloadSourceId = stored.llmDownloadSource === "official" ? "official" : "mirror";
    const dictionarySystemPrompt = typeof stored.dictionarySystemPrompt === "string" && stored.dictionarySystemPrompt.trim()
      ? stored.dictionarySystemPrompt
      : DEFAULT_DICTIONARY_SYSTEM_PROMPT;
    const translationSystemPrompt = typeof stored.translationSystemPrompt === "string" && stored.translationSystemPrompt.trim()
      ? stored.translationSystemPrompt
      : DEFAULT_TRANSLATION_SYSTEM_PROMPT;
    const storedSources = Array.isArray(stored.enabledSources)
      ? stored.enabledSources.filter((source): source is SourceId => sources.some((item) => item.id === source))
      : [...defaultSettings.enabledSources];
    const legacyDefaultSources = ["local", "youdao", "dictionary", "vocabulary"];
    const enabledSources = legacyDefaultSources.every((source) => storedSources.includes(source as SourceId))
      && storedSources.length === legacyDefaultSources.length
      ? [...defaultSettings.enabledSources]
      : storedSources;
    const storedOrder = Array.isArray(stored.sourceOrder)
      ? stored.sourceOrder.filter((source, index): source is SourceId => sources.some((item) => item.id === source) && stored.sourceOrder!.indexOf(source) === index)
      : [];
    const sourceOrder = [...storedOrder, ...sources.map((source) => source.id).filter((source) => !storedOrder.includes(source))];
    return {
      theme,
      language,
      scale,
      font,
      enabledSources: enabledSources.length ? enabledSources : ["local"],
      sourceOrder,
      localModel,
      llmDownloadSource,
      dictionarySystemPrompt,
      translationSystemPrompt,
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
  const { theme, language, scale, font, enabledSources, sourceOrder, localModel, llmDownloadSource, dictionarySystemPrompt, translationSystemPrompt, cacheLimit } = state.settings;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme, language, scale, font, enabledSources, sourceOrder, localModel, llmDownloadSource, dictionarySystemPrompt, translationSystemPrompt, cacheLimit }));
}

function moveDraggedSourceBefore(target: HTMLElement): void {
  if (!draggedSource || target.dataset.sourceOrder === draggedSource) return;
  const targetSource = target.dataset.sourceOrder as SourceId;
  if (sourceOrderHoverTarget === targetSource) return;
  sourceOrderHoverTarget = targetSource;
  const grid = target.parentElement;
  const dragged = grid?.querySelector<HTMLElement>(`[data-source-order="${draggedSource}"]`);
  if (!grid || !dragged) return;

  const items = [...grid.querySelectorAll<HTMLElement>("[data-source-order]")];
  const draggedIndex = items.indexOf(dragged);
  const targetIndex = items.indexOf(target);
  if (draggedIndex < 0 || targetIndex < 0) return;
  if (draggedIndex < targetIndex) target.after(dragged);
  else target.before(dragged);

  const nextOrder = [...grid.querySelectorAll<HTMLElement>("[data-source-order]")]
    .map((item) => item.dataset.sourceOrder as SourceId)
    .filter((source): source is SourceId => sources.some((item) => item.id === source));
  if (nextOrder.length !== sources.length) return;
  state.settings.sourceOrder = nextOrder;
  sourceOrderChanged = true;
}

function beginSourceOrderDrag(item: HTMLElement): void {
  draggedSource = item.dataset.sourceOrder as SourceId;
  sourceOrderChanged = false;
  sourceOrderHoverTarget = null;
  item.classList.add("is-dragging");
}

function updateSourceOrderDragAtPoint(clientX: number, clientY: number): void {
  if (!draggedSource) return;
  const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-source-order]");
  document.querySelectorAll(".source-setting-option.is-drag-over").forEach((option) => option.classList.remove("is-drag-over"));
  if (!target || target.dataset.sourceOrder === draggedSource) {
    sourceOrderHoverTarget = null;
    return;
  }
  moveDraggedSourceBefore(target);
  target.classList.add("is-drag-over");
}

function finishSourceOrderDrag(): void {
  if (!draggedSource) return;
  draggedSource = null;
  sourceOrderHoverTarget = null;
  if (sourceOrderChanged) {
    sourceOrderChanged = false;
    persistSettings();
    render();
    return;
  }
  document.querySelectorAll(".source-setting-option").forEach((option) => option.classList.remove("is-dragging", "is-drag-over"));
}

function moveSourceByOffset(source: SourceId, offset: -1 | 1): void {
  const currentIndex = state.settings.sourceOrder.indexOf(source);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.settings.sourceOrder.length) return;
  const nextOrder = [...state.settings.sourceOrder];
  nextOrder.splice(currentIndex, 1);
  nextOrder.splice(nextIndex, 0, source);
  state.settings.sourceOrder = nextOrder;
  persistSettings();
  render();
  document.querySelector<HTMLElement>(`[data-source-order="${source}"] [data-source-order-grip]`)?.focus();
}

function cacheKey(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function promptFingerprint(prompt: string, fallback: string): string {
  const content = prompt.trim() || fallback;
  let hash = 2_166_136_261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function localModelStatus(modelId: LocalModelId): LlmModelStatus | undefined {
  return state.llmStatus?.models.find((model) => model.modelId === modelId);
}

function downloadLabel(): string {
  const progress = state.llmDownload;
  if (!progress || progress.complete) return t("downloadingModel");
  if (!progress.totalBytes) return progress.downloadedBytes > 0 ? `${t("downloadingModel")} · ${formatBytes(progress.downloadedBytes)}` : t("connectingDownload");
  return `${t("downloadingModel")} · ${Math.round((progress.downloadedBytes / progress.totalBytes) * 100)}%`;
}

function downloadProgressLabel(progress: DownloadProgress): string {
  if (!progress.totalBytes) return downloadLabel();
  const percent = Math.round(clamp((progress.downloadedBytes / progress.totalBytes) * 100, 0, 100));
  return `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)} · ${percent}%`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function downloadProgressPercent(progress: DownloadProgress): number | null {
  if (!progress.totalBytes || progress.totalBytes <= 0) return null;
  return clamp((progress.downloadedBytes / progress.totalBytes) * 100, 0, 100);
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
  if (!key) return null;
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
  if (!key || !Object.keys(results).length) return;
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
    if (state.panel === "settings") render();
  } catch {
    // The system default remains available when a platform declines font enumeration.
  }
}

function availableSources(): Array<(typeof sources)[number]> {
  const visible = state.settings.sourceOrder
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is (typeof sources)[number] => Boolean(source && state.settings.enabledSources.includes(source.id)));
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
    macZoom: '<path d="M4.75 9V4.75H9M4.75 4.75l5.1 5.1M19.25 15v4.25H15M19.25 19.25l-5.1-5.1"/>',
    import: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    check: '<path d="m6 12 3.8 3.8L18.5 7"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10v5M12 7.25h.01"/>',
    copy: '<rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.13 2.13-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.09h-3.01v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.13-2.13.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.03h-.09v-3.01h.09A1.7 1.7 0 0 0 7 9.93a1.7 1.7 0 0 0-.34-1.88L6.6 7.99l2.13-2.13.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.09h3.01v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.13 2.13-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.09v3.01h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
    reset: '<path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.7M20 4v4.7h-4.7"/>',
    key: '<circle cx="8" cy="15" r="3"/><path d="m10.2 12.8 7.1-7.1 2 2-1.5 1.5 1.2 1.2-2.1 2.1-1.2-1.2-2.4 2.4"/>',
    speaker: '<path d="M5 10v4h3l4 3V7l-4 3H5Z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/>',
    translate: '<path d="M4 5h10M9 3v2m-4 0c.7 3.1 2.3 5.8 4.7 7.8M8.3 10.5c-1.1 1.5-2.5 2.8-4.3 3.8"/><path d="M14 19h6m-3-12 4 12m-8 0 4-12"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ""}</svg>`;
}

// Font Awesome Free 6.7.2 (CC BY 4.0): https://fontawesome.com/license/free
const fontAwesomePaths: Record<"house" | "language" | "gear", { viewBox: string; path: string }> = {
  house: { viewBox: "0 0 576 512", path: "M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z" },
  language: { viewBox: "0 0 640 512", path: "M0 128C0 92.7 28.7 64 64 64l192 0 48 0 16 0 256 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64l-256 0-16 0-48 0L64 448c-35.3 0-64-28.7-64-64L0 128zm320 0l0 256 256 0 0-256-256 0zM178.3 175.9c-3.2-7.2-10.4-11.9-18.3-11.9s-15.1 4.7-18.3 11.9l-64 144c-4.5 10.1 .1 21.9 10.2 26.4s21.9-.1 26.4-10.2l8.9-20.1 73.6 0 8.9 20.1c4.5 10.1 16.3 14.6 26.4 10.2s14.6-16.3 10.2-26.4l-64-144zM160 233.2L179 276l-38 0 19-42.8zM448 164c11 0 20 9 20 20l0 4 44 0 16 0c11 0 20 9 20 20s-9 20-20 20l-2 0-1.6 4.5c-8.9 24.4-22.4 46.6-39.6 65.4c.9 .6 1.8 1.1 2.7 1.6l18.9 11.3c9.5 5.7 12.5 18 6.9 27.4s-18 12.5-27.4 6.9l-18.9-11.3c-4.5-2.7-8.8-5.5-13.1-8.5c-10.6 7.5-21.9 14-34 19.4l-3.6 1.6c-10.1 4.5-21.9-.1-26.4-10.2s.1-21.9 10.2-26.4l3.6-1.6c6.4-2.9 12.6-6.1 18.5-9.8l-12.2-12.2c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l14.6 14.6 .5 .5c12.4-13.1 22.5-28.3 29.8-45L448 228l-72 0c-11 0-20-9-20-20s9-20 20-20l52 0 0-4c0-11 9-20 20-20z" },
  gear: { viewBox: "0 0 512 512", path: "M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z" },
};

function fontAwesomeIcon(name: keyof typeof fontAwesomePaths, size = 18): string {
  const asset = fontAwesomePaths[name];
  return `<svg width="${size}" height="${size}" viewBox="${asset.viewBox}" fill="currentColor" aria-hidden="true"><path d="${asset.path}"/></svg>`;
}

function renderWindowControls(): string {
  if (isMac()) {
    return `
      <div class="mac-controls" aria-label="${escapeHtml(t("titlebarCaption"))}">
        <button class="traffic traffic-close" data-window-action="close" aria-label="${escapeHtml(t("closeWindow"))}">${icon("close", 8)}</button>
        <button class="traffic traffic-minimise" data-window-action="minimise" aria-label="${escapeHtml(t("minimiseWindow"))}">${icon("minus", 8)}</button>
        <button class="traffic traffic-maximise" data-window-action="maximise" aria-label="${escapeHtml(t("maximiseWindow"))}">${icon("macZoom", 8)}</button>
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

function llmCard(result: LlmLookup): string {
  const paragraphs = result.content
    .split(/\n{1,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  return `
    <section class="entry-card llm-entry">
      <div class="entry-card-head">
        <div>
          <div class="word-line"><h2>${escapeHtml(displayHeadword(result.word))}</h2></div>
          <p class="source-credit">${escapeHtml(result.modelName)}</p>
        </div>
        <span class="local-mark">${escapeHtml(t("localAiGenerated"))}</span>
      </div>
      <div class="llm-content">${paragraphs}</div>
      <div class="source-note">${icon("info", 16)}<span>${escapeHtml(result.note || t("localAiNote"))}</span></div>
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
  if (result?.type === "llm") return `<div class="entries">${llmCard(result.result)}</div>`;
  return result?.type === "online" ? `<div class="entries">${onlineCard(result.result)}</div>` : emptyState();
}

function settingsPanel(): string {
  if (state.panel !== "settings") return "";
  const settings = state.settings;
  return `
      <section class="settings-page" aria-labelledby="settings-title">
        <h2 id="settings-title" class="sr-only">${escapeHtml(t("settingsTitle"))}</h2>
        <nav class="settings-tab-switcher" role="tablist" aria-label="${escapeHtml(t("settingsTitle"))}">
          <button class="settings-category-tab ${state.settingsTab === "appearance" ? "is-active" : ""}" data-settings-tab="appearance" type="button" role="tab" aria-selected="${state.settingsTab === "appearance"}"><i class="fa-solid fa-palette" aria-hidden="true"></i><span>${escapeHtml(t("appearance"))}</span></button>
          <button class="settings-category-tab ${state.settingsTab === "dictionary" ? "is-active" : ""}" data-settings-tab="dictionary" type="button" role="tab" aria-selected="${state.settingsTab === "dictionary"}"><i class="fa-solid fa-book" aria-hidden="true"></i><span>${escapeHtml(t("dictionarySettings"))}</span></button>
          <button class="settings-category-tab ${state.settingsTab === "software" ? "is-active" : ""}" data-settings-tab="software" type="button" role="tab" aria-selected="${state.settingsTab === "software"}"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>${escapeHtml(t("softwareInformation"))}</span></button>
        </nav>
        <section class="settings-module settings-card settings-card-first ${state.settingsTab === "appearance" ? "" : "is-hidden"}" role="tabpanel" aria-labelledby="appearance-section-title">
          <h3 id="appearance-section-title" class="settings-module-heading">${escapeHtml(t("appearance"))}</h3>
          <section class="settings-section font-section language-section">
            <label class="settings-label" for="ui-language"><span>${escapeHtml(t("uiLanguage"))}</span><small>${escapeHtml(state.settings.language === "zh" ? t("chinese") : t("english"))}</small></label>
            <div class="native-select-wrap">
              <select id="ui-language" class="settings-select" aria-label="${escapeHtml(t("uiLanguage"))}">
                <option value="zh" ${settings.language === "zh" ? "selected" : ""}>${escapeHtml(t("chinese"))}</option>
                <option value="en" ${settings.language === "en" ? "selected" : ""}>${escapeHtml(t("english"))}</option>
              </select>
            </div>
          </section>
          <section class="settings-section theme-section">
            <div class="settings-label"><span>${escapeHtml(t("interfaceTheme"))}</span><small>${escapeHtml(t(themes.find((item) => item.id === settings.theme)?.label ?? "themePurple"))}</small></div>
            <div class="theme-grid" role="radiogroup" aria-label="${escapeHtml(t("interfaceTheme"))}">
              ${themes.map((theme) => `<button class="theme-swatch ${settings.theme === theme.id ? "is-selected" : ""}" data-theme-choice="${theme.id}" role="radio" aria-checked="${settings.theme === theme.id}" title="${escapeHtml(t(theme.label))}"><i style="--swatch:${theme.color}"></i><span>${escapeHtml(t(theme.label))}</span></button>`).join("")}
            </div>
          </section>
          <section class="settings-section font-section">
            <label class="settings-label" for="ui-font"><span>${escapeHtml(t("interfaceFont"))}</span><small>${escapeHtml(fontOptions().find((item) => item.id === settings.font)?.label ?? t("systemDefault"))}</small></label>
            <div class="native-select-wrap"><select id="ui-font" class="settings-select" aria-label="${escapeHtml(t("interfaceFont"))}">${fontOptions().map((font) => `<option value="${font.id}" ${settings.font === font.id ? "selected" : ""}>${font.label}</option>`).join("")}</select></div>
          </section>
          <section class="settings-section range-section">
            <label class="settings-label" for="ui-scale"><span>${escapeHtml(t("interfaceScale"))}</span><output data-setting-value="scale">${settings.scale.toFixed(2)}×</output></label>
            <input id="ui-scale" class="settings-range" type="range" min="0.5" max="2" step="0.05" value="${settings.scale}" />
          </section>
        </section>
        <section class="settings-module settings-card ${state.settingsTab === "dictionary" ? "" : "is-hidden"}" role="tabpanel" aria-labelledby="dictionary-section-title">
          <h3 id="dictionary-section-title" class="settings-module-heading">${escapeHtml(t("dictionarySettings"))}</h3>
          <section class="settings-section source-settings-section">
            <div class="settings-label"><span>${escapeHtml(t("displayedDictionaries"))}</span><small>${escapeHtml(t("defaultFour"))}</small></div>
            <div class="source-settings-grid">${settings.sourceOrder.map((sourceId) => {
              const source = sources.find((item) => item.id === sourceId);
              if (!source) return "";
              return `<label class="source-setting-option" data-source-order="${source.id}"><input type="checkbox" data-source-enabled="${source.id}" ${settings.enabledSources.includes(source.id) ? "checked" : ""} /><span class="source-setting-check">${icon("check", 13)}</span><span><b>${escapeHtml(sourceTitle(source))}</b><small>${escapeHtml(sourceSubtitle(source))}</small></span><span class="source-order-grip" data-source-order-grip role="button" draggable="true" tabindex="0" aria-label="${escapeHtml(t("defaultFour"))}">⠿</span></label>`;
            }).join("")}</div>
          </section>
          <section class="settings-section local-model-section">
            <div class="settings-label"><span>${escapeHtml(t("localAiModels"))}</span><small>${escapeHtml(t("localAiModelsHint"))}</small></div>
            <label class="model-download-source" for="llm-download-source">
              <span>${escapeHtml(t("modelDownloadSource"))}</span>
              <div class="native-select-wrap">
                <select id="llm-download-source" class="settings-select" aria-label="${escapeHtml(t("modelDownloadSource"))}">
                  <option value="mirror" ${settings.llmDownloadSource === "mirror" ? "selected" : ""}>${escapeHtml(t("mirrorDownloadSource"))}</option>
                  <option value="official" ${settings.llmDownloadSource === "official" ? "selected" : ""}>${escapeHtml(t("officialDownloadSource"))}</option>
                </select>
              </div>
              <small class="model-download-source-hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>${escapeHtml(t("mirrorDownloadHint"))}</span></small>
            </label>
            <div class="local-model-grid" role="radiogroup" aria-label="${escapeHtml(t("localAiModels"))}">
              ${localModels.map((model) => {
                const installation = localModelStatus(model.id);
                const selected = settings.localModel === model.id;
                const progress = state.llmDownload?.modelId === model.id ? state.llmDownload : null;
                const progressPercent = progress ? downloadProgressPercent(progress) : null;
                const actionError = state.llmActionError?.modelId === model.id ? state.llmActionError.message : "";
                const action = installation?.installed
                  ? `<button class="local-model-action is-downloaded" type="button" disabled>${escapeHtml(t("modelDownloaded"))}</button>`
                  : `<button class="primary-button local-model-action" type="button" data-download-local-model="${model.id}" ${state.llmActionPending ? "disabled" : ""}>${escapeHtml(state.llmActionPending && state.llmDownload?.modelId === model.id ? downloadLabel() : t("downloadModel"))}</button>`;
                return `<article class="local-model-option ${selected ? "is-selected" : ""}">
                <button class="local-model-select" data-local-model="${model.id}" type="button" role="radio" aria-checked="${selected}">
                  <span class="local-model-choice"><span><b>${escapeHtml(model.name)}</b><small>${escapeHtml(t(model.description))}</small></span>${model.recommended ? `<i>${escapeHtml(t("modelRecommended"))}</i>` : ""}</span>
                  <span class="local-model-footprint">${escapeHtml(t(model.footprint))}${installation?.installed ? ` · ${escapeHtml(t("modelDownloaded"))}` : ""}</span>
                </button>${action}
                ${progress ? `<div class="local-model-progress" aria-live="polite"><div class="local-model-progress-heading"><span>${escapeHtml(t("downloadingModel"))}</span><strong>${progressPercent === null ? "…" : `${Math.round(progressPercent)}%`}</strong></div><div class="local-model-progress-track ${progressPercent === null ? "is-indeterminate" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100" ${progressPercent === null ? "" : `aria-valuenow="${Math.round(progressPercent)}"`}><i style="--download-progress:${progressPercent ?? 35}%"></i></div><small>${escapeHtml(downloadProgressLabel(progress))}</small></div>` : ""}
                ${actionError ? `<p class="local-model-error" role="alert">${escapeHtml(actionError)}</p>` : ""}
              </article>`;
              }).join("")}
            </div>
            <p class="local-model-note">${escapeHtml(t("localModelReadyLater"))}</p>
            ${state.llmStatus && !state.llmStatus.engineAvailable ? `<p class="local-model-engine-note">${escapeHtml(state.llmStatus.message || t("localAiUnavailable"))}</p>` : ""}
          </section>
          <section class="settings-section prompt-settings-section">
            <div class="settings-label"><span>${escapeHtml(t("localAiPromptSettings"))}</span><small>System Prompt</small></div>
            <p class="prompt-settings-hint">${escapeHtml(t("localAiPromptHint"))}</p>
            <div class="prompt-editor-grid">
              <label class="prompt-editor">
                <span><b>${escapeHtml(t("dictionarySystemPrompt"))}</b><button type="button" data-reset-llm-prompt="dictionary">${escapeHtml(t("restoreDefaultPrompt"))}</button></span>
                <textarea data-llm-prompt="dictionary" maxlength="8000" spellcheck="false">${escapeHtml(settings.dictionarySystemPrompt)}</textarea>
              </label>
              <label class="prompt-editor">
                <span><b>${escapeHtml(t("translationSystemPrompt"))}</b><button type="button" data-reset-llm-prompt="translation">${escapeHtml(t("restoreDefaultPrompt"))}</button></span>
                <textarea data-llm-prompt="translation" maxlength="8000" spellcheck="false">${escapeHtml(settings.translationSystemPrompt)}</textarea>
              </label>
            </div>
          </section>
          <section class="settings-section font-section">
            <label class="settings-label" for="ui-cache-limit"><span>${escapeHtml(t("cacheStorage"))}</span><small>${escapeHtml(cacheLimitLabel(settings.cacheLimit))}</small></label>
            <div class="native-select-wrap"><select id="ui-cache-limit" class="settings-select" aria-label="${escapeHtml(t("cacheStorage"))}">${CACHE_LIMIT_OPTIONS.map((limit) => `<option value="${limit}" ${settings.cacheLimit === limit ? "selected" : ""}>${escapeHtml(cacheLimitLabel(limit))}</option>`).join("")}</select></div>
          </section>
        </section>
        <section class="settings-module settings-card software-information ${state.settingsTab === "software" ? "" : "is-hidden"}" role="tabpanel" aria-labelledby="software-section-title">
          <h3 id="software-section-title" class="settings-module-heading">${escapeHtml(t("softwareInformation"))}</h3>
          <dl class="software-information-list">
            <div><dt>${escapeHtml(t("author"))}</dt><dd>TheOneGIS</dd></div>
            <div><dt>${escapeHtml(t("contact"))}</dt><dd><a href="mailto:614106917@qq.com">614106917@qq.com</a></dd></div>
            <div><dt>${escapeHtml(t("homepage"))}</dt><dd><a href="https://theonegis.github.io" target="_blank" rel="noreferrer">https://theonegis.github.io</a></dd></div>
            <div class="license-row"><dt>${escapeHtml(t("license"))}</dt><dd>${escapeHtml(t("licenseText"))}</dd></div>
          </dl>
          <section class="donation-section" aria-labelledby="support-author-title">
            <div class="donation-copy">
              <h4 id="support-author-title">${escapeHtml(t("supportAuthor"))}</h4>
              <p>${escapeHtml(t("supportMessage"))}</p>
            </div>
            <div class="donation-codes">
              <figure><img src="${wechatDonationUrl}" alt="${escapeHtml(t("wechatPay"))}" loading="lazy" /><figcaption><i class="fa-brands fa-weixin" aria-hidden="true"></i>${escapeHtml(t("wechatPay"))}</figcaption></figure>
              <figure><img src="${alipayDonationUrl}" alt="${escapeHtml(t("alipayPay"))}" loading="lazy" /><figcaption><i class="fa-solid fa-qrcode" aria-hidden="true"></i>${escapeHtml(t("alipayPay"))}</figcaption></figure>
            </div>
          </section>
        </section>
        <div class="modal-actions settings-actions">
          <button class="quiet-button" data-reset-settings>${escapeHtml(t("reset"))}</button>
          <button class="primary-button" data-panel="dictionary">${escapeHtml(t("backToDictionary"))}</button>
        </div>
      </section>`;
}

function translationPanel(): string {
  const result = state.translationResult;
  return `
    <section class="translation-page" aria-labelledby="translation-title">
      <header class="panel-page-heading">
        <div class="modal-icon translation-icon">${icon("translate", 23)}</div>
        <div><p class="eyebrow">LOCAL LLM</p><h2 id="translation-title">${escapeHtml(t("translationTitle"))}</h2><p class="modal-copy">${escapeHtml(t("translationCopy"))}</p></div>
      </header>
      <form class="translation-form" id="translation-form">
        <textarea id="translation-input" maxlength="4000" placeholder="${escapeHtml(t("translationPlaceholder"))}" aria-label="${escapeHtml(t("translationPlaceholder"))}">${escapeHtml(state.translationInput)}</textarea>
        <div class="translation-form-actions"><span>${escapeHtml(localModels.find((model) => model.id === state.settings.localModel)?.name ?? "Qwen3-0.6B")}</span><button class="primary-button" type="submit" ${state.translationPending ? "disabled" : ""}>${escapeHtml(state.translationPending ? t("loading") : t("translate"))}</button></div>
      </form>
      <section class="translation-result" aria-live="polite">
        <header><span>${escapeHtml(t("translationResult"))}</span><i></i></header>
        ${state.translationPending ? `<div class="translation-pending"><div class="aurora-loader"><i></i><i></i><i></i></div><p>${escapeHtml(t("loading"))}</p></div>` : ""}
        ${state.translationError ? `<p class="translation-error">${escapeHtml(state.translationError)}</p>` : ""}
        ${result && !state.translationPending ? `<p class="translation-output">${escapeHtml(result.translation)}</p><small>${escapeHtml(result.note)}</small>` : ""}
        ${!state.translationPending && !state.translationError && !result ? `<p class="translation-empty">${escapeHtml(t("translationEmpty"))}</p>` : ""}
      </section>
    </section>`;
}

function dictionaryPanel(active: (typeof sources)[number]): string {
  return `
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
    <section class="results-stage" aria-live="polite">${resultArea()}</section>`;
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
            <img class="brand-app-icon" src="${appIconUrl}" alt="" aria-hidden="true" />
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
          <div class="quick-actions" aria-label="${escapeHtml(t("settingsTitle"))}">
            <button class="quick-action ${state.panel === "dictionary" ? "is-active" : ""}" data-panel="dictionary" type="button" aria-label="${escapeHtml(t("home"))}" title="${escapeHtml(t("home"))}"><i class="fa-solid fa-house" aria-hidden="true"></i></button>
            <button class="quick-action ${state.panel === "translation" ? "is-active" : ""}" data-panel="translation" type="button" aria-label="${escapeHtml(t("translation"))}" title="${escapeHtml(t("translation"))}"><i class="fa-solid fa-language" aria-hidden="true"></i></button>
            <button class="quick-action ${state.panel === "settings" ? "is-active" : ""}" data-panel="settings" type="button" aria-label="${escapeHtml(t("settingsTitle"))}" title="${escapeHtml(t("settingsTitle"))}"><i class="fa-solid fa-sliders" aria-hidden="true"></i></button>
          </div>
        </section>
        ${state.panel === "dictionary" ? dictionaryPanel(active) : state.panel === "translation" ? translationPanel() : settingsPanel()}
      </main>
      </div>
      <footer><span class="footer-pulse"></span><span>${escapeHtml(t("footerLocalFirst"))}</span><i></i><span>${escapeHtml(t("footerLearning"))}</span></footer>
    </div>`;
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
  document.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.panel as PanelId;
      if (panel !== "dictionary" && panel !== "translation" && panel !== "settings") return;
      state.panel = panel;
      render();
      if (panel === "settings") {
        void loadSystemFonts();
        void loadLlmStatus();
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.settingsTab as SettingsTabId;
      if (tab !== "appearance" && tab !== "dictionary" && tab !== "software") return;
      state.settingsTab = tab;
      render(false);
      if (tab === "appearance") void loadSystemFonts();
      if (tab === "dictionary") void loadLlmStatus();
    });
  });
  document.querySelector<HTMLFormElement>("#translation-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLTextAreaElement>("#translation-input");
    void translateText(input?.value ?? state.translationInput);
  });
  document.querySelector<HTMLTextAreaElement>("#translation-input")?.addEventListener("input", (event) => {
    state.translationInput = (event.target as HTMLTextAreaElement).value;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.theme = button.dataset.themeChoice as ThemeId;
      applySettings();
      persistSettings();
      render();
    });
  });
  document.querySelector<HTMLInputElement>("#ui-scale")?.addEventListener("input", (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    state.settings.scale = value;
    applySettings();
    persistSettings();
    const output = document.querySelector<HTMLOutputElement>('[data-setting-value="scale"]');
    if (output) {
      output.value = `${value.toFixed(2)}×`;
      output.textContent = output.value;
    }
  });
  document.querySelector<HTMLSelectElement>("#ui-cache-limit")?.addEventListener("change", (event) => {
    state.settings.cacheLimit = normaliseCacheLimit(Number((event.target as HTMLSelectElement).value));
    persistSettings();
    void trimQueryCache();
    render(false);
  });
  document.querySelector<HTMLSelectElement>("#llm-download-source")?.addEventListener("change", (event) => {
    state.settings.llmDownloadSource = (event.target as HTMLSelectElement).value === "official" ? "official" : "mirror";
    persistSettings();
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
  document.querySelectorAll<HTMLElement>("[data-source-order-grip]").forEach((grip) => {
    grip.addEventListener("dragstart", (event) => {
      const item = grip.closest<HTMLElement>("[data-source-order]");
      const source = item?.dataset.sourceOrder;
      if (!item || !source) return;
      beginSourceOrderDrag(item);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", source);
      }
    });
    grip.addEventListener("dragend", finishSourceOrderDrag);
    grip.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      const item = grip.closest<HTMLElement>("[data-source-order]");
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      beginSourceOrderDrag(item);
      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        updateSourceOrderDragAtPoint(moveEvent.clientX, moveEvent.clientY);
      };
      const handleMouseUp = (upEvent: MouseEvent) => {
        upEvent.preventDefault();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        finishSourceOrderDrag();
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
    grip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      // Desktop mice use native drag-and-drop above. Pointer capture keeps the
      // same interaction available to touch and pen input.
      if (event.pointerType === "mouse") return;
      const item = grip.closest<HTMLElement>("[data-source-order]");
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      beginSourceOrderDrag(item);
      grip.setPointerCapture(event.pointerId);
    });
    grip.addEventListener("pointermove", (event) => {
      if (!draggedSource || !grip.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      updateSourceOrderDragAtPoint(event.clientX, event.clientY);
    });
    grip.addEventListener("pointerup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
      finishSourceOrderDrag();
    });
    grip.addEventListener("pointercancel", finishSourceOrderDrag);
    grip.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    grip.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(event.key)) return;
      const item = grip.closest<HTMLElement>("[data-source-order]");
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      moveSourceByOffset(item.dataset.sourceOrder as SourceId, event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1);
    });
  });
  document.querySelectorAll<HTMLElement>("[data-source-order]").forEach((item) => {
    item.addEventListener("dragover", (event) => {
      if (!draggedSource || item.dataset.sourceOrder === draggedSource) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".source-setting-option.is-drag-over").forEach((option) => option.classList.remove("is-drag-over"));
      moveDraggedSourceBefore(item);
      item.classList.add("is-drag-over");
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      finishSourceOrderDrag();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-local-model]").forEach((button) => {
    button.addEventListener("click", () => {
      const model = button.dataset.localModel as LocalModelId;
      if (!localModels.some((item) => item.id === model)) return;
      state.settings.localModel = model;
      state.llmActionError = null;
      persistSettings();
      render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-download-local-model]").forEach((button) => {
    button.addEventListener("click", () => {
      void downloadLocalModel(button.dataset.downloadLocalModel as LocalModelId);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-delete-local-model]").forEach((button) => {
    button.addEventListener("click", () => {
      void deleteLocalModel(button.dataset.deleteLocalModel as LocalModelId);
    });
  });
  document.querySelectorAll<HTMLTextAreaElement>("[data-llm-prompt]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      if (textarea.dataset.llmPrompt === "dictionary") state.settings.dictionarySystemPrompt = textarea.value;
      if (textarea.dataset.llmPrompt === "translation") {
        state.settings.translationSystemPrompt = textarea.value;
        state.translationResult = null;
        state.translationError = "";
      }
      delete state.sourceResults.local_llm;
      delete state.sourceErrors.local_llm;
      persistSettings();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-reset-llm-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.resetLlmPrompt === "dictionary") state.settings.dictionarySystemPrompt = DEFAULT_DICTIONARY_SYSTEM_PROMPT;
      if (button.dataset.resetLlmPrompt === "translation") {
        state.settings.translationSystemPrompt = DEFAULT_TRANSLATION_SYSTEM_PROMPT;
        state.translationResult = null;
        state.translationError = "";
      }
      delete state.sourceResults.local_llm;
      delete state.sourceErrors.local_llm;
      persistSettings();
      render(false);
    });
  });
  document.querySelector<HTMLButtonElement>("[data-reset-settings]")?.addEventListener("click", () => {
    state.settings = { ...defaultSettings, enabledSources: [...defaultSettings.enabledSources], sourceOrder: [...defaultSettings.sourceOrder] };
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
  if (source === "local_llm") {
    const fingerprint = promptFingerprint(state.settings.dictionarySystemPrompt, DEFAULT_DICTIONARY_SYSTEM_PROMPT);
    if (isTauri()) {
      const result = await invoke<LlmLookup>("lookup_llm", {
        query,
        modelId: state.settings.localModel,
        systemPrompt: state.settings.dictionarySystemPrompt,
      });
      return { type: "llm", result: { ...result, promptFingerprint: fingerprint } };
    }
    return {
      type: "llm",
      result: {
        word: query,
        modelId: state.settings.localModel,
        modelName: localModels.find((model) => model.id === state.settings.localModel)?.name ?? "Qwen3-0.6B",
        content: "释义：本地 AI 词典结果会在桌面应用中生成。\n用法：浏览器预览不会加载本地模型。",
        note: t("localAiNote"),
        promptFingerprint: fingerprint,
      },
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
  const preloadSourceIds = sourceIds.filter((source) => source !== "local_llm" || source === state.source);
  state.query = query;
  state.youdaoSection = "simple";
  state.expandedContent.clear();
  state.sourceErrors = {};
  state.sourceResults = {};
  state.pendingSources = new Set(preloadSourceIds);
  render(false);

  const cached = await readCachedQuery(query);
  if (serial !== lookupSerial) return;
  if (cached) {
    sourceIds.forEach((source) => {
      const result = cached.results[source];
      const currentPromptFingerprint = promptFingerprint(state.settings.dictionarySystemPrompt, DEFAULT_DICTIONARY_SYSTEM_PROMPT);
      if (result && (source !== "local_llm" || (result.type === "llm" && result.result.modelId === state.settings.localModel && result.result.promptFingerprint === currentPromptFingerprint))) {
        state.sourceResults[source] = result;
      }
    });
  }

  const missingSources = preloadSourceIds.filter((source) => !state.sourceResults[source]);
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

async function loadLlmStatus(): Promise<void> {
  if (!isTauri()) return;
  try {
    state.llmStatus = await invoke<LlmStatus>("llm_status");
  } catch {
    state.llmStatus = null;
  } finally {
    if (state.panel === "settings") render();
  }
}

async function downloadLocalModel(modelId: LocalModelId): Promise<void> {
  if (!isTauri() || state.llmActionPending || !localModels.some((model) => model.id === modelId)) return;
  state.llmActionPending = true;
  state.llmDownload = { modelId, downloadedBytes: 0, complete: false };
  state.llmActionError = null;
  render();
  try {
    await invoke("download_llm_model", { modelId, downloadSource: state.settings.llmDownloadSource });
    await loadLlmStatus();
  } catch (error) {
    state.llmActionError = { modelId, message: error instanceof Error ? error.message : String(error) };
  } finally {
    state.llmActionPending = false;
    state.llmDownload = null;
    if (state.panel === "settings") render();
  }
}

async function deleteLocalModel(modelId: LocalModelId): Promise<void> {
  if (!isTauri() || state.llmActionPending || !localModels.some((model) => model.id === modelId)) return;
  state.llmActionPending = true;
  render();
  try {
    await invoke("delete_llm_model", { modelId });
    await loadLlmStatus();
  } catch (error) {
    state.llmActionError = { modelId, message: error instanceof Error ? error.message : String(error) };
  } finally {
    state.llmActionPending = false;
    if (state.panel === "settings") render();
  }
}

async function translateText(rawText: string): Promise<void> {
  const text = rawText.trim();
  state.translationInput = rawText;
  if (!text || state.translationPending) return;
  state.translationPending = true;
  state.translationError = "";
  state.translationResult = null;
  render();
  try {
    if (isTauri()) {
      state.translationResult = await invoke<LlmTranslation>("translate_llm", {
        text,
        modelId: state.settings.localModel,
        systemPrompt: state.settings.translationSystemPrompt,
      });
    } else {
      state.translationResult = {
        source: text,
        translation: "浏览器预览不会加载本地模型。请在桌面应用的离线 AI 版中使用翻译功能。",
        modelId: state.settings.localModel,
        modelName: localModels.find((model) => model.id === state.settings.localModel)?.name ?? "Qwen3-0.6B",
        note: t("localAiNote"),
      };
    }
  } catch (error) {
    state.translationError = error instanceof Error ? error.message : String(error);
  } finally {
    state.translationPending = false;
    if (state.panel === "translation") render();
  }
}

async function initialiseApp(): Promise<void> {
  state.source = defaultSource();
  render();
  // Prepare the local database and its type-ahead index as soon as the window
  // is usable, so the first three-character suggestion is not a cold start.
  if (isTauri()) {
    void invoke<DictionaryStatus>("dictionary_status").catch(() => undefined);
    void loadLlmStatus();
    void listen<DownloadProgress>("llm-download-progress", (event) => {
      state.llmDownload = event.payload;
      if (state.panel === "settings" && llmDownloadRenderFrame === undefined) {
        llmDownloadRenderFrame = window.requestAnimationFrame(() => {
          llmDownloadRenderFrame = undefined;
          if (state.panel === "settings") render();
        });
      }
    });
  }
}

applySettings();
void initialiseApp();
