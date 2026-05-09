package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/baditaflorin/universal-document-workbench/internal/config"
	"github.com/baditaflorin/universal-document-workbench/internal/httpapi"
	"github.com/baditaflorin/universal-document-workbench/internal/processor"
	"github.com/baditaflorin/universal-document-workbench/internal/utils"
	"github.com/baditaflorin/universal-document-workbench/pkg/version"
)

var (
	appVersion = "0.3.0"
	appCommit  = "dev"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if utils.HandleErrorOrLogWithMessages(err, "configuration failed", "") {
		os.Exit(1)
	}

	info := version.Info{Version: appVersion, Commit: appCommit}
	server := httpapi.NewServer(cfg, chooseProcessor(cfg, info), info, logger).HTTPServer()

	go func() {
		logger.Info("server listening", "addr", cfg.Addr, "mode", cfg.ProcessorMode)
		err := server.ListenAndServe()
		if err != nil && !httpapi.IsServerClosed(err) {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	shutdownCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-shutdownCtx.Done()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server stopped")
}

func chooseProcessor(cfg config.Config, info version.Info) processor.Processor {
	if strings.EqualFold(cfg.ProcessorMode, "stub") {
		return processor.StubProcessor{Version: info.Version, Commit: info.Commit}
	}

	return processor.NewExternalProcessor(processor.ExternalConfig{
		WorkDir:       cfg.WorkDir,
		TikaJar:       cfg.TikaJar,
		TesseractLang: cfg.TesseractLang,
		SpacyModel:    cfg.SpacyModel,
		SpacyScript:   cfg.SpacyScript,
		PandocPath:    cfg.PandocPath,
		ToolTimeout:   cfg.ToolTimeout,
		Version:       info.Version,
		Commit:        info.Commit,
	})
}
