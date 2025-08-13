#! /usr/bin/env bash
set -e

python /app/app/celeryworker_pre_start.py
echo "Starting celery beat"
celery -A app.worker beat --loglevel=warning -S redbeat.RedBeatScheduler &
echo "Starting celery worker"
celery -A app.worker worker -l warning -Q main-queue -c 1