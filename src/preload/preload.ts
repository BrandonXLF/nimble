import { ipcRenderer, contextBridge, webFrame } from 'electron';

function genFuncOverrides(...funcs: string[]) {
	return funcs.map(func => `window.${func}=window.NIMBLE_${func};`).join('');
}

contextBridge.exposeInMainWorld('NIMBLE_alert', (message: unknown) => {
	ipcRenderer.sendSync('web-dialog', 'alert', message);
});

contextBridge.exposeInMainWorld('NIMBLE_confirm', (message: unknown) => {
	return ipcRenderer.sendSync('web-dialog', 'confirm', message);
});

contextBridge.exposeInMainWorld('NIMBLE_prompt', (message: unknown, initial: unknown) => {
	return ipcRenderer.sendSync('web-dialog', 'prompt', message, initial);
});

window.addEventListener('keyup', e => {
	if (e.defaultPrevented) return;
	
	ipcRenderer.send(
		'keyboard-input',
		false,
		e.key,
		process.platform === 'darwin' ? e.metaKey : e.ctrlKey,
		e.altKey,
		e.shiftKey
	);
});

// BUG: Directly override https://github.com/electron/electron/issues/33460
webFrame.executeJavaScript(genFuncOverrides('alert', 'confirm', 'prompt'));