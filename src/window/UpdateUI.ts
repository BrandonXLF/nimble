import { ipcRenderer } from "electron";
import updateStatusPopup from './popups/updateStatusPopup';

export default class UpdateUI {
    static IGNORE_STATES: UpdateStatus['state'][] = ['checking', 'unavailable', 'error'];

    updateEl = document.getElementById('update')! as HTMLButtonElement;
    status?: UpdateStatus;

    init() {
        ipcRenderer.on('update-status', (_, status: UpdateStatus) => this.applyStatus(status));
        ipcRenderer.invoke('get-update-status').then((status?: UpdateStatus) => this.applyStatus(status));

        this.updateEl.addEventListener('click', () => {
            if (!this.status) return;

            updateStatusPopup(false, this.status);
        });
    }

    applyStatus(newStatus: UpdateStatus | undefined) {
        this.status = newStatus?.state && !UpdateUI.IGNORE_STATES.includes(newStatus.state)
            ? newStatus : undefined;

        this.updateEl.style.display = this.status ? '' : 'none';
        this.updateEl.title = this.status?.title ?? '';
        this.updateEl.dataset.updateState = this.status?.state ?? '';
    }
}