const vscode = require('vscode');
const http = require('http');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand('notebooklm-vscode.saveSelection', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showInformationMessage('No text selected');
            return;
        }

        const config = vscode.workspace.getConfiguration('notebooklm');
        const projectId = config.get('projectId') || 'vscode-default';
        const port = config.get('apiPort') || 8787;
        const userId = process.env.USER || 'vscode-user';

        const payload = JSON.stringify({
            userId,
            projectId,
            source: 'ide',
            eventType: 'save',
            timestamp: Date.now(),
            payload: {
                file: editor.document.fileName,
                selection: text,
                line: selection.start.line + 1
            }
        });

        const req = http.request({
            host: 'localhost',
            port: port,
            path: '/v1/events',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                vscode.window.showInformationMessage('Saved to NotebookLM!');
            } else {
                vscode.window.showErrorMessage(`Failed to save: ${res.statusCode}`);
            }
        });

        req.on('error', (e) => {
            vscode.window.showErrorMessage(`Error connecting to NotebookLM Sync: ${e.message}`);
        });

        req.write(payload);
        req.end();
    });

    context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
};
