import AceAjax from 'brace';
import { ipcRenderer } from 'electron';
import SettingStore from './SettingStore';

const darkMatch = matchMedia('(prefers-color-scheme: dark)');

export default function applySettings(settings: SettingStore, editor: AceAjax.Editor) {
	const { general: darkTheme, viewer: darkViewer } = resolveDarkModes(settings);

	editor.setOptions({
		enableLiveAutocompletion: true,
		useSoftTabs: settings.get('softTabs'),
		wrap: settings.get('wordWrap'),
		tabSize: settings.get('tabSize'),
		useWorker: false,
		showGutter: settings.get('gutter'),
		showPrintMargin: false,
		showInvisibles: settings.get('showInvisible'),
		theme: 'ace/theme/' + (darkTheme ? 'clouds_midnight' : 'clouds'),
	});

	ipcRenderer.send('update-native-theme', settings.get('theme'));

	// BUG: Background colour must be set https://github.com/electron/electron/issues/36122
	document.querySelector('#webview-container')
		?.setAttribute('viewer-theme', darkViewer ? 'dark' : 'light');
}

export function resolveDarkModes(settings: SettingStore) {
	const theme = settings.get('theme'),
	darkTheme = theme === 'light' ? false : theme === 'dark' ? true : darkMatch.matches,
	viewerTheme = settings.get('viewerTheme'),
	darkViewer = viewerTheme === 'light' ? false : viewerTheme === 'dark' ? true : darkTheme;

	return {
		general: darkTheme,
		viewer: darkViewer
	};
}

export function initializeSettings(settings: SettingStore, editor: AceAjax.Editor) {
	settings.on('change', () => applySettings(settings, editor));
	darkMatch.addEventListener('change', () => applySettings(settings, editor));

	applySettings(settings, editor);
}