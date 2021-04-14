const byId = document.getElementById.bind(document),
	create =document.createElement.bind(document),
	fs = require('fs/promises'),
	{fileURLToPath} = require('url'),
	editorElement = byId('editor'),
	editor = ace.edit(editorElement),
	settingsInfo = require('./settings.json'),
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
	preview = byId('preview'),
	content = byId('content'),
	previewContainer = byId('preview-container'),
	devtools = byId('devtools'),
	tabs = byId('tabs'),
	darkQuery = matchMedia('(prefers-color-scheme: dark)');

let darkTheme,
	connPort,
	unresponsivePopup,
	zoomPopup,
	findPopup,
	converter;

function getConverter() {
	if (converter) return converter;
	return converter = new showdown.Converter()
}

function createSVG(id, className) {
	let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
		use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

	svg.setAttributeNS(null, 'viewBox', '0 0 100 100');
	svg.viewBox = '0 0 100 100';
	svg.classList.add('icon');
	className && svg.classList.add(className);
	use.setAttributeNS(null, 'href', '#' + id);
	svg.append(use);

	return svg;
}

function createMenu(...items) {
	let menu = new nw.Menu();
	items.forEach(item => menu.append(new nw.MenuItem(item)));
	return menu;
}

function createDropdown(id, ...items) {
	let menu = create('div'),
		menuItems = create('div');

	menuItems.className = 'menuitems';
	menu.className = 'menu';
	byId(id).classList.add('menuparent');

	menu.append(menuItems);
	byId(id).append(menu);

	items.forEach(item => {
		let el = create('div');
		el.addEventListener('click', item.click);
		el.innerText = item.label;
		menuItems.append(el);
	});
}

function loadData(value, path) {
	preview.loadDataWithBaseUrl('data:text/html,' + encodeURIComponent(value), path, 'about:blank');
}

function setTheme(initial) {
	darkTheme = settings.theme === 'Light' ? false : settings.theme === 'Dark' ? true : darkQuery.matches;
	let darkPreview = settings.previewtheme === 'Light' ? false : settings.previewtheme === 'Dark' ? true : darkTheme;
	document.documentElement.classList.toggle('dark', darkTheme);
	if (!initial) {
		preview.removeContentScripts(['theme']);
		preview.insertCSS({
			code: darkPreview
				? '@media not print{:root{background:#222;color:#fff}a:link{color:#31c3f7}}'
				: '@media not print{:root{background:unset;color:unset}a:link{color:unset}}',
			matchAboutBlank: true
		});
	}
	if (darkPreview) {
		preview.addContentScripts([{
			name: 'theme',
			matches: [ '<all_urls>' ],
			css: { code: '@media not print{:root{background:#222;color:#fff}a:link{color:#31c3f7}}' },
			run_at: 'document_start'
		}]);
	}
}

function popup(title, msg, buttons = [{text: 'OK'}], container = content, small = false) {
	let cnt = create('div'),
		popupElement = create('div'),
		text = create('div'),
		btnCnt = create('div');

	cnt.className = 'popup-cnt';
	cnt.style.cssText = '';

	popupElement.className = 'popup';

	if (!small) {
		cnt.append(popupElement);
		container.append(cnt);
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

	btnCnt.style.textAlign = 'right';
	popupElement.append(btnCnt);

	buttons.forEach(button => {
		let btn = create('button');

		btn.append(button.text);
		btn.addEventListener('click', () => {
			cnt.remove();
			button.click?.();
		});
		btnCnt.append(btn);
	});

	return popupElement;
}

function saveSetting(key, value) {
	settings[key] = value;
	localStorage.setItem('settings', JSON.stringify(settings));
	setTheme();
	configAce();
}

function configAce() {
	editor.setOptions({
		enableLiveAutocompletion: true,
		useSoftTabs: settings.softTabs,
		wrap: settings.wordwrap ? 'free' : 'off',
		tabSize: settings.tabSize,
		useWorker: true,
		showGutter: settings.gutter,
		showPrintMargin: false,
		showInvisibles: settings.showInvisible,
		theme: 'ace/theme/' + (darkTheme ? 'clouds_midnight' : 'clouds'),
	});
}

async function openPath(filePath) {
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
		let input = create('input');
		el.className = 'settingrow';

		switch (setting.type) {
			case 'checkbox':
				input.type = 'checkbox';
				input.checked = settings[setting.name];
				input.addEventListener('change', () => saveSetting(setting.name, input.checked));
				break;
			case 'select':
				input = create('select');
				input.addEventListener('change', () => saveSetting(setting.name, input.value));
				setting.values.map(value => {
					let option = create('option');

					option.append(value);
					option.selected = value === settings[setting.name];
					input.append(option);
				});
				break;
			case 'text':
			case 'number':
				input.type = setting.type;
				input.value = settings[setting.name];
				input.addEventListener('change', () => saveSetting(setting.name, input.value));
				break;
		}

		el.append(setting.label, input);

		return el;
	}));
}

function draggable(el, handle) {
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
					preview.find(input.value, findCallback);
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
					zoomCallback = (zoom = zoomLevels[preview.zoomIndex]) => zoomText.data = Math.round(zoom * 100) + '%',
					defaultIndex = zoomLevels.indexOf(1);

				preview.getZoom(zoomCallback);

				zoomPopup = popup('', zoomText, [
					{text: createSVG('minus'), click: () => {
						preview.zoomIndex = preview.zoomIndex || defaultIndex;
						preview.zoomIndex = Math.max(preview.zoomIndex - 1, 0);
						preview.setZoom(zoomLevels[preview.zoomIndex], zoomCallback);
					}},
					{text: createSVG('plus'), click: () => {
						preview.zoomIndex = preview.zoomIndex || defaultIndex;
						preview.zoomIndex = Math.min(preview.zoomIndex + 1, zoomLevels.length - 1);
						preview.setZoom(zoomLevels[preview.zoomIndex], zoomCallback);
					}},
					{text: 'Reset', click: () => {
						preview.zoomIndex = defaultIndex;
						preview.setZoom(zoomLevels[preview.zoomIndex], zoomCallback);
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
		files: ['/src/preventF12.js', '/src/previewMenu.js']
	},
	run_at: 'document_start'
}]);

devtools.addContentScripts([{
	name: 'injected',
	matches: ['<all_urls>'],
	js: {
		files: ['/src/preventF12.js']
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
	if (!editor.curOp?.command?.name) return;
	settings.autoPreview && Tab.current.preview();

	if (settings.autoSave && Tab.current.path) {
		Tab.current.save(true);
	} else {
		Tab.current.setSaved(false);
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

if (settings.autoedit) {
	document.body.classList.toggle('editing');
	editor.resize();
}

byId('min').addEventListener('click', () => nw.Window.get().minimize() );
byId('max').addEventListener('click', e => {
	let maximized = nw.Window.get().cWindow.state === 'maximized';

	e.target.classList.toggle('maximized', maximized);
	nw.Window.get()[maximized ? 'restore' : 'maximize']();
});
byId('exit').addEventListener('click', () => nw.Window.get().close());

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
	if (document.body.classList.contains('hoz')) {
		editorElement.style.height = e.offsetY / e.target.parentNode.offsetHeight * 100 + '%';
	} else {
		editorElement.style.width = e.offsetX / e.target.parentNode.offsetWidth * 100 + '%'
	}
	editor.resize();
});

draggable(byId('devtools-resizer'), e => {
	devtools.style.width = 100 - (e.offsetX / e.target.parentNode.offsetWidth * 100) + '%';
});

window.addEventListener('keydown', e => {
	if (e.key === 'F12') {
		e.preventDefault();

		popup('App devtools', 'Are you sure you want to open the devtools for this app?', [
			{text: 'Yes', click: () => nw.Window.get().showDevTools()},
			{text: 'No'}
		]);
	}
});

document.body.addEventListener('contextmenu', e => e.preventDefault());