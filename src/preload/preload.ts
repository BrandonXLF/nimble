import { ipcRenderer, contextBridge, webFrame } from 'electron';

const prefix = `NIMBLE_${(Math.random() + 1).toString(36).substring(2)}`;

function genFuncOverrides(...funcs: string[]) {
	return funcs.map(func => `window.${func}=window.${prefix}_${func};`).join('');
}

contextBridge.exposeInMainWorld(`${prefix}_alert`, (message: unknown) => {
	ipcRenderer.sendSync('web-dialog', 'alert', message);
});

contextBridge.exposeInMainWorld(`${prefix}_confirm`, (message: unknown) => {
	return ipcRenderer.sendSync('web-dialog', 'confirm', message);
});

contextBridge.exposeInMainWorld(`${prefix}_prompt`, (message: unknown, initial: unknown) => {
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

webFrame.executeJavaScript(genFuncOverrides('alert', 'confirm', 'prompt'));