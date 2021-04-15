const byId = document.getElementById.bind(document),
	create = document.createElement.bind(document),
	editorElement = byId('editor'),
	editor = ace.edit(editorElement),
	fs = require('fs/promises'),
	{fileURLToPath} = require('url'),
	{dirname} = require('path'),
	settingsInfo: {
		type: string, name: string, label: string, values?: string[], default: any
	}[] = require('./settings.json'),
	acceptedTypes = {
		all: '.html,.htm,.md,.markdown,.svg',
		svg: '.svg',
		markdown: '.md,.markdown',
		html: '.html,.htm'
	},
	fileTypes = {
		html: 'html',
		htm: 'html',
		svg: 'svg',
		markdown: 'markdown',
		md: 'markdown'
	},
	zoomLevels = [0.25, 1/3, 0.5, 2/3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5],
	settings = JSON.parse(localStorage.getItem('settings') || '{}'),
	preview = byId('preview') as NW_HTMLWebViewElement,
	content = byId('content'),
	previewContainer = byId('preview-container'),
	devtools = byId('devtools') as NW_HTMLWebViewElement,
	tabs = byId('tabs'),
	darkQuery = matchMedia('(prefers-color-scheme: dark)'),
	nwWindow = nw.Window.get();

let darkTheme: boolean,
	connPort: chrome.runtime.Port,
	unresponsivePopup: HTMLElement,
	zoomPopup: HTMLElement,
	findPopup: HTMLElement,
	converter: showdown.Converter,
	zoomIndex: number;

function getConverter() {
	if (converter) return converter;
	return converter = new showdown.Converter()
}

function createSVG(id: string, className?: string) {
	let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
		use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

	svg.setAttributeNS(null, 'viewBox', '0 0 100 100');
	svg.classList.add('icon');
	className && svg.classList.add(className);
	use.setAttributeNS(null, 'href', '#' + id);
	svg.append(use);

	return svg;
}

function createMenu(...items: NWJS_Helpers.MenuItemOption[]) {
	let menu = new nw.Menu();
	items.forEach(item => menu.append(new nw.MenuItem(item)));
	return menu;
}

function createDropdown(id: string, ...items: {label: string, click: (e: MouseEvent) => any}[]) {
	let menu = create('div'),
		menuItems = create('div');

	menuItems.className = 'menu-items';
	menu.className = 'menu';
	byId(id).classList.add('menu-parent');

	menu.append(menuItems);
	byId(id).append(menu);

	items.forEach(item => {
		let el = create('div');
		el.addEventListener('click', item.click);
		el.innerText = item.label;
		menuItems.append(el);
	});
}

function loadData(value: string, path: string) {
	preview.loadDataWithBaseUrl('data:text/html,' + encodeURIComponent(value), path, 'about:blank');
}

function setTheme(initial = false) {
	darkTheme = settings.theme === 'Light' ? false : settings.theme === 'Dark' ? true : darkQuery.matches;
	document.documentElement.classList.toggle('dark', darkTheme);

	let previewTheme = settings.previewTheme,
		darkPreview = previewTheme === 'Light' ? false : previewTheme === 'Dark' ? true : darkTheme;

	if (!initial) {
		preview.removeContentScripts(['theme']);
		preview.insertCSS({
			code: darkPreview
				? '@media not print{:root{background:#222;color:#fff}a:link{color:#31c3f7}}'
				: '@media not print{:root{background:unset;color:unset}a:link{color:unset}}'
		});
	}

	if (darkPreview) {
		preview.addContentScripts([{
			name: 'theme',
			matches: ['<all_urls>'],
			css: {
				code: '@media not print{:root{background:#222;color:#fff}a:link{color:#31c3f7}}'
			},
			run_at: 'document_start'
		}]);
	}
}

function popup(
	title: string,
	msg: string|Node|(string|Node)[],
	buttons: {text: string|Node, click?: () => any}[] = [{text: 'OK'}],
	parent = content,
	small = false
) {
	let container = create('div'),
		popupElement = create('div'),
		text = create('div'),
		buttonCnt = create('div');

	container.className = 'popup-container';
	container.style.cssText = '';

	popupElement.className = 'popup';

	if (!small) {
		container.append(popupElement);
		parent.append(container);
	} else {
		popupElement.className += ' mini-popup';
		container.append(popupElement);
	}

	if (title) {
		let titleElement = create('h3');

		titleElement.style.cssText = 'margin: 0;';
		titleElement.innerText = title;
		popupElement.append(titleElement);
	}

	Array.isArray(msg) ? text.append(...msg) : text.append(msg);
	popupElement.append(text);

	buttonCnt.style.textAlign = 'right';
	popupElement.append(buttonCnt);

	buttons.forEach(button => {
		let buttonElement = create('button');

		buttonElement.append(button.text);
		buttonElement.addEventListener('click', () => {
			container.remove();
			button.click?.();
		});
		buttonCnt.append(buttonElement);
	});

	return popupElement;
}

function saveSetting(key: string, value: any) {
	settings[key] = value;
	localStorage.setItem('settings', JSON.stringify(settings));
	setTheme();
	configAce();
}

function configAce() {
	editor.setOptions({
		enableLiveAutocompletion: true,
		useSoftTabs: settings.softTabs,
		wrap: settings.wordWrap ? 'free' : 'off',
		tabSize: settings.tabSize,
		useWorker: true,
		showGutter: settings.gutter,
		showPrintMargin: false,
		showInvisibles: settings.showInvisible,
		theme: 'ace/theme/' + (darkTheme ? 'clouds_midnight' : 'clouds'),
	});
}

async function openPath(filePath: string) {
	let fileType = filePath.split('.').pop();

	if (!fileTypes[fileType]) {
		popup('Invalid filetype!', `'${fileType}' is an invalid filetype!`, [
			{text: 'Try again', click: openFile},
			{text: 'Cancel'}
		]);
		return;
	}

	fs.readFile(filePath).then(
		buffer => Tab.create({path: filePath, text: buffer.toString()}),
		err => popup(`Failed to read file: ${filePath}`, err.message)
	);
}

function openFile() {
	let chooser = create('input');

	chooser.setAttribute('accept', acceptedTypes.all);
	chooser.type = 'file';
	chooser.addEventListener('change', () => chooser.value && openPath(chooser.value));
	chooser.click();
}

function showSettings() {
	popup('Settings', settingsInfo.map(setting => {
		let el = create('label');
		el.className = 'setting-row';

		switch (setting.type) {
			case 'checkbox':
				let checkbox = create('input');
				checkbox.type = 'checkbox';
				checkbox.checked = settings[setting.name];
				checkbox.addEventListener('change', () => saveSetting(setting.name, checkbox.checked));
				el.append(setting.label, checkbox);
				break;
			case 'select':
				let select = create('select');
				select.addEventListener('change', () => saveSetting(setting.name, select.value));
				setting.values.forEach(value => {
					let option = create('option');

					option.append(value);
					option.selected = value === settings[setting.name];
					select.append(option);
				});
				el.append(setting.label, select);
				break;
			case 'text':
			case 'number':
				let input = create('input');
				input.type = setting.type;
				input.value = settings[setting.name];
				input.addEventListener('change', () => saveSetting(setting.name, input.value));
				el.append(setting.label, input);
				break;
		}

		return el;
	}));
}

function draggable(el: HTMLElement, handle: (e: MouseEvent) => any) {
	el.addEventListener('mousedown', () => {
		let dragArea = create('div');

		dragArea.className = 'drag-area';
		dragArea.style.cursor = getComputedStyle(el).cursor;

		dragArea.addEventListener('mousemove', e => {
			if (!e.buttons) {
				dragArea.remove();
				return;
			}

			e.preventDefault();
			handle(e);
		});

		el.parentNode.append(dragArea);
	});
}

preview.addEventListener('unresponsive', function() {
	if (document.contains(unresponsivePopup)) return;

	unresponsivePopup = popup('Unresponsive', 'The preview window has become unresponsive', [
		{text: 'Wait'},
		{text: 'Terminate', click: () => preview.terminate()}
	]);
});

preview.addEventListener('responsive', function() {
	unresponsivePopup?.remove();
});

preview.addEventListener('newwindow', e => {
	let webview = create('webview'),
		style = create('style');

	e.window.attach(webview);
	style.appendChild(new Text('body{display:flex;margin:0}webview{flex:1}'));

	nw.Window.open('about:blank', {}, win => {
		win.window.addEventListener('load', () => {
			win.window.document.body.append(style, webview);
		});
	});
});

document.title = nw.App.manifest.productName;

settingsInfo.forEach(settingInfo => {
	if (settings[settingInfo.name] === undefined) {
		settings[settingInfo.name] = settingInfo.default;
	}
});

setTheme(true);
configAce();

darkQuery.addEventListener('change', () => {
	setTheme();
	configAce();
});

chrome.runtime.onConnect.addListener(lPort => {
	connPort = lPort;

	connPort.onMessage.addListener(msg => {
		let rect = preview.getBoundingClientRect();

		createMenu(
			{label: 'Print', click: () => preview.print()},
			{label: 'Find', click: () => {
				if (findPopup) return;

				let input = create('input'),
					current = new Text('0'),
					sep = new Text('/'),
					total = new Text('0'),
					findCallback = res => {
						current.data = res.activeMatchOrdinal;
						total.data = res.numberOfMatches;
					};

				input.style.marginRight = '4px';
				input.addEventListener('input', () => {
					preview.stopFinding('clear');
					preview.find(input.value, {}, findCallback);
				});

				findPopup = popup('', [input, current, sep, total], [
					{text: createSVG('prev'), click: () => {
						preview.find(input.value, {backward: true}, findCallback);
					}},
					{text: createSVG('next'), click: () => {
						preview.find(input.value, {}, findCallback)
					}},
					{text: createSVG('close'), click: () => {
						preview.stopFinding('clear');
						findPopup.remove();
						findPopup = undefined;
					}},
				], previewContainer, true);
			}},
			{label: 'Zoom', click: () => {
				if (zoomPopup) return;

				let zoomText = new Text('100%'),
					zoomCallback = (zoom = zoomLevels[zoomIndex]) => zoomText.data = Math.round(zoom * 100) + '%',
					defaultIndex = zoomLevels.indexOf(1);

				preview.getZoom(zoomCallback);

				zoomPopup = popup('', zoomText, [
					{text: createSVG('minus'), click: () => {
						zoomIndex = zoomIndex || defaultIndex;
						zoomIndex = Math.max(zoomIndex - 1, 0);
						preview.setZoom(zoomLevels[zoomIndex], zoomCallback);
					}},
					{text: createSVG('plus'), click: () => {
						zoomIndex = zoomIndex || defaultIndex;
						zoomIndex = Math.min(zoomIndex + 1, zoomLevels.length - 1);
						preview.setZoom(zoomLevels[zoomIndex], zoomCallback);
					}},
					{text: 'Reset', click: () => {
						zoomIndex = defaultIndex;
						preview.setZoom(zoomLevels[zoomIndex], zoomCallback);
					}},
					{text: createSVG('close'), click: () => {
						zoomPopup.remove()
						zoomPopup = undefined;
					}},
				], previewContainer, true);
			}},
			{type: 'separator'},
			{label: 'Forward', click: () => preview.forward()},
			{label: 'Back', click: () => preview.back()},
			{label: 'Reload', click: () => preview.reload()},
			{type: 'separator'},
			{label: 'Inspect', click: () => {
				preview.showDevTools(true, devtools);
				document.body.classList.add('devtools');
				preview.inspectElementAt(msg.x, msg.y);
			}}
		).popup(rect.x + msg.x, rect.y + msg.y);
	});
})

createDropdown(
	'options',
	{label: 'Print', click: () => connPort.postMessage('print')},
	{label: 'Rotate', click: () => {
		document.body.classList.toggle('hoz');
		editor.resize();
	}},
	{label: 'Terminate', click: () => preview.terminate()},
	{label: 'Save', click: () => Tab.current.save(true)},
	{label: 'Save As', click: () => Tab.current.save()},
	{label: 'Settings', click: () => showSettings()}
);
createDropdown(
	'new',
	{label: 'Open file', click: () => openFile()},
	{label: 'New HTML', click: () => Tab.create({name: 'unnamed.html'})},
	{label: 'New SVG', click: () => Tab.create({name: 'unnamed.svg'})},
	{label: 'New MD', click: () => Tab.create({name: 'unnamed.md'})}
);

preview.addContentScripts([{
	name: 'injected',
	matches: ['<all_urls>'],
	js: {
		files: ['/out/preventF12.js', '/out/previewMenu.js']
	},
	run_at: 'document_start'
}]);

devtools.addContentScripts([{
	name: 'injected',
	matches: ['<all_urls>'],
	js: {
		files: ['/out/preventF12.js']
	},
	run_at: 'document_start'
}]);

preview.addEventListener('dialog', e => {
	e.preventDefault();

	switch (e.messageType) {
		case 'prompt':
			let input = create('input');
			input.style.cssText = 'display: block; margin-top: 1em';
			popup('', [e.messageText, input], [
				{text: 'OK', click: () => e.dialog.ok(input.value)},
				{text: 'Cancel', click: () => e.dialog.cancel()}
			], previewContainer);
			break;
		case 'alert':
			popup('', e.messageText, [
				{text: 'OK', click: () => e.dialog.ok()}
			], previewContainer);
			break;
		case 'confirm':
			popup('', e.messageText, [
				{text: 'OK', click: () => e.dialog.ok()},
				{text: 'Cancel', click: () => e.dialog.cancel()}
			], previewContainer);
	}
});

// TODO: What is this shit?
preview.addEventListener('loadstart', e => {
	if (e.isTopLevel && e.url.endsWith('.md')) {
		if (e.url.startsWith('file:')) {
			let path = fileURLToPath(e.url).toString();

			fs.readFile(path).then(buffer => loadData(getConverter().makeHtml(buffer.toString()), path));
		} else {
			fetch(e.url).then(r => r.text()).then(value => loadData(value, e.url));
		}
	}
});

Tab.create(global.movingTab || {name: 'unnamed.html'});
nw.App.argv.forEach(openPath);
global.movingTab = undefined;

editor.on('change', () => {
	// @ts-ignore curOp is defined here
	if (!editor.curOp?.command?.name) return;
	settings.autoPreview && Tab.current.preview();

	if (settings.autoSave && Tab.current.path) {
		Tab.current.save(true);
	} else {
		Tab.current.setSaved(editor.getValue() == '' && !Tab.current.path);
	}
});

byId('edit').addEventListener('click', () => {
	document.body.classList.toggle('editing');
	editor.resize();
});

byId('inspect').addEventListener('click', () => {
	let show = !document.body.classList.contains('devtools');

	preview.showDevTools(show, devtools);
	document.body.classList.toggle('devtools', show);
});

byId('run').addEventListener('click', () => Tab.current.preview());

if (settings.autoEdit) {
	document.body.classList.toggle('editing');
	editor.resize();
}

nwWindow.on('maximize', () => document.body.classList.add('maximized'));
nwWindow.on('restore', () => document.body.classList.remove('maximized'));

byId('minimize').addEventListener('click', () => nwWindow.minimize());
byId('maximize').addEventListener('click', () => nwWindow.maximize());
byId('restore').addEventListener('click', () => nwWindow.restore());
byId('exit').addEventListener('click', () => nwWindow.close());

editor.commands.addCommand({
	name: 'save',
	bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
	exec: () => Tab.current.save(true)
});

editor.commands.addCommand({
	name: 'saveas',
	bindKey: {win: 'Ctrl-Shift-S', mac: 'Command-Shift-S'},
	exec: () => Tab.current.save()
});

editor.commands.addCommand({
	name: 'run',
	bindKey: {win: 'Ctrl-R', mac: 'Command-R'},
	exec: () => Tab.current.preview()
});

byId('editor').addEventListener('contextmenu', e => {
	e.preventDefault();
	createMenu(
		{label: 'Run', key: 'R', modifiers: 'ctrl', click: () => Tab.current.preview()},
		{label: 'Save', key: 'S', modifiers: 'ctrl', click: () => Tab.current.save(true)},
		{label: 'Save as',key: 'S', modifiers: 'ctrl+shift', click: () => Tab.current.save(),},
		{type: 'separator'},
		{label: 'Undo', key: 'Z', modifiers: 'ctrl', click: () => document.execCommand('undo')},
		{label: 'Redo', key: 'Y', modifiers: 'ctrl', click: () => document.execCommand('redo')},
		{type: 'separator'},
		{label: 'Cut', key: 'X', modifiers: 'ctrl', click: () => document.execCommand('cut')},
		{label: 'Copy', key: 'C', modifiers: 'ctrl', click: () => document.execCommand('copy')},
		{label: 'Paste',  key: 'V', modifiers: 'ctrl', click: () => document.execCommand('paste')},
		{label: 'Delete', key: 'Delete', click: () => document.execCommand('delete'),},
		{type: 'separator'},
		{label: 'Select all', key: 'A', modifiers: 'ctrl', click: () => document.execCommand('selectAll')}
	).popup(e.x, e.y);
});

draggable(byId('editor-resizer'), e => {
	let parent = (e.target as HTMLElement).parentNode as HTMLElement;

	if (document.body.classList.contains('hoz')) {
		editorElement.style.height = e.offsetY / parent.offsetHeight * 100 + '%';
	} else {
		editorElement.style.width = e.offsetX / parent.offsetWidth * 100 + '%'
	}

	editor.resize();
});

draggable(byId('devtools-resizer'), e => {
	let parent = (e.target as HTMLElement).parentNode as HTMLElement;

	devtools.style.width = 100 - (e.offsetX / parent.offsetWidth * 100) + '%';
});

window.addEventListener('keydown', e => {
	if (e.key === 'F12') {
		e.preventDefault();

		popup('App devtools', 'Are you sure you want to open the devtools for this app?', [
			{text: 'Yes', click: () => nwWindow.showDevTools()},
			{text: 'No'}
		]);
	}
});

document.body.addEventListener('contextmenu', e => e.preventDefault());