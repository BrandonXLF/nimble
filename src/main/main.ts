import { app, BrowserWindow, ipcMain, webContents, dialog, nativeTheme, Menu } from 'electron';
import { getOpenFilters, getSaveFilters } from '../utils/fileTypes';
import { showContextMenu } from './contextMenu';
import { join } from 'path';
import SessionManager from './SessionManager';
import showTopMenu from './showTopMenu';
import { randomUUID } from 'crypto';
import handleKeyboardShortcut from './handleKeyboardShortcut';
import Store from 'electron-store';
import FileHandler from './FileHandler';
import WindowFactory from './WindowFactory';
import setUpTabTransferring from './setUpTabTransferring';
import License from '../../LICENSE.md';
import Updater from './Updater';
import SettingStore from '../utils/SettingStore';

const initialFiles = process.argv.slice(app.isPackaged ? 1 : 2),
	gotLock = app.requestSingleInstanceLock(initialFiles);

if (!gotLock) app.quit();

function emitSettingsUpdate() {
	BrowserWindow.getAllWindows().forEach(win => win.webContents.send('settings-updated'));
}

const store = new Store(),
	settings = new SettingStore(emitSettingsUpdate, store),
	fileHandler = new FileHandler(),
	windowFactory = new WindowFactory(store, fileHandler),
	updater = new Updater(),
	sessionManager = new SessionManager();

Menu.setApplicationMenu(Menu.buildFromTemplate([]));
fileHandler.registerEvents(app);

app.whenReady().then(() => windowFactory.create(initialFiles));

updater.check();

app.on('web-contents-created', (_, contents) => {
	if (contents.getType() !== 'webview') return;
	
	contents.on('context-menu', (_, params) => showContextMenu(params, contents.hostWebContents, contents));
});

ipcMain.on('renderer-settings-updated', () => {
	settings.markExternalSet();
	emitSettingsUpdate();
});

ipcMain.on('show-license', () => fileHandler.openFiles(join(__dirname, License)));

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

settings.callAndListen('theme', (theme: 'system' | 'light' | 'dark') => {
	nativeTheme.themeSource = theme;
});

ipcMain.on('set-session',(_, ...args: [string, string, string, string]) => sessionManager.set(...args));
ipcMain.on('delete-session', (_, partition: string) => sessionManager.delete(partition));

ipcMain.on('show-menu', showTopMenu);
ipcMain.on('keyboard-input', handleKeyboardShortcut);

setUpTabTransferring(windowFactory);