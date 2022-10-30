import { ipcRenderer } from 'electron';
import { extname } from 'path';
import { getFileType } from '../utils/fileTypes';
import { popup } from './popups/popup';
import Tabs from './Tabs';

export default async function openFile(tabs: Tabs) {
	const files = await ipcRenderer.invoke('open-file');

	(files as string[]).forEach(path => {
		if (!getFileType(extname(path))) {
			popup('Failed to open file', `Unsupported file type ${extname(path)}`);
			return;
		}

		tabs.createTab({ path });
	});
}