package processor

import (
	"context"
	"encoding/base64"
	"os"
	"strings"
	"time"
)

type StubProcessor struct {
	Version string
	Commit  string
}

func (p StubProcessor) Process(_ context.Context, upload Upload) (Result, error) {
	start := time.Now()
	content, err := os.ReadFile(upload.Path)
	if err != nil {
		return Result{}, err
	}

	text := strings.TrimSpace(string(content))
	if text == "" {
		text = "Florin met Ada Lovelace in Bucharest on 8 May 2026."
	}

	markdown := "# Extracted Document\n\n" + text + "\n"
	return Result{
		ID:        "stub-document",
		Filename:  upload.Filename,
		MimeType:  upload.MimeType,
		SizeBytes: upload.Size,
		Text:      text,
		Metadata: map[string]string{
			"Content-Type": upload.MimeType,
			"Processor":    "stub",
		},
		Entities: []Entity{
			{Text: "Florin", Label: "PERSON", Start: 0, End: 6},
			{Text: "Ada Lovelace", Label: "PERSON", Start: 11, End: 23},
			{Text: "Bucharest", Label: "GPE", Start: 27, End: 36},
			{Text: "8 May 2026", Label: "DATE", Start: 40, End: 50},
		},
		People:       []string{"Ada Lovelace", "Florin"},
		Dates:        []string{"8 May 2026"},
		Outputs:      stubOutputs(upload.Filename, markdown),
		ToolVersions: p.ToolVersions(context.Background()),
		Warnings:     []string{"Stub processor mode is active."},
		ProcessingMS: time.Since(start).Milliseconds(),
	}, nil
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
