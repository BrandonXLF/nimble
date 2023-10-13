import './css/window.less';
import { ipcRenderer } from 'electron';
import Tabs from './Tabs';
import SettingStore from './SettingStore';
import ace from 'brace';
import 'brace/theme/clouds';
import 'brace/theme/clouds_midnight';
import 'brace/mode/html';
import 'brace/mode/svg';
import 'brace/mode/markdown';
import 'brace/ext/language_tools';
import 'brace/ext/searchbox';
import SplitElement from './SplitElement';
import promptUnsaved from './popups/promptUnsaved';
import { initializeSettings } from './applySettings';
import Icon from '../icon/icon.ico';
import WebDialogFactory from './popups/WebDialogFactory';
import MenuActionProcessor from './MenuActionProcessor';

const webContentsIdPromise = ipcRenderer.invoke('get-webcontents-id'),
	editor = ace.edit(document.querySelector<HTMLElement>('#editor-container')!),
	settings = new SettingStore(),
	tabs = new Tabs(
		document.getElementById('tabs')!,
		document.getElementById('webview-container')!,
		document.getElementById('devtool-container')!,
		editor,
		webContentsIdPromise,
		settings
	),
	mainSplit = new SplitElement(
		'editor',
		document.getElementById('main-container')!,
		settings.get('editorDirection'),
		settings.get('autoEdit'),
		settings.get('editorWidth'),
		settings.get('editorHeight')
	),
	viewerSplit = new SplitElement(
		'devtools',
		document.getElementById('viewer-container')!,
		settings.get('devtoolsDirection'),
		settings.get('autoDevtools'),
		settings.get('viewerWidth'),
		settings.get('viewerHeight')
	);

mainSplit.on('width', x => settings.set('editorWidth', x));
mainSplit.on('height', x => settings.set('editorHeight', x));
mainSplit.on('visible', () => editor.resize());

viewerSplit.on('width', x => settings.set('viewerWidth', x));
viewerSplit.on('height', x => settings.set('viewerHeight', x));

document.getElementById('edit')!.addEventListener('click', () => mainSplit.toggleVisible());
document.getElementById('inspect')!.addEventListener('click', () => viewerSplit.toggleVisible());
document.getElementById('run')!.addEventListener('click', () => tabs.currentTab.preview());
document.getElementById('header')!.addEventListener('contextmenu', e => e.preventDefault());

(document.getElementById('top-icon') as HTMLImageElement).src = Icon;

['options', 'new'].forEach(id => document.getElementById(id)!.addEventListener('click', () => {
	const rect = document.getElementById(id)!.getBoundingClientRect();

	ipcRenderer.send('show-menu', id, Math.round(rect.x), Math.round(rect.y + rect.height), tabs.currentTab.mode);
}));

['minimize', 'maximize', 'unmaximize', 'close'].forEach(windowAction => {
	document.getElementById(windowAction)!.addEventListener('click', () => ipcRenderer.send('perform-window-action', windowAction));
});

initializeSettings(settings, editor);

const openFilePrefix = '--open-file=',
	openFiles = process.argv
		.filter(arg => arg.startsWith(openFilePrefix))
		.map(arg => arg.substring(openFilePrefix.length));

if (openFiles.length) {
	for (const file of openFiles) {
		tabs.createFromFile(file);
	}
} else {
	tabs.createTab();
}

window.addEventListener('beforeunload', e => {
	if (!tabs.tabs.some(tab => tab.unsaved)) return;

	e.returnValue = false;

	promptUnsaved(tabs, settings);
});

document.body.addEventListener('keyup', e => ipcRenderer.send(
	'keyboard-input',
	true,
	e.key,
	process.platform === 'darwin' ? e.metaKey : e.ctrlKey,
	e.altKey,
	e.shiftKey
));

ipcRenderer.on('release-tab', (_, localTabId: string, targetWebContents: number, targetIndex?: number) => {
	const tab = tabs.getTabById(localTabId);

	if (!tab) return;

	ipcRenderer.sendTo(targetWebContents, 'show-tab', tab.getTabData(), targetIndex);

	tabs.removeTab(tab);
});

ipcRenderer.on('open-files', (_, files: string[]) => files.forEach(file => tabs.createFromFile(file)));
ipcRenderer.on('show-tab', (_, tabData: TabData, index?: number) => tabs.createTab(tabData, index));

ipcRenderer.on('maximize', () => document.body.classList.add('maximized'));
ipcRenderer.on('unmaximize', () => document.body.classList.remove('maximized'));

const webDialogFactory = new WebDialogFactory(tabs),
	menuActionProcessor = new MenuActionProcessor(tabs, mainSplit, viewerSplit, settings);

ipcRenderer.on('web-dialog-request', webDialogFactory.processRequest.bind(webDialogFactory));
ipcRenderer.on('menu-action', menuActionProcessor.processRequest.bind(menuActionProcessor));

ipcRenderer.send('ipc-message');