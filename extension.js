const vscode = require('vscode');
const { default: ollama } = require('ollama'); // Common JS import method fix

class ClipCodeChatProvider {
    /**
     * @param {vscode.ExtensionContext} context
     */
    constructor(context) {
        this.context = context;
    }

    resolveWebviewView(webviewView) {
        this.webviewView = webviewView;
        
        // Allow scripts in the webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        // Set the HTML content
        webviewView.webview.html = this.getHtmlForWebview();

        // Fetch local Ollama models because Node JS doesn't work on webviews
        async function sendModelsToWebview() {
            try {
                const models = await ollama.list();
                const modelNames = models.models.map(m => m.name);
                webviewView.webview.postMessage({ 
                    command: 'modelsList', 
                    models: modelNames
                });
            } catch (error) {
                console.error('Error fetching models:', error);
            }
        }
        sendModelsToWebview();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'chat') {
                const userPrompt = message.text;
                let responseText = '';

                try {
                    // Call Ollama API
                    const { model } = message;
                    const streamResponse = await ollama.chat({
                        model: model,
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });

                    // Process the streaming response
                    for await (const part of streamResponse) {
                        responseText += part.message.content;
                        // Send each chunk back to the webview as it arrives
                        webviewView.webview.postMessage({ 
                            command: 'chatResponse', 
                            text: responseText 
                        });
                    }
                } catch (err) {
                    // Send error message to webview
                    webviewView.webview.postMessage({ 
                        command: 'chatResponse', 
                        text: `Error: ${String(err)}` 
                    });
                }
            }
        });
    }

    getHtmlForWebview() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    margin: 1rem; 
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                h2 { 
                    margin-top: 0;
                    color: var(--vscode-foreground);
                }
                #model-selector {
                    width: 100%;
                    border: 1px solid var(--vscode-input-border);
                    margin-top: 1rem;
                    padding: 0.5rem;
                    min-height: 15px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground)
                    border-radius: 2px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 13px;
                    line-height: 1.5;
                }
                #model-selector:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder)
                }
                #response { 
                    border: 1px solid var(--vscode-panel-border);
                    margin-top: 1rem; 
                    padding: 0.75rem; 
                    min-height: 50px;
                    background: var(--vscode-editor-background);
                    border-radius: 2px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 13px;
                    line-height: 1.5;
                }
                #prompt { 
                    width: 100%; 
                    box-sizing: border-box;
                    padding: 0.75rem;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 13px;
                    border-radius: 2px;
                    resize: none;
                }
                #prompt:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                }
                #sendBtn {
                    width: 100%;
                    margin-top: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                }
                #sendBtn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                #sendBtn:active {
                    transform: translateY(1px);
                }
                .thinking {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <h2>Clip Code</h2>
            <select name="model-selector" id="model-selector">
            </select>
            <br />
            <div id="response">What are we coding today?</div>
            <br />
            <textarea id="prompt" rows="3" placeholder="Ask anything"></textarea>
            <button id="sendBtn">Send</button>

            <script>
                const vscode = acquireVsCodeApi();
                // Listen to the post message sent from the extension side
                window.addEventListener('message', event => {
                    const { command, models } = event.data;
                    if (command === 'modelsList') {
                        const dropdown = document.getElementById("model-selector");
                        models.forEach(modelName => {
                            const option = document.createElement("option");
                            option.value = modelName;
                            option.textContent = modelName;
                            dropdown.appendChild(option);
                        });
                    }
                });

                // Send message to extension when button is clicked
                document.getElementById('sendBtn').addEventListener('click', () => {
                    const text = document.getElementById('prompt').value;
                    const dropdown = document.getElementById("model-selector");
                    const selectedModel = dropdown.value;
                    if (text.trim()) {
                        vscode.postMessage({ command: 'chat', text, model: selectedModel });
                        // Clear the input and show loading
                        document.getElementById('prompt').value = '';
                        document.getElementById('response').innerHTML = '<span class="thinking">Thinking...</span>';
                    }
                });

                // Send on Enter key (Shift+Enter for new line)
                document.getElementById('prompt').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        document.getElementById('sendBtn').click();
                    }
                });

                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const { command, text } = event.data;
                    if (command === 'chatResponse') {
                        document.getElementById('response').innerText = text;
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log("Clip Code Extension activated!");

    // Check if Ollama is available
    if (!ollama) {
        vscode.window.showErrorMessage('Ollama module is not installed. Please run: npm install ollama');
        return;
    }

    const provider = new ClipCodeChatProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('clipcodeView', provider)
    );

    // Optional: Register a command to manually trigger the extension
    let disposable = vscode.commands.registerCommand('clipcode.start', () => {
        vscode.window.showInformationMessage('Clip Code is ready in the sidebar!');
    });

    context.subscriptions.push(disposable);
}

function deactivate() {
    console.log("Clip Code Extension deactivated");
}

module.exports = {
    activate,
    deactivate
}