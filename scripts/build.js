const archiver = require('archiver'),
	fs = require('fs'),
	rcedit = require('rcedit'),
	winresourcer = require('winresourcer'),
	{ncp} = require('ncp');

if (!fs.existsSync('cache/nwjs')) {
	console.log('run "npm run update" before building.');
	return;
}

if (!fs.existsSync('dist')) fs.mkdirSync('dist');

fs.rmSync('dist/win64', {
	recursive: true,
	force: true
});

ncp(`cache/nwjs`, 'dist/win64', () => {
	const output = fs.createWriteStream('dist/win64/app.nw');
	const archive = archiver('zip');

	archive.pipe(output);
	archive.directory('out');
	archive.directory('node_modules/ace-builds/src-noconflict');
	archive.file('node_modules/showdown/dist/showdown.js');
	archive.file('package.json');
	archive.finalize();

	console.log('Finalized archive');

	output.on('close', function() {
		rcedit('dist/win64/nw.exe', {
			'version-string': {
				FileDescription: 'HTML Viewer',
				ProductName: 'HTML Viewer',
				LegalCopyright: 'Copyright ' + new Date().getFullYear(),
				OriginalFilename: 'html-viewer.exe'
			},
			'product-version': '1.0.0',
			'file-version': '1'
		}).then(() => {
			console.log('Added metadata');

			winresourcer({
				operation: 'Update',
				exeFile: 'dist/win64/nw.exe',
				resourceType: 'Icongroup',
				resourceName: 'IDR_MAINFRAME',
				resourceFile: 'icon.ico'
			}, () => {
				winresourcer({
					operation: 'Delete',
					exeFile: 'dist/win64/nw.exe',
					resourceType: 'Icongroup',
					resourceName: 'IDR_X003_INCOGNITO'
				}, () => {
					winresourcer({
						operation: 'Delete',
						exeFile: 'dist/win64/nw.exe',
						resourceType: 'Icongroup',
						resourceName: 'IDR_X001_APP_LIST'
					}, () => {
						fs.createReadStream('dist/win64/app.nw').pipe(
							fs.createWriteStream('dist/win64/nw.exe', {
								flags: 'a'
							})
						)

						fs.renameSync('dist/win64/nw.exe', 'dist/win64/html-viewer.exe');
						// fs.unlinkSync('dist/win64/app.nw');
					});
				});
			});
		});
	});
});