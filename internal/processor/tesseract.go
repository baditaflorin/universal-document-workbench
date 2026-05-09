package processor

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func (p ExternalProcessor) extractImageOCR(ctx context.Context, path string) (string, error) {
	result, err := p.runner.Run(ctx, "tesseract", path, "stdout", "-l", p.cfg.TesseractLang)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(result.Stdout), nil
}

func (p ExternalProcessor) extractPDFOCR(ctx context.Context, path, workDir string) (string, error) {
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		return "", err
	}

	prefix := filepath.Join(workDir, "page")
	if _, err := p.runner.Run(ctx, "pdftoppm", "-png", "-r", "200", path, prefix); err != nil {
		return "", err
	}

	images, err := filepath.Glob(prefix + "-*.png")
	if err != nil {
		return "", err
	}
	sort.Strings(images)
	if len(images) == 0 {
		return "", fmt.Errorf("no rendered PDF pages were produced")
	}

	var builder strings.Builder
	for index, imagePath := range images {
		result, err := p.runner.Run(ctx, "tesseract", imagePath, "stdout", "-l", p.cfg.TesseractLang)
		if err != nil {
			return "", err
		}
		if index > 0 {
			builder.WriteString("\n\n")
		}
		builder.WriteString(strings.TrimSpace(result.Stdout))
	}

	return strings.TrimSpace(builder.String()), nil
}
