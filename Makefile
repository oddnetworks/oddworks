.PHONY: help
.DEFAULT_GOAL := help


SHELL=/bin/bash

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

dev: ## [HOST] - docker-compose run --rm --service-ports web
	@docker-compose run --rm --service-ports oddworks
