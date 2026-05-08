package processor

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

func (p ExternalProcessor) exportAll(ctx context.Context, id, filename, text string) ([]ExportArtifact, []string) {
	baseName := cleanBaseName(filename)
	markdown := buildMarkdown(filename, text)
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

func buildMarkdown(filename, text string) string {
	title := strings.TrimSuffix(cleanBaseName(filename), filepath.Ext(filename))
	if title == "" {
		title = "Extracted Document"
	}

	return "# " + title + "\n\n" + strings.TrimSpace(text) + "\n"
}
