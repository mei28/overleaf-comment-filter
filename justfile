# List recipes
default:
    @just --list

# Install dependencies from the lockfile
install:
    pnpm install --frozen-lockfile

# Run the test suite once
test:
    pnpm test

# Type-check sources, tests and configs
typecheck:
    pnpm typecheck

# Lint and check formatting
lint:
    pnpm lint

# Apply formatter and safe lint fixes
fmt:
    pnpm format

# Build the userscript into .dev-dist/ (gitignored)
build:
    pnpm build:dev

# Rebuild .dev-dist/ on every source change (pair with the Tampermonkey loader)
watch:
    pnpm watch

# Everything that must pass before a commit
check: lint typecheck test build

# Build the release userscript into dist/ (committed, served by @updateURL)
dist:
    pnpm build
