import Tab from '../Tab';
import { useSVG } from '../useSVG';
import { popup } from './popup';

export default class TabMiniPopups {
	zoomLevels = [0.25, 1/3, 0.5, 2/3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

	currentPopup: {
		type: string;
		dispose: () => unknown;
	};

	tab: Tab;
	
	constructor(tab: Tab) {
		this.tab = tab;
	}

	showZoomPopup() {
		if (this.currentPopup) {
			if (this.currentPopup.type === 'zoom') return;
			this.currentPopup.dispose();
		}

		const zoomText = new Text('100%'),
			showZoom = (zoom: number) => zoomText.data = Math.round(zoom * 100) + '%';
		
		const initialZoom = this.tab.webview.getZoomFactor();
		
		let zoomIndex = 0;
		
		while (this.zoomLevels[zoomIndex] < initialZoom) zoomIndex++;
		
		showZoom(initialZoom);

		const popupElement = popup(
			'',
			zoomText,
			[
				{
					text: useSVG('minus'),
					click: () => {
						zoomIndex = Math.max(zoomIndex - 1, 0);
						this.tab.webview.setZoomFactor(this.zoomLevels[zoomIndex]);
						showZoom(this.zoomLevels[zoomIndex]);
					},
					keepOpen: true
				},
				{
					text: useSVG('plus'), click: () => {
						zoomIndex = Math.min(zoomIndex + 1, this.zoomLevels.length - 1);
						this.tab.webview.setZoomFactor(this.zoomLevels[zoomIndex]);
						showZoom(this.zoomLevels[zoomIndex]);
					},
					keepOpen: true
				},
				{
					text: 'Reset', click: () => {
						zoomIndex = this.zoomLevels.indexOf(1);
						this.tab.webview.setZoomFactor(this.zoomLevels[zoomIndex]);
						showZoom(this.zoomLevels[zoomIndex]);
					},
					keepOpen: true
				},
				{
					text: useSVG('x'),
					click: () => this.currentPopup.dispose()
				},
			],
			this.tab.webviewSubContainer,
			true
		);
		
		this.currentPopup = {
			type: 'zoom',
			dispose: () => {
				popupElement.remove();
				this.currentPopup = undefined;
			}
		};
	}

	showFindPopup() {
		if (this.currentPopup) {
			if (this.currentPopup.type === 'find') return;
			this.currentPopup.dispose();
		}

		const input = document.createElement('input'),
			current = new Text('0'),
			sep = new Text('/'),
			total = new Text('0'),
			onFoundInPage = (e: Electron.FoundInPageEvent) => {
				current.data = e.result.activeMatchOrdinal.toString();
				total.data = e.result.matches.toString();
			};
			
		this.tab.webview.addEventListener('found-in-page', onFoundInPage);

		input.style.marginRight = '4px';

		input.addEventListener('input', () => {
			this.tab.webview.stopFindInPage('clearSelection');

			this.tab.webview.findInPage(input.value, {
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
						this.tab.webview.findInPage(input.value, {
							forward: false,
							findNext: false
						});
					},
					keepOpen: true
				},
				{
					text: useSVG('next'),
					click: () => {
						this.tab.webview.findInPage(input.value, {
							forward: true,
							findNext: false
						})
					},
					keepOpen: true
				},
				{
					text: useSVG('x'),
					click: () => this.currentPopup.dispose()
				},
			],
			this.tab.webviewSubContainer,
			true
		);
		
		this.currentPopup = {
			type: 'find',
			dispose: () => {
				popupElement.remove();
				this.tab.webview.stopFindInPage('clearSelection');
				this.tab.webview.removeEventListener('found-in-page', onFoundInPage);
				this.currentPopup = undefined;
			}
		};
	}
}