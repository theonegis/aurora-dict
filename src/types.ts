export type SourceId = "local" | "local_llm" | "youdao" | "dictionary" | "vocabulary";
export type ThemeId = "purple" | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "violet" | "black";
export type UiLanguage = "zh" | "en";
export type FontId = string;
export type LocalModelId = "qwen3-0.6b" | "qwen3-1.7b" | "qwen3-4b";
export type DownloadSourceId = "mirror" | "official";
export type PanelId = "dictionary" | "translation" | "settings";
export type SettingsTabId = "appearance" | "dictionary" | "software";

export interface DictionaryEntry {
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

export interface LocalLookup {
  query: string;
  entries: DictionaryEntry[];
  suggestions: string[];
  sampleData: boolean;
}

export interface LocalSuggestions {
  suggestions: string[];
  correction: boolean;
}

export interface DictionaryStatus {
  entryCount: number;
  sampleData: boolean;
}

export interface OnlineSense {
  partOfSpeech: string;
  definitions: string[];
}

export interface OnlineExample {
  english: string;
  translation?: string;
  source?: string;
}

export interface OnlinePhrase {
  term: string;
  translation?: string;
}

export interface OnlineContentSection {
  id: "simple" | "collins" | string;
  senses: OnlineSense[];
  examples: OnlineExample[];
  phrases: OnlinePhrase[];
}

export interface OnlineLookup {
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

export interface LlmLookup {
  word: string;
  modelId: LocalModelId;
  modelName: string;
  content: string;
  note: string;
  promptFingerprint?: string;
}

export interface LlmTranslation {
  source: string;
  translation: string;
  modelId: LocalModelId;
  modelName: string;
  note: string;
}

export interface LlmModelStatus {
  modelId: LocalModelId;
  installed: boolean;
  sizeBytes: number;
}

export interface LlmStatus {
  engineAvailable: boolean;
  message: string;
  models: LlmModelStatus[];
}

export interface DownloadProgress {
  modelId: LocalModelId;
  downloadedBytes: number;
  totalBytes?: number;
  complete: boolean;
}

export interface LlmActionError {
  modelId: LocalModelId;
  message: string;
}

export interface DisplaySettings {
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

export type SourceLookupResult =
  | { type: "local"; result: LocalLookup }
  | { type: "llm"; result: LlmLookup }
  | { type: "online"; result: OnlineLookup };

export interface QueryCacheRecord {
  query: string;
  accessedAt: number;
  results: Partial<Record<SourceId, SourceLookupResult>>;
}

export interface AppState {
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
}
