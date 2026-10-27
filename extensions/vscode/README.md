# SnippetVault for VS Code

Official Visual Studio Code extension for [SnippetVault](https://github.com/kepler61b/snippet-vault) — self-hosted snippet management for developers.

## Features

- ⚡ **Instant Insertion (`Ctrl+Alt+V` / `Cmd+Alt+V`)**: Search your entire SnippetVault library with fuzzy matching and paste snippets or multi-file fragments right into the active editor.
- 💾 **1-Click Save (`Ctrl+Alt+S` / `Cmd+Alt+S`)**: Save selected code directly to SnippetVault from your editor or context menu. Automatically detects language, filename, and suggested title.
- 🔒 **Secure Personal Access Tokens (PAT)**: Token is safely kept in VS Code's encrypted SecretStorage.
- 🌐 **Self-Hosted Support**: Connects to your local (`http://localhost:3000`) or remote SnippetVault instance.
- 🖱️ **Context Menu & Status Bar**: Right-click in any file to save or insert snippets, or click **SnippetVault** in the status bar.

---

## Getting Started

1. Open SnippetVault in your browser.
2. Go to **Settings > Integrations > Personal Access Tokens (PAT)**.
3. Click **Generate New Token** and copy the generated token (`sv_pat_...`).
4. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   ```text
   SnippetVault: Configure Server URL & Token
   ```
5. Enter your instance URL (default: `http://localhost:3000`) and paste your PAT.

---

## Shortcuts

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Insert Snippet** | `Ctrl + Alt + V` | `Cmd + Alt + V` |
| **Save Selection** | `Ctrl + Alt + S` | `Cmd + Alt + S` |

---

## Commands

- `SnippetVault: Insert Snippet...`: Search and insert a snippet into the active editor.
- `SnippetVault: Save Selection to SnippetVault`: Save the current selection as a new snippet.
- `SnippetVault: Configure Server URL & Token`: Set or update instance URL and PAT.
- `SnippetVault: Open SnippetVault in Browser`: Quickly jump to your web vault.

---

## Extension Settings

This extension contributes the following settings:

* `snippetvault.url`: Base URL of your SnippetVault instance (e.g. `http://localhost:3000` or `https://vault.example.com`).
* `snippetvault.token`: Personal Access Token (can also be entered securely via the Configure command).
