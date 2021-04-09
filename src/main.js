const fs = require('fs');
const { fileURLToPath } = require('url');
const { dirname } = require('path');

const fileTypes = {
	html: 'html',
	htm: 'html',
	svg: 'svg',
	markdown: 'markdown',
	md: 'markdown'
};
const acceptedTypes = {
	all: '.html,.htm,.md,.markdown,.svg',
	svg: '.svg',
	markdown: '.md,.markdown',
	html: '.html,.htm'
};
const settingData = [
	{
		type: 'checkbox',
		name: 'autopreview',
		label: 'Preview changes automatically',
		default: true
	},
	{
		type: 'checkbox',
		name: 'autosave',
		label: 'Save changes automatically',
		default: true
	},
	{
		type: 'select',
		name: 'theme',
		label: 'Theme for UI and editor',
		values: [
			'Dark',
			'Light',
			'System'
		],
		default: 'System'
	},
	{
		type: 'select',
		name: 'previewtheme',
		label: 'Theme for preview',
		values: [
			'Dark',
			'Light',
			'Inherit'
		],
		default: 'Inherit'
	},
	{
		type: 'checkbox',
		name: 'autoedit',
		label: 'Show the editor by default',
		default: false
	},
	{
		type: 'checkbox',
		name: 'softtabs',
		label: 'Use spaces instead of tabs',
		default: false
	},
	{
		type: 'checkbox',
		name: 'gutter',
		label: 'Show line numbers while editing',
		default: true
	},
	{
		type: 'checkbox',
		name: 'wordwrap',
		label: 'Wrap long lines in the editor',
		default: true
	}
];
const zoomLevels = [0.25, 1/3, 0.5, 2/3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
const settings = JSON.parse(localStorage.getItem('settings') || '{}');
const byClass = document.getElementsByClassName.bind(document);
const byId = document.getElementById.bind(document);
const create = document.createElement.bind(document);
const tabs = byId('tabs');
const preview = byId('preview');
const devtools = byId('devtools');
const dragbar = byId('dragbar');
const viewerDragbar = byId('viewer-dragbar');
const editorElement = byId('editor');
const editor = ace.edit(editorElement);
const converter = new showdown.Converter();
const previewMenu = createMenu([
	{
		label: 'Print',
		click: () => connPort.postMessage('print')
	},
	{
		type: 'separator'
	},
	{
		label: 'Forward',
		click: () => preview.forward()
	},
	{
		label: 'Back',
		click: () => preview.back()
	},
	{
		label: 'Reload',
		click: () => preview.reload()
	},
	{
		type: 'separator'
	},
	{
		label: 'Zoom in',
		click: () => {
			preview.zoomIndex = Math.min((preview.zoomIndex || zoomLevels.indexOf(1)) + 1, zoomLevels.length - 1);
			preview.setZoom(zoomLevels[preview.zoomIndex]);
		}
	},
	{
		label: 'Reset zoom',
		click: () => {
			preview.zoomIndex = zoomLevels.indexOf(1);
			preview.setZoom(zoomLevels[preview.zoomIndex]);
		}
	},
	{
		label: 'Zoom out',
		click: () => {
			preview.zoomIndex = Math.max((preview.zoomIndex || zoomLevels.indexOf(1)) - 1, 0)
			preview.setZoom(zoomLevels[preview.zoomIndex]);
		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Inspect',
		click: () => {
			if (document.body.classList.contains('devtools')) {
				devtools.terminate();
				document.body.classList.remove('devtools');
				return;
			}
			preview.showDevTools(true, devtools);
			document.body.classList.add('devtools');
		}
	}
]);
const editorMenu = createMenu([
	{
		label: 'Run',
		click: () => currentTab.preview(),
		key: 'R',
		modifiers: 'ctrl'
	},
	{
		label: 'Save',
		click: () => currentTab.save(true),
		key: 'S',
		modifiers: 'ctrl'
	},
	{
		label: 'Save as',
		click: () => currentTab.save(),
		key: 'S',
		modifiers: 'ctrl+shift'
	},
	{
		type: 'separator'
	},
	{
		label: 'Undo',
		click: () => document.execCommand('undo'),
		key: 'Z',
		modifiers: 'ctrl'
	},
	{
		label: 'Redo',
		click: () => document.execCommand('redo'),
		key: 'Y',
		modifiers: 'ctrl'
	},
	{
		type: 'separator'
	},
	{
		label: 'Cut',
		click: () => document.execCommand('cut'),
		key: 'X',
		modifiers: 'ctrl'
	},
	{
		label: 'Copy',
		click: () => document.execCommand('copy'),
		key: 'C',
		modifiers: 'ctrl'
	},
	{
		label: 'Paste',
		click: () => document.execCommand('paste'),
		key: 'V',
		modifiers: 'ctrl'
	},
	{
		label: 'Delete',
		click: () => document.execCommand('delete'),
		key: 'Delete'
	},
	{
		type: 'separator'
	},
	{
		label: 'Select all',
		click: () => document.execCommand('selectAll'),
		key: 'A',
		modifiers: 'ctrl'
	}
]);
const moreDropdown = [
	{
		label: 'Print',
		click: () => connPort.postMessage('print')
	},
	{
		label: 'Rotate',
		click: () => {
			document.body.classList.toggle('hoz');
			editor.resize();
		}
	},
	{
		label: 'Save',
		click: () => currentTab.save(true)
	},
	{
		label: 'Save As',
		click: () => currentTab.save()
	},
	{
		label: 'Settings',
		click: () => popup('Settings', settingData.map(setting => {
			let el = create('label');
			el.className = 'settingrow';
			if (setting.type == 'checkbox') {
				let checkbox = create('input');
				checkbox.type = 'checkbox';
				checkbox.checked = settings[setting.name];
				checkbox.addEventListener('change', () => saveSetting(setting.name, !settings[setting.name]));
				el.append(checkbox);
			}
			el.append(setting.label);
			if (setting.type == 'select') {
				let select = create('select');
				select.addEventListener('change', () => saveSetting(setting.name, select.value));
				setting.values.map(value => {
					let option = create('option');
					option.append(value);
					option.selected = value == settings[setting.name];
					select.append(option);
				});
				el.append(select);
			}
			return el;
		}))
	}
];
const newDropdown = [
	{
		label: 'Open file',
		click: () => openFile()
	},
	{
		label: 'New HTML',
		click: () => Tab.create({
			name: 'unnamed.html'
		})
	},
	{
		label: 'New SVG',
		click: () => Tab.create({
			name: 'unnamed.svg'
		})
	},
	{
		label: 'New MD',
		click: () => Tab.create({
			name: 'unnamed.md'
		})
	}
];
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

let darkTheme;
let connPort;
let currentTab;
let unresponsivePopup;

function createMenu(items) {
	let menu = new nw.Menu();
	items.forEach(item => {
		menu.append(new nw.MenuItem(item));
	});
	return menu;
}

function createDropdown(id, items) {
	let menu = create('div');
	menu.className = 'menu';
	byId(id).append(menu);
	let menuItems = create('div');
	menuItems.className = 'menuitems';
	menu.append(menuItems);
	items.forEach(item => {
		let el = create('div');
		el.addEventListener('click', item.click);
		el.innerText = item.label;
		menuItems.append(el);
	});
	byId(id).classList.add('menuparent');
}

function loadData(value, path) {
	preview.loadDataWithBaseUrl('data:text/html,' + encodeURIComponent(value), path, 'about:blank');
}

function setTheme(initial) {
	darkTheme = settings.theme == 'Light' ? false : settings.theme == 'Dark' ? true : darkQuery.matches;
	let darkPreview = settings.previewtheme == 'Light' ? false : settings.previewtheme == 'Dark' ? true : darkTheme;
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

function popup(titleStr, msg, buttons = [{ text: 'OK' }]) {
	let cnt = create('div');
	cnt.className = 'popup-cnt';
	cnt.style.cssText = '';
	byId('content').append(cnt);
	let popup = create('div');
	popup.className = 'popup';
	cnt.append(popup);
	let title = create('h3');
	title.style.cssText = 'margin: 0;';
	title.innerText = titleStr;
	popup.append(title);
	let text = create('div');
	text.style.cssText = 'padding-top: 1em;'
	Array.isArray(msg) ? text.append(...msg) : text.append(msg);
	popup.append(text);
	let btnCnt = create('div');
	btnCnt.style.cssText = 'padding-top: 1em; text-align: right;'
	popup.append(btnCnt);
	buttons.forEach(button => {
		let btn = create('button');
		btn.innerText = button.text;
		btn.addEventListener('click', e => {
			cnt.remove();
			if (button.click) button.click();
		});
		btnCnt.append(btn);
	});
	return popup;
}

function saveSetting(key, value) {
	settings[key] = value;
	localStorage.setItem('settings', JSON.stringify(settings));
	setTheme();
	configAce();
}

function configAce() {
	editor.setOptions({
		enableBasicAutocompletion: true,
		enableSnippets: true,
		enableLiveAutocompletion: true,
		useSoftTabs: settings.softtabs,
		wrap: settings.wordwrap ? 'free' : 'off',
		tabSize: 4,
		useWorker: true,
		showGutter: settings.gutter,
		showPrintMargin: false,
		theme: `ace/theme/clouds${darkTheme ? '_midnight' : ''}`,
	});
}

function previewInject() {
	let port = chrome.runtime.connect();
	port.onMessage.addListener(() => window.print());
	window.addEventListener('contextmenu', e => {
		e.preventDefault();
		port.postMessage([e.x, e.y]);
	});
	window.addEventListener('keydown', e => {
		if (e.key == 'F12') e.preventDefault();
	});
}

function devtoolsInject() {
	window.addEventListener('keydown', e => {
		if (e.key == 'F12') e.preventDefault();
	});
}

function openPath(filePath) {
	let fileType = filePath.split('.').pop();
	if (!fileTypes[fileType]) {
		popup('Invalid filetype!', `'${fileType}' is an invalid filetype!`, [
			{
				text: 'Try again',
				click: openFile
			},
			{
				text: 'Cancel'
			}
		]);
		return;
	}
	fs.readFile(filePath, (err, data) => {
		if (err) {
			popup(`Failed to read file: ${filePath}`, e.message);
			return;
		}
		Tab.create({
			path: filePath,
			text: data.toString()
		});
	});
}

function openFile() {
	var chooser = create('input');
	chooser.setAttribute('accept', acceptedTypes.all);
	chooser.type = 'file';
	chooser.addEventListener('change', () => {
		if (chooser.value) openPath(chooser.value);
	});
	chooser.click();
}

preview.addEventListener('unresponsive', function() {
	if (document.contains(unresponsivePopup)) return;
	unresponsivePopup = popup('Unresponsive', 'The preview window has become unresponsive', [
		{
			text: 'Wait'
		},
		{
			text: 'Terminate',
			click: () => preview.terminate()
		}
	]);
});

preview.addEventListener('responsive', function() {
	unresponsivePopup?.remove();
});

document.title = nw.App.manifest.productName;

for (let i = 0; i < settingData.length; i++) {
	if (settings[settingData[i].name] === undefined) {
		settings[settingData[i].name] = settingData[i].default;
	}
}

setTheme(true);
configAce();

darkQuery.addEventListener('change', () => {
	setTheme();
	configAce();
});

chrome.runtime.onConnect.addListener(lPort => {
	connPort = lPort;
	connPort.onMessage.addListener(msg => {
		let classes = document.body.classList;
		let xOffset = !classes.contains('hoz') && classes.contains('editing') ? byId('editor').clientWidth : 0;
		let yOffset = byId('chrome').clientHeight + (classes.contains('hoz') && classes.contains('editing') ? byId('editor').clientHeight : 0);
		previewMenu.popup(xOffset + Math.trunc(msg[0]), yOffset + Math.trunc(msg[1]));
	});
})

createDropdown('options', moreDropdown);
createDropdown('new', newDropdown);

preview.addContentScripts([{
	name: 'injected',
	matches: [ '<all_urls>' ],
	js: { code: '(' + previewInject.toString() + ')();' },
	run_at: 'document_start'
}]);

devtools.addContentScripts([{
	name: 'injected',
	matches: [ '<all_urls>' ],
	js: { code: '(' + devtoolsInject.toString() + ')();' },
	run_at: 'document_start'
}]);

preview.addEventListener('dialog', e => {
	e.preventDefault();
	switch (e.messageType) {
		case 'prompt':
			var input = create('input');
			input.style.cssText = 'display: block; margin-top: 1em';
			popup('The preview says', [e.messageText, input], [
				{
					text: 'OK',
					click: () => e.dialog.ok(input.value)
				}, {
					text: 'Cancel',
					click: () => e.dialog.cancel()
				}
			]);
			break;
		case 'alert':
			popup('The preview says', e.messageText, [
				{
					text: 'OK',
					click: () => e.dialog.ok()
				}
			]);
			break;
		case 'confirm':
			popup('The preview says', e.messageText, [
				{
					text: 'OK',
					click: () => e.dialog.ok()
				},
				{
					text: 'Cancel',
					click: () => e.dialog.cancel()
				}
			]);
	}
});

preview.addEventListener('loadstart', e => {
	if (e.isTopLevel && e.url.endsWith('.md')) {
		if (e.url.startsWith('file:')) {
			let path = fileURLToPath(e.url).toString();
			fs.readFile(path, (err, data) => {
				if (err) throw err;
				loadData(converter.makeHtml(data.toString()), path);
			});
		} else {
			fetch(e.url).then(r => r.text()).then(value => loadData(value, e.url));
		}
	}
});

if (global.movingTab) {
	Tab.create(global.movingTab);
	global.movingTab = undefined;
} else {
	Tab.create({
		name: 'unnamed.html'
	});
}

nw.App.argv.forEach(openPath);

editor.on('change', () => {
	currentTab.saved = false;
	if (settings.autopreview) currentTab.preview();
	if (settings.autosave && currentTab.path) currentTab.save(true);
});

byId('edit').addEventListener('click', () => {
	document.body.classList.toggle('editing');
	editor.resize();
});

byId('inspect').addEventListener('click', () => {
	if (document.body.classList.contains('devtools')) {
		devtools.terminate();
		document.body.classList.remove('devtools');
	} else {
		preview.showDevTools(true, devtools);
		document.body.classList.add('devtools');
	}
});

byId('run').addEventListener('click', () => currentTab.preview());

if (settings.autoedit) {
	document.body.classList.toggle('editing');
	editor.resize();
}

byId('min').addEventListener('click', () => nw.Window.get().minimize() );
byId('max').addEventListener('click', e => {
	let maximized = nw.Window.get().cWindow.state == 'maximized';
	e.target.classList.toggle('maximized', maximized);
	nw.Window.get()[maximized ? 'restore' : 'maximize']();
});
byId('close').addEventListener('click', () => nw.Window.get().close() );

editor.commands.addCommand({
	name: 'save',
	bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
	exec: () => currentTab.save(true)
});

editor.commands.addCommand({
	name: 'saveas',
	bindKey: {win: 'Ctrl-Shift-S', mac: 'Command-Shift-S'},
	exec: () => saveEditor()
});

editor.commands.addCommand({
	name: 'run',
	bindKey: {win: 'Ctrl-R', mac: 'Command-R'},
	exec: () => currentTab.preview()
});

byId('editor').addEventListener('contextmenu', e => {
	e.preventDefault();
	editorMenu.popup(e.x, e.y);
});

function drag(e) {
	if (e.target != dragbar) return;
	if(document.body.classList.contains('hoz')) {
		editorElement.style.height = Math.min(95, Math.max(5, e.offsetY / e.target.parentNode.offsetHeight * 100)) + '%';
	} else {
		editorElement.style.width = Math.min(95, Math.max(5, e.offsetX / e.target.parentNode.offsetWidth * 100)) + '%'
	}
	editor.resize();
}

dragbar.addEventListener('mousedown', () => {
	document.body.classList.add('dragging');
	document.addEventListener('mousemove', drag);
	document.body.addEventListener('mouseup', () => {
		document.body.classList.remove('dragging');
		document.removeEventListener('mousemove', drag);
	}, { once: true });
});

function viewDrag(e) {
	if (e.target != viewerDragbar) return;
	devtools.style.width = Math.min(95, Math.max(5, (1 - (e.offsetX / e.target.parentNode.offsetWidth)) * 100)) + '%'
}

viewerDragbar.addEventListener('mousedown', () => {
	document.body.classList.add('view-dragging');
	document.addEventListener('mousemove', viewDrag);
	document.body.addEventListener('mouseup', () => {
		document.body.classList.remove('view-dragging');
		document.removeEventListener('mousemove', viewDrag);
	}, { once: true });
});

window.addEventListener('keydown', e => {
	if (e.key == 'F12') {
		e.preventDefault();
		popup('App devtools', 'Are you sure you want to open the devtools for this app?', [
			{
				text: 'Yes',
				click: () => nw.Window.get().showDevTools()
			}, {
				text: 'No'
			}
		]);
	}
});

document.body.addEventListener('contextmenu', e => e.preventDefault());