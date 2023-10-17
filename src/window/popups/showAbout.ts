import { ipcRenderer, shell } from 'electron';
import npmPackage from '../../../package.json';
import { popup } from './popup';
import Icon from '../../icon/icon.png';
import showUpdateCheck from './showUpdateCheck';

export default function showAbout() {
	// eslint-disable-next-line prefer-const
	let closePopup: () => void;
	const rows: HTMLDivElement[] = [];

	const addRow = (...items: (string | Node)[]) => {
		const row = document.createElement('div');

		row.className = 'row';
		row.append(...items);
		rows.push(row);

		return row;
	};

	const addActionLink = (text: string, click: () => unknown) => {
		const link = document.createElement('a');
		link.innerText = text;
		link.href = '#';

		link.addEventListener('click', e => {
			e.preventDefault();
			click();
			closePopup?.();
		});

		addRow(link);
	};
	
	const icon = document.createElement('img');
	icon.src = Icon;
	icon.style.height = '80px';

	addRow(icon);
	addRow(npmPackage.build.productName);

	addRow(`Copyright \u00A9 ${npmPackage.author}`);
	addRow(`Version ${npmPackage.version}`);
	addRow(`Chrome ${process.versions.chrome}`);

	addRow('');
	
	addActionLink('Check for updates', () => showUpdateCheck());
	addActionLink(
		'Open code repository',
		() => shell.openExternal('https://github.com/BrandonXLF/nimble')
	);
	addActionLink('View license', () => ipcRenderer.send('show-license'));
	addActionLink('Show app devtools', () => ipcRenderer.send('show-window-devtools'));
	
	closePopup = popup('About', rows);
}