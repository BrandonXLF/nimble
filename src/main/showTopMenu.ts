import { Menu } from 'electron';
import { fileTypes } from '../utils/fileTypes';

const menus: Record<string, (Electron.MenuItemConstructorOptions & {
	id?: string;
	mode?: string;
})[]> = {
	options: [
		{
			label: 'Print',
			accelerator: 'CmdOrCtrl+P',
			id: 'print'
		},
		{
			label: 'Find',
			accelerator: 'CmdOrCtrl+F',
			id: 'find'
		},
		{
			label: 'Zoom',
			accelerator: 'CmdOrCtrl+=',
			id: 'zoom'
		},
		{
			label: 'Terminate',
			id: 'terminate'
		},
		{
			type: 'separator'

		},
		{
			label: 'Format Code',
			id: 'format'
		},
		{
			type: 'separator'
		},
		{
			label: 'Rotate Editor',
			accelerator: 'CmdOrCtrl+Shift+E',
			id: 'rotate-editor'
		},
		{
			label: 'Rotate Devtools',
			accelerator: 'CmdOrCtrl+Shift+D',
			id: 'rotate-devtools'
		},
		{
			type: 'separator'
		},
		{
			label: 'Save',
			accelerator: 'CmdOrCtrl+S',
			id: 'save'
		},
		{
			label: 'Save As',
			accelerator: 'CmdOrCtrl+Shift+S',
			id: 'save-as'
		},
		{
			type: 'separator'
		},
		{
			label: 'Settings',
			id: 'settings'
		},
		{
			label: 'About',
			id: 'about'
		}
	],
	new: [
		{
			label: 'Open File',
			accelerator: 'CmdOrCtrl+O',
			id: 'open'
		},
		{
			type: 'separator'
		},
		...fileTypes.map(typeInfo => ({
			label: `New ${typeInfo.shortName ?? typeInfo.name}`,
			accelerator: 'CmdOrCtrl+N',
			id: 'new',
			mode: typeInfo.type
		}))
	]
};

export default function showTopMenu(e: Electron.IpcMainEvent, type: 'options' | 'new', x: number, y: number, mode: string) {
	const template = menus[type].map(item => {
		const newItem = {...item};
		
		if (newItem.id) {
			newItem.click = () => {
				e.sender.send('menu-action', newItem.id, newItem.mode);
			};
		}
		
		if (newItem.mode && newItem.mode !== mode) {
			delete newItem.accelerator;
		}
		
		return newItem;
	});
	
	Menu.buildFromTemplate(template).popup({ x, y });
}