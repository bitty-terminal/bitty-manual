# bitty-manual quality commands

prettier_version := "3.9.6"
markdownlint_version := "0.23.1"
actionlint_version := "1.7.12"

# Default gate: run all checks
check: fmt-check markdownlint verify-schema

# Format all Markdown, JSON, and script files
fmt:
    bunx --bun prettier@{{prettier_version}} --write . --ignore-unknown

# Check formatting without changing files
fmt-check:
    bunx --bun prettier@{{prettier_version}} --check . --ignore-unknown

# Lint all Markdown files
markdownlint:
    bunx --bun markdownlint-cli2@{{markdownlint_version}}

# Verify documented configuration fields against authoritative bitty-config schema
verify-schema:
    bun scripts/verify-config-schema.mjs
