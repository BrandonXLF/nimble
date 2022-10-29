import './index.less';
import { ipcRenderer } from 'electron';
import Tabs from './Tabs';
import { AskForPath, TabData } from './types';
import { extname } from 'path';
import { getFileType } from './fileTypes';
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
import { Dropdown } from './Dropdown';
import Tab from './Tab';
import SettingPopup from './SettingPopup';
import { showFindPopup, showZoomPopup } from './miniPopups';
import { popup } from './popup';
import './dialogPopups';
import * as npmPackage from '../package.json';

async function openFile() {
	const files = await ipcRenderer.invoke('open-file');

	(files as string[]).forEach(path => {
		if (!getFileType(extname(path))) {
			popup('Failed to open file', `Unsupported file type ${extname(path)}`);
			return;
		}

		tabs.createTab({ path });
	});
}

async function promptUnsaved(unsaved: Tab[]) {
	if (settings.get('autoSave')) {
		await Promise.allSettled(unsaved.map(tab => tab.save(AskForPath.Never)));

		unsaved = tabs.tabs.filter(tab => tab.unsaved);

		if (!unsaved.length) {
			ipcRenderer.send('perform-window-action', 'close');
			return;
		}
	}

	popup(
		'Unsaved Changes!',
		'You have unsaved tabs, would you like to save them now?',
		[
			{
				text: 'Save All',
				click: async () => {
					try {
						await Promise.all(unsaved.map(tab => tab.save()));
					} catch {
						return;
					}

					ipcRenderer.send('perform-window-action', 'close');
				}
			},
			{
				text: 'Don\'t Save',
				click: () => {
					unsaved.forEach(tab => tabs.removeTab(tab));
					ipcRenderer.send('perform-window-action', 'close');
				}
			},
			{
				text: 'Cancel'
			}
		]
	);
}

function showAbout() {
	const nameDiv = document.createElement('div'),
		versionDiv = document.createElement('div'),
		showDevtools = document.createElement('a'),
		icon = document.createElement('img');
	
	icon.src = 'icon.ico';
	icon.style.height = '80px';
	icon.classList.add('about-row');
		
	nameDiv.append(icon, npmPackage.productName);
	nameDiv.classList.add('about-row');

	versionDiv.innerText = npmPackage.version;
	versionDiv.classList.add('about-row');
	
	showDevtools.innerText = 'Show App Devtools'
	showDevtools.href = '#';
	showDevtools.classList.add('about-row');
	
	showDevtools.addEventListener('click', e => {
		e.preventDefault();
		ipcRenderer.send('show-window-devtools');
	});
	
	popup('About', [icon, nameDiv, versionDiv, showDevtools]);
}

function applySettings() {
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

const webContentsIdPromise = ipcRenderer.invoke('get-webcontents-id'),
	darkMatch = matchMedia('(prefers-color-scheme: dark)'),
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

new Dropdown(document.getElementById('options'), () => {
	return [
		{ label: 'Print', click: () => tabs.currentTab.webview.print() },
		{ label: 'Find', click: () => showFindPopup(tabs.currentTab.webview) },
		{ label: 'Zoom', click: () => showZoomPopup(tabs.currentTab.webview) },
		{ label: 'Terminate', click: () => ipcRenderer.send('crash-renderer', tabs.currentTab.webview.getWebContentsId()) },
		Dropdown.Separator,
		document.body.hasAttribute('data-editor') &&
		{ label: 'Rotate Editor', click: () => settings.set('editorDirection', mainSplit.toggleDirection()), stayOpen: true },
		document.body.hasAttribute('data-devtools') &&
		{ label: 'Rotate Devtools', click: () => settings.set('devtoolsDirection', viewerSplit.toggleDirection()), stayOpen: true },
		Dropdown.Separator,
		{ label: 'Save', click: () => tabs.currentTab.save() },
		{ label: 'Save As', click: () => tabs.currentTab.save(AskForPath.Always) },
		Dropdown.Separator,
		{ label: 'Settings', click: () => new SettingPopup(settings).show() },
		{ label: 'About', click: () => showAbout() }
	]
}).start();

new Dropdown(document.getElementById('new'), () => {
	return [
		{ label: 'Open File', click: () => openFile() },
		Dropdown.Separator,
		{ label: 'New HTML', click: () => tabs.createTab({ mode: 'html' }) },
		{ label: 'New SVG', click: () => tabs.createTab({ mode: 'svg' }) },
		{ label: 'New MD', click: () => tabs.createTab({ mode: 'md' }) }
	]
}).start();

mainSplit.on('width', x => settings.set('editorWidth', x));
mainSplit.on('height', x => settings.set('editorHeight', x));
viewerSplit.on('width', x => settings.set('viewerWidth', x));
viewerSplit.on('height', x => settings.set('viewerHeight', x));

document.getElementById('edit').addEventListener('click', () => mainSplit.toggleVisible());
document.getElementById('inspect').addEventListener('click', () => viewerSplit.toggleVisible());
document.getElementById('run').addEventListener('click', () => tabs.currentTab.preview());
document.getElementById('header').addEventListener('contextmenu', e => e.preventDefault());

['minimize', 'maximize', 'unmaximize', 'close'].forEach(windowAction => {
	document.getElementById(windowAction).addEventListener('click', () => ipcRenderer.send('perform-window-action', windowAction));
});

tabs.createTab();

ipcRenderer.send('update-native-theme', settings.get('theme'));
settings.on('change', () => applySettings());
darkMatch.addEventListener('change', () => applySettings());
applySettings();

window.addEventListener('beforeunload', e => {
	const unsaved = tabs.tabs.filter(tab => tab.unsaved);

	if (unsaved.length) {
		e.returnValue = false;

		promptUnsaved(unsaved);
	}
});

ipcRenderer.on('release-tab', (_, localTabId: string, targetWebContents: number, targetIndex?: number) => {
	const tab = tabs.getTabById(localTabId);

	ipcRenderer.sendTo(targetWebContents, 'show-tab', tab.getTabData(), targetIndex);

	tabs.removeTab(tab);
});

ipcRenderer.on('show-tab', (_, tabData: TabData, index?: number) => tabs.createTab(tabData, index));
ipcRenderer.on('maximize', () => document.body.classList.add('maximized'));
ipcRenderer.on('unmaximize', () => document.body.classList.remove('maximized'));

ipcRenderer.on('menu-action', (_, action: string) => {
	if (action === 'run') {
		tabs.currentTab.preview();
		return;
	}
	
	if (action === 'find') {
		showFindPopup(tabs.currentTab.webview);
		return;
	}
	
	if (action === 'zoom') {
		showZoomPopup(tabs.currentTab.webview);
		return;
	}
	
	if (action === 'devtools') {
		viewerSplit.toggleVisible(true);
	}
});