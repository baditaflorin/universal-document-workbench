package httpapi

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/baditaflorin/universal-document-workbench/internal/config"
	"github.com/baditaflorin/universal-document-workbench/internal/processor"
	"github.com/baditaflorin/universal-document-workbench/pkg/version"
)

func TestDocumentUpload(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig(t), processor.StubProcessor{Version: "0.2.0", Commit: "test"}, version.Info{
		Version: "0.2.0",
		Commit:  "test",
	}, nil)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "sample.txt")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write([]byte("Florin met Ada Lovelace in Bucharest on 8 May 2026.")); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/documents", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", response.Code, response.Body.String())
	}

	var result processor.Result
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatalf("decode result: %v", err)
	}
	if result.Filename != "sample.txt" {
		t.Fatalf("expected filename sample.txt, got %s", result.Filename)
	}
	if len(result.Outputs) != 3 {
		t.Fatalf("expected 3 outputs, got %d", len(result.Outputs))
	}
}

func TestHealth(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig(t), processor.StubProcessor{Version: "0.2.0", Commit: "test"}, version.Info{
		Version: "0.2.0",
		Commit:  "test",
	}, nil)

	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
}

func TestDocumentUploadEmptyFileIsAnalyzed(t *testing.T) {
	t.Parallel()

	server := NewServer(testConfig(t), processor.StubProcessor{Version: "0.2.0", Commit: "test"}, version.Info{
		Version: "0.2.0",
		Commit:  "test",
	}, nil)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if _, err := writer.CreateFormFile("file", "empty.txt"); err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/documents", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", response.Code, response.Body.String())
	}

	var result processor.Result
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatalf("decode result: %v", err)
	}
	if result.Analysis.Shape != "empty_text" {
		t.Fatalf("expected empty_text, got %s", result.Analysis.Shape)
	}
	if !contains(result.Warnings, "empty_after_normalization") {
		t.Fatalf("expected empty warning, got %v", result.Warnings)
	}
}

func testConfig(t *testing.T) config.Config {
	t.Helper()
	return config.Config{
		Env:            "test",
		Addr:           ":0",
		PublicOrigin:   "http://example.com",
		MaxUploadBytes: 1024 * 1024,
		WorkDir:        filepath.Join(t.TempDir(), "work"),
		ProcessorMode:  "stub",
		RequestTimeout: time.Second,
		ToolTimeout:    time.Second,
	}
}

func contains(items []string, item string) bool {
	for _, existing := range items {
		if existing == item {
			return true
		}
	}
	return false
}
