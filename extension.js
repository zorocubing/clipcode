import * as vscode from 'vscode';
import ollama from 'ollama';

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

        // Handle input from the webview
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
                    margin: 0.75rem; 
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
                    margin-top: 0rem;
                    padding: 0.5rem;
                    min-height: 15px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
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
                .context-item {
                    margin-bottom: 1rem; /* More breathing room between messages */
                    padding: 0.75rem;
                    border-radius: 6px;
                    max-width: 80%; /* Prevents super wide messages */
                }
                .user {
                    background: rgba(0,120,215,0.12); /* Slightly darker for contrast */
                    align-self: flex-start; /* Left-align user messages */
                }
                .assistant {
                    background: rgba(0,0,0,0.05); /* Subtle bg for assistant */
                    align-self: flex-start; /* Left-align for now, or tweak to right if you want */
                }
                #context-window {
                    display: flex;
                    flex-direction: column; /* Stack messages vertically */
                    gap: 0.5rem; /* Space between items */
                }
                #prompt { 
                    width: 80%;
                    height: 2.75rem;
                    box-sizing: border-box;
                    padding: 0.75rem;
                    margin-right: 0.25rem;
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
                    width: 20%;
                    height: 2.75rem;
                    margin-left: 0.25rem;
                    padding: 0.5rem 1rem;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 13px;
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
                .input-area {
                    display: flex;
                    flex-direction: row;
                    position: sticky;
                    bottom: 0.75rem;
                    left: 0.75rem;
                    right: 0.75rem;
                    background: transparent;
                    margin-top: 50rem;
                    padding: 0;
                }
            </style>
        </head>
        <body>
            <h2>Clip Code</h2>
            <select name="model-selector" id="model-selector">
            </select>
            <br />
            <div id="context-window">
                <br />
            </div>
            <br />
            <footer class="input-area">
                <textarea id="prompt" rows="3" placeholder="Ask anything"></textarea>
                <button id="sendBtn">➤</button>
            </footer>

            <script>
                const vscode = acquireVsCodeApi();
                const contextWindow = document.getElementById('context-window');
                const promptInput = document.getElementById('prompt');
                const sendBtn = document.getElementById('sendBtn');
                const modelSelector = document.getElementById('model-selector');

                // Function to scroll to bottom
                function scrollToBottom() {
                    if (contextWindow)
                        contextWindow.scrollTop = contextWindow.scrollHeight;
                }

                // Message listener
                window.addEventListener('message', event => {
                    const { command, models, text } = event.data;

                    if (command === 'modelsList' && Array.isArray(models)) {
                        modelSelector.innerHTML = '';
                        models.forEach(modelName => {
                            const option = document.createElement("option");
                            option.value = modelName;
                            option.textContent = modelName;
                            modelSelector.appendChild(option);
                        });
                    }

                    if (command === 'chatResponse') {
                        // Find the last assistant div and update it
                        const assistantDivs = contextWindow.querySelectorAll('.assistant');
                        const currentAssistant = assistantDivs[assistantDivs.length - 1];
                        if (currentAssistant) {
                            currentAssistant.innerText = text; // Overwrites 'Thinking...' with streaming text
                            scrollToBottom();
                        }
                    }

                    if (command === 'reset') {
                        contextWindow.innerHTML = ''; // Clear all messages
                        promptInput.value = '';
                        modelSelector.selectedIndex = 0;
                    }
                });

                // Send button click
                sendBtn.addEventListener('click', () => {
                    const text = promptInput.value.trim();
                    const selectedModel = modelSelector.value;

                    if (text) {
                        // Create and append user message div
                        const userDiv = document.createElement('div');
                        userDiv.classList.add('context-item', 'user');
                        userDiv.innerText = text;
                        contextWindow.appendChild(userDiv);

                        // Create and append assistant placeholder div
                        const assistantDiv = document.createElement('div');
                        assistantDiv.classList.add('context-item', 'assistant');
                        assistantDiv.innerHTML = '<span class="thinking">Thinking...</span>';
                        contextWindow.appendChild(assistantDiv);

                        // Scroll to bottom
                        scrollToBottom();

                        // Clear input
                        promptInput.value = '';

                        // Send to extension
                        vscode.postMessage({ command: 'chat', text, model: selectedModel });
                    }
                });

                // Enter key handling (unchanged)
                promptInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendBtn.click();
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
export function activate(context) {
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

    // Register a command to manually trigger the extension
    let disposable = vscode.commands.registerCommand('clipcode.start', () => {
        vscode.window.showInformationMessage('Clip Code is ready in the sidebar!');
    });

    let startNewChat = vscode.commands.registerCommand('clipcode.startNewChat', () => {
        // Post a 'reset' message to the webview so it can restore its initial state
        if (provider && provider.webviewView && provider.webviewView.webview) {
            provider.webviewView.webview.postMessage({ command: 'reset' });
        } else {
            vscode.window.showInformationMessage('Open the Clip Code view to reset the chat.');
        }
    });

    context.subscriptions.push(disposable, startNewChat);
}

export function deactivate() {
    console.log("Clip Code Extension deactivated");
}