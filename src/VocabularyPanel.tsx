import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { CopyKey } from "./config";
import type { VocabularyBookStatus, VocabularyEntry, VocabularyEntryInput } from "./types";

type Translator = (key: CopyKey) => string;

const sqliteFilters = [{ name: "Aurora Dict SQLite", extensions: ["sqlite3", "sqlite", "db"] }];

function inlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    return token;
  });
}

function MarkdownPreview({ value, emptyText }: { value: string; emptyText: string }) {
  const lines = value.split("\n");
  if (!value.trim()) return <p className="markdown-preview-empty">{emptyText}</p>;
  return <div className="markdown-preview-content">{lines.map((line, index) => {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const content = inlineMarkdown(heading[2]);
      if (heading[1].length === 1) return <h1 key={index}>{content}</h1>;
      if (heading[1].length === 2) return <h2 key={index}>{content}</h2>;
      return <h3 key={index}>{content}</h3>;
    }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unordered) return <div className="markdown-list-item" key={index}><i aria-hidden="true" /> <span>{inlineMarkdown(unordered[1])}</span></div>;
    const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (ordered) return <div className="markdown-list-item is-ordered" key={index}><b>{ordered[1]}.</b><span>{inlineMarkdown(ordered[2])}</span></div>;
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) return <blockquote key={index}>{inlineMarkdown(quote[1])}</blockquote>;
    if (!line.trim()) return <div className="markdown-spacer" key={index} />;
    return <p key={index}>{inlineMarkdown(line)}</p>;
  })}</div>;
}

function MarkdownField({ label, value, placeholder, emptyText, template, templateLabel, editLabel, previewLabel, onChange }: {
  label: string;
  value: string;
  placeholder: string;
  emptyText: string;
  template: string;
  templateLabel: string;
  editLabel: string;
  previewLabel: string;
  onChange: (value: string) => void;
}) {
  const insertTemplate = () => onChange(value.trim() ? `${value.trimEnd()}\n\n${template}` : template);
  return <section className="markdown-field">
    <header><div><b>{label}</b><small>Markdown</small></div><button type="button" onClick={insertTemplate}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />{templateLabel}</button></header>
    <div className="markdown-editor-grid">
      <label className="markdown-source"><span className="markdown-pane-label"><i className="fa-solid fa-pen" aria-hidden="true" />{editLabel}</span><textarea aria-label={label} value={value} maxLength={100000} spellCheck onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>
      <section className="markdown-preview" aria-label={`${label} · ${previewLabel}`}><span className="markdown-pane-label"><i className="fa-regular fa-eye" aria-hidden="true" />{previewLabel}</span><MarkdownPreview value={value} emptyText={emptyText} /></section>
    </div>
  </section>;
}

function sameEntry(left: VocabularyEntryInput, right: VocabularyEntryInput): boolean {
  return left.id === right.id && left.word === right.word && left.phonetic === right.phonetic
    && left.definitionMarkdown === right.definitionMarkdown && left.examplesMarkdown === right.examplesMarkdown;
}

function editableEntry(entry: VocabularyEntry): VocabularyEntryInput {
  return {
    id: entry.id,
    word: entry.word,
    phonetic: entry.phonetic,
    definitionMarkdown: entry.definitionMarkdown,
    examplesMarkdown: entry.examplesMarkdown,
  };
}

const emptyEntry = (): VocabularyEntryInput => ({ id: null, word: "", phonetic: "", definitionMarkdown: "", examplesMarkdown: "" });

export function VocabularyPanel({ entries, status, loading, error, isDesktop, persist, remove, refresh, importBook, exportBook, moveBook, openBook, t }: {
  entries: VocabularyEntry[];
  status: VocabularyBookStatus | null;
  loading: boolean;
  error: string;
  isDesktop: boolean;
  persist: (entry: VocabularyEntryInput) => Promise<VocabularyEntry>;
  remove: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
  importBook: (path: string) => Promise<VocabularyBookStatus>;
  exportBook: (path: string) => Promise<VocabularyBookStatus>;
  moveBook: (path: string) => Promise<VocabularyBookStatus>;
  openBook: (path: string) => Promise<VocabularyBookStatus>;
  t: Translator;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [draft, setDraft] = useState<VocabularyEntryInput>(emptyEntry);
  const [baseline, setBaseline] = useState<VocabularyEntryInput>(emptyEntry);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => `${entry.word}\n${entry.definitionMarkdown}\n${entry.examplesMarkdown}`.toLocaleLowerCase().includes(query));
  }, [entries, search]);
  const dirty = !sameEntry(draft, baseline);

  useEffect(() => {
    if (selectedId === null) return;
    const selected = entries.find((entry) => entry.id === selectedId);
    if (!selected || dirty) return;
    const next = editableEntry(selected);
    setDraft(next);
    setBaseline(next);
  }, [entries, selectedId, dirty]);

  useEffect(() => {
    if (loading || creatingNew || selectedId !== null || dirty || !entries.length) return;
    const next = editableEntry(entries[0]);
    setSelectedId(entries[0].id);
    setDraft(next);
    setBaseline(next);
  }, [creatingNew, dirty, entries, loading, selectedId]);

  const mayDiscard = () => !dirty || window.confirm(t("vocabularyDiscardChanges"));
  const selectEntry = (entry: VocabularyEntry) => {
    if (!mayDiscard()) return;
    const next = editableEntry(entry);
    setSelectedId(entry.id);
    setCreatingNew(false);
    setDraft(next);
    setBaseline(next);
    setMessage("");
    setActionError("");
    setConfirmDelete(false);
  };
  const createEntry = () => {
    if (!mayDiscard()) return;
    const next = emptyEntry();
    setSelectedId(null);
    setCreatingNew(true);
    setDraft(next);
    setBaseline(next);
    setMessage("");
    setActionError("");
    setConfirmDelete(false);
  };
  const saveEntry = useCallback(async () => {
    setPending(true);
    setActionError("");
    setMessage("");
    try {
      const saved = await persist(draft);
      const next = editableEntry(saved);
      setSelectedId(saved.id);
      setCreatingNew(false);
      setDraft(next);
      setBaseline(next);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason));
    } finally { setPending(false); }
  }, [draft, persist]);
  const deleteEntry = async () => {
    if (draft.id === null) return;
    setPending(true);
    setActionError("");
    try {
      await remove(draft.id);
      const next = emptyEntry();
      setSelectedId(null);
      setCreatingNew(false);
      setDraft(next);
      setBaseline(next);
      setConfirmDelete(false);
      setMessage(t("vocabularyDeleted"));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason));
    } finally { setPending(false); }
  };
  const canSave = !pending && Boolean(draft.word.trim()) && dirty;
  const saveShortcut = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘S" : "Ctrl+S";
  useEffect(() => {
    const saveWithKeyboard = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== "s") return;
      event.preventDefault();
      if (canSave) void saveEntry();
    };
    document.addEventListener("keydown", saveWithKeyboard);
    return () => document.removeEventListener("keydown", saveWithKeyboard);
  }, [canSave, saveEntry]);
  const chooseOpenPath = async (action: "open" | "import") => {
    if (!isDesktop || !mayDiscard()) return;
    const selected = await open({ multiple: false, directory: false, filters: sqliteFilters });
    if (typeof selected !== "string") return;
    setPending(true); setActionError(""); setMessage("");
    try {
      const nextStatus = action === "open" ? await openBook(selected) : await importBook(selected);
      await refresh();
      const next = emptyEntry();
      setSelectedId(null);
      setCreatingNew(false);
      setDraft(next);
      setBaseline(next);
      setConfirmDelete(false);
      setMessage(action === "open" ? t("vocabularyOpened") : `${t("vocabularyImported")} · ${nextStatus.entryCount}`);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setPending(false); }
  };
  const chooseSavePath = async (action: "move" | "export") => {
    if (!isDesktop || !mayDiscard()) return;
    const selected = await save({ defaultPath: action === "move" ? status?.path : "aurora-vocabulary.sqlite3", filters: sqliteFilters });
    if (!selected) return;
    setPending(true); setActionError(""); setMessage("");
    try {
      await (action === "move" ? moveBook(selected) : exportBook(selected));
      await refresh();
      setMessage(action === "move" ? t("vocabularyMoved") : t("vocabularyExported"));
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setPending(false); }
  };
  const changeDraft = (key: keyof VocabularyEntryInput) => (event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [key]: event.target.value }));

  return <section className="vocabulary-page" aria-labelledby="vocabulary-title">
    <header className="panel-page-heading vocabulary-heading"><div className="modal-icon"><i className="fa-solid fa-book-bookmark" aria-hidden="true" /></div><div><p className="eyebrow">PORTABLE SQLITE · MARKDOWN</p><h2 id="vocabulary-title">{t("vocabularyBook")}</h2><p className="modal-copy">{t("vocabularyBookCopy")}</p></div></header>
    <section className="vocabulary-storage-card">
      <div className="vocabulary-path"><span><i className="fa-solid fa-database" aria-hidden="true" />{t("vocabularyCurrentPath")}</span><code title={status?.path}>{status?.path || t("vocabularyPathUnavailable")}</code><small>{status ? `${status.entryCount} ${t("vocabularyWordUnit")}` : ""}</small></div>
      <div className="vocabulary-file-actions">
        <button type="button" disabled={pending || !isDesktop} onClick={() => void chooseSavePath("move")}><i className="fa-solid fa-folder-tree" aria-hidden="true" />{t("vocabularyMove")}</button>
        <button type="button" disabled={pending || !isDesktop} onClick={() => void chooseOpenPath("open")}><i className="fa-solid fa-folder-open" aria-hidden="true" />{t("vocabularyOpen")}</button>
        <button type="button" disabled={pending || !isDesktop} onClick={() => void chooseOpenPath("import")}><i className="fa-solid fa-file-import" aria-hidden="true" />{t("vocabularyImport")}</button>
        <button type="button" disabled={pending || !isDesktop} onClick={() => void chooseSavePath("export")}><i className="fa-solid fa-file-export" aria-hidden="true" />{t("vocabularyExport")}</button>
      </div>
    </section>
    {(error || actionError || message) && <div className={`vocabulary-feedback ${error || actionError ? "is-error" : "is-success"}`} role="status"><i className={`fa-solid ${error || actionError ? "fa-circle-exclamation" : "fa-circle-check"}`} aria-hidden="true" /><span>{error || actionError || message}</span></div>}
    <div className="vocabulary-workspace">
      <aside className="vocabulary-list-panel">
        <div className="vocabulary-list-actions"><label><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("vocabularySearch")} /></label><button type="button" onClick={createEntry} title={t("vocabularyNew")} aria-label={t("vocabularyNew")}><i className="fa-solid fa-plus" aria-hidden="true" /></button></div>
        <div className="vocabulary-list">{loading ? <p className="vocabulary-list-empty">{t("loading")}</p> : visibleEntries.length ? visibleEntries.map((entry) => <button type="button" className={selectedId === entry.id ? "is-active" : ""} aria-current={selectedId === entry.id ? "true" : undefined} onClick={() => selectEntry(entry)} key={entry.id}><span><b>{entry.word}</b>{entry.phonetic && <small>{entry.phonetic}</small>}</span><time>{new Date(entry.updatedAt).toLocaleDateString()}</time></button>) : <p className="vocabulary-list-empty">{t("vocabularyEmpty")}</p>}</div>
      </aside>
      <section className="vocabulary-editor-card">
        <div className="vocabulary-word-fields"><label><span>{t("vocabularyWord")}</span><input value={draft.word} maxLength={120} autoCapitalize="none" onChange={changeDraft("word")} placeholder={t("vocabularyWordPlaceholder")} /></label><label><span>{t("vocabularyPhonetic")}</span><input value={draft.phonetic} maxLength={200} onChange={changeDraft("phonetic")} placeholder="/ˌserənˈdɪpəti/" /></label></div>
        <MarkdownField label={t("vocabularyDefinitionMarkdown")} value={draft.definitionMarkdown} onChange={(definitionMarkdown) => setDraft((current) => ({ ...current, definitionMarkdown }))} placeholder={t("vocabularyDefinitionPlaceholder")} emptyText={t("vocabularyPreviewEmpty")} template={`## ${t("definition")}\n\n- `} templateLabel={t("vocabularyInsertDefinition")} editLabel={t("vocabularyEdit")} previewLabel={t("vocabularyPreview")} />
        <MarkdownField label={t("vocabularyExamplesMarkdown")} value={draft.examplesMarkdown} onChange={(examplesMarkdown) => setDraft((current) => ({ ...current, examplesMarkdown }))} placeholder={t("vocabularyExamplesPlaceholder")} emptyText={t("vocabularyPreviewEmpty")} template={`## ${t("examples")}\n\n1. **English sentence.**\n   中文翻译。`} templateLabel={t("vocabularyInsertExample")} editLabel={t("vocabularyEdit")} previewLabel={t("vocabularyPreview")} />
        <div className="vocabulary-editor-actions"><div className="vocabulary-delete-actions">{draft.id !== null && (confirmDelete ? <><button className="danger-button is-confirming" type="button" disabled={pending} onClick={() => void deleteEntry()}>{t("vocabularyConfirmDelete")}</button><button className="quiet-button" type="button" onClick={() => setConfirmDelete(false)}>{t("cancel")}</button></> : <button className="danger-button" type="button" disabled={pending} onClick={() => setConfirmDelete(true)}>{t("vocabularyDelete")}</button>)}</div><span className={dirty ? "is-dirty" : "is-saved"} role="status" aria-live="polite"><i aria-hidden="true" />{dirty ? t("vocabularyUnsaved") : t("vocabularyUpToDate")}</span><button className="primary-button vocabulary-save-button" type="button" disabled={!canSave} onClick={() => void saveEntry()}><span>{pending ? t("loading") : t("vocabularySave")}</span><kbd>{saveShortcut}</kbd></button></div>
      </section>
    </div>
  </section>;
}
