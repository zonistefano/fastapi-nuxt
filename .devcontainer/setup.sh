#!/usr/bin/env bash
set -euo pipefail
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
uv_version=$(cat "$project_root/.uv-version")
bun_version=$(cat "$project_root/.bun-version")
curl -LsSf "https://astral.sh/uv/$uv_version/install.sh" | sh
curl -fsSL https://bun.sh/install | bash -s "bun-v$bun_version"
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
cd "$project_root"
make setup
