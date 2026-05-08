package processor

import "context"

type Upload struct {
	Path     string
	Filename string
	MimeType string
	Size     int64
}

type Result struct {
	ID           string            `json:"id"`
	Filename     string            `json:"filename"`
	MimeType     string            `json:"mime_type"`
	SizeBytes    int64             `json:"size_bytes"`
	Text         string            `json:"text"`
	Metadata     map[string]string `json:"metadata"`
	Entities     []Entity          `json:"entities"`
	People       []string          `json:"people"`
	Dates        []string          `json:"dates"`
	Outputs      []ExportArtifact  `json:"outputs"`
	ToolVersions map[string]string `json:"tool_versions"`
	Warnings     []string          `json:"warnings"`
	ProcessingMS int64             `json:"processing_ms"`
}

type Entity struct {
	Text  string `json:"text"`
	Label string `json:"label"`
	Start int    `json:"start"`
	End   int    `json:"end"`
}

type ExportArtifact struct {
	Format    string `json:"format"`
	Filename  string `json:"filename"`
	MimeType  string `json:"mime_type"`
	Base64    string `json:"base64"`
	SizeBytes int64  `json:"size_bytes"`
}

type Processor interface {
	Process(ctx context.Context, upload Upload) (Result, error)
	Ready(ctx context.Context) error
	ToolVersions(ctx context.Context) map[string]string
}
