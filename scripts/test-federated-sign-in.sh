#!/usr/bin/env bash
# Exerce Better Auth et le proxy Next réels sans installer le monorepo mobile.
set -euo pipefail

task_repo_root="$(cd "$(dirname "$0")/.." && pwd)"
task_harness_dir="$(mktemp -d "${TMPDIR:-/tmp}/idn-oidc-response.XXXXXX")"
trap 'rm -rf "$task_harness_dir"' EXIT

bun add --cwd "$task_harness_dir" --ignore-scripts --exact \
  better-auth@1.6.11 @convex-dev/better-auth@0.12.2 next@16.2.0 zod@4.4.3

python3 - "$task_repo_root" "$task_harness_dir" <<'PY'
import json
from pathlib import Path
import shutil
import sys

source, target = map(Path, sys.argv[1:])
paths = [
    "tests/federated-sign-in.integration.test.ts",
    "apps/web/lib/federated-sign-in.ts",
    "apps/web/lib/consent-flow.ts",
    "apps/web/lib/auth-proxy.ts",
    "apps/web/app/api/auth/[...all]/route.ts",
    "packages/backend/convex/auth.ts",
    "packages/backend/convex/lib/pinSignInPlugin.ts",
    "packages/backend/convex/lib/twoFactorGate.ts",
]
for path in paths:
    (target / path).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / path, target / path)
(target / "tsconfig.json").write_text(json.dumps({
    "compilerOptions": {"baseUrl": ".", "paths": {"@/*": ["apps/web/*"]}}
}))
PY

bun test --cwd "$task_harness_dir" tests/federated-sign-in.integration.test.ts
