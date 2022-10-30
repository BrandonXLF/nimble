import './css/window.less';
import { ipcRenderer } from 'electron';
import Tabs from './Tabs';
import { TabData } from '../types';
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
import showWebDialog from './popups/showWebDialog';
import promptUnsaved from './popups/promptUnsaved';
import menuActionFactory from './menuActionFactory';
import { initializeSettings } from './applySettings';

const webContentsIdPromise = ipcRenderer.invoke('get-webcontents-id'),
	editor = ace.edit(document.querySelector<HTMLElement>('#editor-container')),
	settings = new SettingStore(),
	tabs = new Tabs(
		document.getElementById('tabs'),
		document.getElementById('webview-container'),
		document.getElementById('devtool-container'),
		editor,
		webContentsIdPromise,
		settings
	),
	mainSplit = new SplitElement(
		'editor',
		document.getElementById('main-container'),
		settings.get('editorDirection'),
		settings.get('autoEdit'),
		settings.get('editorWidth'),
		settings.get('editorHeight')
	),
	viewerSplit = new SplitElement(
		'devtools',
		document.getElementById('viewer-container'),
		settings.get('devtoolsDirection'),
		settings.get('autoDevtools'),
		settings.get('viewerWidth'),
		settings.get('viewerHeight')
	);

mainSplit.on('width', x => settings.set('editorWidth', x));
mainSplit.on('height', x => settings.set('editorHeight', x));
viewerSplit.on('width', x => settings.set('viewerWidth', x));
viewerSplit.on('height', x => settings.set('viewerHeight', x));

document.getElementById('edit').addEventListener('click', () => mainSplit.toggleVisible());
document.getElementById('inspect').addEventListener('click', () => viewerSplit.toggleVisible());
document.getElementById('run').addEventListener('click', () => tabs.currentTab.preview());
document.getElementById('header').addEventListener('contextmenu', e => e.preventDefault());

['options', 'new'].forEach(id => document.getElementById(id).addEventListener('click', () => {
	const rect = document.getElementById(id).getBoundingClientRect();

	ipcRenderer.send('show-menu', id, Math.round(rect.x), Math.round(rect.y + rect.height));
}));

['minimize', 'maximize', 'unmaximize', 'close'].forEach(windowAction => {
	document.getElementById(windowAction).addEventListener('click', () => ipcRenderer.send('perform-window-action', windowAction));
});

initializeSettings(settings, editor);
tabs.createTab();

window.addEventListener('beforeunload', e => {
	if (!tabs.tabs.some(tab => tab.unsaved)) return;

	e.returnValue = false;

	promptUnsaved(tabs, settings);
});

ipcRenderer.on('release-tab', (_, localTabId: string, targetWebContents: number, targetIndex?: number) => {
	const tab = tabs.getTabById(localTabId);

	ipcRenderer.sendTo(targetWebContents, 'show-tab', tab.getTabData(), targetIndex);

	tabs.removeTab(tab);
});

ipcRenderer.on('show-tab', (_, tabData: TabData, index?: number) => tabs.createTab(tabData, index));
ipcRenderer.on('maximize', () => document.body.classList.add('maximized'));
ipcRenderer.on('unmaximize', () => document.body.classList.remove('maximized'));
ipcRenderer.on('web-dialog-request', showWebDialog);
ipcRenderer.on('menu-action', menuActionFactory(tabs, mainSplit, viewerSplit, settings))