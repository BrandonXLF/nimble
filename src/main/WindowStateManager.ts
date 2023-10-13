import Store from 'electron-store';
import { BrowserWindow, screen } from 'electron';

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

export default class WindowStateManager {
    static DEFAULT_WIDTH = 800;
    static DEFAULT_HEIGHT = 600;
    static STATE_EVENTS =  ['focus', 'moved', 'resize', 'maximize', 'unmaximize'] as const;

    constructor(private store: Store) { }

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
            width: storedState.width ?? WindowStateManager.DEFAULT_WIDTH,
            height: storedState.height ?? WindowStateManager.DEFAULT_HEIGHT,
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
            state.width = WindowStateManager.DEFAULT_WIDTH;
            state.height = WindowStateManager.DEFAULT_HEIGHT;
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

    createWindow(options: Electron.BrowserWindowConstructorOptions, position?: Electron.Point) {
        const state = this.getWindowState(position),
            win = new BrowserWindow({ ...options, ...state });

        if (state.maximized) win.maximize();

        const listener = () => this.saveState(win);
        WindowStateManager.STATE_EVENTS.forEach(event => win.on(event as 'focus', listener));

        return win;
    }
}