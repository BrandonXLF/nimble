const { spawn } = require('child_process');
const update = require('./update');

update().then(ver => {
    spawn(`cache\\nwjs-sdk-${ver}-win-x64\\nw.exe`, ['.']);
});