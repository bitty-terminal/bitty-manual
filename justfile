# bitty-manual quality commands

prettier_version := "3.9.6"
markdownlint_version := "0.23.1"
actionlint_version := "1.7.12"

# Default gate: run all checks
check: fmt-check markdownlint actionlint verify-schema package

# Format all Markdown, JSON, and script files
fmt:
    bunx --bun prettier@{{prettier_version}} --write . --ignore-unknown

# Check formatting without changing files
fmt-check:
    bunx --bun prettier@{{prettier_version}} --check . --ignore-unknown

# Lint all Markdown files
markdownlint:
    bunx --bun markdownlint-cli2@{{markdownlint_version}}

# Lint GitHub Actions workflows
actionlint:
    @if command -v actionlint >/dev/null 2>&1; then \
        actionlint .github/workflows/*.yml; \
    else \
        echo "actionlint not found, skipping workflow linting"; \
    fi

# Verify documented configuration fields against authoritative bitty-config schema
verify-schema:
    bun scripts/verify-config-schema.mjs

# Package documentation bundle and offline search index for bitty doc and CDN
package:
    bun scripts/package-manual.mjs

# Alias for package
build: package

# Dry-run R2 upload simulation
upload-r2-dry: package
    bun scripts/upload-r2.mjs --dry-run

# Upload packaged manual to Cloudflare R2
upload-r2: package
    bun scripts/upload-r2.mjs
