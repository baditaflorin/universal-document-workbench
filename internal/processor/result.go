package processor

import (
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

func buildProvenance(upload Upload, source SourceAnalysis, version, commit string, toolVersions map[string]string, parameters map[string]string) Provenance {
	if version == "" {
		version = "dev"
	}
	if commit == "" {
		commit = "dev"
	}
	if parameters == nil {
		parameters = map[string]string{}
	}

	return Provenance{
		SchemaVersion:  SchemaVersion,
		SourceSHA256:   source.SHA256,
		SourceBytes:    int64(len(source.Bytes)),
		SourceFilename: upload.Filename,
		GeneratedAt:    time.Now().UTC().Format(time.RFC3339),
		AppVersion:     version,
		Commit:         commit,
		Strategy:       source.Analysis.Strategy,
		Parameters:     copyStringMap(parameters),
		ToolVersions:   copyStringMap(toolVersions),
		Normalizations: sortedUnique(source.Normalized.Actions),
		RuntimeOnlyFields: []string{
			"processing_ms",
			"provenance.generated_at",
		},
		DeterminismContract: "Same source bytes and configuration produce the same id, analysis, warnings, entities, and export content; processing_ms and generated_at are runtime-only.",
	}
}

func buildConfidenceMap(source SourceAnalysis, text string, metadata map[string]string, entities []Entity, outputs []ExportArtifact) map[string]Confidence {
	textConfidence := confidenceForText(source, text)
	entityConfidence := confidenceForEntities(source, entities)
	exportConfidence := NewConfidence(minFloat(textConfidence.Score, source.Analysis.Confidence.Score))
	if len(outputs) == 0 {
		exportConfidence = NewConfidence(0)
	}
	ocrConfidence := NewConfidence(1)
	if source.Analysis.NeedsOCR {
		ocrConfidence = NewConfidence(0.58)
	}

	metadataScore := 0.45
	if len(metadata) > 1 {
		metadataScore = 0.78
	}

	return map[string]Confidence{
		"document_shape": source.Analysis.Confidence,
		"entities":       entityConfidence,
		"exports":        exportConfidence,
		"metadata":       NewConfidence(metadataScore),
		"ocr":            ocrConfidence,
		"text":           textConfidence,
	}
}

func confidenceForText(source SourceAnalysis, text string) Confidence {
	switch {
	case source.Analysis.Empty || strings.TrimSpace(text) == "":
		return NewConfidence(0.05)
	case source.Analysis.Partial:
		return NewConfidence(0.35)
	case source.Analysis.NeedsOCR:
		return NewConfidence(0.58)
	case source.Analysis.Shape == "spreadsheet" || source.Analysis.Shape == "ebook" || source.Analysis.Shape == "sec_submission":
		return NewConfidence(0.68)
	default:
		return NewConfidence(0.86)
	}
}

func confidenceForEntities(source SourceAnalysis, entities []Entity) Confidence {
	switch {
	case source.Analysis.Empty:
		return NewConfidence(0)
	case contains(source.Warnings, "unsupported_language_model"):
		return NewConfidence(0.25)
	case len(entities) == 0:
		return NewConfidence(0.4)
	default:
		return NewConfidence(0.78)
	}
}

func assignEntityConfidence(entities []Entity, confidence Confidence) []Entity {
	for index := range entities {
		if entities[index].Confidence.Score == 0 && entities[index].Confidence.Label == "" {
			entities[index].Confidence = confidence
		}
	}
	return entities
}

func assignArtifactConfidence(outputs []ExportArtifact, confidence Confidence) []ExportArtifact {
	for index := range outputs {
		outputs[index].Confidence = confidence
	}
	return outputs
}

func mergeWarnings(groups ...[]string) []string {
	merged := make([]string, 0)
	for _, group := range groups {
		merged = append(merged, group...)
	}
	return sortedUnique(merged)
}

func buildMetadata(upload Upload, mimeType string, metadata map[string]string, source SourceAnalysis) map[string]string {
	if metadata == nil {
		metadata = map[string]string{}
	}
	metadata["Content-Type"] = mimeType
	metadata["Document-Shape"] = source.Analysis.Shape
	metadata["Document-Shape-Confidence"] = source.Analysis.Confidence.Label
	metadata["Source-SHA256"] = source.SHA256
	metadata["Schema-Version"] = SchemaVersion
	if upload.Filename != "" {
		metadata["Source-Filename"] = upload.Filename
	}
	return metadata
}

func simpleEntityGuess(text string) ([]Entity, []string, []string) {
	people := sortedRegexMatches(text, regexp.MustCompile(`\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b`))
	dates := sortedRegexMatches(text, regexp.MustCompile(`\b(?:\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b`))
	entities := make([]Entity, 0, len(people)+len(dates))

	for _, person := range people {
		start := strings.Index(text, person)
		entities = append(entities, Entity{
			Text:       person,
			Label:      "PERSON",
			Start:      start,
			End:        start + len(person),
			Confidence: NewConfidence(0.56),
		})
	}
	for _, date := range dates {
		start := strings.Index(text, date)
		entities = append(entities, Entity{
			Text:       date,
			Label:      "DATE",
			Start:      start,
			End:        start + len(date),
			Confidence: NewConfidence(0.74),
		})
	}

	sort.SliceStable(entities, func(i, j int) bool {
		if entities[i].Start == entities[j].Start {
			return entities[i].End < entities[j].End
		}
		return entities[i].Start < entities[j].Start
	})

	return entities, people, dates
}

func sortedRegexMatches(text string, expression *regexp.Regexp) []string {
	matches := expression.FindAllString(text, -1)
	return sortedUnique(matches)
}

func buildBaseResult(upload Upload, source SourceAnalysis, mimeType string, text string, metadata map[string]string, entities []Entity, people []string, dates []string, outputs []ExportArtifact, toolVersions map[string]string, version, commit string, parameters map[string]string, start time.Time, warnings ...[]string) Result {
	text = NormalizeText(text).Text
	metadata = buildMetadata(upload, mimeType, metadata, source)
	entities = assignEntityConfidence(entities, confidenceForEntities(source, entities))
	warningList := mergeWarnings(append([][]string{source.Warnings}, warnings...)...)
	outputConfidence := NewConfidence(minFloat(confidenceForText(source, text).Score, source.Analysis.Confidence.Score))
	outputs = assignArtifactConfidence(outputs, outputConfidence)
	confidence := buildConfidenceMap(source, text, metadata, entities, outputs)

	return Result{
		ID:           source.StableID,
		Filename:     upload.Filename,
		MimeType:     mimeType,
		SizeBytes:    upload.Size,
		Text:         text,
		Metadata:     metadata,
		Entities:     entities,
		People:       sortedUnique(people),
		Dates:        sortedUnique(dates),
		Outputs:      outputs,
		ToolVersions: toolVersions,
		Warnings:     warningList,
		Analysis:     source.Analysis,
		Confidence:   confidence,
		Anomalies:    source.Anomalies,
		Provenance: buildProvenance(upload, source, version, commit, toolVersions, mapWithDefaults(parameters, map[string]string{
			"base_name": strings.TrimSuffix(cleanBaseName(upload.Filename), filepath.Ext(upload.Filename)),
		})),
		ProcessingMS: time.Since(start).Milliseconds(),
	}
}

func mapWithDefaults(values, defaults map[string]string) map[string]string {
	merged := copyStringMap(defaults)
	for key, value := range values {
		merged[key] = value
	}
	return merged
}

func copyStringMap(input map[string]string) map[string]string {
	output := make(map[string]string, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
