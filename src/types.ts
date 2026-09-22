export type SuspiciousCharacter = {
	name: string;
	replacement: string;
};

export type Issue = {
	uri: string;
	filePath: string;
	fileName: string;
	offset: number;
	line: number;
	column: number;
	character: string;
	name: string;
	replacement: string;
};
