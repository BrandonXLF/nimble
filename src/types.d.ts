declare module NodeJS  {
	interface Global {
		openApp: () => Promise<NWJS_Helpers.win>
		windowOrder: NWJS_Helpers.win[]
		movingTab: Tab
	}
}

interface TabElement extends HTMLDivElement {
	tabData: Tab;
}

interface NW_HTMLWebViewElement extends HTMLWebViewElement {
	showDevTools: (show: boolean, container?: HTMLWebViewElement) => void,
	inspectElementAt: (x: number, y: number) => void
}

interface NW_File extends File {
	path: string;
}

interface TransferableTabInfo {
	name?: string;
	path?: string;
	session?: AceAjax.IEditSession;
	text?: string;
	saved?: boolean;
}