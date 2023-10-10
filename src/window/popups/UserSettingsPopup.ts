import SettingStore from '../SettingStore';
import { popup } from './popup';
import './userSettings.less';
import { userSettingsData } from './userSettingsData';

export default class UserSettingsPopup {
	settings: SettingStore;
	
	constructor(settings: SettingStore) {
		this.settings = settings;
	}
	
	show() {
		popup('Settings', userSettingsData.map(setting => this.createSetting(setting)));
	}
	
	createSetting(setting: typeof userSettingsData[0]) {
		const el = document.createElement('label');
		el.className = 'setting-row';

		switch (setting.type) {
			case 'checkbox':
				this.createCheckbox(el, setting);
				break;
			case 'select':
				this.createSelect(el, setting);
				break;
			case 'text':
			case 'number':
				this.createInput(el, setting);
		}

		return el;
	}
	
	createCheckbox(parent: HTMLElement, setting: typeof userSettingsData[0]) {
		const checkbox = document.createElement('input');

		checkbox.type = 'checkbox';
		checkbox.checked = this.settings.get(setting.name);
		checkbox.addEventListener('change', () => this.settings.set(setting.name, checkbox.checked));
		parent.append(setting.label, checkbox);
	}
	
	createSelect(parent: HTMLElement, setting: typeof userSettingsData[0]) {
		const select = document.createElement('select');

		select.addEventListener('change', () => this.settings.set(setting.name, select.value));
		setting.values.forEach(({label, value}) => {
			const option = document.createElement('option');

			option.append(label);
			option.selected = value === this.settings.get(setting.name);
			option.value = value;
			select.append(option);
		});

		parent.append(setting.label, select);
	}
	
	createInput(parent: HTMLElement, setting: typeof userSettingsData[0]) {
		const input = document.createElement('input');

		input.type = setting.type;
		input.value = this.settings.get(setting.name);
		input.addEventListener('change', () => this.settings.set(setting.name, input.value));
		parent.append(setting.label, input);
	}
}