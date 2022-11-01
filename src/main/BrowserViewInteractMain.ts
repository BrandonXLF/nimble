import { webContents } from "electron";
import BrowserViewStore from "./BrowserViewStore";

class BrowserViewInteractMain {
	store: BrowserViewStore;

	constructor(store: BrowserViewStore) {
		this.store = store;
	}
	
	onAddEventListener(event: string, id: string) {
		const webContents = this.store.get(id).webContents;
		
		webContents.addListener(event as any, () => webContents.send('browser-view-event', event));
	}

	onRemoveEventListener(event: string, id: string) {
		const webContents = this.store.get(id).webContents;
		
		webContents.removeListener(event, eventListener)
	}

	onGetValue() {
		
	}
}