# Deployment

Production backend image:

```sh
docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml up -d
```

Frontend:

https://baditaflorin.github.io/universal-document-workbench/

Backend image:

ghcr.io/baditaflorin/universal-document-workbench:latest

## First Server Setup

1. Install Docker Engine and Docker Compose.
2. Point DNS for the backend hostname to the server.
3. Issue TLS certificates with certbot and update `deploy/nginx/nginx.conf` certificate paths.
4. Create `deploy/.env` from `deploy/.env.example`.
5. Run `docker compose -f deploy/docker-compose.yml pull`.
6. Run `docker compose -f deploy/docker-compose.yml up -d`.

The public HTTPS listener is also exposed on host port `25342`.

## Rollback

```sh
docker compose -f deploy/docker-compose.yml pull app
docker compose -f deploy/docker-compose.yml up -d app
```

To pin a specific release, edit the image tag in `deploy/docker-compose.yml` to a semver tag such as `v0.1.0`.

## Logs

```sh
docker compose -f deploy/docker-compose.yml logs -f app
docker compose -f deploy/docker-compose.yml logs -f nginx
```

