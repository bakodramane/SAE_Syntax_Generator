# SAE Syntax Generator

A browser-only, offline-capable expert system that recommends small area estimation (SAE)
methods and generates ready-to-run R and Stata scripts from a description of your survey
microdata and auxiliary data. No data leaves your machine.

**Live app:** https://bakodramane.github.io/SAE_Syntax_Generator/

---

## What it does

Small area estimation bridges the gap between nationally representative surveys and the need
for reliable estimates at district, county, or municipality level. This tool:

1. Lets you describe your data (variable types, what auxiliary data you have, Stata version).
2. Recommends the most appropriate SAE method from a catalogue of 16 methods.
3. Generates a complete, commented R script and Stata `.do` file — ready to run with your
   real variable names filled in.

Target users: statisticians in national statistical offices and development organisations,
including those working in countries where Stata 14 is the installed standard.

---

## Quick start (local development)

```bash
git clone https://github.com/bakodramane/SAE_Syntax_Generator.git
cd SAE_Syntax_Generator
npm install
npm run dev          # opens http://localhost:5173/SAE_Syntax_Generator/
```

Requirements: Node.js ≥ 18.

---

## Running tests

```bash
npm test             # Vitest unit tests (catalogue schema + engine logic)
npx playwright test  # Playwright end-to-end smoke test
```

---

## Building for production

```bash
npm run build        # outputs to dist/
npx vite preview     # serve the built app locally
```

---

## Deployment

The app deploys automatically to GitHub Pages on every merge to `main` via the
`.github/workflows/deploy.yml` workflow. No manual steps are required.

To deploy a fork to your own GitHub Pages, enable Pages (Settings → Pages → Source: GitHub
Actions) and push to your `main` branch.

---

## Adding a new SAE method

See [docs/adding-a-method.md](docs/adding-a-method.md) for a step-by-step guide. No engine
code needs to change — you only create one TypeScript file in `src/catalogue/`.

---

## Stata v14 compatibility

See [docs/stata-v14-notes.md](docs/stata-v14-notes.md) for a full breakdown of which methods
work on Stata 14, which fall back to the `mixed` command, and which require R.

---

## Project structure

```
src/
  catalogue/      # One .ts file per SAE method (human-editable)
  engine/         # Recommender and code-generation logic
  types/          # Shared TypeScript interfaces
docs/
  adding-a-method.md   # Guide for contributing new methods
  stata-v14-notes.md   # Stata version compatibility reference
  SAE-CATALOGUE.md     # Full method taxonomy and design spec
  PHASES.md            # Build plan and acceptance criteria
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

MIT — see [LICENSE](LICENSE).
