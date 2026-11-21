#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec npx --yes @intellectronica/ruler@0.3.46 apply --local-only "$@"
