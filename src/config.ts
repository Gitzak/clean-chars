import * as vscode from 'vscode';

export function getWorkspaceExcludePattern(): string {
	const configuredExclude =
		vscode.workspace
			.getConfiguration('cleanChars')
			.get<string[]>('exclude', []);

	const defaults = [
		'**/node_modules/**',
		'**/.git/**',
		'**/out/**',
		'**/dist/**',
		'**/build/**',
	];

	return `{${[...defaults, ...configuredExclude].join(',')}}`;
}
