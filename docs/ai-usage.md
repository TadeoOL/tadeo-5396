# AI usage

The project was planned, documented and built with Claude Code, an AI coding assistant, under the maintainer's direction.

- **Planning**: turning the brief into decision tickets, researching options (payment gateway conventions, browser password hashing, free hosting) and slicing the roadmap into issues.
- **Documentation**: the glossary, ADRs, specs, screen design and delivery docs in `docs/`.
- **Implementation**: the code and its tests, issue by issue, each through a pull request.

**Validation**: the maintainer made the scope and design decisions; every change passed `npm run check` and `ci` before merging, end-to-end tests ran against the production build, and manual checks ran locally and on the live app.
