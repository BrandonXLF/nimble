import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import npmPackage from '../../package.json';

export default class Updater {
    status?: UpdateStatus;

    constructor() {
        autoUpdater.forceDevUpdateConfig = true;

        autoUpdater.on('update-available', info => {
            this.updateStatus({
                state: 'available',
                title: 'Update available!',
                details: `Update to v${info.version} is available.`
            });
        });

        autoUpdater.on('download-progress', info => {
            this.updateStatus({
                state: 'downloading',
                title: 'Update downloading...',
                details: `Update is ${info.percent}% downloaded.`
            });
        });

        autoUpdater.on('update-downloaded', () => {
            this.updateStatus({
                state: 'downloaded',
                title: 'Update downloaded!',
                details: `Restart to use the new version of ${npmPackage.build.productName}!`
            });
        });

        autoUpdater.on('error', () => this.updateStatus());
        
        ipcMain.handle('get-update-status', () => this.status);
    }

    updateStatus(newStatus?: UpdateStatus) {
        this.status = newStatus;

        BrowserWindow.getAllWindows().forEach(
            win => win.webContents.send('update-status', this.status)
        );
    }

    check() {
        autoUpdater.checkForUpdates();
    }
}