import { EventEmitter } from 'events';
import Store from 'electron-store';

export default class SettingStore extends EventEmitter {
	readonly defaults: Record<string, unknown> = {
		// User settings
		autoRun: true,
		autoSave: true,
		theme: 'system',
		viewerUseTheme: true,
		autoEdit: false,
		autoDevtools: false,
		softTabs: false,
		tabSize: 4,
		showInvisible: false,
		gutter: true,
		wordWrap: true,
		defaultType: 'html',
		
		// Layout settings
		editorDirection: 'horizontal',
		devtoolsDirection: 'vertical',
		editorWidth: '50%',
		editorHeight: '50%',
		viewerWidth: '50%',
		viewerHeight: '50%'
	};
	
	store: Store;
	
	constructor() {
		super();
		this.store = new Store();
	}
	
	get<T>(name: string) {
		return this.store.get(name, this.defaults[name]) as T;
	}
	
	set<T>(name: string, value: T): void {
		this.store.set(name, value);
		
		this.emit('change');
	}
	
	toggle(name: string, force?: boolean): boolean {
		this.set<boolean>(name, force ?? !this.get<boolean>(name));
		
		return this.get<boolean>(name);
	}
}