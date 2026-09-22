import type { SuspiciousCharacter } from './types';

export const diagnosticSource = 'CleanChars';
export const maxScannedFileBytes = 1024 * 1024;

export const suspiciousCharacters: Record<string, SuspiciousCharacter> = {
	'\u2014': {
		name: 'Em dash',
		replacement: '-',
	},
	'\u2013': {
		name: 'En dash',
		replacement: '-',
	},
	'\u2019': {
		name: 'Curly apostrophe',
		replacement: "'",
	},
	'\u201c': {
		name: 'Opening smart quote',
		replacement: '"',
	},
	'\u201d': {
		name: 'Closing smart quote',
		replacement: '"',
	},
	'\u2026': {
		name: 'Ellipsis',
		replacement: '...',
	},
	'\u00e2\u20ac\u201d': {
		name: 'Em dash',
		replacement: '-',
	},
	'\u00e2\u20ac\u201c': {
		name: 'En dash',
		replacement: '-',
	},
	'\u00e2\u20ac\u2122': {
		name: 'Curly apostrophe',
		replacement: "'",
	},
	'\u00e2\u20ac\u0153': {
		name: 'Opening smart quote',
		replacement: '"',
	},
	'\u00e2\u20ac\ufffd': {
		name: 'Closing smart quote',
		replacement: '"',
	},
	'\u00e2\u20ac\u00a6': {
		name: 'Ellipsis',
		replacement: '...',
	},
};
