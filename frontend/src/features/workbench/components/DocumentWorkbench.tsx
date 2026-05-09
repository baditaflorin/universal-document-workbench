import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Braces,
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Gauge,
  Github,
  Heart,
  Loader2,
  ScanText,
  Server,
  ShieldCheck,
  Tags,
  Upload,
  XCircle,
} from "lucide-react";
import type { DragEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { appConfig } from "../../../lib/config";
import { downloadBase64, downloadText } from "../../../lib/download";
import { formatBytes, formatDuration } from "../../../lib/format";
import { useLocalStorage } from "../../../lib/useLocalStorage";
import { DocumentApiError, fetchHealth, processDocument } from "../api";
import type {
  Confidence,
  Diagnostic,
  DocumentResult,
  ExportArtifact,
} from "../types";

const primaryTabs = [
  "Analysis",
  "Text",
  "Metadata",
  "Entities",
  "Exports",
] as const;
const debugTab = "Debug" as const;
type Tab = (typeof primaryTabs)[number] | typeof debugTab;

export function DocumentWorkbench() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useLocalStorage(
    "udw.apiBaseUrl",
    appConfig.apiBaseUrl,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Analysis");
  const [isDragging, setIsDragging] = useState(false);
  const debugEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );

  const healthQuery = useQuery({
    queryKey: ["health", apiBaseUrl],
    queryFn: () => fetchHealth(apiBaseUrl),
    staleTime: 15_000,
    retry: false,
  });

  const processMutation = useMutation({
    mutationFn: (file: File) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return processDocument(apiBaseUrl, file, controller.signal);
    },
    onSuccess: () => setActiveTab("Analysis"),
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const result = processMutation.data;

  const healthLabel = useMemo(() => {
    if (healthQuery.isLoading) {
      return "Checking";
    }

    if (healthQuery.isError) {
      return "Offline";
    }

    return healthQuery.data?.status ?? "Unknown";
  }, [healthQuery.data?.status, healthQuery.isError, healthQuery.isLoading]);

  function chooseFile() {
    fileInputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    const file = files?.item(0);
    if (file) {
      abortControllerRef.current?.abort();
      setSelectedFile(file);
      processMutation.reset();
      setActiveTab("Analysis");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function submit() {
    if (selectedFile) {
      processMutation.mutate(selectedFile);
    }
  }

  function cancelProcessing() {
    abortControllerRef.current?.abort();
  }

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
              <Github size={18} aria-hidden="true" />
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
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
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

          <section
            className={`rounded-lg border bg-white p-4 shadow-panel transition ${
              isDragging
                ? "border-lagoon ring-4 ring-teal-100"
                : "border-slate-200"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-plum" aria-hidden="true" />
              <h2 className="text-sm font-bold">Document</h2>
            </div>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              onChange={(event) => handleFiles(event.target.files)}
              aria-label="Choose document"
            />
            <button
              type="button"
              className="mt-4 flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-plum hover:bg-violet-50"
              onClick={chooseFile}
            >
              <FileArchive size={28} className="text-plum" aria-hidden="true" />
              <span className="text-sm font-bold">
                {selectedFile ? selectedFile.name : "Choose file"}
              </span>
              {selectedFile ? (
                <span className="text-xs text-slate-600">
                  {formatBytes(selectedFile.size)}
                </span>
              ) : (
                <span className="text-xs text-slate-600">Drop file</span>
              )}
            </button>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={!selectedFile || processMutation.isPending}
                onClick={submit}
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
                {processMutation.isPending ? "Processing" : "Process"}
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
            {processMutation.isError ? (
              <ProcessingError error={processMutation.error} />
            ) : null}
          </section>
        </aside>

        <section className="min-h-[620px] rounded-lg border border-slate-200 bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-lagoon" aria-hidden="true" />
              <h2 className="text-sm font-bold">Result</h2>
            </div>
            {result ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>{result.filename}</span>
                <span>{formatBytes(result.size_bytes)}</span>
                <span>{formatDuration(result.processing_ms)}</span>
                <ConfidenceBadge confidence={result.analysis.confidence} />
              </div>
            ) : null}
          </div>

          {result ? (
            <ResultView
              result={result}
              activeTab={activeTab}
              debugEnabled={debugEnabled}
              onTabChange={setActiveTab}
            />
          ) : (
            <div className="grid min-h-[520px] place-items-center p-8 text-center">
              <div>
                <Braces
                  size={44}
                  className="mx-auto text-slate-300"
                  aria-hidden="true"
                />
                <p className="mt-4 text-sm font-semibold text-slate-500">
                  {processMutation.isPending ? "Processing" : "No result"}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
      <dt className="font-bold uppercase text-slate-500">{label}</dt>
      <dd className="tabular mt-1 truncate font-mono text-[11px] text-ink">
        {value}
      </dd>
    </div>
  );
}

function ResultView({
  result,
  activeTab,
  debugEnabled,
  onTabChange,
}: {
  result: DocumentResult;
  activeTab: Tab;
  debugEnabled: boolean;
  onTabChange: (tab: Tab) => void;
}) {
  const visibleTabs = debugEnabled ? [...primaryTabs, debugTab] : primaryTabs;

  return (
    <div>
      <div
        className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3"
        role="tablist"
        aria-label="Result tabs"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`rounded-md px-3 py-2 text-sm font-bold ${
              activeTab === tab
                ? "bg-ink text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4">
        {activeTab === "Analysis" ? <AnalysisTab result={result} /> : null}
        {activeTab === "Text" ? <TextTab result={result} /> : null}
        {activeTab === "Metadata" ? <MetadataTab result={result} /> : null}
        {activeTab === "Entities" ? <EntitiesTab result={result} /> : null}
        {activeTab === "Exports" ? <ExportsTab result={result} /> : null}
        {activeTab === "Debug" && debugEnabled ? (
          <DebugTab result={result} />
        ) : null}
      </div>
    </div>
  );
}

function AnalysisTab({ result }: { result: DocumentResult }) {
  const confidenceEntries = Object.entries(result.confidence).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Detected shape
              </p>
              <h3 className="mt-1 text-xl font-bold">
                {result.analysis.shape_label}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {result.analysis.strategy.replaceAll("_", " ")}
              </p>
            </div>
            <ConfidenceBadge confidence={result.analysis.confidence} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <InfoPill
              icon={<FileText size={14} />}
              label={result.analysis.shape}
            />
            <InfoPill
              icon={<Gauge size={14} />}
              label={`${result.analysis.text_bytes.toLocaleString()} text bytes`}
            />
            {result.analysis.page_count > 0 ? (
              <InfoPill
                icon={<FileArchive size={14} />}
                label={`${result.analysis.page_count} pages`}
              />
            ) : null}
            {result.analysis.needs_ocr ? (
              <InfoPill icon={<ScanText size={14} />} label="OCR expected" />
            ) : null}
            {result.analysis.language_hint !== "unknown" ? (
              <InfoPill
                icon={<Tags size={14} />}
                label={`${result.analysis.language_hint}/${result.analysis.script_hint}`}
              />
            ) : null}
          </div>

          {result.analysis.evidence.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Evidence
              </p>
              <ChipList values={result.analysis.evidence} />
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck size={16} aria-hidden="true" />
            Confidence
          </h3>
          <div className="mt-3 space-y-2">
            {confidenceEntries.map(([key, confidence]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-semibold capitalize text-slate-700">
                  {key.replaceAll("_", " ")}
                </span>
                <ConfidenceBadge confidence={confidence} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {result.anomalies.length > 0 ||
      result.analysis.expected_actions.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-2">
          <AnomalyList anomalies={result.anomalies} />
          <section className="rounded-md border border-slate-200 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <CircleAlert size={16} aria-hidden="true" />
              Next steps
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {result.analysis.expected_actions.map((action) => (
                <li key={action} className="rounded-md bg-slate-50 px-3 py-2">
                  {action}
                </li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}

      {result.analysis.table.detected ? (
        <section className="rounded-md border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <BarChart3 size={16} aria-hidden="true" />
            Table inference
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Metric
              label="Rows sampled"
              value={`${result.analysis.table.rows}`}
            />
            <Metric
              label="Columns"
              value={`${result.analysis.table.columns}`}
            />
            <Metric
              label="Delimiter"
              value={result.analysis.table.delimiter || "unknown"}
            />
          </div>
          <ChipList values={result.analysis.table.header_names} />
        </section>
      ) : null}

      {result.analysis.fields.length > 0 ? (
        <section className="overflow-hidden rounded-md border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Field</th>
                <th className="w-36 px-3 py-2">Type</th>
                <th className="w-36 px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {result.analysis.fields.map((field) => (
                <tr key={field.name} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-semibold text-ink">
                    {field.name}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{field.type}</td>
                  <td className="px-3 py-2">
                    <ConfidenceBadge confidence={field.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function TextTab({ result }: { result: DocumentResult }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-600">
          {result.text.length.toLocaleString()} characters
        </p>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold hover:border-lagoon hover:text-lagoon"
          onClick={() =>
            downloadText(
              `${result.filename}.txt`,
              result.text,
              "text/plain;charset=utf-8",
            )
          }
        >
          <Download size={16} aria-hidden="true" />
          TXT
        </button>
      </div>
      <pre className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
        {result.text || "No text extracted"}
      </pre>
    </div>
  );
}

function MetadataTab({ result }: { result: DocumentResult }) {
  const entries = Object.entries(result.metadata).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
          <tr>
            <th className="w-56 px-3 py-2">Key</th>
            <th className="px-3 py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.length > 0 ? (
            entries.map(([key, value]) => (
              <tr key={key} className="border-t border-slate-200">
                <th className="align-top px-3 py-2 font-semibold text-slate-700">
                  {key}
                </th>
                <td className="break-words px-3 py-2 text-slate-600">
                  {value}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-slate-500" colSpan={2}>
                No metadata
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EntitiesTab({ result }: { result: DocumentResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <EntityGroup
          title="People"
          icon={<Tags size={16} aria-hidden="true" />}
          values={result.people}
        />
        <EntityGroup
          title="Dates"
          icon={<Tags size={16} aria-hidden="true" />}
          values={result.dates}
        />
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Text</th>
              <th className="w-32 px-3 py-2">Label</th>
              <th className="w-36 px-3 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {result.entities.length > 0 ? (
              result.entities.map((entity, index) => (
                <tr
                  key={`${entity.start}-${entity.end}-${index}`}
                  className="border-t border-slate-200"
                >
                  <td className="px-3 py-2 font-semibold text-ink">
                    {entity.text}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{entity.label}</td>
                  <td className="px-3 py-2">
                    <ConfidenceBadge confidence={entity.confidence} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={3}>
                  No entities
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntityGroup({
  title,
  icon,
  values,
}: {
  title: string;
  icon: ReactNode;
  values: string[];
}) {
  return (
    <section className="rounded-md border border-slate-200 p-3">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={value}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">None</span>
        )}
      </div>
    </section>
  );
}

function ExportsTab({ result }: { result: DocumentResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {result.outputs.map((artifact) => (
        <ExportButton key={artifact.format} artifact={artifact} />
      ))}
    </div>
  );
}

function ExportButton({ artifact }: { artifact: ExportArtifact }) {
  return (
    <button
      type="button"
      className="flex min-h-28 flex-col justify-between rounded-md border border-slate-200 p-3 text-left transition hover:border-lagoon hover:bg-teal-50"
      onClick={() =>
        downloadBase64(artifact.filename, artifact.base64, artifact.mime_type)
      }
    >
      <span className="inline-flex items-center gap-2 text-sm font-bold uppercase">
        <Download size={16} aria-hidden="true" />
        {artifact.format}
      </span>
      <span className="text-xs text-slate-600">
        {formatBytes(artifact.size_bytes)}
      </span>
      <ConfidenceBadge confidence={artifact.confidence} />
    </button>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const className =
    confidence.label === "high"
      ? "bg-emerald-50 text-emerald-700"
      : confidence.label === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${className}`}
      title={`${Math.round(confidence.score * 100)}% confidence`}
    >
      {confidence.label}
      <span className="tabular">{Math.round(confidence.score * 100)}%</span>
    </span>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
      {icon}
      {label}
    </span>
  );
}

function ChipList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function AnomalyList({ anomalies }: { anomalies: Diagnostic[] }) {
  return (
    <section className="rounded-md border border-slate-200 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <AlertTriangle size={16} aria-hidden="true" />
        Anomalies
      </h3>
      <div className="mt-3 space-y-2">
        {anomalies.length > 0 ? (
          anomalies.map((anomaly) => (
            <div
              key={anomaly.code}
              className={`rounded-md px-3 py-2 text-sm ${
                anomaly.severity === "error"
                  ? "bg-red-50 text-red-800"
                  : anomaly.severity === "warning"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{anomaly.code}</span>
                <span className="text-xs font-bold uppercase">
                  {anomaly.severity}
                </span>
              </div>
              <p className="mt-1">{anomaly.message}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No anomalies detected</p>
        )}
      </div>
    </section>
  );
}

function DebugTab({ result }: { result: DocumentResult }) {
  const debugPayload = {
    ...result,
    outputs: result.outputs.map(({ base64, ...artifact }) => ({
      ...artifact,
      base64_length: base64.length,
    })),
  };

  return (
    <pre className="max-h-[560px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
      {JSON.stringify(debugPayload, null, 2)}
    </pre>
  );
}

function ProcessingError({ error }: { error: Error }) {
  if (error.name === "AbortError") {
    return (
      <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
        Processing cancelled.
      </p>
    );
  }

  if (error instanceof DocumentApiError) {
    return (
      <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
        <p className="font-bold">{error.details.what ?? error.message}</p>
        {error.details.why ? <p className="mt-1">{error.details.why}</p> : null}
        {error.details.now_what ? (
          <p className="mt-1 font-semibold">{error.details.now_what}</p>
        ) : null}
      </div>
    );
  }

  return (
    <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {error.message}
    </p>
  );
}
