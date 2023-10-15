import { App, BrowserWindow } from 'electron';

export default class FileHandler {
    currentWindow: BrowserWindow | undefined;
	fileQueue: string[] | undefined = [];

    openFiles(...files: string[]) {
        if (!this.currentWindow) {
            this.fileQueue!.push(...files);
            return;
        }
    
        this.currentWindow.show();
        this.currentWindow.webContents.send('open-files', files);
    }

    registerEvents(app: App) {
        app.on('second-instance', (_, _args, _cwd, files: string[]) => this.openFiles(...files));
        app.on('open-file', (_, path) => this.openFiles(path));

    }

    consumeQueue() {
        if (!this.fileQueue?.length) return;

        const consumedQueue = this.fileQueue;
        this.fileQueue = [];

        return consumedQueue;
    }

    setCurrentWindow(win: BrowserWindow) {
		this.currentWindow = win;
		win.on('focus', () => this.currentWindow = win);

		if (this.fileQueue?.length) {
			win.webContents.send('open-files', this.fileQueue);
		}

        this.fileQueue = undefined;
    }
}