import { ipcRenderer, shell } from 'electron';
import npmPackage from '../../../package.json';
import { popup } from './popup';
import Icon from '../../icon/icon.ico';

export default function showAbout() {
	// eslint-disable-next-line prefer-const
	let closePopup: () => void;

	const rows: HTMLDivElement[] = [];

	const addRow = (...items: (string | Node)[]) => {
		const row = document.createElement('div');
		row.className = 'row';
		row.append(...items);
		rows.push(row);
	};
	
	const icon = document.createElement('img');
	icon.src = Icon;
	icon.style.height = '80px';
	addRow(icon);
		
	addRow(npmPackage.build.productName);
	addRow(`Copyright \u00A9 ${npmPackage.author}`);
	addRow(`Version ${npmPackage.version}`);
	addRow(`Chrome ${process.versions.chrome}`);
	
	addRow(``);

	const showRepo = document.createElement('a');
	showRepo.innerText = 'Open code repository'
	showRepo.href = 'https://github.com/BrandonXLF/nimble';
	addRow(showRepo);

	showRepo.addEventListener('click', e => {
		e.preventDefault();
		shell.openExternal(showRepo.href);
		closePopup?.();
	});

	const showLicense = document.createElement('a');
	showLicense.innerText = 'Show license'
	showLicense.href = '#';
	addRow(showLicense);

	showLicense.addEventListener('click', e => {
		e.preventDefault();
		ipcRenderer.send('show-license');
		closePopup?.();
	});
	
	const showDevtools = document.createElement('a');
	showDevtools.innerText = 'Show app devtools'
	showDevtools.href = '#';
	addRow(showDevtools);
	
	showDevtools.addEventListener('click', e => {
		e.preventDefault();
		ipcRenderer.send('show-window-devtools');
		closePopup?.();
	});
	
	closePopup = popup('About', rows);
}