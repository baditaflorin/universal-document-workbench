package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/baditaflorin/universal-document-workbench/internal/processor"
)

type errorResponse struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	What      string `json:"what"`
	Why       string `json:"why"`
	NowWhat   string `json:"now_what"`
	Severity  string `json:"severity"`
	Retryable bool   `json:"retryable"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{
		Error: apiError{
			Code:      code,
			Message:   message,
			What:      message,
			Why:       "The request could not be completed in its current form.",
			NowWhat:   "Review the upload and try again.",
			Severity:  "recoverable",
			Retryable: false,
		},
	})
}

func writeProcessorError(w http.ResponseWriter, err error) {
	var processingErr processor.ProcessingError
	if errors.As(err, &processingErr) {
		writeJSON(w, http.StatusUnprocessableEntity, errorResponse{
			Error: apiError{
				Code:      processingErr.Code,
				Message:   processingErr.What,
				What:      processingErr.What,
				Why:       processingErr.Why,
				NowWhat:   processingErr.NowWhat,
				Severity:  processingErr.Severity,
				Retryable: processingErr.Retryable,
			},
		})
		return
	}

	writeJSON(w, http.StatusUnprocessableEntity, errorResponse{
		Error: apiError{
			Code:      "processing_failed",
			Message:   "Document processing failed.",
			What:      "Document processing failed.",
			Why:       err.Error(),
			NowWhat:   "Try another export of the document, or inspect the file for corruption.",
			Severity:  "recoverable",
			Retryable: true,
		},
	})
}
