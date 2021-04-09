const unzipper = require('unzipper');
const https = require('https');
const fs = require('fs');
const empty = require('empty-folder');

module.exports = function() {
    return new Promise(resolve => {
        console.log('Fetching versions.json');

        https.get('https://nwjs.io/versions.json', verRes => {
            let data = '';

            verRes.on('data', chunk => {
                data += chunk;
            });

            verRes.on('end', () => {
                const ver = JSON.parse(data).latest;

                console.log(`Latest is ${ver}`)

                if (fs.existsSync(`cache/nwjs-sdk-${ver}-win-x64`)) {
                    console.log('Using cache');

                    resolve(ver);
                } else {
                    console.log(`Downloading version ${ver}`)

                    empty('cache', false, () => {
                        https.get(`https://dl.nwjs.io/${ver}/nwjs-sdk-${ver}-win-x64.zip`, fileRes => {
                            console.log(`Extracting version ${ver}`)

                            fileRes.pipe(unzipper.Extract({
                                path: 'cache'
                            })).on('close', () => resolve(ver));
                        });
                    });
                }
            });
        });
    });
};