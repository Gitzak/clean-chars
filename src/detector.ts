import * as vscode from 'vscode';

import { diagnosticSource, suspiciousCharacters } from './constants';
import type { Issue } from './types';

function getFileName(uri: vscode.Uri): string {
	return uri.fsPath
		.split(/[\\/]/)
		.pop() ?? uri.fsPath;
}

function getPositionAtOffset(
	text: string,
	offset: number
): { line: number; column: number } {
	let line = 1;
	let column = 1;

	for (let i = 0; i < offset; i++) {
		if (text[i] === '\n') {
			line++;
			column = 1;
		} else {
			column++;
		}
	}

	return { line, column };
}

export function findIssuesInText(
	text: string,
	uri: vscode.Uri
): Issue[] {
	const issues: Issue[] = [];

	for (let i = 0; i < text.length; i++) {
		const character = text[i];
		const suspicious = suspiciousCharacters[character];

		if (!suspicious) {
			continue;
		}

		const position = getPositionAtOffset(text, i);

		issues.push({
			uri: uri.toString(),
			filePath: uri.fsPath,
			fileName: getFileName(uri),
			offset: i,
			line: position.line,
			column: position.column,
			character,
			name: suspicious.name,
			replacement: suspicious.replacement,
		});
	}

	return issues;
}

export function findIssues(document: vscode.TextDocument): Issue[] {
	return findIssuesInText(
		document.getText(),
		document.uri
	);
}

export function createDiagnostics(issues: Issue[]): vscode.Diagnostic[] {
	return issues.map((issue) => {
		const range = new vscode.Range(
			issue.line - 1,
			issue.column - 1,
			issue.line - 1,
			issue.column - 1 + issue.character.length
		);

		const diagnostic = new vscode.Diagnostic(
			range,
			`${issue.name}. Consider replacing "${issue.character}" with "${issue.replacement}".`,
			vscode.DiagnosticSeverity.Warning
		);

		diagnostic.source = diagnosticSource;

		return diagnostic;
	});
}
