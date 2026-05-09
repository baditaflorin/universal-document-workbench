SHELL := /bin/bash

APP_NAME := universal-document-workbench
APP_VERSION ?= 0.2.0
GIT_COMMIT ?= $(shell git log --format=%h --invert-grep --extended-regexp --grep='^chore: (publish|refresh pages build)' -1 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo dev)
IMAGE ?= ghcr.io/baditaflorin/$(APP_NAME)

.PHONY: help install-hooks dev build build-frontend build-backend data test test-go test-frontend test-integration smoke lint fmt pages-preview docker-build docker-push release compose-up compose-down clean hooks-pre-commit hooks-commit-msg hooks-pre-push hooks-post-checkout

help: ## list all targets
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install-hooks: ## wire .githooks
	git config core.hooksPath .githooks
	chmod +x .githooks/* scripts/*.sh

dev: ## run locally
	./scripts/dev.sh

build: build-frontend build-backend ## build frontend and backend

build-frontend: ## build frontend into docs
	APP_VERSION=$(APP_VERSION) GIT_COMMIT=$(GIT_COMMIT) ./scripts/build-pages.sh

build-backend: ## compile Go backend
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.appVersion=$(APP_VERSION) -X main.appCommit=$(GIT_COMMIT)" -o bin/$(APP_NAME) ./cmd/server

data: ## no-op for Mode C
	@echo "Mode C has no static data pipeline."

test: test-go test-frontend ## run unit tests

test-go: ## run Go tests
	CGO_ENABLED=0 go test ./...

test-frontend: ## run frontend tests
	npm --prefix frontend test

test-integration: ## run integration tests
	CGO_ENABLED=0 go test -tags=integration ./test/integration/...

smoke: ## run local smoke tests
	./scripts/smoke.sh

lint: ## all linters
	CGO_ENABLED=0 go vet ./...
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run; else echo "golangci-lint not installed; skipping"; fi
	npm --prefix frontend run lint
	npm --prefix frontend run fmt:check
	npm --prefix frontend run typecheck

fmt: ## autoformat
	gofmt -w cmd internal pkg test
	npm --prefix frontend run fmt

pages-preview: ## serve docs locally as GitHub Pages
	node scripts/static-server.mjs docs 4173 /universal-document-workbench

docker-build: ## build amd64 image
	docker buildx build --platform linux/amd64 --build-arg VERSION=$(APP_VERSION) --build-arg COMMIT=$(GIT_COMMIT) -t $(IMAGE):latest -t $(IMAGE):$(GIT_COMMIT) .

docker-push: ## push image to ghcr
	docker buildx build --platform linux/amd64 --push --build-arg VERSION=$(APP_VERSION) --build-arg COMMIT=$(GIT_COMMIT) -t $(IMAGE):latest -t $(IMAGE):$(GIT_COMMIT) .

release: test build docker-push ## tag and push release
	git tag v$(APP_VERSION)
	git push origin v$(APP_VERSION)

compose-up: ## run local stack
	docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml up -d

compose-down: ## stop local stack
	docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml down

clean: ## remove generated local files
	rm -rf bin tmp coverage frontend/coverage

hooks-pre-commit: ## run pre-commit checks
	gofmt -w cmd internal pkg test
	CGO_ENABLED=0 go vet ./...
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run; else echo "golangci-lint not installed; skipping"; fi
	npm --prefix frontend run lint
	npm --prefix frontend run fmt:check
	npm --prefix frontend run typecheck
	@if command -v gitleaks >/dev/null 2>&1; then gitleaks protect --staged --verbose; else echo "gitleaks not installed; skipping secret scan"; fi

hooks-commit-msg: ## validate Conventional Commits
	./scripts/validate-commit-msg.sh "$${MESSAGE_FILE:-}"

hooks-pre-push: ## run pre-push checks
	$(MAKE) test
	$(MAKE) build
	$(MAKE) smoke

hooks-post-checkout: ## regenerate generated code
	@echo "No generated client code to refresh yet."
