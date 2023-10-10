import { ipcRenderer } from 'electron';
import npmPackage from '../../../package.json';
import { popup } from './popup';
import Icon from '../../icon/icon.ico';

export default function showAbout() {
	const rows: HTMLDivElement[] = [];

	const addRow = (...items: (string | Node)[]) => {
		const row = document.createElement('div');
		row.className = 'about-row';
		row.append(...items);
		rows.push(row);
	};
	
	const icon = document.createElement('img');
	icon.src = Icon;
	icon.style.height = '80px';
	addRow(icon);
		
	addRow(npmPackage.productName);
	addRow(`By ${npmPackage.author}`);
	addRow(`Version ${npmPackage.version}`);
	addRow(`Chrome ${process.versions.chrome}`);
	
	const showDevtools = document.createElement('a');
	showDevtools.innerText = 'Show App Devtools'
	showDevtools.href = '#';
	addRow(showDevtools);
	
	showDevtools.addEventListener('click', e => {
		e.preventDefault();
		ipcRenderer.send('show-window-devtools');
	});
	
	popup('About', rows);
}