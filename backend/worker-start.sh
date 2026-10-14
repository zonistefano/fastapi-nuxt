#!/usr/bin/env bash
set -euo pipefail
python /app/app/celeryworker_pre_start.py
exec celery -A app.worker worker --loglevel=warning -Q main-queue -c 1
