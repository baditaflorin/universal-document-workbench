//go:build integration

package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/baditaflorin/universal-document-workbench/internal/config"
	"github.com/baditaflorin/universal-document-workbench/internal/httpapi"
	"github.com/baditaflorin/universal-document-workbench/internal/processor"
	"github.com/baditaflorin/universal-document-workbench/pkg/version"
)

func TestReadyEndpointWithStubProcessor(t *testing.T) {
	t.Parallel()

	server := httpapi.NewServer(config.Config{
		PublicOrigin:   "http://example.com",
		MaxUploadBytes: 1024 * 1024,
		WorkDir:        t.TempDir(),
		RequestTimeout: time.Second,
		ToolTimeout:    time.Second,
	}, processor.StubProcessor{Version: "0.1.0", Commit: "test"}, version.Info{
		Version: "0.1.0",
		Commit:  "test",
	}, nil)

	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
}
