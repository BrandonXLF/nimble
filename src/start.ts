global.windowOrder = [];

global.openApp = async function() {
	let win: NWJS_Helpers.win = await new Promise(resolve => {
		nw.Window.open('out/main.html', {frame: false}, resolve);
	});

	win.on('closed', () => {
		global.windowOrder.splice(global.windowOrder.indexOf(win), 1);
	});

	win.on('focus', () => {
		global.windowOrder.splice(global.windowOrder.indexOf(win), 1);
		global.windowOrder.unshift(win);
	});

	global.windowOrder.unshift(win);

	return win;
}

nw.App.on('open', argv => {
	let files = [...argv.replace(/--[^=]*?=".*?"/g, '').match(/"(.*?)"/g)].map(x => x.match(/\"(.*)\"/)[1]).slice(1);
	if (files[0]) {
		global.windowOrder[0].focus();
		// @ts-ignore main.html defines openPath in the window
		files.forEach(global.windowOrder[0].window.openPath);
		return;
	}
	global.openApp();
});

global.openApp();