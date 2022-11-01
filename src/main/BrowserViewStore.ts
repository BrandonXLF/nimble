import { BrowserView, BrowserViewConstructorOptions, BrowserWindow } from 'electron';

export default class BrowserViewStore {
	list: Record<string, BrowserView> = {};
	
	create(win: BrowserWindow, options: BrowserViewConstructorOptions = {}) {
		const id = crypto.randomUUID();
		
		this.list[id] = new BrowserView(options);
		
		win.addBrowserView(this.list[id]);
		win.setTopBrowserView(win.getBrowserViews()[0])
		
		return {
			view: this.list[id],
			id
		};
	}
	
	get(id: string) {
		return this.list[id];
	}
	
	remove(id: string) {
		BrowserWindow.fromWebContents(this.list[id].webContents).removeBrowserView(this.list[id]);
		
		delete this.list[id];
	}
}