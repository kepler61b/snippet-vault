import * as vscode from "vscode";
import * as path from "path";

interface SnippetFile {
  id?: string;
  filename: string;
  language: string;
  content: string;
  order?: number;
}

interface SnippetItem {
  id: string;
  title: string;
  description: string | null;
  tags: string;
  shareToken?: string;
  files: SnippetFile[];
  createdAt: string;
}

interface SnippetQuickPickItem extends vscode.QuickPickItem {
  snippet: SnippetItem;
  file: SnippetFile;
}

const SECRET_KEY_PAT = "snippetvault_pat";

/**
 * Retrieves the configured base URL (stripped of trailing slashes).
 */
function getVaultUrl(): string {
  const config = vscode.workspace.getConfiguration("snippetvault");
  let url = config.get<string>("url", "http://localhost:3000").trim();
  return url.replace(/\/+$/, "");
}

/**
 * Retrieves the PAT from SecretStorage, falling back to configuration setting.
 */
async function getVaultToken(context: vscode.ExtensionContext): Promise<string> {
  const secret = await context.secrets.get(SECRET_KEY_PAT);
  if (secret && secret.trim()) {
    return secret.trim();
  }
  const config = vscode.workspace.getConfiguration("snippetvault");
  return config.get<string>("token", "").trim();
}

/**
 * Stores the token securely in SecretStorage.
 */
async function setVaultToken(context: vscode.ExtensionContext, token: string): Promise<void> {
  await context.secrets.store(SECRET_KEY_PAT, token.trim());
}

/**
 * Helper to ensure credentials are valid and present, prompting the user if missing.
 */
async function ensureConfigured(context: vscode.ExtensionContext): Promise<boolean> {
  const token = await getVaultToken(context);
  if (!token) {
    const choice = await vscode.window.showWarningMessage(
      "SnippetVault Personal Access Token is not configured.",
      "Configure Now",
      "Cancel"
    );
    if (choice === "Configure Now") {
      return configureVault(context);
    }
    return false;
  }
  return true;
}

/**
 * Interactive configuration command for setting Vault URL and PAT.
 */
async function configureVault(context: vscode.ExtensionContext): Promise<boolean> {
  const currentUrl = getVaultUrl();
  const inputUrl = await vscode.window.showInputBox({
    title: "SnippetVault: Server URL",
    prompt: "Enter your SnippetVault URL (e.g. http://localhost:3000 or https://vault.example.com)",
    value: currentUrl,
    ignoreFocusOut: true,
  });

  if (inputUrl === undefined) return false;
  const cleanUrl = inputUrl.trim().replace(/\/+$/, "");
  await vscode.workspace.getConfiguration("snippetvault").update("url", cleanUrl, true);

  const currentToken = await getVaultToken(context);
  const inputToken = await vscode.window.showInputBox({
    title: "SnippetVault: Personal Access Token (PAT)",
    prompt: "Enter your SnippetVault Personal Access Token (generated in Profile > API Tokens)",
    value: currentToken,
    password: true,
    ignoreFocusOut: true,
  });

  if (inputToken === undefined) return false;
  await setVaultToken(context, inputToken.trim());

  // Test connection
  try {
    const testRes = await fetch(`${cleanUrl}/api/snippets`, {
      headers: {
        Authorization: `Bearer ${inputToken.trim()}`,
        "User-Agent": "SnippetVault-VSCode/0.1.0",
      },
    });

    if (testRes.status === 401) {
      vscode.window.showErrorMessage(
        "SnippetVault: Authentication failed (401). Please check your token."
      );
      return false;
    }

    if (!testRes.ok) {
      vscode.window.showErrorMessage(
        `SnippetVault: Connection failed with HTTP status ${testRes.status}.`
      );
      return false;
    }

    vscode.window.showInformationMessage("SnippetVault: Successfully connected!");
    return true;
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `SnippetVault: Could not connect to ${cleanUrl} (${err.message || err})`
    );
    return false;
  }
}

/**
 * Command: Insert Snippet from SnippetVault
 */
async function insertSnippetCommand(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Open a file in editor to insert a snippet.");
    return;
  }

  const ok = await ensureConfigured(context);
  if (!ok) return;

  const baseUrl = getVaultUrl();
  const token = await getVaultToken(context);

  try {
    const items = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Fetching snippets from SnippetVault...",
        cancellable: false,
      },
      async () => {
        const res = await fetch(`${baseUrl}/api/snippets`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "SnippetVault-VSCode/0.1.0",
          },
        });

        if (res.status === 401) {
          throw new Error("UNAUTHORIZED");
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: any = await res.json();
        return (data.snippets || []) as SnippetItem[];
      }
    );

    if (items.length === 0) {
      vscode.window.showInformationMessage("No snippets found in your SnippetVault library.");
      return;
    }

    // Build QuickPick items
    const quickPickItems: SnippetQuickPickItem[] = [];

    for (const snippet of items) {
      const files = snippet.files && snippet.files.length > 0 ? snippet.files : [];
      const tagSuffix = snippet.tags ? ` #${snippet.tags.split(",").map((t) => t.trim()).join(" #")}` : "";

      if (files.length <= 1) {
        const file = files[0] || {
          filename: "snippet.txt",
          language: "plaintext",
          content: "",
        };
        quickPickItems.push({
          label: `$(code) ${snippet.title}`,
          description: `${file.filename} (${file.language})${tagSuffix}`,
          detail: snippet.description || file.content.split("\n")[0]?.trim() || "",
          snippet,
          file,
        });
      } else {
        // Multi-file snippet: create an entry for each file
        for (const file of files) {
          quickPickItems.push({
            label: `$(files) ${snippet.title}`,
            description: `${file.filename} (${file.language})${tagSuffix}`,
            detail: snippet.description || file.content.split("\n")[0]?.trim() || "",
            snippet,
            file,
          });
        }
      }
    }

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      title: "SnippetVault: Select Snippet to Insert",
      placeHolder: "Type to search by title, filename, tags, or description...",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) return;

    // Insert code into current selection or cursor position
    await editor.edit((editBuilder) => {
      editBuilder.replace(editor.selection, selected.file.content);
    });

    vscode.window.setStatusBarMessage(
      `$(check) Inserted snippet: "${selected.snippet.title}" (${selected.file.filename})`,
      3500
    );
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      const choice = await vscode.window.showErrorMessage(
        "SnippetVault: Invalid or expired access token.",
        "Update Token"
      );
      if (choice === "Update Token") {
        configureVault(context);
      }
    } else {
      vscode.window.showErrorMessage(`SnippetVault error: ${err.message || err}`);
    }
  }
}

/**
 * Command: Save selection to SnippetVault
 */
async function saveSnippetCommand(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Open a file in editor to save a snippet.");
    return;
  }

  let text = editor.document.getText(editor.selection);

  if (!text || text.trim().length === 0) {
    const choice = await vscode.window.showInformationMessage(
      "No text selected. Do you want to save the entire file as a snippet?",
      "Save Entire File",
      "Cancel"
    );
    if (choice === "Save Entire File") {
      text = editor.document.getText();
    } else {
      return;
    }
  }

  if (!text || text.trim().length === 0) {
    vscode.window.showWarningMessage("Selected text is empty.");
    return;
  }

  const ok = await ensureConfigured(context);
  if (!ok) return;

  const defaultFilename = path.basename(editor.document.fileName) || "snippet.txt";
  const defaultLanguage = editor.document.languageId || "plaintext";

  // Derive default title from first line if it looks like a title/comment, else filename
  let defaultTitle = defaultFilename;
  const firstLine = text.trim().split("\n")[0].replace(/^(\/\/|#|\/\*|\*|--)\s*/, "").trim();
  if (firstLine.length > 2 && firstLine.length < 50) {
    defaultTitle = firstLine;
  }

  const title = await vscode.window.showInputBox({
    title: "SnippetVault: Snippet Title",
    prompt: "Enter a title for this snippet",
    value: defaultTitle,
    ignoreFocusOut: true,
    validateInput: (v) => (!v.trim() ? "Title cannot be empty" : null),
  });

  if (!title) return;

  const description = await vscode.window.showInputBox({
    title: "SnippetVault: Description (Optional)",
    prompt: "Enter an optional description (Press Enter to skip)",
    ignoreFocusOut: true,
  });

  const tags = await vscode.window.showInputBox({
    title: "SnippetVault: Tags (Optional)",
    prompt: "Enter comma-separated tags (e.g. react, hooks, auth)",
    value: defaultLanguage !== "plaintext" ? defaultLanguage : "",
    ignoreFocusOut: true,
  });

  const baseUrl = getVaultUrl();
  const token = await getVaultToken(context);

  try {
    const created = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Saving snippet "${title}" to SnippetVault...`,
        cancellable: false,
      },
      async () => {
        const res = await fetch(`${baseUrl}/api/snippets`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "SnippetVault-VSCode/0.1.0",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description?.trim() || null,
            tags: tags?.trim() || "",
            files: [
              {
                filename: defaultFilename,
                language: defaultLanguage,
                content: text,
              },
            ],
          }),
        });

        if (res.status === 401) {
          throw new Error("UNAUTHORIZED");
        }

        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data: any = await res.json();
        return data.snippet as SnippetItem;
      }
    );

    const shareUrl = `${baseUrl}/s/${created.shareToken || created.id}`;
    const choice = await vscode.window.showInformationMessage(
      `Snippet "${created.title}" successfully saved to SnippetVault!`,
      "Open in Browser",
      "Copy Link"
    );

    if (choice === "Open in Browser") {
      vscode.env.openExternal(vscode.Uri.parse(shareUrl));
    } else if (choice === "Copy Link") {
      await vscode.env.clipboard.writeText(shareUrl);
      vscode.window.setStatusBarMessage("$(check) SnippetVault link copied to clipboard!", 3000);
    }
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      const choice = await vscode.window.showErrorMessage(
        "SnippetVault: Invalid or expired access token.",
        "Update Token"
      );
      if (choice === "Update Token") {
        configureVault(context);
      }
    } else {
      vscode.window.showErrorMessage(`Failed to save snippet: ${err.message || err}`);
    }
  }
}

/**
 * Command: Open SnippetVault in Browser
 */
async function openVaultCommand() {
  const url = getVaultUrl();
  vscode.env.openExternal(vscode.Uri.parse(url));
}

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("snippetvault.insertSnippet", () =>
      insertSnippetCommand(context)
    ),
    vscode.commands.registerCommand("snippetvault.saveSnippet", () =>
      saveSnippetCommand(context)
    ),
    vscode.commands.registerCommand("snippetvault.openVault", openVaultCommand),
    vscode.commands.registerCommand("snippetvault.configure", () =>
      configureVault(context)
    )
  );

  // Status Bar Item for quick access
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.command = "snippetvault.insertSnippet";
  statusBar.text = "$(code) SnippetVault";
  statusBar.tooltip = "SnippetVault: Insert snippet (Ctrl+Alt+V)";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate() {}
