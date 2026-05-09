package processor

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type ExternalConfig struct {
	WorkDir       string
	TikaJar       string
	TesseractLang string
	SpacyModel    string
	SpacyScript   string
	PandocPath    string
	ToolTimeout   time.Duration
	Version       string
	Commit        string
}

type ExternalProcessor struct {
	cfg    ExternalConfig
	runner CommandRunner
}

var externalToolVersionCache sync.Map

func NewExternalProcessor(cfg ExternalConfig) ExternalProcessor {
	return ExternalProcessor{
		cfg:    cfg,
		runner: CommandRunner{Timeout: cfg.ToolTimeout},
	}
}

func (p ExternalProcessor) Process(ctx context.Context, upload Upload) (Result, error) {
	start := time.Now()
	if err := os.MkdirAll(p.cfg.WorkDir, 0o755); err != nil {
		return Result{}, err
	}

	source, err := AnalyzeUpload(upload)
	if err != nil {
		return Result{}, err
	}
	if source.Analysis.Encrypted {
		return Result{}, ProcessingError{
			Code:      "encrypted_pdf",
			What:      "This PDF is encrypted.",
			Why:       "The file contains a PDF encryption dictionary, so text cannot be extracted without unlocking it first.",
			NowWhat:   "Upload an unlocked copy, or decrypt the PDF locally and try again.",
			Severity:  "recoverable",
			Retryable: false,
		}
	}

	mimeType := upload.MimeType
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = detectMimeType(upload.Path)
	}

	warnings := make([]string, 0)
	text, tikaWarnings, err := p.extractText(ctx, upload.Path)
	warnings = append(warnings, tikaWarnings...)
	if err != nil {
		return Result{}, ProcessingError{
			Code:      "text_extraction_failed",
			What:      "Text extraction failed.",
			Why:       "Apache Tika could not parse the uploaded file into text.",
			NowWhat:   "Try a simpler export of the file, or upload the original source document if this copy is damaged.",
			Severity:  "recoverable",
			Retryable: true,
			Err:       err,
		}
	}
	text = NormalizeText(text).Text

	metadata, metadataWarnings := p.extractMetadata(ctx, upload.Path)
	warnings = append(warnings, metadataWarnings...)

	if strings.TrimSpace(text) == "" && strings.HasPrefix(mimeType, "image/") {
		ocrText, err := p.extractImageOCR(ctx, upload.Path)
		if err != nil {
			warnings = append(warnings, err.Error())
		} else {
			text = NormalizeText(ocrText).Text
		}
	}

	if strings.TrimSpace(text) == "" && source.Analysis.NeedsOCR && source.Analysis.Shape == "scanned_pdf" {
		ocrText, err := p.extractPDFOCR(ctx, upload.Path, filepath.Join(p.cfg.WorkDir, source.StableID, "ocr"))
		if err != nil {
			warnings = append(warnings, "pdf_ocr_failed: "+err.Error())
		} else {
			text = NormalizeText(ocrText).Text
		}
	}

	entities, people, dates, entityWarnings := p.detectEntities(ctx, text)
	warnings = append(warnings, entityWarnings...)

	outputs, exportWarnings := p.exportAll(ctx, source.StableID, upload.Filename, text, source)
	warnings = append(warnings, exportWarnings...)

	toolVersions := p.ToolVersions(ctx)
	return buildBaseResult(upload, source, mimeType, text, metadata, entities, people, dates, outputs, toolVersions, p.cfg.Version, p.cfg.Commit, map[string]string{
		"entity_model": p.cfg.SpacyModel,
		"ocr_language": p.cfg.TesseractLang,
	}, start, warnings), nil
}

func (p ExternalProcessor) Ready(ctx context.Context) error {
	if _, err := os.Stat(p.cfg.TikaJar); err != nil {
		return fmt.Errorf("tika jar is not available: %w", err)
	}

	for _, name := range []string{"java", "pdftoppm", "tesseract", "python3", p.cfg.PandocPath} {
		if _, err := exec.LookPath(name); err != nil {
			return fmt.Errorf("%s is not available: %w", name, err)
		}
	}

	if _, err := p.runner.Run(ctx, "python3", "-c", "import spacy"); err != nil {
		return fmt.Errorf("spacy is not importable: %w", err)
	}

	return nil
}

func (p ExternalProcessor) ToolVersions(ctx context.Context) map[string]string {
	cacheKey := strings.Join([]string{p.cfg.Version, p.cfg.Commit, p.cfg.PandocPath, p.cfg.TikaJar}, "|")
	if cached, ok := externalToolVersionCache.Load(cacheKey); ok {
		if versions, ok := cached.(map[string]string); ok {
			return copyStringMap(versions)
		}
	}

	versions := map[string]string{
		"backend": p.cfg.Version,
		"commit":  p.cfg.Commit,
		"mode":    "external",
	}

	commands := map[string][]string{
		"java":      {"java", "-version"},
		"pdftoppm":  {"pdftoppm", "-v"},
		"tesseract": {"tesseract", "--version"},
		"pandoc":    {p.cfg.PandocPath, "--version"},
		"python":    {"python3", "--version"},
	}

	for key, command := range commands {
		result, err := p.runner.Run(ctx, command[0], command[1:]...)
		if err != nil {
			versions[key] = "unavailable"
			continue
		}
		output := strings.TrimSpace(result.Stdout)
		if output == "" {
			output = strings.TrimSpace(result.Stderr)
		}
		versions[key] = firstLine(output)
	}

	externalToolVersionCache.Store(cacheKey, copyStringMap(versions))
	return copyStringMap(versions)
}

func detectMimeType(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return "application/octet-stream"
	}
	defer file.Close()

	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil {
		return "application/octet-stream"
	}

	return http.DetectContentType(buffer[:n])
}

func cleanBaseName(filename string) string {
	base := filepath.Base(filename)
	base = strings.TrimSpace(base)
	if base == "." || base == "/" || base == "" {
		return "document"
	}
	return strings.NewReplacer("/", "_", "\\", "_", ":", "_").Replace(base)
}

func encodeArtifact(format, filename, mimeType string, bytes []byte) ExportArtifact {
	return ExportArtifact{
		Format:    format,
		Filename:  filename,
		MimeType:  mimeType,
		Base64:    base64.StdEncoding.EncodeToString(bytes),
		SizeBytes: int64(len(bytes)),
	}
}

func firstLine(output string) string {
	lines := strings.Split(output, "\n")
	if len(lines) == 0 {
		return ""
	}
	return strings.TrimSpace(lines[0])
}
