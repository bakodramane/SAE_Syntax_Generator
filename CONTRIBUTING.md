# Contributing to SAE Syntax Generator

Thank you for your interest in improving this tool. Contributions from statisticians,
developers, and domain experts are all welcome.

---

## Code of conduct

Be respectful and constructive. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
(v2.1). Harassment of any kind will not be tolerated.

---

## How to open an issue

Go to [GitHub Issues](https://github.com/bakodramane/SAE_Syntax_Generator/issues) and choose
the most appropriate template:

- **Bug report** — something does not work as documented.
- **Method correction** — a formula, reference, or caveat in a catalogue entry is wrong.
- **New method request** — a SAE method is missing from the catalogue.
- **Documentation improvement** — unclear or missing explanation.

Please include: the browser and OS, the exact steps to reproduce (if a bug), and what you
expected vs. what happened.

---

## How to submit a pull request

1. Fork the repository and clone your fork.
2. Create a branch: `git checkout -b fix/my-fix` or `feat/my-feature`.
3. Make your changes (see *Coding conventions* below).
4. Run `npm run build`, `npm test`, and `npm run lint` — all must pass.
5. Open a pull request against `main` with a clear description of what changed and why.

---

## Adding a new SAE method

This is the most common type of contribution. See
[docs/adding-a-method.md](docs/adding-a-method.md) for a complete step-by-step guide. You
do not need to touch the engine code; you only create one TypeScript catalogue file.

---

## Coding conventions

- **TypeScript strict mode** — no `any` types; `tsc --noEmit` must pass.
- **Tailwind CSS** — use utility classes; do not add custom CSS unless unavoidable.
- **UK English** with the Oxford comma in all user-facing text and documentation.
- **No comments on obvious code** — only add a comment when the *why* is non-obvious.
- **Conventional commits** — `feat:`, `fix:`, `test:`, `docs:`, `chore:` prefixes.
- **No self-merging** — open a pull request and wait for review.

---

## Local development

```bash
npm install
npm run dev          # development server with hot reload
npm test             # Vitest unit tests
npx playwright test  # end-to-end smoke test
npm run lint         # ESLint
npm run build        # production build
```

---

## Licence

By contributing you agree that your work will be released under the
[MIT Licence](LICENSE).
