import * as vscode from 'vscode';

import { suspiciousCharacters } from './constants';
import { escapeHtml, escapeHtmlAttribute } from './html';
import { CleanCharsScanner } from './scanner';
import type { Issue } from './types';

export class CleanCharsWebviewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'cleanChars.issues';

	private view?: vscode.WebviewView;

	public constructor(
		private readonly scanner: CleanCharsScanner
	) { }

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
		};

		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.type === 'fixOne') {
				await this.fixOne(
					message.uri,
					message.offset,
					message.length,
					message.replacement
				);

				return;
			}

			if (message.type === 'fixAllFile') {
				await this.fixAllFile(message.uri);

				return;
			}

			if (message.type === 'fixAllWorkspace') {
				await this.fixAllWorkspace();
			}
		});

		this.render();
	}

	public refresh(): void {
		this.render();
	}

	private async openDocument(uriValue: string): Promise<vscode.TextDocument | undefined> {
		try {
			return await vscode.workspace.openTextDocument(
				vscode.Uri.parse(uriValue)
			);
		} catch {
			return undefined;
		}
	}

	private async fixOne(
		uriValue: string,
		offset: number,
		length: number,
		replacement: string
	): Promise<void> {
		const document = await this.openDocument(uriValue);

		if (!document) {
			return;
		}

		const text = document.getText();

		if (
			offset < 0 ||
			offset >= text.length ||
			length <= 0
		) {
			return;
		}

		const character = text.substring(
			offset,
			offset + length
		);

		if (!suspiciousCharacters[character]) {
			return;
		}

		const start = document.positionAt(offset);
		const end = document.positionAt(offset + length);
		const edit = new vscode.WorkspaceEdit();

		edit.replace(
			document.uri,
			new vscode.Range(start, end),
			replacement
		);

		const applied = await vscode.workspace.applyEdit(edit);

		if (!applied) {
			return;
		}

		await document.save();
		this.scanner.scanDocument(document);
	}

	private async fixAllFile(uriValue: string): Promise<void> {
		const document = await this.openDocument(uriValue);

		if (!document) {
			return;
		}

		await this.fixAllInDocument(document);
	}

	private async fixAllWorkspace(): Promise<void> {
		const uris = [
			...new Set(
				this.scanner
					.getAllIssues()
					.map((issue) => issue.uri)
			),
		];

		for (const uriValue of uris) {
			const document = await this.openDocument(uriValue);

			if (document) {
				await this.fixAllInDocument(document);
			}
		}
	}

	private async fixAllInDocument(
		document: vscode.TextDocument
	): Promise<void> {
		const text = document.getText();
		const edit = new vscode.WorkspaceEdit();

		for (let i = text.length - 1; i >= 0; i--) {
			const character = text[i];
			const suspicious = suspiciousCharacters[character];

			if (!suspicious) {
				continue;
			}

			const start = document.positionAt(i);
			const end = document.positionAt(i + 1);

			edit.replace(
				document.uri,
				new vscode.Range(start, end),
				suspicious.replacement
			);
		}

		const applied = await vscode.workspace.applyEdit(edit);

		if (!applied) {
			return;
		}

		await document.save();
		this.scanner.scanDocument(document);
	}

	private render(): void {
		if (!this.view) {
			return;
		}

		const issues = this.scanner.getAllIssues();
		const groupedIssues = groupIssuesByUri(issues);
		const fileSections = renderFileSections(groupedIssues);

		this.view.webview.html = renderWebviewHtml(
			issues.length,
			groupedIssues.size,
			fileSections
		);
	}
}

function groupIssuesByUri(issues: Issue[]): Map<string, Issue[]> {
	const groupedIssues = new Map<string, Issue[]>();

	for (const issue of issues) {
		const existing = groupedIssues.get(issue.uri) ?? [];
		existing.push(issue);
		groupedIssues.set(issue.uri, existing);
	}

	return groupedIssues;
}

function renderFileSections(
	groupedIssues: Map<string, Issue[]>
): string {
	return [...groupedIssues.entries()]
		.sort(([, firstIssues], [, secondIssues]) => {
			return firstIssues[0].filePath.localeCompare(
				secondIssues[0].filePath
			);
		})
		.map(([uri, fileIssues]) => {
			return renderFileSection(uri, fileIssues);
		})
		.join('');
}

function renderFileSection(
	uri: string,
	fileIssues: Issue[]
): string {
	const rows = fileIssues
		.map((issue) => {
			return `
				<tr class="issue-row">
					<td class="line-cell">${issue.line}</td>
					<td class="issue-cell">
						<div class="issue-main">
							<span class="character">${escapeHtml(issue.character)}</span>
							<span class="arrow">&rarr;</span>
							<span class="replacement">${escapeHtml(issue.replacement)}</span>
						</div>
						<div class="issue-name">${escapeHtml(issue.name)}</div>
					</td>
					<td class="column-cell">${issue.column}</td>
					<td class="action-cell">
						<button
							class="fix-button"
							data-uri="${escapeHtmlAttribute(issue.uri)}"
							data-offset="${issue.offset}"
							data-length="${issue.character.length}"
							data-replacement="${escapeHtmlAttribute(issue.replacement)}"
						>
							Fix
						</button>
					</td>
				</tr>
			`;
		})
		.join('');

	return `
		<section class="file-section">
			<div class="file-header">
				<div>
					<div class="filename">${escapeHtml(fileIssues[0].fileName)}</div>
					<div
						class="filepath"
						title="${escapeHtmlAttribute(fileIssues[0].filePath)}"
					>
						${escapeHtml(fileIssues[0].filePath)}
					</div>
				</div>
				<button
					class="fix-file"
					data-uri="${escapeHtmlAttribute(uri)}"
				>
					Fix File
				</button>
			</div>

			<table>
				<thead>
					<tr>
						<th style="width:45px;">Line</th>
						<th>Issue</th>
						<th style="width:45px;">Col</th>
						<th style="width:76px;"></th>
					</tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>
		</section>
	`;
}

function renderWebviewHtml(
	issueCount: number,
	fileCount: number,
	fileSections: string
): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0"
			>
			<style>
				* {
					box-sizing: border-box;
				}

				body {
					margin: 0;
					padding: 16px;
					font-family: var(--vscode-font-family);
					font-size: var(--vscode-font-size);
					color: var(--vscode-foreground);
					background: var(--vscode-sideBar-background);
				}

				.header {
					margin-bottom: 18px;
				}

				.title {
					font-size: 16px;
					font-weight: 700;
					margin-bottom: 8px;
				}

				.summary {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 8px;
					margin-bottom: 12px;
				}

				.summary-title {
					font-size: 12px;
					font-weight: 700;
				}

				.count,
				.filepath,
				.column-cell,
				.issue-name {
					color: var(--vscode-descriptionForeground);
				}

				.count {
					font-size: 11px;
				}

				.file-section {
					margin-bottom: 18px;
				}

				.file-header {
					display: flex;
					align-items: flex-start;
					justify-content: space-between;
					gap: 8px;
					margin-bottom: 8px;
				}

				.filename {
					font-size: 12px;
					font-weight: 700;
					margin-bottom: 4px;
				}

				.filepath {
					font-size: 10px;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					max-width: 180px;
				}

				table {
					width: 100%;
					border-collapse: collapse;
					table-layout: fixed;
				}

				th {
					padding: 8px 6px;
					text-align: left;
					font-size: 10px;
					font-weight: 500;
					color: var(--vscode-descriptionForeground);
					border-bottom: 1px solid var(--vscode-panel-border);
				}

				td {
					padding: 10px 6px;
					vertical-align: middle;
					border-bottom: 1px solid var(--vscode-panel-border);
				}

				.issue-row:hover {
					background: var(--vscode-list-hoverBackground);
				}

				.line-cell {
					width: 45px;
				}

				.column-cell {
					width: 45px;
					font-size: 11px;
				}

				.action-cell {
					width: 76px;
					text-align: right;
				}

				.issue-main {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.character,
				.replacement {
					font-family: var(--vscode-editor-font-family);
					font-weight: 700;
				}

				.arrow {
					color: var(--vscode-descriptionForeground);
				}

				.issue-name {
					margin-top: 4px;
					font-size: 10px;
				}

				button {
					border: 0;
					cursor: pointer;
					font-family: var(--vscode-font-family);
				}

				.fix-button,
				.fix-file,
				.fix-all {
					background: #2563eb;
					color: #ffffff;
					box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
				}

				.fix-button:hover,
				.fix-file:hover,
				.fix-all:hover {
					background: #1d4ed8;
				}

				.fix-button {
					min-width: 52px;
					padding: 7px 10px;
					font-size: 12px;
					font-weight: 600;
					border-radius: 6px;
				}

				.fix-file {
					flex: 0 0 auto;
					padding: 6px 8px;
					font-size: 11px;
					font-weight: 600;
					border-radius: 6px;
				}

				.fix-all {
					width: 100%;
					margin-bottom: 14px;
					padding: 11px 14px;
					font-size: 13px;
					font-weight: 700;
					border-radius: 6px;
				}

				.empty {
					margin-top: 25px;
					text-align: center;
					font-size: 12px;
					color: var(--vscode-descriptionForeground);
				}

				.clean-icon {
					font-size: 24px;
					margin-bottom: 8px;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<div class="title">Workspace Issues</div>
			</div>

			<div class="summary">
				<div class="summary-title">Issues</div>
				<div class="count">
					${issueCount} found in ${fileCount} files
				</div>
			</div>

			${issueCount === 0
			? `
				<div class="empty">
					<div class="clean-icon">&#10003;</div>
					No suspicious characters found.
				</div>
			`
			: `
				<button class="fix-all">
					Fix All Workspace (${issueCount})
				</button>
				${fileSections}
			`
		}

			<script>
				const vscode = acquireVsCodeApi();

				document
					.querySelectorAll('.fix-button')
					.forEach((button) => {
						button.addEventListener('click', (event) => {
							event.preventDefault();
							event.stopPropagation();

							const target = event.currentTarget;

							vscode.postMessage({
								type: 'fixOne',
								uri: target.dataset.uri,
								offset: Number(target.dataset.offset),
								length: Number(target.dataset.length),
								replacement: target.dataset.replacement
							});
						});
					});

				document
					.querySelectorAll('.fix-file')
					.forEach((button) => {
						button.addEventListener('click', (event) => {
							event.preventDefault();
							event.stopPropagation();

							vscode.postMessage({
								type: 'fixAllFile',
								uri: event.currentTarget.dataset.uri
							});
						});
					});

				const fixAllButton =
					document.querySelector('.fix-all');

				if (fixAllButton) {
					fixAllButton.addEventListener('click', (event) => {
						event.preventDefault();
						event.stopPropagation();

						vscode.postMessage({
							type: 'fixAllWorkspace'
						});
					});
				}
			</script>
		</body>
		</html>
	`;
}
