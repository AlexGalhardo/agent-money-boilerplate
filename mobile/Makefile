# op — Docker stack shortcuts (Unix / macOS / Git-Bash / WSL).
# Windows without `make`: use scripts\stack.ps1 (same verbs).
.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help init up up-build prod down stop restart logs ps migrate psql \
        rebuild-web native native-down test clean nuke

help: ## List targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

init: ## Create .env from the template if missing
	@test -f .env || (cp .env.example .env && echo "created .env — edit it before `make up`")

up: init ## Start the stack (build if needed), detached
	$(COMPOSE) up -d --build

up-build: init ## Force a rebuild and start
	$(COMPOSE) build --no-cache && $(COMPOSE) up -d

prod: init ## Start production-style (ignores docker-compose.override.yml)
	$(COMPOSE) -f docker-compose.yml up -d --build

down: ## Stop and remove containers (keeps the DB volume)
	$(COMPOSE) down

stop: ## Stop containers without removing them
	$(COMPOSE) stop

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Tail logs (all services)
	$(COMPOSE) logs -f --tail=100

ps: ## Show stack status
	$(COMPOSE) ps

migrate: ## Run DB migrations against the running stack
	$(COMPOSE) exec backend bun run db:migrate

psql: ## Open a psql shell on the bundled Postgres
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-op} -d $${POSTGRES_DB:-op}

rebuild-web: ## Rebuild only the web app (after changing EXPO_PUBLIC_* in .env)
	$(COMPOSE) build web && $(COMPOSE) up -d web

native: init ## Start db+backend+Expo dev server for a physical device (Expo Go)
	$(COMPOSE) --profile native up -d --build db backend metro
	@echo "Open  exp://$${LAN_HOST}:$${METRO_PORT:-8082}  in Expo Go"

native-down: ## Stop the native profile
	$(COMPOSE) --profile native down

test: ## Run the full local test suite (no Docker needed)
	bun run test:all

clean: ## Stop and remove containers + named volumes (DROPS the database)
	$(COMPOSE) down -v

nuke: clean ## clean + remove built images
	$(COMPOSE) down --rmi local -v || true
