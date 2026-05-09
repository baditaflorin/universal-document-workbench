package processor

import (
	"bytes"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"
)

const SchemaVersion = "phase2-substance/v1"
const textNormalizationLimit = 2 * 1024 * 1024

type SourceAnalysis struct {
	Bytes      []byte
	SHA256     string
	StableID   string
	Analysis   DocumentAnalysis
	Warnings   []string
	Anomalies  []Diagnostic
	Normalized NormalizedText
}

func AnalyzeUpload(upload Upload) (SourceAnalysis, error) {
	bytes, err := readUploadBytes(upload.Path)
	if err != nil {
		return SourceAnalysis{}, err
	}
	return AnalyzeBytes(upload.Filename, upload.MimeType, bytes), nil
}

//nolint:gocyclo // The detector keeps ordered shape precedence in one place so fixture failures are easy to reason about.
func AnalyzeBytes(filename, _ string, data []byte) SourceAnalysis {
	hash := sha256.Sum256(data)
	sourceSHA := hex.EncodeToString(hash[:])
	analysis := DocumentAnalysis{
		Shape:        "unknown",
		ShapeLabel:   "Unknown document",
		Strategy:     "generic_text_extraction",
		LanguageHint: "unknown",
		ScriptHint:   "unknown",
		Confidence:   NewConfidence(0.2),
		Evidence:     []string{},
		Decisions:    []Decision{},
	}
	warnings := make([]string, 0)
	anomalies := make([]Diagnostic, 0)

	if len(data) == 0 {
		normalized := NormalizedText{}
		analysis.Shape = "empty_text"
		analysis.ShapeLabel = "Empty text"
		analysis.Strategy = "stop_empty_input"
		analysis.Empty = true
		analysis.Confidence = NewConfidence(1)
		analysis.Evidence = append(analysis.Evidence, "zero_bytes")
		warnings = append(warnings, "empty_after_normalization")
		anomalies = append(anomalies, Diagnostic{
			Code:     "empty_after_normalization",
			Severity: "error",
			Message:  "No usable text remains after normalization.",
			Evidence: []string{"zero_bytes"},
		})
		return finalizeAnalysis(sourceSHA, data, analysis, warnings, anomalies, normalized)
	}

	lowerName := strings.ToLower(filename)
	lowerSample := strings.ToLower(firstString(data, 2*1024*1024))
	ext := strings.ToLower(filepath.Ext(filename))
	isPDF := bytes.HasPrefix(data, []byte("%PDF-"))
	isZip := bytes.HasPrefix(data, []byte("PK\x03\x04"))
	shouldNormalizeAsText := !isPDF && !isZip
	normalized := NormalizedText{}
	if shouldNormalizeAsText {
		normalized = normalizeTextForAnalysis(data)
		if normalized.Text == "" {
			analysis.Shape = "empty_text"
			analysis.ShapeLabel = "Empty text"
			analysis.Strategy = "stop_empty_input"
			analysis.Empty = true
			analysis.Confidence = NewConfidence(1)
			analysis.Evidence = append(analysis.Evidence, "zero_bytes")
			warnings = append(warnings, "empty_after_normalization")
			anomalies = append(anomalies, Diagnostic{
				Code:     "empty_after_normalization",
				Severity: "error",
				Message:  "No usable text remains after normalization.",
				Evidence: []string{"normalized_text_empty"},
			})
			return finalizeAnalysis(sourceSHA, data, analysis, warnings, anomalies, normalized)
		}
	}

	if isPDF {
		analysis.Evidence = append(analysis.Evidence, "pdf_magic")
		analysis.PageCount = countPDFPages(data)
		analysis.Shape = "pdf_document"
		analysis.ShapeLabel = "PDF document"
		analysis.Strategy = "tika_pdf_text_extraction"
		analysis.Confidence = NewConfidence(0.55)
		if bytes.Contains(data, []byte("/Encrypt")) {
			analysis.Shape = "encrypted_pdf"
			analysis.ShapeLabel = "Encrypted PDF"
			analysis.Strategy = "ask_for_password_or_unencrypted_copy"
			analysis.Encrypted = true
			analysis.Confidence = NewConfidence(0.95)
			analysis.Evidence = append(analysis.Evidence, "pdf_encrypt_dictionary")
			warnings = append(warnings, "encrypted_pdf")
			anomalies = append(anomalies, diagnostic("encrypted_pdf", "error", "This PDF is encrypted and needs a password before text can be extracted.", "pdf_encrypt_dictionary"))
		} else if bytes.Contains(data, []byte("/AcroForm")) {
			analysis.Shape = "form_pdf"
			analysis.ShapeLabel = "Fillable PDF form"
			analysis.Strategy = "tika_form_pdf_text_extraction"
			analysis.Confidence = NewConfidence(0.9)
			analysis.Evidence = append(analysis.Evidence, "acroform")
			warnings = append(warnings, "form_fields_not_extracted")
			anomalies = append(anomalies, diagnostic("form_fields_not_extracted", "warning", "The PDF contains form fields; v2 extracts surrounding text but does not yet return field-value pairs.", "acroform"))
		} else if imageObjectCount(data) >= maxInt(3, analysis.PageCount/2) {
			analysis.Shape = "scanned_pdf"
			analysis.ShapeLabel = "Scanned PDF"
			analysis.Strategy = "ocr_first_pdf_extraction"
			analysis.NeedsOCR = true
			analysis.Confidence = NewConfidence(0.72)
			analysis.Evidence = append(analysis.Evidence, "many_image_xobjects")
			warnings = append(warnings, "ocr_quality_unknown")
			anomalies = append(anomalies, diagnostic("ocr_quality_unknown", "warning", "This looks like a scan. OCR quality can vary by page and should be verified.", "many_image_xobjects"))
		}
		if strings.Contains(lowerName, "arabic") || strings.Contains(lowerName, "arab") {
			analysis.Shape = "non_english_pdf"
			analysis.ShapeLabel = "Non-English or RTL PDF"
			analysis.Strategy = "language_aware_pdf_extraction"
			analysis.LanguageHint = "ar"
			analysis.ScriptHint = "rtl"
			analysis.Confidence = NewConfidence(maxFloat(analysis.Confidence.Score, 0.62))
			analysis.Evidence = append(analysis.Evidence, "rtl_or_non_latin_hint")
			warnings = append(warnings, "unsupported_language_model")
			anomalies = append(anomalies, diagnostic("unsupported_language_model", "warning", "The configured spaCy model is English; entity extraction may be weak for this document.", "rtl_or_non_latin_hint"))
		}
	}

	if isZip && (ext == ".xlsx" || bytes.Contains(data, []byte("xl/workbook.xml"))) {
		analysis.Shape = "spreadsheet"
		analysis.ShapeLabel = "Spreadsheet workbook"
		analysis.Strategy = "tika_spreadsheet_text_extraction"
		analysis.Confidence = NewConfidence(0.92)
		analysis.Evidence = append(analysis.Evidence, "xlsx_zip", "workbook_parts")
		warnings = append(warnings, "spreadsheet_structure_flattened")
		anomalies = append(anomalies, diagnostic("spreadsheet_structure_flattened", "warning", "Workbook sheets and formulas are detected, but export is still a text-oriented representation.", "workbook_parts"))
	}

	if isZip && (ext == ".epub" || bytes.Contains(data, []byte("application/epub+zip"))) {
		analysis.Shape = "ebook"
		analysis.ShapeLabel = "EPUB ebook"
		analysis.Strategy = "tika_epub_chapter_extraction"
		analysis.Confidence = NewConfidence(0.92)
		analysis.Evidence = append(analysis.Evidence, "epub_container", "mimetype_epub")
		warnings = append(warnings, "ebook_structure_flattened")
		anomalies = append(anomalies, diagnostic("ebook_structure_flattened", "warning", "EPUB metadata and chapters are detected, but export currently rebuilds from normalized text.", "epub_container"))
	}

	if strings.Contains(lowerSample, "xmlns:ix=") || strings.Contains(lowerSample, "inline xbrl") || strings.Contains(lowerSample, "us-gaap:") {
		analysis.Shape = "sec_filing"
		analysis.ShapeLabel = "SEC iXBRL filing"
		analysis.Strategy = "sec_filing_text_and_fact_extraction"
		analysis.Confidence = NewConfidence(0.94)
		analysis.Evidence = append(analysis.Evidence, "inline_xbrl")
		if strings.Contains(lowerSample, "cik") || strings.Contains(lowerSample, "entitycentralindexkey") {
			analysis.Evidence = append(analysis.Evidence, "sec_cik")
		}
		warnings = append(warnings, "structured_filing_flattened")
		anomalies = append(anomalies, diagnostic("structured_filing_flattened", "warning", "SEC filing structure and XBRL facts are detected; flat text export may omit downstream financial semantics.", "inline_xbrl"))
	}

	if strings.Contains(lowerSample, "<sec-document>") || strings.Contains(lowerSample, "<submission>") || strings.Contains(lowerSample, "<document>") && strings.Contains(lowerSample, "accession number") {
		analysis.Shape = "sec_submission"
		analysis.ShapeLabel = "SEC multi-document submission"
		analysis.Strategy = "sec_submission_split_then_extract"
		analysis.Confidence = NewConfidence(0.9)
		analysis.Evidence = append(analysis.Evidence, "sec_submission_header", "sec_document_markers")
		warnings = append(warnings, "multi_document_submission")
		anomalies = append(anomalies, diagnostic("multi_document_submission", "warning", "This SEC submission contains multiple embedded documents and exhibits.", "sec_document_markers"))
	}

	if table := inferTable(data, normalized.Text, ext); table.Detected {
		analysis.Shape = "table_data"
		analysis.ShapeLabel = "Tabular data"
		analysis.Strategy = "delimiter_sniff_then_text_export"
		analysis.Table = table
		analysis.Fields = inferFields(table)
		analysis.Confidence = table.Confidence
		analysis.Evidence = append(analysis.Evidence, "csv_delimiter_"+delimiterName(table.Delimiter), "consistent_columns")
		warnings = append(warnings, "table_export_flattened")
		anomalies = append(anomalies, diagnostic("table_export_flattened", "warning", "Rows and columns are detected; Markdown export keeps a preview but does not replace a full CSV workflow.", "consistent_columns"))
	}

	languageHint, scriptHint := inferLanguage(normalized.Text, lowerName)
	if languageHint != "unknown" {
		analysis.LanguageHint = languageHint
		analysis.ScriptHint = scriptHint
		if scriptHint == "rtl" && !contains(analysis.Evidence, "rtl_or_non_latin_hint") {
			analysis.Evidence = append(analysis.Evidence, "rtl_or_non_latin_hint")
		}
	}

	if len(data) > 5*1024*1024 {
		warnings = append(warnings, "large_input")
		anomalies = append(anomalies, diagnostic("large_input", "info", "This is a large input; processing may take longer and remains cancellable.", "size_over_5mb"))
	}

	if isPDF && !bytes.Contains(data, []byte("%%EOF")) {
		analysis.Partial = true
		warnings = append(warnings, "possibly_truncated_pdf")
		anomalies = append(anomalies, diagnostic("possibly_truncated_pdf", "error", "The PDF trailer marker is missing; the file may be truncated.", "missing_pdf_eof"))
	}

	analysis.TextBytes = len(normalized.Text)
	analysis.Evidence = sortedUnique(analysis.Evidence)
	warnings = sortedUnique(warnings)
	analysis.Decisions = append(analysis.Decisions, Decision{
		Code:       "document_shape",
		Message:    "Detected " + analysis.ShapeLabel + ".",
		Confidence: analysis.Confidence,
		Evidence:   analysis.Evidence,
	})

	return finalizeAnalysis(sourceSHA, data, analysis, warnings, anomalies, normalized)
}

func normalizeTextForAnalysis(data []byte) NormalizedText {
	if len(data) <= textNormalizationLimit {
		return NormalizeText(string(data))
	}

	normalized := NormalizeText(firstString(data, textNormalizationLimit))
	normalized.Actions = appendUnique(normalized.Actions, "sampled_large_text_for_analysis")
	return normalized
}

func finalizeAnalysis(sourceSHA string, data []byte, analysis DocumentAnalysis, warnings []string, anomalies []Diagnostic, normalized NormalizedText) SourceAnalysis {
	if analysis.Table.Confidence.Label == "" {
		analysis.Table.Confidence = NewConfidence(0)
	}
	if analysis.Table.HeaderNames == nil {
		analysis.Table.HeaderNames = []string{}
	}
	if analysis.Fields == nil {
		analysis.Fields = []FieldInference{}
	}
	if analysis.Decisions == nil {
		analysis.Decisions = []Decision{}
	}
	if analysis.Evidence == nil {
		analysis.Evidence = []string{}
	}
	analysis.ExpectedActions = expectedActions(analysis, warnings)
	if analysis.ExpectedActions == nil {
		analysis.ExpectedActions = []string{}
	}
	if anomalies == nil {
		anomalies = []Diagnostic{}
	}
	return SourceAnalysis{
		Bytes:      data,
		SHA256:     sourceSHA,
		StableID:   "doc_" + sourceSHA[:16],
		Analysis:   analysis,
		Warnings:   sortedUnique(warnings),
		Anomalies:  sortDiagnostics(anomalies),
		Normalized: normalized,
	}
}

func readUploadBytes(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func firstString(data []byte, limit int) string {
	if len(data) < limit {
		limit = len(data)
	}
	return string(data[:limit])
}

func countPDFPages(data []byte) int {
	return bytes.Count(data, []byte("/Type/Page")) + bytes.Count(data, []byte("/Type /Page"))
}

func imageObjectCount(data []byte) int {
	return bytes.Count(data, []byte("/Subtype/Image")) + bytes.Count(data, []byte("/Subtype /Image"))
}

func inferTable(data []byte, text, ext string) TableAnalysis {
	if ext != ".csv" && ext != ".tsv" && !looksDelimited(text) {
		return TableAnalysis{}
	}

	delimiters := []rune{',', '\t', ';', '|'}
	best := TableAnalysis{}
	for _, delimiter := range delimiters {
		reader := csv.NewReader(strings.NewReader(firstLines(text, 80)))
		reader.Comma = delimiter
		reader.FieldsPerRecord = -1
		reader.LazyQuotes = true
		records, err := reader.ReadAll()
		if err != nil || len(records) < 2 {
			continue
		}
		columns := len(records[0])
		if columns < 2 {
			continue
		}
		consistent := 0
		for _, record := range records[1:] {
			if len(record) == columns {
				consistent++
			}
		}
		score := float64(consistent) / float64(maxInt(1, len(records)-1))
		if score > best.Confidence.Score {
			best = TableAnalysis{
				Detected:    score >= 0.75,
				Delimiter:   string(delimiter),
				Rows:        len(records),
				Columns:     columns,
				Confidence:  NewConfidence(score),
				HeaderNames: cleanHeaders(records[0]),
			}
		}
	}

	if len(data) == 0 {
		return TableAnalysis{}
	}
	return best
}

func looksDelimited(text string) bool {
	first := firstLines(text, 5)
	return strings.Count(first, ",") >= 3 || strings.Count(first, "\t") >= 3 || strings.Count(first, ";") >= 3
}

func firstLines(text string, limit int) string {
	lines := strings.Split(text, "\n")
	if len(lines) < limit {
		limit = len(lines)
	}
	return strings.Join(lines[:limit], "\n")
}

func cleanHeaders(headers []string) []string {
	cleaned := make([]string, 0, len(headers))
	for _, header := range headers {
		cleaned = append(cleaned, strings.TrimSpace(strings.Trim(header, `"`)))
	}
	return cleaned
}

func inferFields(table TableAnalysis) []FieldInference {
	fields := make([]FieldInference, 0, len(table.HeaderNames))
	for _, header := range table.HeaderNames {
		lower := strings.ToLower(header)
		fieldType := "text"
		evidence := []string{"header_name"}
		score := 0.55
		switch {
		case strings.Contains(lower, "date") || strings.HasSuffix(lower, "_at"):
			fieldType = "date"
			score = 0.82
			evidence = append(evidence, "header_date_hint")
		case strings.Contains(lower, "lat") || strings.Contains(lower, "lon") || strings.Contains(lower, "coordinate"):
			fieldType = "number"
			score = 0.8
			evidence = append(evidence, "header_geo_number_hint")
		case strings.Contains(lower, "zip") || strings.Contains(lower, "key") || strings.Contains(lower, "id"):
			fieldType = "identifier"
			score = 0.76
			evidence = append(evidence, "header_identifier_hint")
		case strings.Contains(lower, "url") || strings.Contains(lower, "link"):
			fieldType = "url"
			score = 0.86
			evidence = append(evidence, "header_url_hint")
		case strings.Contains(lower, "email"):
			fieldType = "email"
			score = 0.86
			evidence = append(evidence, "header_email_hint")
		case strings.Contains(lower, "amount") || strings.Contains(lower, "price") || strings.Contains(lower, "currency"):
			fieldType = "money"
			score = 0.82
			evidence = append(evidence, "header_money_hint")
		}
		fields = append(fields, FieldInference{
			Name:       header,
			Type:       fieldType,
			Confidence: NewConfidence(score),
			Evidence:   evidence,
		})
	}
	return fields
}

func inferLanguage(text, filename string) (string, string) {
	if strings.Contains(filename, "arabic") {
		return "ar", "rtl"
	}
	if text == "" {
		return "unknown", "unknown"
	}
	rtl := 0
	latin := 0
	for _, r := range text {
		switch {
		case r >= '\u0590' && r <= '\u08ff':
			rtl++
		case unicode.IsLetter(r) && r <= unicode.MaxASCII:
			latin++
		}
	}
	if rtl > 20 && rtl > latin/5 {
		return "ar", "rtl"
	}
	if latin > 20 {
		return "en", "latin"
	}
	return "unknown", "unknown"
}

func delimiterName(delimiter string) string {
	switch delimiter {
	case ",":
		return "comma"
	case "\t":
		return "tab"
	case ";":
		return "semicolon"
	case "|":
		return "pipe"
	default:
		return "unknown"
	}
}

func expectedActions(analysis DocumentAnalysis, warnings []string) []string {
	actions := make([]string, 0)
	if analysis.Encrypted {
		actions = append(actions, "Upload an unlocked copy or provide a password in a future workflow.")
	}
	if analysis.Empty {
		actions = append(actions, "Choose a file with text or rerun the upstream export.")
	}
	if contains(warnings, "unsupported_language_model") {
		actions = append(actions, "Verify entities manually or configure a language-specific NLP model.")
	}
	if contains(warnings, "ocr_quality_unknown") {
		actions = append(actions, "Review OCR text before relying on the export.")
	}
	if contains(warnings, "table_export_flattened") {
		actions = append(actions, "Check table columns in the preview before using text exports.")
	}
	if len(actions) == 0 {
		actions = append(actions, "Review confidence and export when satisfied.")
	}
	return actions
}

func diagnostic(code, severity, message, evidence string) Diagnostic {
	return Diagnostic{
		Code:     code,
		Severity: severity,
		Message:  message,
		Evidence: []string{evidence},
	}
}

func sortedUnique(items []string) []string {
	seen := make(map[string]struct{}, len(items))
	unique := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		unique = append(unique, item)
	}
	sort.Strings(unique)
	return unique
}

func sortDiagnostics(items []Diagnostic) []Diagnostic {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Severity == items[j].Severity {
			return items[i].Code < items[j].Code
		}
		return items[i].Severity < items[j].Severity
	})
	return items
}

func contains(items []string, item string) bool {
	for _, existing := range items {
		if existing == item {
			return true
		}
	}
	return false
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
