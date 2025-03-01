import { Ace } from 'ace-builds';
import SettingStore from '../utils/SettingStore';
import ThemeMode from './ThemeMode';
import Tabs from './Tabs';

type SessionlessSettings = Exclude<keyof Ace.EditorOptions, keyof Ace.EditSessionOptions>;

const editorSettings: Partial<Record<SessionlessSettings, string>> = {
	enableBasicAutocompletion: 'autocomplete',
	enableLiveAutocompletion: 'autocomplete',
	showGutter: 'gutter',
	enableSnippets: 'enableSnippets',
	showInvisibles: 'showInvisible'
};

const sessionSettings: Partial<Record< keyof Ace.EditSessionOptions, string>> = {
	useSoftTabs: 'softTabs',
	wrap: 'wordWrap',
	tabSize: 'tabSize',
};

export function initializeSettings(
	settings: SettingStore,
	themeMode: ThemeMode,
	editor: Ace.Editor,
	tabs: Tabs
) {
	for (const [aceSetting, storeSetting] of Object.entries(editorSettings)) {
		settings.listen<string | boolean | number>(
			storeSetting,
			value => editor.setOption(aceSetting as keyof Ace.EditorOptions, value)
		);
	}

	for (const [aceSetting, storeSetting] of Object.entries(sessionSettings)) {
		settings.listen<string | boolean | number>(
			storeSetting,
			value => tabs.tabs.forEach(tab => {
				tab.editorSession.setOption(aceSetting as keyof Ace.EditSessionOptions, value);
			})
		);
	}

	const setAceTheme = () => editor.setTheme('ace/theme/' + (themeMode.darkMode ? 'clouds_midnight' : 'clouds'));
	themeMode.addListener('change', () => setAceTheme());
	settings.listen('theme', () => setAceTheme());

	settings.callAndListen<boolean>('viewerUseTheme', useTheme => {
		document.querySelector('#webview-container')?.classList.toggle('use-theme', useTheme);
	});
}

export function getEditorOptions(settings: SettingStore, themeMode: ThemeMode): Partial<Omit<Ace.EditorOptions, keyof Ace.EditSessionOptions>> {
	return {
		showPrintMargin: false,
		theme: 'ace/theme/' + (themeMode.darkMode ? 'clouds_midnight' : 'clouds'),
		...Object.fromEntries(Object.entries(editorSettings).map(([aceSetting, storeSetting]) => {
			return [aceSetting, settings.get(storeSetting)];
		}))
	};
}

export function getSessionOptions(settings: SettingStore): Partial<Ace.EditSessionOptions> {
	return {
		useWorker: false,
		...Object.fromEntries(Object.entries(sessionSettings).map(([aceSetting, storeSetting]) => {
			return [aceSetting, settings.get(storeSetting)];
		}))
	};
}