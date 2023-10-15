import { app, BrowserWindow, ipcMain, webContents, dialog, nativeTheme, Menu } from 'electron';
import { getOpenFilters, getSaveFilters } from '../utils/fileTypes';
import { showContextMenu } from './contextMenu';
import interceptFileProtocol from './interceptFileProtocol';
import showTopMenu from './showTopMenu';
import { randomUUID } from 'crypto';
import handleKeyboardShortcut from './handleKeyboardShortcut';
import Store from 'electron-store';
import FileHandler from './FileHandler';
import WindowFactory from './WindowFactory';
import setUpTabTransferring from './setUpTabTransferring';
import License from '../../LICENSE.md';

const initialFiles = process.argv.slice(app.isPackaged ? 1 : 2),
	gotLock = app.requestSingleInstanceLock(initialFiles);

if (!gotLock) app.quit();

const store = new Store(),
	fileHandler = new FileHandler(),
	windowFactory = new WindowFactory(store, fileHandler);

Menu.setApplicationMenu(Menu.buildFromTemplate([]));
fileHandler.registerEvents(app);

app.whenReady().then(() => windowFactory.create(initialFiles));

app.on('web-contents-created', (_, contents) => {
	if (contents.getType() !== 'webview') return;
	
	contents.on('context-menu', (_, params) => showContextMenu(params, contents.hostWebContents, contents));
});

ipcMain.on('show-license', () => fileHandler.openFiles(License));

ipcMain.on('show-window-devtools', e => webContents.fromId(e.sender.id)!.openDevTools({
	mode: 'undocked'
}));

ipcMain.handle('show-open-dialog', async (e) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender)!,
		openDialog = await dialog.showOpenDialog(browserWindow, {
			filters: getOpenFilters()
		});
		
	return openDialog.filePaths;
});

ipcMain.handle('get-webcontents-id', e => e.sender.id);

ipcMain.on('crash-renderer', (_, webContentsId: number) => webContents.fromId(webContentsId)?.forcefullyCrashRenderer());

ipcMain.on('move-window', (e, x: number, y: number) =>
	BrowserWindow.fromWebContents(e.sender)!.setPosition(x, y)
);

ipcMain.on('web-dialog', (e, type, message, initial) => {
	const uuid = randomUUID(),
		onResponse = (_: Electron.IpcMainEvent, resUUID: string, res?: boolean | string) => {
			if (resUUID !== uuid) return;
			
			ipcMain.off('web-dialog-response', onResponse);
			e.returnValue = res;
		};
	
	BrowserWindow.getFocusedWindow()?.webContents.send('web-dialog-request', uuid, type, message, initial);
	ipcMain.on('web-dialog-response', onResponse);
});

ipcMain.on('set-devtool-webview', (_, targetContentsId: number, devtoolsContentsId: number) => {
	const target = webContents.fromId(targetContentsId)!,
		devtools = webContents.fromId(devtoolsContentsId)!;

	target.setDevToolsWebContents(devtools);
	target.openDevTools();

	devtools.executeJavaScript('window.location.reload();');
});

ipcMain.on('perform-window-action', (e, action) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender)!;
	
	switch (action) {
		case 'minimize':
			browserWindow.minimize();
			break;
		case 'maximize':
			browserWindow.maximize();
			break;
		case 'unmaximize':
			browserWindow.unmaximize();
			break;
		case 'close':
			browserWindow.close();
	}
});

ipcMain.handle('get-path', async (e, type: string, defaultPath: string) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender)!,
		pathInfo = await dialog.showSaveDialog(browserWindow, {
			defaultPath,
			filters: getSaveFilters(type)
		});
		
	return pathInfo.filePath;
});

ipcMain.on('update-native-theme', (_, theme: 'system' | 'light' | 'dark') => {
	nativeTheme.themeSource = theme;
});

ipcMain.on('intercept-file', interceptFileProtocol);
ipcMain.on('show-menu', showTopMenu);
ipcMain.on('keyboard-input', handleKeyboardShortcut);

setUpTabTransferring(windowFactory);