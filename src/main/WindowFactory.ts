import { BrowserWindow, Point, screen } from 'electron';
import { join } from 'path';
import { platform } from 'os';
import { showContextMenu } from './contextMenu';
import npmPackage from '../../package.json';
import Icon from '../icon/icon.png';
import IconIco from '../icon/icon.ico';
import Store from 'electron-store';
import FileHandler from './FileHandler';

type FullWindowState = {
    x: number,
    y: number,
    width: number, 
    height: number,
    maximized?: boolean
};

type WindowState = FullWindowState | {
    x: undefined,
    y: undefined,
    width: number,
    height: number,
    maximized?: boolean
};

export default class WindowFactory {
    static DEFAULT_WIDTH = 800;
    static DEFAULT_HEIGHT = 600;
    static STATE_EVENTS =  ['focus', 'moved', 'resize', 'maximize', 'unmaximize'] as const;

    constructor(
        private store: Store,
        private fileHandler: FileHandler
    ) { }

    stateWithinBounds(state: FullWindowState, bounds: Electron.Rectangle) {
        return state.x >= bounds.x &&
            state.y >= bounds.y &&
            state.x + state.width <= bounds.x + bounds.width &&
            state.y + state.height <= bounds.y + bounds.height;
    }

    stateWithinDisplay(state: WindowState) {
        if (state.x === undefined) {
            const bounds = screen.getPrimaryDisplay().bounds;
            return state.width <= bounds.width && state.height <= bounds.height;
        }

        return screen.getAllDisplays().some(
            display => this.stateWithinBounds(state, display.bounds)
        );
    }

    getWindowState(position?: Electron.Point) {
        const storedState = this.store.get('window-state', {}) as Partial<WindowState>;

        const state = {
            x: position?.x ?? storedState.x,
            y: position?.y ?? storedState.y,
            width: storedState.width ?? WindowFactory.DEFAULT_WIDTH,
            height: storedState.height ?? WindowFactory.DEFAULT_HEIGHT,
            maximized: storedState.maximized ?? false
        } as WindowState;

        if (position) {
            return state;
        }
        
        if (state.x !== undefined && !this.stateWithinDisplay(state)) {
            delete (state as WindowState).x;
            delete (state as WindowState).y;
        }

        if (!this.stateWithinDisplay(state)) {
            state.width = WindowFactory.DEFAULT_WIDTH;
            state.height = WindowFactory.DEFAULT_HEIGHT;
        }

        return state;
    }

    saveState(window: BrowserWindow) {
        const bounds = window.getNormalBounds(),
            state: WindowState = {
                ...bounds,
                maximized: window.isMaximized()
            };

        this.store.set('window-state', state);
    }

    create(files: string[] = [], position?: Point) {
        const earlyFileQueue = this.fileHandler.consumeQueue();

        if (earlyFileQueue?.length) {
            files.push(...earlyFileQueue);
        }
    
        const state = this.getWindowState(position),
            options: Electron.BrowserWindowConstructorOptions = {
                ...state,
                resizable: true,
                frame: false,
                title: npmPackage.build.productName,
                icon: join(__dirname, platform() === 'win32' ? IconIco : Icon),
                webPreferences: {
                    webviewTag: true,
                    nodeIntegration: true,
                    // BUG: Required to bypass https://github.com/electron/electron/issues/22582
                    nodeIntegrationInSubFrames: true,
                    contextIsolation: false,
                    additionalArguments: files.map(file => '--open-file=' + file)
                }
            },
            win = new BrowserWindow(options);
        
        win.loadFile(join(__dirname, 'window.html'));

        if (state.maximized) win.maximize();

        const listener = () => this.saveState(win);
        WindowFactory.STATE_EVENTS.forEach(event => win.on(event as 'focus', listener));
    
        win.webContents.on('context-menu', (_, params) => showContextMenu(params, win.webContents));
    
        win.webContents.once('ipc-message', () => {
            win.webContents.send(win.isMaximized() ? 'maximize' : 'unmaximize');
            win.on('maximize', () => win.webContents.send('maximize'));
            win.on('unmaximize', () => win.webContents.send('unmaximize'));

            this.fileHandler.setCurrentWindow(win);
        });
    
        return win;
    }
}