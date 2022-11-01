import { Menu } from 'electron';

const menus: Record<string, (Electron.MenuItemConstructorOptions & {
	id?: string;
	arg?: string;
})[]> = {
	options: [
		{
			label: 'Print',
			id: 'print'
		},
		{
			label: 'Find',
			id: 'find'
		},
		{
			label: 'Zoom',
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
			label: 'Rotate Editor',
			id: 'rotate'
		},
		{
			type: 'separator'
		},
		{
			label: 'Save',
			id: 'save'
		},
		{
			label: 'Save As',
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
			id: 'open'
		},
		{
			type: 'separator'
		},
		{
			label: 'New HTML',
			id: 'new',
			arg: 'html'
		},
		{
			label: 'New SVG',
			id: 'new',
			arg: 'svg'
		},
		{
			label: 'New MD',
			id: 'new',
			arg: 'markdown'
		}
	]
};

export default function showTopMenu(e: Electron.IpcMainEvent, type: 'options' | 'new', x: number, y: number) {
	const template = menus[type].map(item => {
		if (item.id) {
			item.click = () => {
				e.sender.send('menu-action', item.id, item.arg);
			};
		}
		
		return item;
	})
	
	Menu.buildFromTemplate(template).popup({ x, y });
}