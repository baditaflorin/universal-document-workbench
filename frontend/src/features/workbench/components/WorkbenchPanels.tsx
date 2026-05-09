import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  FileArchive,
  FileText,
  Gauge,
  History,
  Import,
  ScanText,
  ShieldCheck,
  Tags,
} from "lucide-react";
import type { ReactNode } from "react";
import { downloadBase64, downloadText } from "../../../lib/download";
import { formatBytes, formatDuration } from "../../../lib/format";
import { DocumentApiError } from "../api";
import type {
  Confidence,
  Diagnostic,
  DocumentResult,
  ExportArtifact,
} from "../types";
import type { SourceMode } from "../state";

export function ResultSummary({ result }: { result: DocumentResult | null }) {
  if (!result) {
    return (
      <span className="text-xs text-slate-500">No processed document yet</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span>{result.filename}</span>
      <span>{formatBytes(result.size_bytes)}</span>
      <span>{formatDuration(result.processing_ms)}</span>
      <ConfidenceBadge confidence={result.analysis.confidence} />
    </div>
  );
}

export function WorkspacePanel({
  resultCount,
  selectedFileName,
  queuedCount,
  sourceMode,
  pastedText,
  sourceUrl,
  onLoadSample,
  onCopyText,
  onCopyJson,
  onExportState,
  onImportState,
  onClearWorkspace,
}: {
  resultCount: number;
  selectedFileName: string | null;
  queuedCount: number;
  sourceMode: SourceMode;
  pastedText: string;
  sourceUrl: string;
  onLoadSample: () => void;
  onCopyText: () => void;
  onCopyJson: () => void;
  onExportState: () => void;
  onImportState: () => void;
  onClearWorkspace: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 lg:grid-cols-3">
        <Metric label="Results saved" value={`${resultCount}`} />
        <Metric label="Queue length" value={`${queuedCount}`} />
        <Metric label="Active intake" value={sourceMode} />
      </section>

      <section className="rounded-md border border-slate-200 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 size={16} aria-hidden="true" />
          Working set
        </h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <p>
            Selected file: <strong>{selectedFileName ?? "none"}</strong>
          </p>
          <p>
            Paste draft:{" "}
            <strong>
              {pastedText.trim().length > 0
                ? `${pastedText.trim().length.toLocaleString()} chars`
                : "empty"}
            </strong>
          </p>
          <p>
            Source URL: <strong>{sourceUrl || "not set"}</strong>
          </p>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <History size={16} aria-hidden="true" />
          Session actions
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ActionButton
            icon={<FileText size={16} />}
            label="Load sample"
            onClick={onLoadSample}
          />
          <ActionButton
            icon={<Copy size={16} />}
            label="Copy text"
            onClick={onCopyText}
          />
          <ActionButton
            icon={<Copy size={16} />}
            label="Copy JSON"
            onClick={onCopyJson}
          />
          <ActionButton
            icon={<Download size={16} />}
            label="Export state"
            onClick={onExportState}
          />
          <ActionButton
            icon={<Import size={16} />}
            label="Import state"
            onClick={onImportState}
          />
          <ActionButton
            icon={<AlertTriangle size={16} />}
            label="Start fresh"
            onClick={onClearWorkspace}
          />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 p-4">
        <h3 className="text-sm font-bold">How this build behaves</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="rounded-md bg-slate-50 px-3 py-2">
            Paste, upload, and sample intake can all be processed into the same
            backend pipeline.
          </li>
          <li className="rounded-md bg-slate-50 px-3 py-2">
            State export captures the processed results, settings, active tab,
            and intake drafts.
          </li>
          <li className="rounded-md bg-slate-50 px-3 py-2">
            Remote URL loading depends on the target allowing browser fetches;
            when it does not, the UI explains the next step instead of failing
            silently.
          </li>
        </ul>
      </section>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-lagoon hover:text-lagoon"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export function AnalysisPanel({ result }: { result: DocumentResult }) {
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

export function TextPanel({
  result,
  onCopy,
}: {
  result: DocumentResult;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-600">
          {result.text.length.toLocaleString()} characters
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold hover:border-lagoon hover:text-lagoon"
            onClick={onCopy}
          >
            <Copy size={16} aria-hidden="true" />
            Copy
          </button>
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
      </div>
      <pre className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
        {result.text || "No text extracted"}
      </pre>
    </div>
  );
}

export function MetadataPanel({ result }: { result: DocumentResult }) {
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

export function EntitiesPanel({ result }: { result: DocumentResult }) {
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

export function ExportsPanel({
  result,
  onDownloadState,
  onCopyJson,
}: {
  result: DocumentResult;
  onDownloadState: () => void;
  onCopyJson: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {result.outputs.map((artifact) => (
          <ExportButton key={artifact.format} artifact={artifact} />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ActionButton
          icon={<Download size={16} />}
          label="Download state JSON"
          onClick={onDownloadState}
        />
        <ActionButton
          icon={<Copy size={16} />}
          label="Copy result JSON"
          onClick={onCopyJson}
        />
      </div>
    </div>
  );
}

export function DebugPanel({ result }: { result: DocumentResult }) {
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

export function HistoryPanel({
  results,
  selectedResultId,
  onSelect,
}: {
  results: DocumentResult[];
  selectedResultId: string | null;
  onSelect: (resultId: string) => void;
}) {
  return (
    <section className="rounded-md border border-slate-200 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <History size={16} aria-hidden="true" />
        Recent results
      </h2>
      <div className="mt-3 space-y-2">
        {results.length > 0 ? (
          results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-md border px-3 py-3 text-left transition ${
                item.id === selectedResultId
                  ? "border-lagoon bg-teal-50"
                  : "border-slate-200 hover:border-lagoon hover:bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink">
                  {item.filename}
                </span>
                <ConfidenceBadge confidence={item.analysis.confidence} />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {formatBytes(item.size_bytes)} ·{" "}
                {formatDuration(item.processing_ms)} ·{" "}
                {item.analysis.shape_label}
              </p>
            </button>
          ))
        ) : (
          <p className="text-sm text-slate-500">No saved results yet.</p>
        )}
      </div>
    </section>
  );
}

export function ProcessingError({ error }: { error: Error }) {
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

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
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

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
      <dt className="font-bold uppercase text-slate-500">{label}</dt>
      <dd className="tabular mt-1 truncate font-mono text-[11px] text-ink">
        {value}
      </dd>
    </div>
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
