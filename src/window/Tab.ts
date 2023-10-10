import * as fs from 'fs/promises';
import { join } from 'path';
import { ipcRenderer } from 'electron';
import Tabs from './Tabs';
import { extname, basename } from 'path';
import markdownToHTML from '../utils/mdConverter';
import { getDefaultExtension, getFileType } from '../utils/fileTypes';
import ace from 'brace';
import throttle from 'lodash.throttle';
import { pathToFileURL } from 'url';
import { popup } from './popups/popup';
import { emittedOnce } from '../utils/emittedOnce';
import { useSVG } from './useSVG';
import TabMiniPopups from './popups/TabMiniPopups';
import { resolveDarkModes } from './applySettings';

export default class Tab {
	webview = document.createElement('webview');
	devtools = document.createElement('webview');
	webviewSubContainer = document.createElement('div');
	partition = crypto.randomUUID();
	faviconElement = document.createElement('img');
	webviewReady = emittedOnce(this.webview, 'dom-ready');
	devtoolsReady = emittedOnce(this.devtools, 'dom-ready');
	tabElement = document.createElement('div');
	titleElement = document.createElement('span');
	closeButton = document.createElement('button');
	unsavedIndicator = document.createElement('div');

	editorSession: ace.IEditSession;
	tabStore: Tabs;
	mode: string;
	path: string;
	watchController: AbortController;
	tabId: string;
	savedText: string;
	miniPopups: TabMiniPopups;
	webviewCssId: string;
	autoSave: () => void;
	
	constructor(tabStore: Tabs, tabId: string, data: TabData = {}) {
		this.tabStore = tabStore;
		this.tabId = tabId;
		
		this.webview.src = 'about:blank';
		this.webview.partition = this.partition;
		// BUG: No preload in iframes https://github.com/electron/electron/issues/22582
		// BUG: Use events instead https://github.com/electron/electron/issues/26160
		this.webview.preload = join(__dirname, 'preload.js');
		
		// Can be placed in preload if this breaks
		this.webview.addEventListener('did-navigate', () => this.updateWebviewCSS());
		this.tabStore.settings.on('change', () => this.updateWebviewCSS());

		this.webview.addEventListener('did-finish-load', () => {
			this.updateTitle();
			this.faviconElement.removeAttribute('src');
		});

		this.webview.addEventListener('page-title-updated', () => this.updateTitle());
		this.webview.addEventListener('page-favicon-updated', e => this.faviconElement.src = e.favicons[0]);

		this.webviewSubContainer.append(this.webview);
		this.webviewSubContainer.classList.add('webview-sub-container', 'show-when-current');
		tabStore.addToMainArea(this.webviewSubContainer);
		
		this.devtools.src = 'about:blank';
		this.devtools.classList.add('show-when-current');
		tabStore.addToDevtoolsArea(this.devtools);
		
		this.faviconElement.classList.add('tab-favicon');
		
		this.mode = data.mode || this.tabStore.settings.get('defaultType');
		this.savedText = data.savedText || '';
		this.miniPopups = new TabMiniPopups(this);
		
		this.autoSave = throttle(async () => this.save(AskForPath.Never), 500);

		this.editorSession = ace.createEditSession(data.text || '', `ace/mode/${this.mode}` as unknown as ace.TextMode);
		this.editorSession.on('change', () => {
			this.updateUnsaved();
			this.tabStore.settings.get('autoRun') && this.preview();
			this.tabStore.settings.get('autoSave') && this.autoSave();
		});
		
		this.unsavedIndicator.append(useSVG('circle'));
		this.unsavedIndicator.classList.add('tab-unsaved');
		
		this.updateTitle();
		this.titleElement.classList.add('tab-title');
		
		this.closeButton.append(useSVG('x'));
		this.closeButton.classList.add('tab-close');
		this.closeButton.title = 'Close tab (Ctrl+W)'
		this.closeButton.addEventListener('click', e => {
			e.stopPropagation();

			this.close();
		});
		
		this.tabElement.draggable = true;
		this.tabElement.classList.add('tab');
		this.tabElement.addEventListener('click', () => tabStore.selectTab(this));
		this.tabElement.append(this.unsavedIndicator, this.faviconElement, this.titleElement, this.closeButton);
		
		this.setPath(data.path, true);
		this.addDragAndDrop();
		this.linkDevtools();
		this.preview(data.text);
		this.updateUnsaved();
	}

	get unsaved() {
		return this.editorSession.getValue() !== this.savedText;
	}

	async updateWebviewCSS() {
		const { viewer: darkViewer } = resolveDarkModes(this.tabStore.settings);

		if (this.webviewCssId) {
			this.webview.removeInsertedCSS(this.webviewCssId);
		}

		if (darkViewer) {
			this.webviewCssId = await this.webview.insertCSS(':root{color-scheme:dark;}');
		}
	}
		
	addDragAndDrop(): void {
		this.tabElement.addEventListener('dragover', e => e.preventDefault());
	
		this.tabElement.addEventListener('dragstart', e => {
			e.dataTransfer.setData('nimble-html-markdown/tab-id', this.tabId);
		});
		
		this.tabElement.addEventListener('dragend', e => {
			if (e.dataTransfer.dropEffect === 'none') {
				if (this.tabStore.tabs.length > 1) {
					ipcRenderer.send('new-window-with-tab', this.tabId);
				} else {
					ipcRenderer.send('move-window-to-mouse');
				}
			}
		})
		
		this.tabElement.addEventListener('drop', e => {
			e.stopPropagation();
			
			const boundRect = this.tabElement.getBoundingClientRect();
			let targetIndex = this.tabStore.getTabIndex(this);
			
			if (e.pageX - boundRect.left > boundRect.width / 2) targetIndex++;
			
			if (e.dataTransfer.files.length) {
				[...e.dataTransfer.files].forEach(file => this.tabStore.createFromFile(file.path, targetIndex));
				return;
			}
			
			const tabId = e.dataTransfer.getData('nimble-html-markdown/tab-id');
			
			if (tabId === this.tabId) return;
			
			const localTab = this.tabStore.getTabById(tabId);
			
			if (localTab) {
				this.tabStore.moveTab(localTab, targetIndex);
				return;
			}
			
			ipcRenderer.send('release-tab', tabId, targetIndex);
		});
	}
	
	updateTitle() {
		let title
		
		try {
			title = this.webview.getTitle();
		} catch (_) {
			// Pass
		}
		
		if (!title || title === this.partition || title === 'about:blank') {
			title = this.path ? basename(this.path) : `unnamed${getDefaultExtension(this.mode) || ''}`;
		}
		
		const unsavedText = this.unsaved ? ' - Unsaved' : '',
			pathText = this.path ? ` - ${this.path}` : '';
		
		this.titleElement.innerText = `${title}`;
		this.titleElement.title = `${title}${pathText}${unsavedText}`;
	}
	
	async preview(text?: string): Promise<void> {
		let value = text ?? this.editorSession.getValue();
		
		if (this.mode === 'markdown') {
			value = markdownToHTML(value);
		}
		
		await this.webviewReady;
		
		ipcRenderer.send('intercept-file', this.partition, this.path, value);
		
		try {
			await this.webview.loadURL(this.path ? pathToFileURL(this.path).href : `file://${this.partition}/`);
			this.webview.clearHistory();
		} catch (_) {
			// Pass
		}
	}
	
	async linkDevtools() {
		await this.webviewReady;
		await this.devtoolsReady;

		ipcRenderer.send(
			'set-devtool-webview',
			this.webview.getWebContentsId(),
			this.devtools.getWebContentsId()
		);
	}
	
	async save(askForPath = AskForPath.WhenNeeded): Promise<boolean> {
		const value = this.editorSession.getValue();
		
		if (
			askForPath === AskForPath.Always ||
			(askForPath === AskForPath.WhenNeeded && !this.path)
		) await this.getPath();
		
		if (!this.path) return false;
		
		try {
			await fs.writeFile(this.path, value);
		} catch (_) {
			if (askForPath === AskForPath.Never) return false;
		
			return new Promise(resolve => {
				popup(
					'Failed To Save',
					'Failed to save tab to ' + this.path,
					[
						{
							text: 'Retry',
							click: () => resolve(this.save(AskForPath.WhenNeeded))
						},
						{
							text: 'Save As',
							click: () => resolve(this.save(AskForPath.Always))
						},
						{
							text: 'Cancel',
							click: () => resolve(false)
						}
					]
				)
			});
		}

		this.savedText = value;
		this.updateUnsaved();

		return true;
	}
	
	async getPath(): Promise<void> {
		const newPath = await ipcRenderer.invoke('get-path', this.mode, this.path || `unnamed${getDefaultExtension(this.mode) || ''}`);
		
		this.setPath(newPath);
	}
	
	async setPath(path: string, loadFile = false): Promise<void> {
		if (!path || path === this.path) return;
		
		if (!getFileType(extname(path))) {
			popup('Failed to set path', `Unsupported file type ${extname(path)}`);
			
			if (loadFile) this.tabStore.removeTab(this);

			return;
		}
		
		this.path = path;
		this.mode = getFileType(extname(this.path));
		
		this.updateTitle();

		this.editorSession.setMode(`ace/mode/${this.mode}`);
		
		if (loadFile) {
			const loadedText = await fs.readFile(this.path, 'utf8');

			this.editorSession.setValue(loadedText);
			this.savedText = loadedText;
		} else {
			await fs.writeFile(this.path, this.editorSession.getValue());
			this.savedText = this.editorSession.getValue();
		}
		
		this.updateUnsaved();
		this.watchController?.abort();
		this.watchController = new AbortController();

		const watcher = fs.watch(this.path, {
			signal: this.watchController.signal
		}); 
		
		try {
			for await (const _ of watcher) {
				const newValue = await fs.readFile(this.path, 'utf8');
				
				if (newValue !== this.savedText) {
					if (!this.unsaved) this.editorSession.setValue(newValue);

					this.savedText = newValue;
					this.updateUnsaved();
				}
			}
		} catch (err) {
			if (err.name !== 'AbortError') throw err;
		}
	}
	
	close() {
		(async () => {
			if (this.unsaved && this.tabStore.settings.get('autoSave')) {
				await this.save(AskForPath.Never);
			}

			if (!this.unsaved) {
				this.tabStore.removeTab(this);
				return;
			}
			
			popup(
				'Unsaved changes!',
				'Tab has unsaved changes, would you like to save them now?',
				[
					{
						text: 'Save',
						click: async () => {
							if (await this.save()) this.tabStore.removeTab(this)
						}
					},
					{
						text: 'Don\'t Save',
						click: () => this.tabStore.removeTab(this)
					},
					{
						text: 'Cancel'
					}
				]
			);
		})();
	}
	
	dispose(): void {
		this.watchController?.abort();
		this.tabElement.remove();
		this.webviewSubContainer.remove();
	}
	
	getTabData(): TabData {
		return {
			mode: this.mode,
			path: this.path,
			text: this.editorSession.getValue(),
			savedText: this.savedText
		};
	}
	
	updateUnsaved(): void {
		if (this.unsaved) {
			if (!this.tabStore.settings.get('autoSave') || !this.path) this.tabElement.classList.add('unsaved');
		} else {
			this.tabElement.classList.remove('unsaved');
		}
		
		this.updateTitle();
	}
}