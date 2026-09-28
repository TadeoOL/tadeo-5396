# Run TypeScript with Node's type stripping; only the web app has a build

The API and the shared `contracts` package run as TypeScript source on Node 24, which strips types natively, so neither has a build step. `contracts` exports its `.ts` source, and only the React app is built, with Vite. This removes a build order between packages and a second runtime (`tsx`), and dev runs exactly what production runs.

## Considered Options

- **`tsx`**: rejected. It adds a dependency, and dev would run on a different loader than production.
- **Compile with `tsc` to `dist`**: rejected. `contracts` would need its own build, and the packages would have to be built in order before the API could start.

## Consequences

- Only erasable syntax is allowed: no `enum`, `namespace` or parameter properties. `erasableSyntaxOnly` in the base `tsconfig` enforces this.
- Relative imports must carry the `.ts` extension.
- Type errors never stop the server from starting; `typecheck` and CI catch them.
