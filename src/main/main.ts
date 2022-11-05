import { app, BrowserWindow, ipcMain, webContents, dialog, screen, nativeTheme } from 'electron';
import { join } from 'path';
import { getOpenFilters, getSaveFilters } from '../utils/fileTypes';
import { showContextMenu } from './contextMenu';
import npmPackage from '../../package.json';
import interceptFileProtocol from './interceptFileProtocol';
import showTopMenu from './showTopMenu';
import { randomUUID } from 'crypto';
import Icon from '../icon/icon.png';

declare const WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
	app.quit();
}

function createWindow(point?: Electron.Point) {
	const options: Electron.BrowserWindowConstructorOptions = {
		width: 800,
		height: 600,
		resizable: true,
		frame: false,
		title: npmPackage.productName,
		icon: join(__dirname, Icon),
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
			contextIsolation: false
		}
	};
	
	if (point) {
		options.x = point.x - 40;
		options.y = point.y - 10;
	}
	
	const win = new BrowserWindow(options);

	win.loadURL(WINDOW_WEBPACK_ENTRY);

	win.webContents.on('context-menu', (_, params) => showContextMenu(params, win.webContents));
	
	win.on('maximize', () => win.webContents.send('maximize'));
	win.on('unmaximize', () => win.webContents.send('unmaximize'));
	win.webContents.once('ipc-message', () => win.webContents.send(win.isMaximized() ? 'maximize' : 'unmaximize'));
	
	return win;
}

app.whenReady().then(() => createWindow());

ipcMain.on('show-window-devtools', e => webContents.fromId(e.sender.id).openDevTools({
	mode: 'undocked'
}));

app.on('web-contents-created', (e, contents) => {
	if (contents.getType() !== 'webview') return;
	
	contents.on('context-menu', (_, params) => showContextMenu(params, contents.hostWebContents, contents));
});

ipcMain.handle('open-file', async (e) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender),
		openDialog = await dialog.showOpenDialog(browserWindow, {
			filters: getOpenFilters()
		});
		
	return openDialog.filePaths;
});

ipcMain.handle('get-webcontents-id', e => e.sender.id);

ipcMain.on('crash-renderer', (_, webContentsId: number) => webContents.fromId(webContentsId).forcefullyCrashRenderer());

ipcMain.on('release-tab', (e, tabId: string, targetIndex?: number) => {
	const sourceContentsId = parseInt(tabId.split('-')[0]);

	webContents.fromId(sourceContentsId).send('release-tab', tabId, e.sender.id, targetIndex);
});

ipcMain.on('new-window-with-tab', (_, tabId: string) => {
	const sourceContentsId = parseInt(tabId.split('-')[0]),
		target = createWindow(screen.getCursorScreenPoint()).webContents;
		
	target.once('ipc-message', () => {
		webContents.fromId(sourceContentsId).send('release-tab', tabId, target.id);
	});
});

ipcMain.on('move-window-to-mouse', e => {
	const point = screen.getCursorScreenPoint();
	
	BrowserWindow.fromWebContents(e.sender).setPosition(point.x - 40, point.y - 10);
});

ipcMain.on('web-dialog', (e, type, message, initial) => {
	const uuid = randomUUID(),
		onResponse = (_: Electron.IpcMainEvent, resUUID: string, res?: boolean | string) => {
			if (resUUID !== uuid) return;
			
			ipcMain.off('web-dialog-response', onResponse);
			e.returnValue = res;
		};
	
	BrowserWindow.getFocusedWindow().webContents.send('web-dialog-request', uuid, type, message, initial);
	ipcMain.on('web-dialog-response', onResponse);
});

ipcMain.on('set-devtool-webview', (_, targetContentsId: number, devtoolsContentsId: number) => {
	const target = webContents.fromId(targetContentsId),
		devtools = webContents.fromId(devtoolsContentsId);

	target.setDevToolsWebContents(devtools);
	target.openDevTools();

	devtools.executeJavaScript('window.location.reload();');
});

ipcMain.on('perform-window-action', (e, action) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender);
	
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
			
			break;
	}
});

ipcMain.handle('get-path', async (e, type: string, defaultPath: string) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender),
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