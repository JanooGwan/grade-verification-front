# Frontend Development Guidelines

## Project scope

- This repository contains the frontend for the university grade-validation system.
- Preserve existing user changes and never add credentials, applicant records, or other sensitive data to source code or fixtures.
- Treat this directory as an independent Git repository and do not include backend or surrounding business-document files in commits.

## Technology

- Use Node.js 22.20 or newer, pnpm 10, React 19, TypeScript, Vite, and TanStack Query.
- Use `pnpm` and keep `pnpm-lock.yaml` synchronized with `package.json`.
- Prefer platform APIs and existing dependencies before adding a production dependency.

## Architecture

- Organize API code by domain under `src/apis/{domain}`.
- Define API request and response types in each domain's `entity.ts`.
- Send HTTP requests through `src/apis/client.ts`; do not call `fetch` directly from pages or components.
- Keep server state in TanStack Query and use a query-key factory for each domain.
- Put page-specific state and mutations in a page-level `hooks` directory when they are not reusable globally.
- Keep components focused on rendering and user interaction; avoid embedding transport logic in components.

## Styling and code style

- Use two-space indentation, single quotes, semicolons, and trailing commas where supported.
- Keep responsive behavior and visible keyboard focus states when adding UI.
- Use semantic HTML and associate every form label with its input.
- Do not edit generated `dist` or `node_modules` content.

## Environment variables

- Use `VITE_API_PATH` for the backend API base path.
- Document new variables in `.env.example` and never commit `.env` files.

## Verification

- Run `pnpm lint` after frontend code changes.
- Run `pnpm build` for API, routing, dependency, or build-configuration changes.
- Do not claim completion when lint or build fails.

## Git workflow

- Work on `develop` unless the user requests another branch.
- Keep commits small and focused on one coherent change.
- Push completed work when the user has explicitly authorized it.
- Use commit messages in the form `type: 한국어 설명` with types such as `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, and `test`.
