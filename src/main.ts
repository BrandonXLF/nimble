import { app, BrowserWindow, ipcMain, webContents, dialog, screen, session, nativeTheme } from 'electron';
import { join } from 'path';
import { getOpenFilters, getSaveFilters } from './fileTypes';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import markdownToHTML from './mdConverter';
import { showContextMenu } from './contextMenu';
import * as npmPackage from '../package.json';

function createWindow(point?: Electron.Point) {
	const options: Electron.BrowserWindowConstructorOptions = {
		width: 800,
		height: 600,
		resizable: true,
		frame: false,
		title: npmPackage.productName,
		icon: join(__dirname, 'icon.ico'),
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

	win.loadFile(join(__dirname, 'index.html'));

	win.webContents.on('context-menu', (_, params) => showContextMenu(params, win.webContents));
	
	win.on('maximize', () => win.webContents.send('maximize'));
	win.on('unmaximize', () => win.webContents.send('unmaximize'));
	
	win.webContents.once('ipc-message', () => {
		win.webContents.send(win.isMaximized() ? 'maximize' : 'unmaximize')
	});
	
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
	BrowserWindow.getFocusedWindow().webContents.send('web-dialog-request', type, message, initial);

	ipcMain.once('web-dialog-response', (_, res) => e.returnValue = res);
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

ipcMain.handle('get-path', async (e, defaultPath: string) => {
	const browserWindow = BrowserWindow.fromWebContents(e.sender),
		pathInfo = await dialog.showSaveDialog(browserWindow, {
			defaultPath,
			filters: getSaveFilters()
		});
		
	return pathInfo.filePath;
});

ipcMain.on('update-native-theme', (_, theme: 'system' | 'light' | 'dark') => {
	nativeTheme.themeSource = theme;
});

ipcMain.on('intercept-file', (_, partition: string, file: string, text: string) => {
	const partitionSession = session.fromPartition(partition),
		stringIntercept = async (req: Electron.ProtocolRequest, callback: (response: string | Electron.ProtocolResponse) => void) => {
			partitionSession.protocol.uninterceptProtocol('file');
			
			const requestFile = fileURLToPath(req.url);
			
			if (requestFile === file) {
				callback(text);

				return;
			}
			
			if (requestFile.endsWith('.md') || requestFile.endsWith('.markdown')) {
				const text = await fs.readFile(requestFile, 'utf8');
				
				callback(markdownToHTML(text));
			}
		};

	partitionSession.protocol.uninterceptProtocol('file');

	partitionSession.webRequest.onBeforeRequest((req, callback) => {
		let requestFile;
		
		try {
			requestFile = fileURLToPath(req.url);
		} catch (e) {
			// Not a file
		}
		
		if (!requestFile || partitionSession.protocol.isProtocolIntercepted('file')) {
			callback({});
			
			return;
		}
		
		if (requestFile === file || requestFile.endsWith('.md') || requestFile.endsWith('.markdown')) {
			partitionSession.protocol.interceptStringProtocol('file', stringIntercept);

			callback({
				redirectURL: req.url
			});
			
			return;
		}
		
		// BUG: Files may have wrong background https://github.com/electron/electron/issues/36122
		callback({});
	});
});