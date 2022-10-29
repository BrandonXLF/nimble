import { useSVG } from './useSVG';
import { popup } from './popup';

const zoomLevels = [0.25, 1/3, 0.5, 2/3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

let currentPopup: {
	type: string;
	dispose: () => unknown;
}

export function showZoomPopup(webview: Electron.WebviewTag) {
	if (currentPopup) {
		if (currentPopup.type === 'zoom') return;
		currentPopup.dispose();
	}

	const zoomText = new Text('100%'),
		showZoom = (zoom: number) => zoomText.data = Math.round(zoom * 100) + '%';
	
	const initialZoom = webview.getZoomFactor();
	
	let zoomIndex = 0;
	
	while (zoomLevels[zoomIndex] < initialZoom) zoomIndex++;
	
	showZoom(initialZoom);

	const popupElement = popup(
		'',
		zoomText,
		[
			{
				text: useSVG('minus'),
				click: () => {
					zoomIndex = Math.max(zoomIndex - 1, 0);
					webview.setZoomFactor(zoomLevels[zoomIndex]);
					showZoom(zoomLevels[zoomIndex]);
				},
				keepOpen: true
			},
			{
				text: useSVG('plus'), click: () => {
					zoomIndex = Math.min(zoomIndex + 1, zoomLevels.length - 1);
					webview.setZoomFactor(zoomLevels[zoomIndex]);
					showZoom(zoomLevels[zoomIndex]);
				},
				keepOpen: true
			},
			{
				text: 'Reset', click: () => {
					zoomIndex = zoomLevels.indexOf(1);
					webview.setZoomFactor(zoomLevels[zoomIndex]);
					showZoom(zoomLevels[zoomIndex]);
				},
				keepOpen: true
			},
			{
				text: useSVG('x')
			},
		],
		document.getElementById('webview-container'),
		true
	);
	
	currentPopup = {
		type: 'zoom',
		dispose: () => {
			popupElement.remove();
			currentPopup = undefined;
		}
	};
}

export function showFindPopup(webview: Electron.WebviewTag) {
	if (currentPopup) {
		if (currentPopup.type === 'find') return;
		currentPopup.dispose();
	}

	const input = document.createElement('input'),
		current = new Text('0'),
		sep = new Text('/'),
		total = new Text('0');
		
	webview.addEventListener('found-in-page', e => {
		current.data = e.result.activeMatchOrdinal.toString();
		total.data = e.result.matches.toString();
	});

	input.style.marginRight = '4px';

	input.addEventListener('input', () => {
		webview.stopFindInPage('clearSelection');

		webview.findInPage(input.value, {
			findNext: true
		});
	});

	const popupElement = popup(
		'',
		[input, current, sep, total],
		[
			{
				text: useSVG('prev'),
				click: () => {
					webview.findInPage(input.value, {
						forward: false,
						findNext: false
					});
				},
				keepOpen: true
			},
			{
				text: useSVG('next'),
				click: () => {
					webview.findInPage(input.value, {
						forward: true,
						findNext: false
					})
				},
				keepOpen: true
			},
			{
				text: useSVG('x'),
				click: () => {
					webview.stopFindInPage('clearSelection');
				}
			},
		],
		document.getElementById('webview-container'),
		true
	);
	
	currentPopup = {
		type: 'find',
		dispose: () => {
			popupElement.remove();
			webview.stopFindInPage('clearSelection');
			currentPopup = undefined;
		}
	};
}