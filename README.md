# CleanChars

<img width="693" height="666" alt="clean-chars-extention-vs-code" src="https://github.com/user-attachments/assets/04756317-fedf-45ee-9d35-5838f9fcf2e2" />

CleanChars is a lightweight Visual Studio Code extension for detecting and cleaning suspicious typography characters in your workspace.

It helps catch characters that often look harmless in code reviews, docs, prompts, configuration files, or copied text, but can cause formatting issues, syntax errors, broken commands, or inconsistent output.

## Features

- Scans the whole workspace, not only the currently opened file.
- Shows all detected issues in the CleanChars sidebar.
- Groups issues by file for quick review.
- Adds diagnostics directly in the editor.
- Provides quick fixes from VS Code diagnostics.
- Supports one-click fixes for:
  - a single issue
  - all issues in one file
  - all issues in the workspace
- Watches file changes and updates results automatically.
- Skips common generated folders by default.

## Detected Characters

CleanChars currently detects common smart typography characters and replaces them with plain ASCII equivalents:

| Character | Name | Replacement |
| --- | --- | --- |
| `—` | Em dash | `-` |
| `–` | En dash | `-` |
| `’` | Curly apostrophe | `'` |
| `“` | Opening smart quote | `"` |
| `”` | Closing smart quote | `"` |
| `…` | Ellipsis | `...` |

The extension also detects several mojibake variants that appear when UTF-8 text has been decoded incorrectly.

## Usage

1. Open a folder in VS Code.
2. Open the CleanChars activity bar view.
3. Review the workspace issues grouped by file.
4. Use `Fix`, `Fix File`, or `Fix All Workspace` depending on how much you want to clean.

You can also use VS Code quick fixes from the editor when a suspicious character is highlighted.

## Extension Settings

CleanChars contributes the following setting:

```json
"cleanChars.exclude": []
```

Use it to exclude files or folders from workspace scans:

```json
"cleanChars.exclude": [
  "**/*.md",
  "**/vendor/**",
  "**/generated/**"
]
```

These folders are always excluded:

- `**/node_modules/**`
- `**/.git/**`
- `**/out/**`
- `**/dist/**`
- `**/build/**`

## Performance

CleanChars scans files through the VS Code workspace file system API and avoids opening every file in the editor. Files larger than 1 MB are skipped to keep the extension responsive.

## Development

Install dependencies:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

Run lint checks:

```bash
npm run lint
```

On Windows PowerShell, if `npm run ...` is blocked by script execution policy, use:

```bash
npm.cmd run compile
npm.cmd run lint
```

## Project Structure

```text
src/
  extension.ts        VS Code activation and registrations
  constants.ts        Detected characters and scan limits
  detector.ts         Issue detection and diagnostics
  scanner.ts          Workspace and file scanning
  webviewProvider.ts  Sidebar UI and fix actions
  codeActions.ts      Editor quick fixes
  config.ts           Extension configuration helpers
  html.ts             HTML escaping helpers
  types.ts            Shared TypeScript types
```

## Release Notes

### 0.0.1

Initial release with workspace scanning, sidebar issue review, editor diagnostics, quick fixes, configurable exclusions, and safe file-size limits.
