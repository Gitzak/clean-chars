import * as vscode from 'vscode';

import { diagnosticSource, suspiciousCharacters } from './constants';

export class CleanCharsCodeActionProvider implements vscode.CodeActionProvider {
	public provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext
	): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
			if (diagnostic.source !== diagnosticSource) {
				continue;
			}

			const character = document.getText(diagnostic.range);
			const suspicious = suspiciousCharacters[character];

			if (!suspicious) {
				continue;
			}

			const fix = new vscode.CodeAction(
				`Replace "${character}" with "${suspicious.replacement}"`,
				vscode.CodeActionKind.QuickFix
			);

			fix.edit = new vscode.WorkspaceEdit();
			fix.edit.replace(
				document.uri,
				diagnostic.range,
				suspicious.replacement
			);
			fix.diagnostics = [diagnostic];
			fix.isPreferred = true;

			actions.push(fix);
		}

		return actions;
	}
}
