# Bitty Manual Guidance

## Identity and Scope

`bitty-manual` is the canonical, user-facing documentation repository for the Bitty ecosystem.
It holds end-user guides, configuration references, Lua API references, and troubleshooting material.

It must remain concise, accurate, and free of internal architectural debates or unresolved RFC discussions.

## Anti-Drift Rule (Strict)

Every configuration field or API documented in this repository must correspond to an actual, implemented feature in the Bitty core or official extension suite.

- Run `just verify-schema` to validate configuration references against `schemas/config-fields.json`.
- Do not invent configuration knobs, parameters, or API signatures.

## Language Policy

- The `en/` tree is the canonical source of truth for all content.
- Translations (e.g. `zh-CN/`) must reflect an accepted revision of the corresponding English document.
- Code syntax, API names, error codes, and configuration keys are never translated.

## Quality Gates

Before pushing or completing work, ensure all local checks pass:

```bash
just check
```
