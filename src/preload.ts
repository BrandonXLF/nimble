import { ipcRenderer, contextBridge, webFrame } from 'electron';

function genFuncOverrides(...funcs: string[]) {
	return funcs.map(func => `window.${func}=window.MVE_${func};`).join('');
}

contextBridge.exposeInMainWorld('MVE_alert', (message: unknown) => {
	ipcRenderer.sendSync('web-dialog', 'alert', message);
});

contextBridge.exposeInMainWorld('MVE_confirm', (message: unknown) => {
	return ipcRenderer.sendSync('web-dialog', 'confirm', message);
});

contextBridge.exposeInMainWorld('MVE_prompt', (message: unknown, initial: unknown) => {
	return ipcRenderer.sendSync('web-dialog', 'prompt', message, initial);
});

// TODO: Directly override https://github.com/electron/electron/issues/33460
webFrame.executeJavaScript(genFuncOverrides('alert', 'confirm', 'prompt'));