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
        </head>
        <body>
          <h1>Clip Code</h1>
          <select id="LLM-selector" name="LLM" style="width: 300px; height: 30px; border-radius: 5px; border: 1px solid black;">
            <option value="">Select model</option>
            <option value="gpt-oss-20B">gpt-oss 20B</option>
            <option value="gpt-oss-120B">gpt-oss 120B</option>
          </select>

          <br><br>

          <div contenteditable="true" placeholder="Ask Clip Code..." style="border: 1px solid white; height: 30px; width: 300px; border-radius: 5px; padding: 5px; display: flex; align-items: center; justify-content: bottom;">
            <p>Ask Clip Code...</p>
          </div>
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