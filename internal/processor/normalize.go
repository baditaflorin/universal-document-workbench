package processor

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

type NormalizedText struct {
	Text    string
	Actions []string
}

func NormalizeText(input string) NormalizedText {
	actions := make([]string, 0)
	text := input

	if strings.HasPrefix(text, "\ufeff") {
		text = strings.TrimPrefix(text, "\ufeff")
		actions = append(actions, "removed_utf8_bom")
	}

	if strings.Contains(text, "\r\n") || strings.Contains(text, "\r") {
		text = strings.ReplaceAll(text, "\r\n", "\n")
		text = strings.ReplaceAll(text, "\r", "\n")
		actions = append(actions, "normalized_line_endings")
	}

	if strings.Contains(text, "\u00a0") {
		text = strings.ReplaceAll(text, "\u00a0", " ")
		actions = append(actions, "replaced_nbsp")
	}

	if strings.Contains(text, "\u200b") || strings.Contains(text, "\u200c") || strings.Contains(text, "\u200d") {
		text = strings.NewReplacer("\u200b", "", "\u200c", "", "\u200d", "").Replace(text)
		actions = append(actions, "removed_zero_width_characters")
	}

	if !utf8.ValidString(text) {
		text = strings.ToValidUTF8(text, "�")
		actions = append(actions, "replaced_invalid_utf8")
	}

	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = collapseHorizontalWhitespace(strings.TrimSpace(line))
	}
	text = strings.TrimSpace(strings.Join(lines, "\n"))

	if text != strings.TrimSpace(input) {
		actions = appendUnique(actions, "trimmed_and_collapsed_whitespace")
	}

	return NormalizedText{Text: text, Actions: actions}
}

func collapseHorizontalWhitespace(input string) string {
	var builder strings.Builder
	lastWasSpace := false
	for _, r := range input {
		if unicode.IsSpace(r) && r != '\n' {
			if !lastWasSpace {
				builder.WriteRune(' ')
			}
			lastWasSpace = true
			continue
		}
		lastWasSpace = false
		builder.WriteRune(r)
	}
	return builder.String()
}

func appendUnique(items []string, item string) []string {
	for _, existing := range items {
		if existing == item {
			return items
		}
	}
	return append(items, item)
}
