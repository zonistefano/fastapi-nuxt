#!/usr/bin/env bash
set -euo pipefail
python app/tests_pre_start.py
alembic upgrade head
python app/initial_data.py
bash scripts/test.sh "$@"
