# Phase 2 Real-Data Performance

Measured on 2026-05-09 with:

`CGO_ENABLED=0 go test ./internal/processor -bench BenchmarkAnalyzeRealDataFixtures -run '^$' -benchtime=1x`

Host: Apple M1 Pro, darwin/arm64.

## Analyzer Fixture Results

| Fixture | Time | Allocated |
|---|---:|---:|
| 01-irs-w9.pdf | 2.76 ms | 705 KB |
| 02-apple-10k.htm | 20.32 ms | 13.76 MB |
| 03-apple-submission.txt | 29.14 ms | 18.46 MB |
| 04-sec-financial-report.xlsx | 1.75 ms | 489 KB |
| 05-gutenberg-pride.epub | 11.87 ms | 3.68 MB |
| 06-scanned-legal.pdf | 46.82 ms | 13.61 MB |
| 07-arabic-legal.pdf | 14.43 ms | 4.15 MB |
| 08-password-protected.pdf | 3.97 ms | 616 KB |
| 09-nyc-311.csv | 14.04 ms | 6.42 MB |
| 10-empty-export.txt | 0.04 ms | 320 B |

Median: 12.95 ms. Worst: 46.82 ms.

## Hot Paths Fixed

1. Binary PDFs were normalized as text before shape detection. The analyzer now skips text normalization for PDF/ZIP containers.
2. Large text submissions normalized the full body for analysis. The analyzer now samples the first 2 MB for shape and language inference and records `sampled_large_text_for_analysis` in provenance.
3. Tool version probing ran per processed document. External processor tool versions are cached per process and copied into each result.

## Performance Budget

The Phase 2 analyzer budget is p95 under 100 ms for the 10 real-data fixtures. The current fixture set is under that budget on the measured host.
