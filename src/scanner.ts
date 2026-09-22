import * as vscode from 'vscode';

import { getWorkspaceExcludePattern } from './config';
import { maxScannedFileBytes } from './constants';
import { createDiagnostics, findIssues, findIssuesInText } from './detector';
import type { Issue } from './types';

export class CleanCharsScanner {
	private readonly issuesByUri = new Map<string, Issue[]>();
	private scanRunId = 0;

	public constructor(
		private readonly diagnosticCollection: vscode.DiagnosticCollection,
		private readonly onDidUpdate: () => void
	) { }

	public getAllIssues(): Issue[] {
		return [...this.issuesByUri.values()].flat();
	}

	public async scanWorkspace(): Promise<void> {
		const runId = ++this.scanRunId;
		const files = await vscode.workspace.findFiles(
			'**/*',
			getWorkspaceExcludePattern()
		);
		const seen = new Set<string>();

		for (const uri of files) {
			if (runId !== this.scanRunId) {
				return;
			}

			seen.add(uri.toString());
			await this.scanUri(uri, false);
		}

		for (const uriValue of this.issuesByUri.keys()) {
			if (!seen.has(uriValue)) {
				const uri = vscode.Uri.parse(uriValue);
				this.issuesByUri.delete(uriValue);
				this.diagnosticCollection.delete(uri);
			}
		}

		this.onDidUpdate();
	}

	public async scanUri(
		uri: vscode.Uri,
		notify = true
	): Promise<void> {
		if (uri.scheme !== 'file') {
			return;
		}

		try {
			const bytes = await vscode.workspace.fs.readFile(uri);

			if (bytes.byteLength > maxScannedFileBytes) {
				this.clearUri(uri, notify);
				return;
			}

			const text = new TextDecoder('utf-8', {
				fatal: false,
			}).decode(bytes);
			const issues = findIssuesInText(text, uri);

			this.issuesByUri.set(uri.toString(), issues);
			this.diagnosticCollection.set(
				uri,
				createDiagnostics(issues)
			);

			if (notify) {
				this.onDidUpdate();
			}
		} catch {
			this.clearUri(uri, notify);
		}
	}

	public scanDocument(
		document: vscode.TextDocument,
		notify = true
	): void {
		if (document.uri.scheme !== 'file') {
			return;
		}

		const issues = findIssues(document);

		this.issuesByUri.set(document.uri.toString(), issues);
		this.diagnosticCollection.set(
			document.uri,
			createDiagnostics(issues)
		);

		if (notify) {
			this.onDidUpdate();
		}
	}

	public clearUri(
		uri: vscode.Uri,
		notify = true
	): void {
		this.issuesByUri.delete(uri.toString());
		this.diagnosticCollection.delete(uri);

		if (notify) {
			this.onDidUpdate();
		}
	}
}
