# =============================================================================
#   PROJECT:   @redkubes/otomi-api (Node.js + TypeScript)
#   USAGE:     make <target> [PM=npm]
# =============================================================================

PM        ?= npm
RUN       = $(PM) run

# —–– Phony targets —––––––––––––––––––––––––––––––––––––––––––––––––––––––––
.PHONY: help install dev dev\:node watch start \
        test test\:pattern lint lint-fix lint-staged \
        typecheck build build\:models build\:spec clean \
        prepare commit commit-retry \
        release release-minor release\:client pre-release\:client \
        run-if-changed license-sign

# —–– Help —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
help: ## Show this help message
	@grep -E '^[a-zA-Z0-9_:/-]+:.*?##' Makefile \
		| awk 'BEGIN {print "\nUsage:"} {split($$0,a,":"); printf "  make %-20s %s\n", a[1], a[2]}' \
		| sed 's/## //g'

# —–– Install dependencies –––––––––––––––––––––––––––––––––––––––––––––––––––
install: ## npm ci (clean install)
	$(PM) ci

# —–– Development —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
dev: ## npm run dev (parallel watch & run)
	$(RUN) dev

docker: ## npm run dev:docker (dockerized dev)
	$(RUN) dev:docker

start: ## npm start (run built app)
	$(PM) start

# —–– Testing & linting –––––––––––––––––––––––––––––––––––––––––––––––––––––
test: ## npm run test (build models & run tests)
	$(RUN) test

lint: ## npm run lint (typecheck & lint)
	$(RUN) lint

# —–– Build –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
build: ## npm run build (clean, build models, compile & copy assets)
	$(RUN) build

# —–– Clean up —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
clean: ## remove dist artifacts
	rm -rf dist

