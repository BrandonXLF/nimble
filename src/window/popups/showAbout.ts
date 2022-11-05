import { ipcRenderer } from 'electron';
import npmPackage from '../../../package.json';
import { popup } from './popup';
import Icon from '../../icon/icon.png';

export default function showAbout() {
	const nameDiv = document.createElement('div'),
		versionDiv = document.createElement('div'),
		chromeVerDiv = document.createElement('div'),
		showDevtools = document.createElement('a'),
		icon = document.createElement('img');
	
	icon.src = Icon;
	icon.style.height = '80px';
	icon.classList.add('about-row');
		
	nameDiv.append(icon, npmPackage.productName);
	nameDiv.classList.add('about-row');

	versionDiv.innerText = `Version ${npmPackage.version}`;
	versionDiv.classList.add('about-row');
	
	chromeVerDiv.innerText = `Chrome ${process.versions.chrome}`;
	chromeVerDiv.classList.add('about-row');
	
	showDevtools.innerText = 'Show App Devtools'
	showDevtools.href = '#';
	showDevtools.classList.add('about-row');
	
	showDevtools.addEventListener('click', e => {
		e.preventDefault();
		ipcRenderer.send('show-window-devtools');
	});
	
	popup(
		'About',
		[icon, nameDiv, versionDiv, chromeVerDiv, showDevtools]
	);
}