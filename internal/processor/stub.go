package processor

import (
	"context"
	"encoding/base64"
	"time"
)

type StubProcessor struct {
	Version string
	Commit  string
}

func (p StubProcessor) Process(_ context.Context, upload Upload) (Result, error) {
	start := time.Now()
	source, err := AnalyzeUpload(upload)
	if err != nil {
		return Result{}, err
	}

	text := source.Normalized.Text
	entities, people, dates := simpleEntityGuess(text)
	markdown := buildMarkdown(upload.Filename, text, source)
	toolVersions := p.ToolVersions(context.Background())

	return buildBaseResult(upload, source, upload.MimeType, text, map[string]string{
		"Processor": "stub",
	}, entities, people, dates, stubOutputs(upload.Filename, markdown), toolVersions, p.Version, p.Commit, map[string]string{
		"entity_model": "deterministic_regex_stub",
		"ocr_language": "none",
	}, start, []string{"stub_processor_mode"}), nil
}

func (p StubProcessor) Ready(_ context.Context) error {
	return nil
}

func (p StubProcessor) ToolVersions(_ context.Context) map[string]string {
	return map[string]string{
		"backend": p.Version,
		"commit":  p.Commit,
		"mode":    "stub",
	}
}

func stubOutputs(filename, markdown string) []ExportArtifact {
	markdownBytes := []byte(markdown)
	docxBytes := []byte("stub docx artifact for " + filename)
	epubBytes := []byte("stub epub artifact for " + filename)

	return []ExportArtifact{
		{
			Format:    "markdown",
			Filename:  filename + ".md",
			MimeType:  "text/markdown;charset=utf-8",
			Base64:    base64.StdEncoding.EncodeToString(markdownBytes),
			SizeBytes: int64(len(markdownBytes)),
		},
		{
			Format:    "docx",
			Filename:  filename + ".docx",
			MimeType:  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			Base64:    base64.StdEncoding.EncodeToString(docxBytes),
			SizeBytes: int64(len(docxBytes)),
		},
		{
			Format:    "epub",
			Filename:  filename + ".epub",
			MimeType:  "application/epub+zip",
			Base64:    base64.StdEncoding.EncodeToString(epubBytes),
			SizeBytes: int64(len(epubBytes)),
		},
	}
}
