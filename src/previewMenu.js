let port = chrome.runtime.connect();

window.addEventListener('contextmenu', e => {
	e.preventDefault();
	port.postMessage({x: Math.round(e.x), y: Math.round(e.y)});
});