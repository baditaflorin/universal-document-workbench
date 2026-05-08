package httpapi

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	registry         *prometheus.Registry
	httpRequests     *prometheus.CounterVec
	httpDuration     *prometheus.HistogramVec
	documentsTotal   prometheus.Counter
	uploadBytes      prometheus.Histogram
	processingSecond prometheus.Histogram
}

func NewMetrics() *Metrics {
	registry := prometheus.NewRegistry()
	metrics := &Metrics{
		registry: registry,
		httpRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "udw_http_requests_total",
			Help: "HTTP requests by method, route, and status.",
		}, []string{"method", "route", "status"}),
		httpDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "udw_http_request_duration_seconds",
			Help:    "HTTP request duration by method, route, and status.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route", "status"}),
		documentsTotal: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "udw_documents_processed_total",
			Help: "Documents processed successfully.",
		}),
		uploadBytes: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "udw_upload_bytes",
			Help:    "Uploaded document size in bytes.",
			Buckets: []float64{1024, 64 * 1024, 1024 * 1024, 10 * 1024 * 1024, 50 * 1024 * 1024},
		}),
		processingSecond: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "udw_document_processing_duration_seconds",
			Help:    "Document processing duration in seconds.",
			Buckets: []float64{0.1, 0.5, 1, 3, 10, 30, 60, 120},
		}),
	}

	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		metrics.httpRequests,
		metrics.httpDuration,
		metrics.documentsTotal,
		metrics.uploadBytes,
		metrics.processingSecond,
	)

	return metrics
}

func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)

		route := r.URL.Path
		status := strconv.Itoa(recorder.status)
		m.httpRequests.WithLabelValues(r.Method, route, status).Inc()
		m.httpDuration.WithLabelValues(r.Method, route, status).Observe(time.Since(start).Seconds())
	})
}

func (m *Metrics) ObserveDocument(sizeBytes int64, processingMS int64) {
	m.documentsTotal.Inc()
	m.uploadBytes.Observe(float64(sizeBytes))
	m.processingSecond.Observe(float64(processingMS) / 1000)
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
