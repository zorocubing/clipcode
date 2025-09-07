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
        webviewView.webview.html = `
            <!doctype html>
            <html>
            <body>
                <h1>ClipCode Chat</h1>
                <div id="content">Welcome to ClipCode!</div>
            </body>
            </html>
        `;
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