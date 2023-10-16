import { ipcRenderer } from "electron";
import { popup } from "./popups/popup";

export default class UpdateUI {
    updateEl = document.getElementById('update')! as HTMLButtonElement;
    status?: UpdateStatus;

    init() {
        ipcRenderer.on('update-status', (_, status?: UpdateStatus) => this.applyStatus(status));
        ipcRenderer.invoke('get-update-status').then((status?: UpdateStatus) => this.applyStatus(status));

        this.updateEl.addEventListener('click', () => {
            if (!this.status) return;

            popup(this.status.title, this.status.details ?? '');
        });
    }

    applyStatus(newStatus: UpdateStatus | undefined) {
        this.status = newStatus;

        if (!newStatus) return;

        this.updateEl.style.display = this.status ? '' : 'none';
        this.updateEl.title = this.status?.title ?? '';
        this.updateEl.dataset.updateState = this.status?.state ?? '';
    }
}