package processor

import (
	"context"
	"strings"
)

func (p ExternalProcessor) extractImageOCR(ctx context.Context, path string) (string, error) {
	result, err := p.runner.Run(ctx, "tesseract", path, "stdout", "-l", p.cfg.TesseractLang)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(result.Stdout), nil
}
