const unzipper = require('unzipper');
const https = require('https');
const fs = require('fs');

console.log('Fetching versions.json');

https.get('https://nwjs.io/versions.json', verRes => {
	let data = '';

	verRes.on('data', chunk => {
		data += chunk;
	});

	verRes.on('end', () => {
		const ver = JSON.parse(data).latest;

		console.log(`Latest is ${ver}`)

		if (fs.existsSync(`cache/nwjs.version`) && fs.readFileSync('cache/nwjs.version') == ver) {
			console.log(`${ver} is already installed`);
		} else {
			console.log(`Downloading version ${ver}`);

			if (fs.existsSync(`cache/nwjs`)) {
				fs.rmSync('cache/nwjs', {
					recursive: true,
					force: true
				});
			}

			https.get(`https://dl.nwjs.io/${ver}/nwjs-sdk-${ver}-win-x64.zip`, fileRes => {
				console.log(`Extracting version ${ver}`)

				fileRes.pipe(unzipper.Extract({
					path: 'cache'
				})).on('close', () => {
					fs.renameSync(`cache/nwjs-sdk-${ver}-win-x64`, 'cache/nwjs');
					fs.writeFileSync('cache/nwjs.version', ver);
				});
			});
		}
	});
});