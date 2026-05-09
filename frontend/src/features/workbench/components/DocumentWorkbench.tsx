import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  FileArchive,
  FileInput,
  FileText,
  Heart,
  Import,
  Loader2,
  ScanText,
  Server,
  Settings2,
  Upload,
  XCircle,
} from "lucide-react";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { appConfig } from "../../../lib/config";
import { downloadJSON } from "../../../lib/download";
import { formatBytes } from "../../../lib/format";
import { fetchHealth, processDocument } from "../api";
import { sampleDocument } from "../sample";
import {
  buildWorkbenchSnapshot,
  defaultWorkbenchSettings,
  trimResults,
  type SourceMode,
  type WorkbenchSettings,
  type WorkspaceTab,
  workbenchSnapshotSchema,
} from "../state";
import type { DocumentResult } from "../types";
import {
  AnalysisPanel,
  DebugPanel,
  EntitiesPanel,
  ExportsPanel,
  HistoryPanel,
  MetadataPanel,
  Metric,
  ProcessingError,
  ResultSummary,
  TextPanel,
  WorkspacePanel,
} from "./WorkbenchPanels";
import { buildVisibleTabs, copyResultJson, downloadResultJson } from "../view";

const snapshotStorageKey = "udw.phase3.snapshot";

function readStoredSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(snapshotStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return workbenchSnapshotSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function buildDefaultSettings(): WorkbenchSettings {
  return {
    ...defaultWorkbenchSettings,
    apiBaseUrl: appConfig.apiBaseUrl,
  };
}

function inferPasteMimeType(value: string): string {
  return /<\/?[a-z][\s\S]*>/i.test(value) ? "text/html" : "text/plain";
}

function buildPasteFile(text: string, filenamePrefix: string): File {
  const mimeType = inferPasteMimeType(text);
  const extension = mimeType === "text/html" ? "html" : "txt";
  return new File([text], `${filenamePrefix}.${extension}`, { type: mimeType });
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function fetchUrlAsFile(sourceUrl: string): Promise<File> {
  let parsed: URL;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("Enter a complete URL, including https://.");
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString());
  } catch {
    throw new Error(
      "The browser could not read that URL. If the site blocks cross-origin fetches, download the file first or paste the rendered text.",
    );
  }

  if (!response.ok) {
    throw new Error(
      `The URL returned ${response.status}. Try downloading the file locally and uploading it instead.`,
    );
  }

  const blob = await response.blob();
  const pathname = parsed.pathname.split("/").filter(Boolean).pop();
  const fallbackName =
    pathname && pathname.length > 0 ? pathname : "remote-document";
  const mimeType =
    response.headers.get("content-type")?.split(";")[0] ??
    blob.type ??
    "application/octet-stream";
  return new File([blob], fallbackName, { type: mimeType });
}

type NoticeTone = "success" | "error" | "info";

export function DocumentWorkbench() {
  const storedSnapshot = useMemo(() => readStoredSnapshot(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stateImportRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debugEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );

  const [settings, setSettings] = useState<WorkbenchSettings>(
    storedSnapshot?.settings ?? buildDefaultSettings(),
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    storedSnapshot?.active_tab ?? "Workspace",
  );
  const [sourceMode, setSourceMode] = useState<SourceMode>(
    storedSnapshot?.source_mode ?? "upload",
  );
  const [results, setResults] = useState<DocumentResult[]>(
    storedSnapshot?.results ?? [],
  );
  const [selectedResultId, setSelectedResultId] = useState<string | null>(
    storedSnapshot?.selected_result_id ??
      storedSnapshot?.results[0]?.id ??
      null,
  );
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState<string>(
    storedSnapshot?.pasted_text ?? "",
  );
  const [sourceUrl, setSourceUrl] = useState<string>(
    storedSnapshot?.source_url ?? "",
  );
  const [queueStats, setQueueStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
  });
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    message: string;
  } | null>(null);

  const currentResult = useMemo(() => {
    const matched = results.find((item) => item.id === selectedResultId);
    return matched ?? results[0] ?? null;
  }, [results, selectedResultId]);

  useEffect(() => {
    setResults((current) => trimResults(current, settings.historyLimit));
  }, [settings.historyLimit]);

  useEffect(() => {
    if (!settings.autosave) {
      window.localStorage.removeItem(snapshotStorageKey);
      return;
    }

    const snapshot = buildWorkbenchSnapshot({
      activeTab,
      sourceMode,
      pastedText,
      sourceUrl,
      selectedResultId,
      settings,
      results: trimResults(results, settings.historyLimit),
    });

    try {
      window.localStorage.setItem(snapshotStorageKey, JSON.stringify(snapshot));
    } catch {
      setNotice({
        tone: "error",
        message:
          "Autosave could not store the current session. Export the state JSON before closing this tab.",
      });
    }
  }, [
    activeTab,
    pastedText,
    results,
    selectedResultId,
    settings,
    sourceMode,
    sourceUrl,
  ]);

  const healthQuery = useQuery({
    queryKey: ["health", settings.apiBaseUrl],
    queryFn: () => fetchHealth(settings.apiBaseUrl),
    staleTime: 15_000,
    retry: false,
  });

  const processMutation = useMutation({
    mutationFn: (file: File) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return processDocument(settings.apiBaseUrl, file, controller.signal);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const visibleTabs = buildVisibleTabs(debugEnabled);
  const healthLabel = useMemo(() => {
    if (healthQuery.isLoading) {
      return "Checking";
    }

    if (healthQuery.isError) {
      return "Offline";
    }

    return healthQuery.data?.status ?? "Unknown";
  }, [healthQuery.data?.status, healthQuery.isError, healthQuery.isLoading]);

  function updateSettings(
    updater: (current: WorkbenchSettings) => WorkbenchSettings,
  ) {
    setSettings((current) => updater(current));
  }

  function chooseFiles() {
    fileInputRef.current?.click();
  }

  function chooseStateFile() {
    stateImportRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    const nextFiles = files ? Array.from(files) : [];
    if (nextFiles.length === 0) {
      return;
    }

    abortControllerRef.current?.abort();
    processMutation.reset();
    setSourceMode("upload");
    setQueuedFiles(nextFiles);
    setQueueStats({ total: 0, completed: 0, failed: 0 });
    setNotice({
      tone: "info",
      message:
        nextFiles.length === 1
          ? `Ready to process ${nextFiles[0].name}.`
          : `Queued ${nextFiles.length} files for batch processing.`,
    });
    setActiveTab("Workspace");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }

  async function buildSourceFiles(): Promise<File[]> {
    if (sourceMode === "upload") {
      if (queuedFiles.length === 0) {
        throw new Error("Choose one or more files first.");
      }
      return queuedFiles;
    }

    if (sourceMode === "paste") {
      if (pastedText.trim().length === 0) {
        throw new Error("Paste text or HTML before processing.");
      }
      return [buildPasteFile(pastedText, "pasted-document")];
    }

    if (sourceMode === "sample") {
      return [
        new File([sampleDocument.text], sampleDocument.filename, {
          type: sampleDocument.mimeType,
        }),
      ];
    }

    return [await fetchUrlAsFile(sourceUrl)];
  }

  async function processSources() {
    setNotice(null);
    processMutation.reset();

    let files: File[];
    try {
      files = await buildSourceFiles();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to prepare the selected source.",
      });
      return;
    }

    setQueueStats({ total: files.length, completed: 0, failed: 0 });
    let completed = 0;
    let failed = 0;
    let cancelled = false;

    for (const file of files) {
      try {
        const result = await processMutation.mutateAsync(file);
        completed += 1;
        setQueueStats({ total: files.length, completed, failed });
        setResults((current) => {
          const next = trimResults([result, ...current], settings.historyLimit);
          return next;
        });
        setSelectedResultId(result.id);
        setActiveTab("Analysis");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          cancelled = true;
          break;
        }
        failed += 1;
        setQueueStats({ total: files.length, completed, failed });
      }
    }

    if (sourceMode === "upload" && !cancelled) {
      setQueuedFiles([]);
    }

    if (cancelled) {
      setNotice({
        tone: "info",
        message: "Processing cancelled. Completed results remain in history.",
      });
      return;
    }

    setNotice({
      tone: failed > 0 ? "error" : "success",
      message:
        failed > 0
          ? `Processed ${completed} file(s); ${failed} failed. Review the error state before retrying the queue.`
          : `Processed ${completed} file(s) successfully.`,
    });
  }

  function cancelProcessing() {
    abortControllerRef.current?.abort();
  }

  async function copyCurrentText() {
    if (!currentResult) {
      setNotice({
        tone: "error",
        message: "Process a document before copying text.",
      });
      return;
    }
    await copyText(currentResult.text);
    setNotice({
      tone: "success",
      message: "Extracted text copied to the clipboard.",
    });
  }

  async function copyCurrentJson() {
    if (!currentResult) {
      setNotice({
        tone: "error",
        message: "Process a document before copying JSON.",
      });
      return;
    }
    await copyText(copyResultJson(currentResult));
    setNotice({
      tone: "success",
      message: "Result JSON copied to the clipboard.",
    });
  }

  function exportWorkspaceState() {
    const snapshot = buildWorkbenchSnapshot({
      activeTab,
      sourceMode,
      pastedText,
      sourceUrl,
      selectedResultId,
      settings,
      results,
    });
    downloadJSON("universal-document-workbench-state.json", snapshot);
    setNotice({ tone: "success", message: "Workspace state downloaded." });
  }

  async function importWorkspaceState(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const parsed = workbenchSnapshotSchema.parse(
        JSON.parse(await file.text()),
      );
      setSettings(parsed.settings);
      setActiveTab(parsed.active_tab);
      setSourceMode(parsed.source_mode);
      setPastedText(parsed.pasted_text);
      setSourceUrl(parsed.source_url);
      setResults(parsed.results);
      setSelectedResultId(
        parsed.selected_result_id ?? parsed.results[0]?.id ?? null,
      );
      setQueuedFiles([]);
      setNotice({
        tone: "success",
        message: `Imported ${parsed.results.length} saved result(s) from state JSON.`,
      });
    } catch {
      setNotice({
        tone: "error",
        message:
          "That state file could not be imported. Make sure it came from this workbench build.",
      });
    }
  }

  function clearWorkspace() {
    abortControllerRef.current?.abort();
    setQueuedFiles([]);
    setPastedText("");
    setSourceUrl("");
    setResults([]);
    setSelectedResultId(null);
    setActiveTab("Workspace");
    processMutation.reset();
    setQueueStats({ total: 0, completed: 0, failed: 0 });
    window.localStorage.removeItem(snapshotStorageKey);
    setNotice({
      tone: "success",
      message: "Workspace cleared. You can start fresh.",
    });
  }

  function loadSample() {
    setSourceMode("sample");
    setPastedText(sampleDocument.text);
    setSourceUrl("");
    setQueuedFiles([]);
    setNotice({
      tone: "info",
      message: "Sample loaded. Process it to verify the full pipeline quickly.",
    });
    setActiveTab("Workspace");
  }

  async function readClipboard() {
    if (!navigator.clipboard?.readText) {
      setNotice({
        tone: "error",
        message:
          "Clipboard read is not available in this browser. Paste into the text area instead.",
      });
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      setSourceMode("paste");
      setPastedText(clipboardText);
      setNotice({
        tone: "success",
        message: `Loaded ${clipboardText.length.toLocaleString()} characters from the clipboard.`,
      });
    } catch {
      setNotice({
        tone: "error",
        message:
          "Clipboard permission was denied. Use the paste area directly if the browser blocks clipboard reads.",
      });
    }
  }

  const resultAvailable = currentResult !== null;

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon">
              Universal Document Workbench
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal sm:text-3xl">
              Document intake console
            </h1>
          </div>
          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Project links"
          >
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-ink transition hover:border-lagoon hover:text-lagoon"
              href={appConfig.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              Star on GitHub
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-ink transition hover:border-ember hover:text-ember"
              href={appConfig.paypalUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Heart size={18} aria-hidden="true" />
              PayPal
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-lagoon" aria-hidden="true" />
                <h2 className="text-sm font-bold">Backend</h2>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                  healthQuery.isError
                    ? "bg-red-50 text-red-700"
                    : healthQuery.isLoading
                      ? "bg-slate-100 text-slate-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {healthQuery.isError ? (
                  <AlertTriangle size={14} aria-hidden="true" />
                ) : healthQuery.isLoading ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 size={14} aria-hidden="true" />
                )}
                {healthLabel}
              </span>
            </div>
            <label
              className="mt-4 block text-xs font-bold uppercase text-slate-500"
              htmlFor="apiBaseUrl"
            >
              API URL
            </label>
            <input
              id="apiBaseUrl"
              value={settings.apiBaseUrl}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  apiBaseUrl: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              spellCheck={false}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <Metric
                label="Version"
                value={healthQuery.data?.version ?? appConfig.version}
              />
              <Metric
                label="Commit"
                value={healthQuery.data?.commit ?? appConfig.commit}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <div className="flex items-center gap-2">
              <FileInput size={18} className="text-plum" aria-hidden="true" />
              <h2 className="text-sm font-bold">Input</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  ["upload", "Files"],
                  ["paste", "Paste"],
                  ["url", "URL"],
                  ["sample", "Sample"],
                ] satisfies [SourceMode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSourceMode(value)}
                  className={`rounded-md px-3 py-2 text-sm font-bold ${
                    sourceMode === value
                      ? "bg-ink text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              aria-label="Choose document"
            />
            <input
              ref={stateImportRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) =>
                importWorkspaceState(event.target.files?.item(0) ?? null)
              }
              aria-label="Import workspace state"
            />

            {sourceMode === "upload" ? (
              <div
                className="mt-4 rounded-md border border-slate-200 p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <button
                  type="button"
                  className="flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-plum hover:bg-violet-50"
                  onClick={chooseFiles}
                >
                  <Upload size={26} className="text-plum" aria-hidden="true" />
                  <span className="text-sm font-bold">
                    {queuedFiles.length > 0
                      ? `${queuedFiles.length} file(s) queued`
                      : "Choose or drop files"}
                  </span>
                  <span className="text-xs text-slate-600">
                    Supports batch processing in the current browser session.
                  </span>
                </button>
                {queuedFiles.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {queuedFiles.slice(0, 4).map((file) => (
                      <li
                        key={`${file.name}-${file.size}`}
                        className="rounded-md bg-slate-50 px-3 py-2"
                      >
                        {file.name} · {formatBytes(file.size)}
                      </li>
                    ))}
                    {queuedFiles.length > 4 ? (
                      <li className="text-xs text-slate-500">
                        {queuedFiles.length - 4} more file(s) queued.
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {sourceMode === "paste" ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  className="min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  placeholder="Paste raw text or HTML here."
                />
                <button
                  type="button"
                  onClick={readClipboard}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-lagoon hover:text-lagoon"
                >
                  <ClipboardPaste size={16} aria-hidden="true" />
                  Read clipboard
                </button>
              </div>
            ) : null}

            {sourceMode === "url" ? (
              <div className="mt-4 space-y-3">
                <label
                  className="block text-xs font-bold uppercase text-slate-500"
                  htmlFor="sourceUrl"
                >
                  Remote document URL
                </label>
                <input
                  id="sourceUrl"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  placeholder="https://example.com/report.pdf"
                  spellCheck={false}
                />
                <p className="text-xs text-slate-500">
                  This works when the remote host allows browser fetches. If it
                  does not, download the file locally or paste the rendered
                  text.
                </p>
              </div>
            ) : null}

            {sourceMode === "sample" ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-bold">{sampleDocument.filename}</p>
                <p className="mt-2">
                  A built-in text fixture that exercises entities, dates,
                  currency, and URL extraction.
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={processMutation.isPending}
                onClick={processSources}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {processMutation.isPending ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ScanText size={18} aria-hidden="true" />
                )}
                {processMutation.isPending ? "Processing" : "Process source"}
              </button>
              {processMutation.isPending ? (
                <button
                  type="button"
                  onClick={cancelProcessing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-red-400 hover:text-red-700"
                >
                  <XCircle size={18} aria-hidden="true" />
                  Cancel
                </button>
              ) : null}
            </div>

            {queueStats.total > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                <Metric label="Total" value={`${queueStats.total}`} />
                <Metric label="Done" value={`${queueStats.completed}`} />
                <Metric label="Failed" value={`${queueStats.failed}`} />
              </div>
            ) : null}

            {processMutation.isError ? (
              <ProcessingError error={processMutation.error} />
            ) : null}
            {notice ? (
              <div
                className={`mt-3 rounded-md px-3 py-2 text-sm ${
                  notice.tone === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : notice.tone === "error"
                      ? "bg-red-50 text-red-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {notice.message}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <div className="flex items-center gap-2">
              <Settings2 size={18} className="text-lagoon" aria-hidden="true" />
              <h2 className="text-sm font-bold">Settings</h2>
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Autosave session
              <input
                type="checkbox"
                checked={settings.autosave}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    autosave: event.target.checked,
                  }))
                }
              />
            </label>

            <label
              className="mt-3 block text-xs font-bold uppercase text-slate-500"
              htmlFor="historyLimit"
            >
              Saved result history
            </label>
            <select
              id="historyLimit"
              value={settings.historyLimit}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  historyLimit: Number(event.target.value),
                }))
              }
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              {[3, 4, 5, 6, 8, 10, 12].map((count) => (
                <option key={count} value={count}>
                  Keep last {count} result(s)
                </option>
              ))}
            </select>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={exportWorkspaceState}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-lagoon hover:text-lagoon"
              >
                <FileArchive size={16} aria-hidden="true" />
                Export state JSON
              </button>
              <button
                type="button"
                onClick={chooseStateFile}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-lagoon hover:text-lagoon"
              >
                <Import size={16} aria-hidden="true" />
                Import state JSON
              </button>
            </div>
          </section>

          <HistoryPanel
            results={results}
            selectedResultId={currentResult?.id ?? null}
            onSelect={(resultId) => {
              setSelectedResultId(resultId);
              setActiveTab("Analysis");
            }}
          />
        </aside>

        <section className="min-h-[620px] rounded-lg border border-slate-200 bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-lagoon" aria-hidden="true" />
              <h2 className="text-sm font-bold">Workspace</h2>
            </div>
            <ResultSummary result={currentResult} />
          </div>

          <div
            className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3"
            role="tablist"
            aria-label="Result tabs"
          >
            {visibleTabs.map((tab) => {
              const disabled = tab !== "Workspace" && !resultAvailable;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-disabled={disabled}
                  disabled={disabled}
                  className={`rounded-md px-3 py-2 text-sm font-bold ${
                    activeTab === tab
                      ? "bg-ink text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {activeTab === "Workspace" ? (
              <WorkspacePanel
                resultCount={results.length}
                selectedFileName={queuedFiles[0]?.name ?? null}
                queuedCount={queuedFiles.length}
                sourceMode={sourceMode}
                pastedText={pastedText}
                sourceUrl={sourceUrl}
                onLoadSample={loadSample}
                onCopyText={() => {
                  void copyCurrentText();
                }}
                onCopyJson={() => {
                  void copyCurrentJson();
                }}
                onExportState={exportWorkspaceState}
                onImportState={chooseStateFile}
                onClearWorkspace={clearWorkspace}
              />
            ) : null}
            {activeTab === "Analysis" && currentResult ? (
              <AnalysisPanel result={currentResult} />
            ) : null}
            {activeTab === "Text" && currentResult ? (
              <TextPanel
                result={currentResult}
                onCopy={() => {
                  void copyCurrentText();
                }}
              />
            ) : null}
            {activeTab === "Metadata" && currentResult ? (
              <MetadataPanel result={currentResult} />
            ) : null}
            {activeTab === "Entities" && currentResult ? (
              <EntitiesPanel result={currentResult} />
            ) : null}
            {activeTab === "Exports" && currentResult ? (
              <ExportsPanel
                result={currentResult}
                onDownloadState={() => downloadResultJson(currentResult)}
                onCopyJson={() => {
                  void copyCurrentJson();
                }}
              />
            ) : null}
            {activeTab === "Debug" && debugEnabled && currentResult ? (
              <DebugPanel result={currentResult} />
            ) : null}
            {activeTab !== "Workspace" && !currentResult ? (
              <div className="grid min-h-[420px] place-items-center p-8 text-center">
                <div>
                  <FileArchive
                    size={40}
                    className="mx-auto text-slate-300"
                    aria-hidden="true"
                  />
                  <p className="mt-4 text-sm font-semibold text-slate-500">
                    Process a document first, or restore a saved state file.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
