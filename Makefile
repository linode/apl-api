# =============================================================================
#   PROJECT:   @redkubes/otomi-api (Node.js + TypeScript)
#   USAGE:     make <target> [PM=npm]
# =============================================================================

PM        ?= npm
RUN       = $(PM) run

.PHONY: help install dev dev\:node watch start \
        test test\:pattern lint lint-fix lint-staged \
        typecheck build build\:models build\:spec clean \
        prepare commit commit-retry \
        release release-minor release\:client pre-release\:client \
        run-if-changed license-sign

help: ## Show this help message
	@grep -E '^[a-zA-Z0-9_:/-]+:.*?##' Makefile \
		| awk 'BEGIN {print "\nUsage:"} {split($$0,a,":"); printf "  make %-20s %s\n", a[1], a[2]}' \
		| sed 's/## //g'

install: ## npm ci (clean install)
	$(PM) ci

dev: ## npm run dev (parallel watch & run)
	$(RUN) dev

dev\:node: ## npm run dev:node (run with debugger)
	$(RUN) dev:node

watch: ## npm run watch (file watcher)
	$(RUN) watch

start: ## npm start (run built app)
	$(PM) start

test: ## npm run test (build models & run tests)
	$(RUN) test

test\:pattern: ## npm run test:pattern (build models & run pattern-based tests)
	$(RUN) test:pattern

lint: ## npm run lint (typecheck & lint)
	$(RUN) lint

lint-fix: ## npm run lint:fix (auto-fix lint errors)
	$(RUN) lint:fix

lint-staged: ## npm run lint-staged (pre-commit checks)
	$(RUN) lint-staged

typecheck: ## npm run types (tsc --noEmit)
	$(RUN) types

build: ## npm run build (clean, build models, compile & copy assets)
	$(RUN) build

build\:models: ## npm run build:models (generate TS from schema)
	$(RUN) build:models

build\:spec: ## npm run build:spec (build OpenAPI spec)
	$(RUN) build:spec

clean: ## remove dist artifacts
	rm -rf dist

prepare: ## npm run prepare (husky install)
	$(RUN) prepare

commit: ## npm run cz (commitizen)
	$(RUN) cz

commit-retry: ## npm run cz:retry (retry commitizen)
	$(RUN) cz:retry

release: ## npm run release (standard-version)
	$(RUN) release

release-minor: ## npm run release:bump:minor (bump minor version)
	$(RUN) release:bump:minor

release\:client: ## npm run release:client (client-side release script)
	$(RUN) release:client

pre-release\:client: ## npm run pre-release:client (RC client release)
	$(RUN) pre-release:client

run-if-changed: ## npm run run-if-changed (watch file changes)
	$(RUN) run-if-changed

license-sign: ## npm run license:sign (sign license file)
	$(RUN) license:sign
