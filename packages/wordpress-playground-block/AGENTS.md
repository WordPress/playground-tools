# Agent Guidance: wordpress-playground-block

This document provides guidance for AI coding assistants (Claude, Codex, Copilot, Gemini, etc.) working with the wordpress-playground-block package.

## Package Overview

**Name:** WordPress Playground Block
**Published as:** `interactive-code-block` on WordPress.org
**Location:** `/packages/wordpress-playground-block`
**Description:** A Gutenberg block that embeds WordPress Playground into WordPress posts and pages with optional interactive code editing.

### Key Features

-   Embed WordPress Playground in posts/pages
-   Interactive code editor (JavaScript, JSON, PHP)
-   Multiple file support
-   Blueprint configuration support
-   Plugin or inline script modes
-   Automatic user login and customizable landing pages

### Technical Requirements

-   WordPress 6.1+
-   PHP 7.0+
-   HTTPS required (Playground limitation)

## Development Commands

All commands should be run from the repository root (`/Users/brandon/src/playground-tools`).

### Setup

```bash
nvm use
npm install
```

### Dev Server

```bash
# Start both webpack dev server and WordPress instance (recommended)
nx dev wordpress-playground-block

# Or run individually:
nx dev:webpack wordpress-playground-block  # Webpack only
nx dev:server wordpress-playground-block   # WordPress server only
```

### Build

```bash
npx nx build wordpress-playground-block
```

Output: `dist/packages/wordpress-playground-block/`

### Code Quality

```bash
npx nx lint wordpress-playground-block      # Lint
npx nx format wordpress-playground-block    # Format
npx nx typecheck wordpress-playground-block # Type check
```

### Tests

**Note:** No automated tests are currently implemented for this package. Type checking via `npx nx typecheck wordpress-playground-block` is available.

## Key Files

| File                                          | Purpose                             |
| --------------------------------------------- | ----------------------------------- |
| `src/edit.tsx`                                | Block editor component (main logic) |
| `src/view.tsx`                                | Frontend rendering                  |
| `src/block.json`                              | Block registration metadata         |
| `src/render.php`                              | PHP server-side rendering           |
| `src/components/playground-preview/index.tsx` | Playground preview component        |
| `wordpress-playground-block.php`              | Main plugin file                    |
| `project.json`                                | Nx build configuration              |

## Architecture

-   **Framework:** React with @wordpress/element
-   **Language:** TypeScript
-   **Styling:** SCSS
-   **Build:** Webpack via @wordpress/scripts
-   **Code Editor:** CodeMirror

### Block Attributes (block.json)

Key attributes include: `codeEditor`, `codeEditorReadOnly`, `codeEditorMultipleFiles`, `codeEditorMode` ("plugin" or "inline"), `files`, `blueprintUrl`, `blueprint`, `logInUser`, `landingPageUrl`.

## Monorepo Context

This is part of the `playground-tools` monorepo using:

-   **Nx** for build orchestration
-   **Lerna** for versioning
-   **npm workspaces**

Other packages in the repo include `wp-now`, `interactive-code-block`, `vscode-extension`, and `playground`.

## Important Constraints

-   Only works on HTTPS sites
-   Cannot run inside WordPress Playground itself
-   Uses block API v2 (required for proper iframe handling)
-   No Node.js build support in browser
-   No folder/subfolder support in file management yet
