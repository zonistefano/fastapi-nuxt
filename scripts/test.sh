#!/usr/bin/env bash
set -euo pipefail
export PROJECT_ROOT
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_directory=$(mktemp -d)
export TEST_ENV_FILE="$test_directory/.env"
# Never accept the development project name or load the developer's .env.
project_name="template-tests-$$"
compose=(docker compose --project-name "$project_name" --env-file "$TEST_ENV_FILE" -f "$PROJECT_ROOT/docker-compose.test.yml")
cleanup() {
  status=$?
  trap - EXIT
  if ! "${compose[@]}" down --volumes --remove-orphans; then
    echo "Could not clean up test project $project_name" >&2
    if [ "$status" -eq 0 ]; then status=1; fi
  fi
  rm -rf "$test_directory"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 "$PROJECT_ROOT/scripts/init.py" --env-file "$TEST_ENV_FILE"
mkdir -p "$PROJECT_ROOT/backend/htmlcov"
"${compose[@]}" run --build --rm -T backend bash scripts/tests-start.sh "$@"
