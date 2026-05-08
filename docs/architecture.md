# Architecture

## Context

```mermaid
C4Context
  title Universal Document Workbench
  Person(user, "Researcher / legal analyst / journalist", "Drops files and downloads normalized outputs.")
  System_Boundary(pages, "GitHub Pages") {
    System(frontend, "Static React frontend", "Upload UI, result viewer, export downloads.")
  }
  System_Boundary(server, "Self-hosted Docker backend") {
    System(api, "Go API", "Upload handling, orchestration, metrics.")
    System_Ext(tika, "Apache Tika", "Text and metadata extraction.")
    System_Ext(tesseract, "Tesseract", "OCR.")
    System_Ext(pandoc, "Pandoc", "Markdown, DOCX, EPUB conversion.")
    System_Ext(spacy, "spaCy", "Entities, people, dates.")
  }
  Rel(user, frontend, "Uses", "HTTPS")
  Rel(frontend, api, "Uploads documents", "REST/JSON over HTTPS")
  Rel(api, tika, "Runs CLI", "local process")
  Rel(api, tesseract, "Runs CLI", "local process")
  Rel(api, pandoc, "Runs CLI", "local process")
  Rel(api, spacy, "Runs Python script", "local process")
```

## Containers

```mermaid
C4Container
  title Container View
  Person(user, "User")
  Container_Boundary(ghp, "GitHub Pages") {
    Container(web, "Frontend", "React, Vite, TypeScript", "Static document workbench UI.")
  }
  Container_Boundary(compose, "Docker Compose Server") {
    Container(nginx, "nginx", "nginx:alpine", "TLS, CORS, rate limiting, reverse proxy.")
    Container(app, "API", "Go + Java + Python + native tools", "Document pipeline.")
    Container(prom, "Prometheus", "Optional profile", "Metrics scraping.")
  }
  Rel(user, web, "Loads app", "HTTPS")
  Rel(web, nginx, "Calls API", "HTTPS")
  Rel(nginx, app, "Proxies", "HTTP :8080")
  Rel(prom, app, "Scrapes", "/metrics")
```

## Module Boundaries

- `frontend/` owns the browser UI.
- `internal/httpapi/` owns HTTP routing and API responses.
- `internal/processor/` owns external tool execution and result assembly.
- `deploy/` owns production server topology.
- `docs/` owns GitHub Pages output and project documentation.

