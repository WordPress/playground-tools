# Agent Guidance: playground-tools

This document provides guidance for AI coding assistants (Claude, Codex, Copilot, Gemini, etc.) working with this repository.

## Repository Overview

This is a monorepo containing WordPress Playground-related tools and packages.

**Primary Package:** [wordpress-playground-block](packages/wordpress-playground-block/AGENTS.md) - A Gutenberg block published as `interactive-code-block` on WordPress.org.

## Monorepo Structure

-   **Build System:** Nx
-   **Versioning:** Lerna
-   **Package Manager:** npm workspaces

### Packages

| Package                      | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `wordpress-playground-block` | Gutenberg block for embedding WordPress Playground |
| `wp-now`                     | WordPress local development tool                   |
| `interactive-code-block`     | Interactive code block package                     |
| `vscode-extension`           | VS Code extension                                  |
| `playground`                 | Playground plugin                                  |
| `nx-extensions`              | Custom Nx extensions                               |

## Quick Start

```bash
nvm use
npm install
```

## Package-Specific Guidance

See individual package AGENTS.md files for detailed guidance:

-   [packages/wordpress-playground-block/AGENTS.md](packages/wordpress-playground-block/AGENTS.md)
