import { EventEmitter } from 'events';

export default class SettingStore extends EventEmitter {
	readonly defaults: Record<string, unknown> = {
		// User settings
		autoRun: true,
		autoSave: true,
		theme: 'system',
		viewerTheme: 'inherit',
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
	};
	
	settings: Record<string, unknown>;
	
	constructor() {
		super();
		
		this.settings = JSON.parse(localStorage.getItem('settings') || '{}');
	}
	
	get<T>(name: string) {
		return (this.settings[name] ?? this.defaults[name]) as T;
	}
	
	set<T>(name: string, value: T): void {
		this.settings[name] = value;
		
		this.emit('change');
		this.save();
	}
	
	toggle(name: string, force?: boolean): boolean {
		this.set<boolean>(name, force ?? !this.get<boolean>(name));
		
		return this.get<boolean>(name);
	}
	
	save(): void {
		localStorage.setItem('settings', JSON.stringify(this.settings));
	}
}