declare module '*.ico'
declare module '*.md'
declare module '*.png'

declare const enum AskForPath {
	Always,
	WhenNeeded,
	Never
}

declare interface TabData {
	mode?: string;
	path?: string;
	text?: string;
	savedText?: string;
}

declare interface UpdateStatus {
    state: 'available' | 'downloading' | 'downloaded';
    title: string;
    details?: string;
};