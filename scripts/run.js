const fs = require('fs'),
	{spawn} = require('child_process');

if (!fs.existsSync('cache/nwjs')) {
	console.log('run "npm run update" before building.');
	return;
}

spawn(`cache\\nwjs\\nw.exe`, ['.']);