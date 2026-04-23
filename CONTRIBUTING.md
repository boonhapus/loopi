# Contributing

Welcome! We appreciate your interest in contributing to this project.

## Dev setup

```bash
bun install
npx playwright install chromium firefox webkit
```

## Running

```bash
node src/run.js examples/todomvc.json   # Run an example scenario
```

Scenarios must be run with `node`, not `bun` — bun + Playwright hangs on browser launch on Windows.

## Testing

```bash
bun test            # Run tests
bun run format      # Format code
```

## Making changes

1. Create a feature branch
2. Make changes
3. Add tests if applicable
4. Run `bun run format` before committing
5. Commit with a clear message

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org):

```
<type>: <subject>

[optional body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
```
feat: add scroll action
fix: handle missing selector in click
docs: clarify scenario schema
```

Keep subjects under 50 characters. Use body for "why", not "what".
