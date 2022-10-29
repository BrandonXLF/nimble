import { ipcRenderer } from 'electron';
import { popup } from './popup';

ipcRenderer.on('web-dialog-request', async (_, type: string, message: string, initial: string) => {
	if (type === 'alert') {
		popup(
			'Alert',
			message,
			[
				{
					text: 'OK',
					click: () => ipcRenderer.send('web-dialog-response', undefined)
				}
			],
			document.getElementById('viewer-container')
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
					click: () => ipcRenderer.send('web-dialog-response', true)
				},
				{
					text: 'Cancel',
					click: () => ipcRenderer.send('web-dialog-response', false)
				}
			],
			document.getElementById('viewer-container')
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
					click: () => ipcRenderer.send('web-dialog-response', input.value)
				},
				{
					text: 'Cancel',
					click: () => ipcRenderer.send('web-dialog-response', null)
				}
			],
			document.getElementById('viewer-container')
		);
	}
});