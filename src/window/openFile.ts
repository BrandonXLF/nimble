import { ipcRenderer } from 'electron';
import Tabs from './Tabs';

export default async function openFile(tabs: Tabs) {
	const files = await ipcRenderer.invoke('show-open-dialog');

	(files as string[]).forEach(path => tabs.createFromFile(path));
}