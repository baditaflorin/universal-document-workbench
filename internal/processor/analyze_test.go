package processor

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type fixtureExpectation struct {
	ID                 string   `json:"id"`
	SHA256             string   `json:"sha256"`
	ExpectedShape      string   `json:"expected_shape"`
	MinShapeConfidence float64  `json:"min_shape_confidence"`
	RequiredEvidence   []string `json:"required_evidence"`
	RequiredWarnings   []string `json:"required_warnings"`
}

func TestAnalyzeRealDataFixtures(t *testing.T) {
	t.Parallel()

	expectationPaths, err := filepath.Glob(filepath.Join("..", "..", "test", "fixtures", "realdata", "*.expected.json"))
	if err != nil {
		t.Fatalf("glob expectations: %v", err)
	}
	if len(expectationPaths) != 10 {
		t.Fatalf("expected 10 real-data expectations, got %d", len(expectationPaths))
	}

	for _, expectationPath := range expectationPaths {
		expectationPath := expectationPath
		t.Run(filepath.Base(expectationPath), func(t *testing.T) {
			t.Parallel()

			expected := readFixtureExpectation(t, expectationPath)
			sourcePath := sourcePathForExpectation(t, expectationPath)
			source := AnalyzeBytes(filepath.Base(sourcePath), "", readFixtureBytes(t, sourcePath))

			if source.SHA256 != expected.SHA256 {
				t.Fatalf("sha mismatch: got %s want %s", source.SHA256, expected.SHA256)
			}
			if source.Analysis.Shape != expected.ExpectedShape {
				t.Fatalf("shape mismatch: got %s want %s evidence=%v warnings=%v", source.Analysis.Shape, expected.ExpectedShape, source.Analysis.Evidence, source.Warnings)
			}
			if source.Analysis.Confidence.Score < expected.MinShapeConfidence {
				t.Fatalf("shape confidence %.2f below %.2f", source.Analysis.Confidence.Score, expected.MinShapeConfidence)
			}
			for _, evidence := range expected.RequiredEvidence {
				if !contains(source.Analysis.Evidence, evidence) {
					t.Fatalf("missing evidence %q in %v", evidence, source.Analysis.Evidence)
				}
			}
			for _, warning := range expected.RequiredWarnings {
				if !contains(source.Warnings, warning) {
					t.Fatalf("missing warning %q in %v", warning, source.Warnings)
				}
			}

			repeated := AnalyzeBytes(filepath.Base(sourcePath), "", readFixtureBytes(t, sourcePath))
			if !reflect.DeepEqual(source.Analysis, repeated.Analysis) ||
				!reflect.DeepEqual(source.Warnings, repeated.Warnings) ||
				!reflect.DeepEqual(source.Anomalies, repeated.Anomalies) ||
				source.StableID != repeated.StableID ||
				source.SHA256 != repeated.SHA256 {
				t.Fatalf("analysis is not deterministic")
			}
		})
	}
}

func TestAnalyzeSyntheticEdgeCases(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name     string
		filename string
		data     []byte
		shape    string
		warning  string
	}{
		{
			name:     "empty",
			filename: "empty.txt",
			data:     []byte{},
			shape:    "empty_text",
			warning:  "empty_after_normalization",
		},
		{
			name:     "encrypted_pdf_marker",
			filename: "locked.pdf",
			data:     []byte("%PDF-1.7\n1 0 obj<</Encrypt 2 0 R /Type /Catalog>>endobj\n%%EOF"),
			shape:    "encrypted_pdf",
			warning:  "encrypted_pdf",
		},
		{
			name:     "truncated_pdf",
			filename: "partial.pdf",
			data:     []byte("%PDF-1.7\n1 0 obj<</Type/Page>>endobj\n"),
			shape:    "pdf_document",
			warning:  "possibly_truncated_pdf",
		},
		{
			name:     "semicolon_csv",
			filename: "people.csv",
			data:     []byte("name;date;amount\nAda Lovelace;1843-01-01;42\nFlorin Badita;2026-05-09;21\n"),
			shape:    "table_data",
			warning:  "table_export_flattened",
		},
		{
			name:     "utf8_bom_crlf_nbsp",
			filename: "notes.txt",
			data:     []byte("\xef\xbb\xbfName:\u00a0Ada\r\nDate:\u00a02026-05-09\r\n"),
			shape:    "unknown",
			warning:  "",
		},
	}

	for _, testCase := range cases {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()
			source := AnalyzeBytes(testCase.filename, "", testCase.data)
			if source.Analysis.Shape != testCase.shape {
				t.Fatalf("shape mismatch: got %s want %s", source.Analysis.Shape, testCase.shape)
			}
			if testCase.warning != "" && !contains(source.Warnings, testCase.warning) {
				t.Fatalf("missing warning %q in %v", testCase.warning, source.Warnings)
			}
			if source.StableID == "" {
				t.Fatalf("stable id is empty")
			}
		})
	}
}

func BenchmarkAnalyzeRealDataFixtures(b *testing.B) {
	fixtures := loadRealDataFixtures(b)
	for _, fixture := range fixtures {
		fixture := fixture
		b.Run(fixture.name, func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				_ = AnalyzeBytes(fixture.name, "", fixture.bytes)
			}
		})
	}
}

type loadedFixture struct {
	name  string
	bytes []byte
}

func loadRealDataFixtures(tb testing.TB) []loadedFixture {
	tb.Helper()
	expectationPaths, err := filepath.Glob(filepath.Join("..", "..", "test", "fixtures", "realdata", "*.expected.json"))
	if err != nil {
		tb.Fatalf("glob expectations: %v", err)
	}
	fixtures := make([]loadedFixture, 0, len(expectationPaths))
	for _, expectationPath := range expectationPaths {
		sourcePath := sourcePathForExpectation(tb, expectationPath)
		fixtures = append(fixtures, loadedFixture{
			name:  filepath.Base(sourcePath),
			bytes: readFixtureBytes(tb, sourcePath),
		})
	}
	return fixtures
}

func sourcePathForExpectation(t testing.TB, expectationPath string) string {
	t.Helper()
	prefix := strings.TrimSuffix(expectationPath, ".expected.json")
	matches, err := filepath.Glob(prefix + ".*")
	if err != nil {
		t.Fatalf("glob source for %s: %v", expectationPath, err)
	}
	for _, match := range matches {
		if strings.HasSuffix(match, ".expected.json") {
			continue
		}
		return match
	}
	t.Fatalf("missing source fixture for %s", expectationPath)
	return ""
}

func readFixtureExpectation(t *testing.T, path string) fixtureExpectation {
	t.Helper()
	bytes := readFixtureBytes(t, path)
	var expected fixtureExpectation
	if err := json.Unmarshal(bytes, &expected); err != nil {
		t.Fatalf("decode expectation %s: %v", path, err)
	}
	return expected
}

func readFixtureBytes(t testing.TB, path string) []byte {
	t.Helper()
	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", path, err)
	}
	return bytes
}
