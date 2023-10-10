import { clipboard, ContextMenuParams, Menu, MenuItemConstructorOptions, session, WebContents } from 'electron';

export function showContextMenu(params: ContextMenuParams, main: WebContents, webview?: WebContents) {
	const template: MenuItemConstructorOptions[] = [],
		focused = main || webview;
	
	if (webview) {
		template.push(
			{
				label: 'Back',
				enabled: webview.canGoBack(),
				accelerator: 'Alt+Left',
				click: () => webview.goBack()
			},
			{
				label: 'Forward',
				enabled: webview.canGoForward(),
				accelerator: 'Alt+Right',
				click: () => webview.goForward()
			},
			{
				type: 'separator'
			}
		);
	}
	
	template.push({
		label: 'Run',
		accelerator: 'CmdOrCtrl+R',
		click: () => main.send('menu-action', 'run')
	})
	
	if (webview) {
		template.push({
			label: 'Find...',
			accelerator: 'CmdOrCtrl+F',
			click: () => main.send('menu-action', 'find')
		})
		
		template.push({
			label: 'Zoom...',
			accelerator: 'CmdOrCtrl+=',
			click: () => main.send('menu-action', 'zoom')
		})
		
		template.push({
			label: 'Print...',
			accelerator: 'CmdOrCtrl+P',
			click: () => webview.print({ silent: false })
		})
	}
	
	template.push({
		type: 'separator'
	});
	
	const hasSelection = params.selectionText.length > 0;
	
	if (params.isEditable) {
		template.push(
			{
				label: 'Undo',
				accelerator: 'CmdOrCtrl+Z',
				click: () => focused.undo()
			},
			{
				label: 'Redo',
				accelerator: 'CmdOrCtrl+Shift+Z ',
				click: () => focused.redo()
			},
			{
				type: 'separator',
			}
		);
	}
	
	if (params.isEditable || hasSelection) {
		template.push(
			{
				label: 'Cut',
				accelerator: 'CmdOrCtrl+Z',
				visible: params.isEditable,
				enabled: hasSelection,
				click: () => focused.cut()
			},
			{
				label: 'Copy',
				accelerator: 'CmdOrCtrl+C',
				enabled: hasSelection,
				click: () => focused.copy()
			},
			{
				label: 'Paste',
				accelerator: 'CmdOrCtrl+V',
				visible: params.isEditable,
				click: () => focused.paste()
			},
			{
				label: 'Select All',
				accelerator: 'CmdOrCtrl+A',
				click: () => focused.selectAll()
			},
			{
				type: 'separator'
			}
		)
	}
	
	if (webview) {
		let mediaType;
		
		if (params.mediaType === 'image' || params.mediaType === 'canvas') {
			mediaType = 'Image';
		}
		
		if (params.mediaType === 'video' || params.mediaType === 'canvas') {
			mediaType = 'Video';
		}
		
		if (params.linkURL.length > 0) {
			template.push(
				{
					label: 'Copy Link Address',
					visible: params.linkURL.length > 0,
					click: () => clipboard.write({ text: params.linkURL })
				},
				{
					type: 'separator',
					visible: params.linkURL.length > 0,
				}
			);
		}
		
		if (mediaType) {
			template.push(
				{
					label: `Save ${mediaType}`,
					click: () => session.defaultSession.downloadURL(params.srcURL)
				},
				{
					label: `Copy ${mediaType}`,
					click: () => webview.copyImageAt(params.x, params.y)
				},
				{
					label: `Copy ${mediaType} Address`,
					click: () => clipboard.write({ text: params.srcURL })
				},
				{
					type: 'separator'
				}
			);
		}
		
		template.push({
			label: 'Inspect Element',
			click: () => {
				webview.inspectElement(params.x, params.y);
				main.send('menu-action', 'devtools');
			}
		});
	}
	
	Menu.buildFromTemplate(template).popup({
		x: params.x,
		y: params.y
	});
}