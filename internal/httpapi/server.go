package httpapi

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/baditaflorin/universal-document-workbench/internal/config"
	"github.com/baditaflorin/universal-document-workbench/internal/processor"
	"github.com/baditaflorin/universal-document-workbench/pkg/version"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-playground/validator/v10"
)

type Server struct {
	cfg       config.Config
	processor processor.Processor
	version   version.Info
	logger    *slog.Logger
	metrics   *Metrics
	validate  *validator.Validate
}

func NewServer(cfg config.Config, docProcessor processor.Processor, info version.Info, logger *slog.Logger) *Server {
	return &Server{
		cfg:       cfg,
		processor: docProcessor,
		version:   info,
		logger:    logger,
		metrics:   NewMetrics(),
		validate:  validator.New(validator.WithRequiredStructEnabled()),
	}
}

func (s *Server) Handler() http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(s.metrics.Middleware)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.AllowedOrigins(),
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	router.Get("/healthz", s.handleHealth)
	router.Get("/readyz", s.handleReady)
	router.Handle("/metrics", s.metrics.Handler())

	router.Route("/api/v1", func(r chi.Router) {
		r.Get("/version", s.handleVersion)
		r.Post("/documents", s.handleDocumentUpload)
	})

	return router
}

func (s *Server) HTTPServer() *http.Server {
	return &http.Server{
		Addr:              s.cfg.Addr,
		Handler:           s.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       s.cfg.RequestTimeout + 10*time.Second,
		WriteTimeout:      s.cfg.RequestTimeout + 10*time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": s.version.Version,
		"commit":  s.version.Commit,
	})
}

func (s *Server) handleVersion(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.version)
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.processor.Ready(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "not_ready", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ready",
		"version": s.version.Version,
		"commit":  s.version.Commit,
	})
}

func (s *Server) handleDocumentUpload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes)
	if err := r.ParseMultipartForm(s.cfg.MaxUploadBytes); err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "upload_too_large", "Upload exceeds the configured size limit.")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing_file", "Multipart field 'file' is required.")
		return
	}
	defer file.Close()

	if header.Size <= 0 {
		writeError(w, http.StatusBadRequest, "empty_file", "Uploaded file is empty.")
		return
	}

	upload, cleanup, err := s.saveUpload(file, header.Filename, header.Header.Get("Content-Type"), header.Size)
	if err != nil {
		s.logger.Error("failed to save upload", "error", err)
		writeError(w, http.StatusInternalServerError, "save_failed", "Could not save uploaded file.")
		return
	}
	defer cleanup()

	ctx, cancel := context.WithTimeout(r.Context(), s.cfg.RequestTimeout)
	defer cancel()

	result, err := s.processor.Process(ctx, upload)
	if err != nil {
		s.logger.Error("document processing failed", "error", err)
		writeError(w, http.StatusUnprocessableEntity, "processing_failed", err.Error())
		return
	}

	s.metrics.ObserveDocument(result.SizeBytes, result.ProcessingMS)
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) saveUpload(reader io.Reader, filename, mimeType string, size int64) (processor.Upload, func(), error) {
	if err := os.MkdirAll(s.cfg.WorkDir, 0o755); err != nil {
		return processor.Upload{}, func() {}, err
	}

	safeName := filepath.Base(filename)
	if safeName == "." || safeName == string(filepath.Separator) || safeName == "" {
		safeName = "document"
	}

	uploadDir, err := os.MkdirTemp(s.cfg.WorkDir, "upload-*")
	if err != nil {
		return processor.Upload{}, func() {}, err
	}

	cleanup := func() {
		if err := os.RemoveAll(uploadDir); err != nil {
			s.logger.Warn("failed to remove upload directory", "path", uploadDir, "error", err)
		}
	}

	path := filepath.Join(uploadDir, safeName)
	target, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		cleanup()
		return processor.Upload{}, func() {}, err
	}
	defer target.Close()

	written, err := io.Copy(target, reader)
	if err != nil {
		cleanup()
		return processor.Upload{}, func() {}, err
	}
	if written != size && size > 0 {
		s.logger.Warn("multipart size differs from copied bytes", "declared", size, "written", written)
	}

	if err := s.validate.Var(safeName, "required"); err != nil {
		cleanup()
		return processor.Upload{}, func() {}, fmt.Errorf("invalid filename: %w", err)
	}

	return processor.Upload{
		Path:     path,
		Filename: safeName,
		MimeType: mimeType,
		Size:     written,
	}, cleanup, nil
}

func IsServerClosed(err error) bool {
	return errors.Is(err, http.ErrServerClosed)
}
