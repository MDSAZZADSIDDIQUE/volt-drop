# <name> module

Owns <what it owns, in one line> (spec §5).

| | |
|---|---|
| Endpoints | `METHOD /v1/...` (the permission it needs): what it does |
| Public API (`index.ts`) | What other modules may use: the module, services, event definitions and types |
| Tables | `table_name` (notes such as "append-only") |
| Jobs | `task.name` (when it runs) |
| Events | Publishes `aggregate.past_tense`. Handles `other_module.event` |

## How to use it

How other modules call it, and the rules they must follow.

## Provider documentation

Adapters only: each external API this module calls, with the documentation URL and the date it was checked (spec §0).

## Still to come

- `TODO(M<n>)`: what's missing, and why.
