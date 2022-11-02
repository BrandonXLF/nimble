import { ipcRenderer } from 'electron';
import Tabs from '../Tabs';
import { popup } from './popup';

export default function showWebDialogFactory(tabs: Tabs) {
	return async (_: Electron.IpcRendererEvent, uuid: string, type: string, message: string, initial: string) => {
		if (type === 'alert') {
			popup(
				'Alert',
				message,
				[
					{
						text: 'OK',
						click: () => ipcRenderer.send('web-dialog-response', uuid, undefined)
					}
				],
				tabs.currentTab.popupArea
			);

			return;
		}

		if (type === 'confirm') {
			popup(
				'Confirm',
				message,
				[
					{
						text: 'OK',
						click: () => ipcRenderer.send('web-dialog-response', uuid, true)
					},
					{
						text: 'Cancel',
						click: () => ipcRenderer.send('web-dialog-response', uuid, false)
					}
				],
				tabs.currentTab.popupArea
			);
			
			return;
		}
		
		if (type === 'prompt') {
			const input = document.createElement('input');
			input.value = initial || '';
			input.style.cssText = 'display: block; margin-top: 1em';

			popup(
				'Prompt',
				[message, input],
				[
					{
						text: 'OK',
						click: () => ipcRenderer.send('web-dialog-response', uuid, input.value)
					},
					{
						text: 'Cancel',
						click: () => ipcRenderer.send('web-dialog-response', uuid, null)
					}
				],
				tabs.currentTab.popupArea
			);
		}
	};
}