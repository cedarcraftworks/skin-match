# skin-match — find your next skincare product from your own records

[日本語](README.md) | **English**

[![CI](https://github.com/cedarcraftworks/skin-match/actions/workflows/ci.yml/badge.svg)](https://github.com/cedarcraftworks/skin-match/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-live-b5566b)](https://cedarcraftworks.github.io/skin-match/)

A web app that compares a candidate product's full ingredient list (Japanese labeling) against the products **you** recorded as "worked for my skin" or "didn't", and explains what they have in common — with the evidence, never a verdict.

**[▶ Open the demo](https://cedarcraftworks.github.io/skin-match/)** — no sign-up; it runs on a fictional user's records.

## The problem

Finding skincare that suits your skin takes many failed attempts. When a product that worked is discontinued, or when you move from toner to moisturizer, you start from scratch. Reading the ingredient list alone doesn't tell you whether it will suit *you*.

## What it does

1. Record each product you used with its ingredient list and whether it worked.
2. Paste a candidate's ingredient list; each ingredient is sorted into:
   - **In common** — in at least half of the products that worked ("in 4 of the 4 that worked")
   - **Caution** — only in products that didn't work
   - **Mixed** — in some that worked, or in both
   - **No data** — never tried
3. See your overall pattern across all records.

Spelling variants in Japanese labels (e.g. 精製水 → 水, ヒアルロン酸ナトリウム → ヒアルロン酸Na) are unified with a shared [alias dictionary](contract/ingredient-aliases.json) before counting.

## Design decisions

- **No AI skin diagnosis.** An individual can't collect labeled data to prove accuracy, so the app shows only counted facts from the user's own records.
- **No claims.** It never says "suits your skin" or "X caused it"; a disclaimer is always shown.
- **Deterministic.** The same input always gives the same result; the rule is pinned by [shared test cases](contract/cases.json).
- **Private by default.** Every query is scoped to the owner; other users' records return 404.

## Architecture

| Part | Stack | Role |
| --- | --- | --- |
| [web/](web) | TypeScript, React, esbuild | UI; the demo also judges in the browser |
| [api/](api) | Java 21, Spring Boot 3, Flyway, PostgreSQL | Auth, products and usage records, forwards the owner's records to the analyzer |
| [analyzer/](analyzer) | Python 3.12, FastAPI | Ingredient parsing/normalization and judging |
| [contract/](contract) | JSON | Alias dictionary and test cases that both Python and TypeScript must pass |

## Run and test

```bash
cd web && npm install && npm run dev          # demo UI only
docker compose up --build                      # PostgreSQL + analyzer + API
cd analyzer && pytest                          # Python
cd api && mvn verify                           # Java (needs PostgreSQL)
cd web && npm test && npm run typecheck        # TypeScript
```

All three run on every push in GitHub Actions.

## Disclaimer

This app shows patterns in your own records and does not guarantee that a product suits your skin. See a dermatologist for skin symptoms. All product names in the demo are fictional.

## License

[MIT](LICENSE)
