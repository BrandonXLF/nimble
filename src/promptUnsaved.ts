import { ipcRenderer } from 'electron';
import { popup } from './popup';
import SettingStore from './SettingStore';
import Tabs from './Tabs';
import { AskForPath } from './types';

export default async function promptUnsaved(tabs: Tabs, settings: SettingStore) {
	let unsaved = tabs.tabs.filter(tab => tab.unsaved);
	
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