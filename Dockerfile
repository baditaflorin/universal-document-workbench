ARG GO_VERSION=1.26
ARG TIKA_VERSION=3.3.0

FROM golang:${GO_VERSION}-bookworm AS builder
WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
ARG VERSION=0.1.0
ARG COMMIT=dev
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -trimpath \
    -ldflags="-s -w -X main.appVersion=${VERSION} -X main.appCommit=${COMMIT}" \
    -o /out/universal-document-workbench ./cmd/server

FROM python:3.12-slim-bookworm AS runtime
ARG TIKA_VERSION=3.3.0
ARG VERSION=0.1.0
ARG COMMIT=dev

LABEL org.opencontainers.image.title="Universal Document Workbench" \
      org.opencontainers.image.description="Document extraction, OCR, NLP, and conversion API." \
      org.opencontainers.image.source="https://github.com/baditaflorin/universal-document-workbench" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

ENV APP_ENV=production \
    APP_ADDR=:8080 \
    APP_WORK_DIR=/tmp/universal-document-workbench \
    APP_TIKA_JAR=/opt/tika/tika-app.jar \
    APP_TESSERACT_LANG=eng \
    APP_SPACY_MODEL=en_core_web_sm \
    APP_SPACY_SCRIPT=/app/scripts/spacy_entities.py \
    APP_PANDOC_PATH=pandoc \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      openjdk-17-jre-headless \
      pandoc \
      tini \
      tesseract-ocr \
      tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/tika \
    && curl -fsSL "https://repo1.maven.org/maven2/org/apache/tika/tika-app/${TIKA_VERSION}/tika-app-${TIKA_VERSION}.jar" \
      -o /opt/tika/tika-app.jar

RUN pip install --no-cache-dir "spacy==3.8.7" \
    && python -m spacy download en_core_web_sm

RUN groupadd --system app && useradd --system --gid app --home-dir /app --create-home app
WORKDIR /app
COPY --from=builder /out/universal-document-workbench /usr/local/bin/universal-document-workbench
COPY scripts/spacy_entities.py /app/scripts/spacy_entities.py
RUN chmod +x /usr/local/bin/universal-document-workbench /app/scripts/spacy_entities.py \
    && mkdir -p /tmp/universal-document-workbench \
    && chown -R app:app /app /tmp/universal-document-workbench /opt/tika

USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/healthz >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/universal-document-workbench"]
