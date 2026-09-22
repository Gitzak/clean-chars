import * as vscode from 'vscode';

import { CleanCharsCodeActionProvider } from './codeActions';
import { CleanCharsScanner } from './scanner';
import { CleanCharsWebviewProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {
	const diagnosticCollection =
		vscode.languages.createDiagnosticCollection(
			'cleanChars'
		);

	let webviewProvider: CleanCharsWebviewProvider | undefined;

	const scanner = new CleanCharsScanner(
		diagnosticCollection,
		() => webviewProvider?.refresh()
	);

	webviewProvider = new CleanCharsWebviewProvider(scanner);

	const watcher = vscode.workspace.createFileSystemWatcher(
		'**/*'
	);

	context.subscriptions.push(
		diagnosticCollection,
		watcher
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			CleanCharsWebviewProvider.viewType,
			webviewProvider
		)
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			scanner.scanDocument(event.document);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((document) => {
			scanner.scanDocument(document);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((document) => {
			scanner.scanDocument(document);
		})
	);

	context.subscriptions.push(
		watcher.onDidCreate((uri) => {
			void scanner.scanUri(uri);
		}),
		watcher.onDidChange((uri) => {
			void scanner.scanUri(uri);
		}),
		watcher.onDidDelete((uri) => {
			scanner.clearUri(uri);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('cleanChars.exclude')) {
				void scanner.scanWorkspace();
			}
		})
	);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{
				scheme: 'file',
			},
			new CleanCharsCodeActionProvider(),
			{
				providedCodeActionKinds: [
					vscode.CodeActionKind.QuickFix,
				],
			}
		)
	);

	void scanner.scanWorkspace();
}

export function deactivate(): void { }
