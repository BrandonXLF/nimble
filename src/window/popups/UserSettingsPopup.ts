import SettingStore from '../../utils/SettingStore';
import { popup } from './popup';
import '../less/userSettings.less';
import getUserSettingData from './userSettingsData';
import uniq from 'lodash.uniq';

type Section = ReturnType<typeof getUserSettingData>[0];
type Setting = ReturnType<typeof getUserSettingData>[0]['settings'][0];

export default class UserSettingsPopup {
	settings: SettingStore;
	
	constructor(settings: SettingStore) {
		this.settings = settings;
	}
	
	async show() {
		const fontFamilies = uniq((await queryLocalFonts()).map(x => x.family));

		popup(
			'Settings',
			getUserSettingData(fontFamilies).flatMap(section => this.createSection(section))
		);
	}

	createSection(section: Section) {
		const heading = document.createElement('h4');
		heading.className = 'row setting-section-heading';
		heading.textContent = section.name;

		return [heading, ...section.settings.map(setting => this.createSetting(setting))]
	}
	
	createSetting(setting: Setting) {
		const el = document.createElement('label');
		el.className = 'row setting-row';

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
	
	createCheckbox(parent: HTMLElement, setting: Setting) {
		const checkbox = document.createElement('input');

		checkbox.type = 'checkbox';
		checkbox.checked = this.settings.get(setting.name);
		checkbox.addEventListener('change', () => this.settings.set(setting.name, checkbox.checked));
		parent.append(setting.label, checkbox);
	}
	
	createSelect(parent: HTMLElement, setting: Setting) {
		const select = document.createElement('select');

		select.addEventListener('change', () => this.settings.set(setting.name, select.value));
		setting.values?.forEach(({label, value}) => {
			const option = document.createElement('option');

			option.append(label);
			option.selected = value === this.settings.get(setting.name);
			option.value = value;
			select.append(option);
		});

		parent.append(setting.label, select);
	}
	
	createInput(parent: HTMLElement, setting: Setting) {
		const input = document.createElement('input');

		input.type = setting.type;
		input.value = this.settings.get(setting.name);
		input.addEventListener('change', () => this.settings.set(setting.name, input.value));
		parent.append(setting.label, input);
	}
}