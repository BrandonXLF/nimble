import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';

export default class SettingStore extends EventEmitter {
	readonly defaults: Record<string, any> = {
		// User settings
		autoRun: true,
		autoSave: true,
		theme: 'system',
		autoEdit: false,
		autoDevtools: false,
		softTabs: false,
		tabSize: 4,
		showInvisible: false,
		gutter: true,
		wordWrap: true,
		
		// Layout settings
		editorDirection: 'horizontal',
		devtoolsDirection: 'vertical',
		editorWidth: '50%',
		editorHeight: '50%',
		viewerWidth: '50%',
		viewerHeight: '50%'
	}
	
	settings: Record<string, any>;
	
	constructor() {
		super();
		
		this.settings = JSON.parse(localStorage.getItem('settings') || '{}');
		
		this.addListener('change', this.onChange.bind(this));
	}
	
	get<T>(name: string): T {
		return this.settings[name] ?? this.defaults[name];
	}
	
	set<T>(name: string, value: T): void {
		this.settings[name] = value;
		
		this.emit('change');
		this.save();
	}
	
	toggle(name: string, force?: boolean): boolean {
		this.set(name, force !== undefined ? force : !this.get(name));
		
		return this.get(name);
	}
	
	save(): void {
		localStorage.setItem('settings', JSON.stringify(this.settings));
	}
	
	onChange() {
		ipcRenderer.send('update-native-theme', this.get('theme'));
	}
}