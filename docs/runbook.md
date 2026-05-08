# Runbook

## Local

```sh
make dev
make test
make smoke
```

By default `make dev` runs the backend in stub mode. Use the Docker stack for the full Apache Tika, Tesseract, Pandoc, and spaCy toolchain.

## Production Backend

```sh
docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml up -d
```

## Logs

```sh
docker compose -f deploy/docker-compose.yml logs -f app
docker compose -f deploy/docker-compose.yml logs -f nginx
```

## Health

```sh
curl https://YOUR_BACKEND_HOST/healthz
curl https://YOUR_BACKEND_HOST/readyz
```

## Expected Resources

Minimum:

- CPU: 2 cores
- RAM: 4 GB
- Disk: 10 GB free

Recommended for OCR-heavy batches:

- CPU: 4+ cores
- RAM: 8 GB
- Disk: 50 GB free temp space

## Common Failures

- `/readyz` fails: check Java, Tika jar, Tesseract, Pandoc, Python, and spaCy model availability inside the container.
- Upload returns `413`: raise `APP_MAX_UPLOAD_BYTES` and nginx `client_max_body_size` together.
- Entity detection warning: verify `APP_SPACY_MODEL` is installed in the image.
- DOCX/EPUB export warning: verify Pandoc is available.

