const vscode = require('vscode');

class ClipCodeChatProvider {
    /**
     * @param {vscode.ExtensionContext} context
     */
    constructor(context) {
        this.context = context;
    }

    resolveWebviewView(webviewView) {
        // Allow scripts in the webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        // Set the HTML content
        webviewView.webview.html = this.getHtmlForWebview();
    }

    getHtmlForWebview() {
      // Define your HTML content here
      return `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Chat with Clip Code!</title>
          <style>
          </style>
        </head>
        <body>
          <h1>Clip Code</h1>
          <p>Select model</p>
        </body>
        </html>`;
    }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Extension activated"); // Log to verify activation

  const provider = new ClipCodeChatProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('clipcodeView', provider)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}