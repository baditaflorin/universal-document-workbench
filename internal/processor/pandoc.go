package processor

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

func (p ExternalProcessor) exportAll(ctx context.Context, id, filename, text string, source SourceAnalysis) ([]ExportArtifact, []string) {
	baseName := cleanBaseName(filename)
	markdown := buildMarkdown(filename, text, source)
	outputs := []ExportArtifact{
		encodeArtifact("markdown", baseName+".md", "text/markdown;charset=utf-8", []byte(markdown)),
	}

	workDir := filepath.Join(p.cfg.WorkDir, id)
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		return outputs, []string{err.Error()}
	}

	markdownPath := filepath.Join(workDir, "document.md")
	if err := os.WriteFile(markdownPath, []byte(markdown), 0o600); err != nil {
		return outputs, []string{err.Error()}
	}

	warnings := make([]string, 0)
	for _, target := range []struct {
		format   string
		filename string
		mimeType string
	}{
		{"docx", baseName + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
		{"epub", baseName + ".epub", "application/epub+zip"},
	} {
		outputPath := filepath.Join(workDir, target.filename)
		args := []string{
			markdownPath,
			"--metadata", "title=" + strings.TrimSuffix(baseName, filepath.Ext(baseName)),
			"-o", outputPath,
		}
		if _, err := p.runner.Run(ctx, p.cfg.PandocPath, args...); err != nil {
			warnings = append(warnings, err.Error())
			continue
		}

		bytes, err := os.ReadFile(outputPath)
		if err != nil {
			warnings = append(warnings, err.Error())
			continue
		}
		outputs = append(outputs, encodeArtifact(target.format, target.filename, target.mimeType, bytes))
	}

	return outputs, warnings
}

func buildMarkdown(filename, text string, source SourceAnalysis) string {
	title := strings.TrimSuffix(cleanBaseName(filename), filepath.Ext(filename))
	if title == "" {
		title = "Extracted Document"
	}

	var builder strings.Builder
	builder.WriteString("---\n")
	builder.WriteString("schema_version: " + SchemaVersion + "\n")
	builder.WriteString("source_sha256: " + source.SHA256 + "\n")
	builder.WriteString("document_shape: " + source.Analysis.Shape + "\n")
	builder.WriteString("shape_confidence: " + source.Analysis.Confidence.Label + "\n")
	builder.WriteString("strategy: " + source.Analysis.Strategy + "\n")
	if len(source.Warnings) > 0 {
		builder.WriteString("warnings:\n")
		for _, warning := range source.Warnings {
			builder.WriteString("  - " + warning + "\n")
		}
	}
	builder.WriteString("---\n\n")
	builder.WriteString("# " + title + "\n\n")
	if strings.TrimSpace(text) == "" {
		builder.WriteString("> No text was extracted. Review the warnings and source file before using this export.\n")
		return builder.String()
	}

	builder.WriteString(strings.TrimSpace(text))
	builder.WriteString("\n")
	return builder.String()
}
