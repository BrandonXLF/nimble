import { Ace } from 'ace-builds';
import SettingStore from '../utils/SettingStore';
import ThemeMode from './ThemeMode';

const aceSettings = {
	enableBasicAutocompletion: 'autocomplete',
	enableLiveAutocompletion: 'autocomplete',
	useSoftTabs: 'softTabs',
	wrap: 'wordWrap',
	tabSize: 'tabSize',
	showGutter: 'gutter',
	enableSnippets: 'enableSnippets',
	showInvisibles: 'showInvisible',
	fontSize: 'fontSize',
	fontFamily: 'monospaceFont'
} as const;

export function initializeSettings(settings: SettingStore, themeMode: ThemeMode, editor: Ace.Editor) {
	for (const [aceSetting, storeSetting] of Object.entries(aceSettings)) {
		settings.listen<string | boolean | number>(storeSetting,
			value => editor.setOption(aceSetting as keyof Ace.EditorOptions, value)
		);
	}

	const setAceTheme = () => editor.setTheme('ace/theme/' + (themeMode.darkMode ? 'clouds_midnight' : 'clouds'));
	themeMode.addListener('change', () => setAceTheme());
	settings.listen('theme', () => setAceTheme());

	settings.callAndListen<boolean>('viewerUseTheme', useTheme => {
		document.querySelector('#webview-container')?.classList.toggle('use-theme', useTheme);
	});
}

export function getEditorOptions(settings: SettingStore, themeMode: ThemeMode): Partial<Ace.EditorOptions> {
	return {
		useWorker: false,
		showPrintMargin: false,
		...Object.fromEntries(Object.entries(aceSettings).map(([aceSettings, storeSetting]) => {
			return [aceSettings, settings.get(storeSetting)];
		})),
		theme: 'ace/theme/' + (themeMode.darkMode ? 'clouds_midnight' : 'clouds'),
	};
}