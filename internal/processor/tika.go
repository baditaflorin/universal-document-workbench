package processor

import (
	"context"
	"encoding/json"
	"strings"
)

func (p ExternalProcessor) extractText(ctx context.Context, path string) (string, []string, error) {
	attempts := [][]string{
		{"-jar", p.cfg.TikaJar, "--text-main", path},
		{"-jar", p.cfg.TikaJar, "-t", path},
	}

	warnings := make([]string, 0)
	for _, args := range attempts {
		result, err := p.runner.Run(ctx, "java", args...)
		if err == nil {
			return strings.TrimSpace(result.Stdout), warnings, nil
		}
		warnings = append(warnings, err.Error())
	}

	return "", warnings, nil
}

func (p ExternalProcessor) extractMetadata(ctx context.Context, path string) (map[string]string, []string) {
	attempts := [][]string{
		{"-jar", p.cfg.TikaJar, "--metadata", "--json", path},
		{"-jar", p.cfg.TikaJar, "-m", path},
	}

	warnings := make([]string, 0)
	for _, args := range attempts {
		result, err := p.runner.Run(ctx, "java", args...)
		if err != nil {
			warnings = append(warnings, err.Error())
			continue
		}

		if metadata := parseMetadata(result.Stdout); len(metadata) > 0 {
			return metadata, warnings
		}
	}

	return map[string]string{}, warnings
}

func parseMetadata(output string) map[string]string {
	metadata := make(map[string]string)
	output = strings.TrimSpace(output)
	if output == "" {
		return metadata
	}

	var object map[string]any
	if err := json.Unmarshal([]byte(output), &object); err == nil {
		flattenMetadata(metadata, object)
		return metadata
	}

	var array []map[string]any
	if err := json.Unmarshal([]byte(output), &array); err == nil {
		for _, item := range array {
			flattenMetadata(metadata, item)
		}
		return metadata
	}

	for _, line := range strings.Split(output, "\n") {
		key, value, ok := strings.Cut(line, ":")
		if ok {
			metadata[strings.TrimSpace(key)] = strings.TrimSpace(value)
		}
	}

	return metadata
}

func flattenMetadata(metadata map[string]string, object map[string]any) {
	for key, value := range object {
		switch typed := value.(type) {
		case string:
			metadata[key] = typed
		case []any:
			parts := make([]string, 0, len(typed))
			for _, item := range typed {
				parts = append(parts, strings.TrimSpace(toString(item)))
			}
			metadata[key] = strings.Join(parts, ", ")
		default:
			metadata[key] = toString(typed)
		}
	}
}

func toString(value any) string {
	bytes, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return strings.Trim(string(bytes), "\"")
}
