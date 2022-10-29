export enum AskForPath {
	Always,
	WhenNeeded,
	Never
}

export interface TabData {
	mode?: string;
	path?: string;
	text?: string;
	savedText?: string;
}