# API

OpenAPI spec:

api/openapi.yaml

Local backend:

http://localhost:8080

Health:

```sh
curl http://localhost:8080/healthz
```

Readiness:

```sh
curl http://localhost:8080/readyz
```

Process a document:

```sh
curl -F "file=@sample.pdf" http://localhost:8080/api/v1/documents
```

Metrics:

```sh
curl http://localhost:8080/metrics
```

