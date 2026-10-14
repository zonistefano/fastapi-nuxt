#!/usr/bin/env bash
set -euo pipefail
coverage run --source=app -m pytest
coverage report --show-missing
coverage html --title "${1:-Backend coverage}"
coverage xml
