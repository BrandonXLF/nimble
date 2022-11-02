import { ipcRenderer } from 'electron';
import Tabs from './Tabs';

export default async function openFile(tabs: Tabs) {
	const files = await ipcRenderer.invoke('open-file');

	(files as string[]).forEach(path => tabs.createFromFile(path));
}