chrome := env("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

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

# Render the README images from docs/screenshots/mock.html (sample data; needs
# Chrome and network access for the web fonts; set CHROME to override the path)
screenshots:
    for state in menu list scan; do \
      "{{chrome}}" --headless=new --disable-gpu --hide-scrollbars \
        --window-size=760,520 --virtual-time-budget=5000 \
        --screenshot="{{justfile_directory()}}/docs/images/$state.png" \
        "file://{{justfile_directory()}}/docs/screenshots/mock.html?state=$state"; \
    done
