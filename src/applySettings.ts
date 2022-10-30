import AceAjax from 'brace';
import { ipcRenderer } from 'electron';
import SettingStore from './SettingStore';

const darkMatch = matchMedia('(prefers-color-scheme: dark)');

export default function applySettings(settings: SettingStore, editor: AceAjax.Editor) {
	const theme = settings.get('theme'),
		darkTheme = theme === 'Light' ? false : theme === 'Dark' ? true : darkMatch.matches,
		aceTheme = darkTheme ? 'clouds_midnight' : 'clouds';

	editor.setOptions({
		enableLiveAutocompletion: true,
		useSoftTabs: settings.get('softTabs'),
		wrap: settings.get('wordWrap') ? 'free' : 'off',
		tabSize: settings.get('tabSize'),
		useWorker: false,
		showGutter: settings.get('gutter'),
		showPrintMargin: false,
		showInvisibles: settings.get('showInvisible'),
		theme: 'ace/theme/' + aceTheme,
	});
}

export function initializeSettings(settings: SettingStore, editor: AceAjax.Editor) {
	ipcRenderer.send('update-native-theme', settings.get('theme'));

	settings.on('change', () => applySettings(settings, editor));
	darkMatch.addEventListener('change', () => applySettings(settings, editor));

	applySettings(settings, editor);
}