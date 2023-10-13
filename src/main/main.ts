import { app, BrowserWindow, ipcMain, webContents, dialog, screen, nativeTheme, Menu } from 'electron';
import { join } from 'path';
import { getOpenFilters, getSaveFilters } from '../utils/fileTypes';
import { showContextMenu } from './contextMenu';
import npmPackage from '../../package.json';
import interceptFileProtocol from './interceptFileProtocol';
import showTopMenu from './showTopMenu';
import { randomUUID } from 'crypto';
import Icon from '../icon/icon.ico';
import handleKeyboardShortcut from './handleKeyboardShortcut';
import Store from 'electron-store';
import WindowStateManager from './WindowStateManager';

Menu.setApplicationMenu(Menu.buildFromTemplate([]));

const store = new Store(),
	windowStateManager = new WindowStateManager(store);

let currentWindow: BrowserWindow | undefined,
	fileQueue: string[] | undefined = [];

function openFiles(...files: string[]) {
	if (!currentWindow) {
		fileQueue!.push(...files);
		return;
	}

	currentWindow.show();
	currentWindow.webContents.send('open-files', files);
}

function createWindow(files: string[] = [], position?: Electron.Point) {
	if (fileQueue?.length) {
		files.push(...fileQueue);
		fileQueue = [];
	}

	const options: Electron.BrowserWindowConstructorOptions = {
		resizable: true,
		frame: false,
		title: npmPackage.productName,
		icon: join(__dirname, Icon),
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
			contextIsolation: false,
			additionalArguments: files.map(file => '--open-file=' + file)
		}
	};
	
	const win = windowStateManager.createWindow(options, position);
	win.loadFile(join(__dirname, 'window.html'));

	win.webContents.on('context-menu', (_, params) => showContextMenu(params, win.webContents));

	win.webContents.once('ipc-message', () => {
		win.webContents.send(win.isMaximized() ? 'maximize' : 'unmaximize');
		win.on('maximize', () => win.webContents.send('maximize'));
		win.on('unmaximize', () => win.webContents.send('unmaximize'));

		currentWindow = win;
		win.on('focus', () => currentWindow = win);

		if (fileQueue?.length) {
			win.webContents.send('open-files', fileQueue);
			fileQueue = undefined;
		}
	});

	return win;
}

const initialFiles = process.argv.slice(app.isPackaged ? 1 : 2),
	gotLock = app.requestSingleInstanceLock(initialFiles);

if (!gotLock) app.quit();

app.whenReady().then(() => createWindow(initialFiles));

app.on('second-instance', (_, _args, _cwd, files: string[]) => openFiles(...files));
app.on('open-file', (_, path) => openFiles(path));

ipcMain.on('show-window-devtools', e => webContents.fromId(e.sender.id)!.openDevTools({
	mode: 'undocked'
}));

app.on('web-contents-created', (_, contents) => {
	if (contents.getType() !== 'webview') return;
	
	contents.on('context-menu', (_, params) => showContextMenu(params, contents.hostWebContents, contents));
});

ipcMain.handle('show-open-dialog', async (e) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender)!,
		openDialog = await dialog.showOpenDialog(browserWindow, {
			filters: getOpenFilters()
		});
		
	return openDialog.filePaths;
});

ipcMain.handle('get-webcontents-id', e => e.sender.id);

ipcMain.on('crash-renderer', (_, webContentsId: number) => webContents.fromId(webContentsId)?.forcefullyCrashRenderer());

ipcMain.on('release-tab', (e, tabId: string, targetIndex?: number) => {
	const sourceContentsId = parseInt(tabId.split('-')[0]);

	webContents.fromId(sourceContentsId)?.send('release-tab', tabId, e.sender.id, targetIndex);
});

ipcMain.on('new-window-with-tab', (_, tabId: string) => {
	const sourceContentsId = parseInt(tabId.split('-')[0]),
		target = createWindow(undefined, screen.getCursorScreenPoint()).webContents;
		
	target.once('ipc-message', () => {
		webContents.fromId(sourceContentsId)?.send('release-tab', tabId, target.id);
	});
});

ipcMain.on('move-window-to-mouse', e => {
	const point = screen.getCursorScreenPoint();
	
	BrowserWindow.fromWebContents(e.sender)!.setPosition(point.x - 40, point.y - 10);
});

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
			
			break;
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