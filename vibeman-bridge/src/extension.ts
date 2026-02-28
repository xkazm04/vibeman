/**
 * Vibeman Bridge Extension
 *
 * Entry point for the VS Code extension. Manages the bridge server lifecycle
 * and provides status bar feedback.
 */

import * as vscode from 'vscode';
import { BridgeServer } from './server';

let server: BridgeServer | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('vibeman-bridge');
  const port = config.get<number>('port', 9876);

  // Start server automatically
  server = new BridgeServer(port);
  server.start();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vibeman-bridge.start', () => {
      if (server?.isRunning()) {
        vscode.window.showInformationMessage(`Vibeman Bridge already running on port ${port}`);
        return;
      }
      if (!server) {
        server = new BridgeServer(port);
      }
      server.start();
      updateStatusBar(port, true);
      vscode.window.showInformationMessage(`Vibeman Bridge started on port ${port}`);
    }),

    vscode.commands.registerCommand('vibeman-bridge.stop', () => {
      server?.stop();
      updateStatusBar(port, false);
      vscode.window.showInformationMessage('Vibeman Bridge stopped');
    }),
  );

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  updateStatusBar(port, true);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      server?.stop();
      server = undefined;
    },
  });

  console.log(`[vibeman-bridge] Extension activated, server on port ${port}`);
}

export function deactivate() {
  server?.stop();
  server = undefined;
}

function updateStatusBar(port: number, running: boolean): void {
  if (!statusBarItem) return;

  if (running) {
    statusBarItem.text = '$(plug) Vibeman';
    statusBarItem.tooltip = `Vibeman Bridge running on port ${port} — click to stop`;
    statusBarItem.command = 'vibeman-bridge.stop';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(debug-disconnect) Vibeman';
    statusBarItem.tooltip = `Vibeman Bridge stopped — click to start`;
    statusBarItem.command = 'vibeman-bridge.start';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}
