/**
 *                         Tab transferring flow                       
 * -------------------------------------------------------------------
 * |  Requesting renderer  |        Main       |  Renderer with tab  |
 * -------------------------------------------------------------------
 * |                  request-tab -->          |                     |
 * |       OR new-window-with-tab -->          |                     | 
 * |                       |            release-tab-to -->           |
 * |                       |          <-- send-tab-to                |
 * |                <-- show-tab               |                     |
 * -------------------------------------------------------------------
 */

import { ipcMain, webContents } from 'electron';
import WindowFactory from './WindowFactory';

function requestTabRelease(tabId: string, targetId: number, targetIndex?: number) {
    const sourceContentsId = parseInt(tabId.split('-')[0]);
    webContents.fromId(sourceContentsId)?.send('release-tab-to', tabId, targetId, targetIndex);
}

export default function setUpTabTransferring(windowFactory: WindowFactory) {
    ipcMain.on('request-tab',
        (e, tabId: string, targetIndex?: number) => requestTabRelease(tabId, e.sender.id, targetIndex)
    );

    ipcMain.on('new-window-with-tab', (_, tabId: string, x: number, y: number) => {
        const target = windowFactory.create(undefined, { x, y }).webContents;  
        target.once('ipc-message', () => requestTabRelease(tabId, target.id));
    });

    ipcMain.on('send-tab-to', (_, targetId: number, tabData: TabData, targetIndex?: number) =>
        webContents.fromId(targetId)?.send('show-tab', tabData, targetIndex)
    );
}