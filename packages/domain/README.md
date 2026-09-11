# @voltdrop/domain

Pure business logic shared by the API and the apps. It has no framework, database or UI code, which dependency-cruiser enforces. Its only runtime dependencies are `zod` and `uuid`.

| Module | What it does | Decisions |
|---|---|---|
| `money` | Integer-pence `Money`, safe arithmetic, basis-point percentages, exact allocation, en-GB formatting | ADR-0012 |
| `vat` | VAT split per line from VAT-inclusive prices, VAT on top of fees, VAT breakdowns | ADR-0012, ADR-0005 |
| `ids` | UUIDv7 ids with entity tags | spec §6 |
| `refs` | Human references such as `VD-7K3Q9A`, plus lenient parsing for support | spec §6 |
| `state-machine` | Explicit transition tables; illegal transitions throw | spec §6 |
| `schemas` | Shared zod schemas (problem details, money) | spec §6 |

Rules:
- All money goes through `money`. Never do arithmetic on `amountMinor` directly, and never use floats.
- Clients display money and never compute totals; the server computes every total (spec §6).

Commands:
- `pnpm --filter @voltdrop/domain test` runs the tests with coverage. The money and VAT folders must stay at 100%.
- `pnpm --filter @voltdrop/domain build` compiles to `dist/`.
