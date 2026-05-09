package processor

import "context"

type Upload struct {
	Path     string
	Filename string
	MimeType string
	Size     int64
}

type Result struct {
	ID           string                `json:"id"`
	Filename     string                `json:"filename"`
	MimeType     string                `json:"mime_type"`
	SizeBytes    int64                 `json:"size_bytes"`
	Text         string                `json:"text"`
	Metadata     map[string]string     `json:"metadata"`
	Entities     []Entity              `json:"entities"`
	People       []string              `json:"people"`
	Dates        []string              `json:"dates"`
	Outputs      []ExportArtifact      `json:"outputs"`
	ToolVersions map[string]string     `json:"tool_versions"`
	Warnings     []string              `json:"warnings"`
	Analysis     DocumentAnalysis      `json:"analysis"`
	Confidence   map[string]Confidence `json:"confidence"`
	Anomalies    []Diagnostic          `json:"anomalies"`
	Provenance   Provenance            `json:"provenance"`
	ProcessingMS int64                 `json:"processing_ms"`
}

type Entity struct {
	Text       string     `json:"text"`
	Label      string     `json:"label"`
	Start      int        `json:"start"`
	End        int        `json:"end"`
	Confidence Confidence `json:"confidence"`
}

type ExportArtifact struct {
	Format     string     `json:"format"`
	Filename   string     `json:"filename"`
	MimeType   string     `json:"mime_type"`
	Base64     string     `json:"base64"`
	SizeBytes  int64      `json:"size_bytes"`
	Confidence Confidence `json:"confidence"`
}

type Processor interface {
	Process(ctx context.Context, upload Upload) (Result, error)
	Ready(ctx context.Context) error
	ToolVersions(ctx context.Context) map[string]string
}

type Confidence struct {
	Score float64 `json:"score"`
	Label string  `json:"label"`
}

type DocumentAnalysis struct {
	Shape           string           `json:"shape"`
	ShapeLabel      string           `json:"shape_label"`
	Strategy        string           `json:"strategy"`
	NeedsOCR        bool             `json:"needs_ocr"`
	Encrypted       bool             `json:"encrypted"`
	Empty           bool             `json:"empty"`
	Partial         bool             `json:"partial"`
	LanguageHint    string           `json:"language_hint"`
	ScriptHint      string           `json:"script_hint"`
	PageCount       int              `json:"page_count"`
	TextBytes       int              `json:"text_bytes"`
	Table           TableAnalysis    `json:"table"`
	Fields          []FieldInference `json:"fields"`
	Decisions       []Decision       `json:"decisions"`
	Confidence      Confidence       `json:"confidence"`
	Evidence        []string         `json:"evidence"`
	ExpectedActions []string         `json:"expected_actions"`
}

type TableAnalysis struct {
	Detected    bool       `json:"detected"`
	Delimiter   string     `json:"delimiter"`
	Rows        int        `json:"rows"`
	Columns     int        `json:"columns"`
	Confidence  Confidence `json:"confidence"`
	HeaderNames []string   `json:"header_names"`
}

type FieldInference struct {
	Name       string     `json:"name"`
	Type       string     `json:"type"`
	Confidence Confidence `json:"confidence"`
	Evidence   []string   `json:"evidence"`
}

type Decision struct {
	Code       string     `json:"code"`
	Message    string     `json:"message"`
	Confidence Confidence `json:"confidence"`
	Evidence   []string   `json:"evidence"`
}

type Diagnostic struct {
	Code     string   `json:"code"`
	Severity string   `json:"severity"`
	Message  string   `json:"message"`
	Evidence []string `json:"evidence"`
}

type Provenance struct {
	SchemaVersion       string            `json:"schema_version"`
	SourceSHA256        string            `json:"source_sha256"`
	SourceBytes         int64             `json:"source_bytes"`
	SourceFilename      string            `json:"source_filename"`
	GeneratedAt         string            `json:"generated_at"`
	AppVersion          string            `json:"app_version"`
	Commit              string            `json:"commit"`
	Strategy            string            `json:"strategy"`
	Parameters          map[string]string `json:"parameters"`
	ToolVersions        map[string]string `json:"tool_versions"`
	Normalizations      []string          `json:"normalizations"`
	RuntimeOnlyFields   []string          `json:"runtime_only_fields"`
	DeterminismContract string            `json:"determinism_contract"`
}
