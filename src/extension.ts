import * as vscode from 'vscode';

/**
 * This method is called when the extension is activated.
 * The extension is activated the very first time a command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('MIDI VSCode Shortcuts extension is now active');

    // Register commands that will be implemented in later tasks
    const commands = [
        vscode.commands.registerCommand('midiShortcuts.openConfiguration', () => {
            vscode.window.showInformationMessage('MIDI Configuration will be implemented in a future task');
        }),
        vscode.commands.registerCommand('midiShortcuts.selectDevice', () => {
            vscode.window.showInformationMessage('MIDI Device Selection will be implemented in a future task');
        }),
        vscode.commands.registerCommand('midiShortcuts.startListening', () => {
            vscode.window.showInformationMessage('MIDI Listening will be implemented in a future task');
        }),
        vscode.commands.registerCommand('midiShortcuts.stopListening', () => {
            vscode.window.showInformationMessage('MIDI Listening will be implemented in a future task');
        }),
        vscode.commands.registerCommand('midiShortcuts.exportConfiguration', () => {
            vscode.window.showInformationMessage('Configuration Export will be implemented in a future task');
        }),
        vscode.commands.registerCommand('midiShortcuts.importConfiguration', () => {
            vscode.window.showInformationMessage('Configuration Import will be implemented in a future task');
        })
    ];

    // Add all commands to the context subscriptions for proper cleanup
    commands.forEach(command => context.subscriptions.push(command));

    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('MIDI Shortcuts');
    context.subscriptions.push(outputChannel);

    outputChannel.appendLine('MIDI VSCode Shortcuts extension activated successfully');
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
    console.log('MIDI VSCode Shortcuts extension is being deactivated');
}