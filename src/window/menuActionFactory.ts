import { ipcRenderer } from 'electron';
import showAbout from './popups/showAbout';
import { showFindPopup, showZoomPopup } from './popups/miniPopups';
import openFile from './openFile';
import UserSettingsPopup from './popups/UserSettingsPopup';
import SettingStore from './SettingStore';
import SplitElement from './SplitElement';
import Tabs from './Tabs';
import { AskForPath } from '../types';

export default function menuActionFactory(
	tabs: Tabs,
	mainSplit: SplitElement,
	settings: SettingStore
) {
	return (e: Electron.IpcRendererEvent, action: string, arg?: string) => {
		if (action === 'print') {
			// tabs.currentTab.webview.print();
			return;
		}
		
		if (action === 'find') {
			// showFindPopup(tabs.currentTab.webview);
			return;
		}
		
		if (action === 'zoom') {
			// showZoomPopup(tabs.currentTab.webview);
			return;
		}
		
		if (action === 'terminate') {
			// ipcRenderer.send('crash-renderer', tabs.currentTab.webview.getWebContentsId());
			return;
		}
		
		if (action === 'rotate') {
			settings.set('editorDirection', mainSplit.toggleDirection());
			return;
		}
		
		if (action === 'save') {
			tabs.currentTab.save();
			return;
		}
		
		if (action === 'save-as') {
			tabs.currentTab.save(AskForPath.Always);
			return;
		}
		
		if (action === 'settings') {
			new UserSettingsPopup(settings).show();
			return;
		}
		
		if (action === 'about') {
			showAbout();
			return;
		}
		
		if (action === 'run') {
			tabs.currentTab.preview();
			return;
		}
		
		if (action === 'devtools') {
			/*
			tabs.currentTab.openDevtools({
				mode: 'left'
			})
			*/
			return;
		}
		
		if (action === 'open') {
			openFile(tabs);
			return;
		}
		
		if (action === 'new') {
			tabs.createTab({ mode: arg });
		}
	};
}