global.windowOrder = [];

async function openApp() {
	let win = await new Promise(resolve => {
		nw.Window.open('src/main.html', {frame: false}, resolve);
	});

	win.on('closed', () => {
		windowOrder.splice(windowOrder.indexOf(win), 1);
	});

	win.on('focus', () => {
		windowOrder.splice(windowOrder.indexOf(win), 1);
		windowOrder.unshift(win);
	});

	windowOrder.unshift(win);

	return win;
}

nw.App.on('open', argv => {
	let files = [ ...argv.replace(/--[^=]*?=".*?"/g, '').match(/"(.*?)"/g) ].map(x => x.match(/\"(.*)\"/)[1] ).slice(1);
	if (files[0]) {
		windowOrder[0].focus();
		files.forEach(windowOrder[0].window.openPath);
		return;
	}
	openApp();
});

openApp();