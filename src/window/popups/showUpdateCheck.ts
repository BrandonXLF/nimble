import { IpcRendererEvent, ipcRenderer } from 'electron';
import { popup } from './popup';

export default async function showUpdateCheck() {
    ipcRenderer.send('check-for-updates');

    const title = new Text('Initializing...'),
        details = new Text('Updater initializing...');

    const updateStateListener = (_: IpcRendererEvent, status: UpdateStatus) => {
        title.textContent = status.title;
        details.textContent = status.details;
    };

    popup(title, details, [{
        text: 'Close',
        click: () => ipcRenderer.off('update-status', updateStateListener)
    }]);

    ipcRenderer.on('update-status', updateStateListener);
}