const archiver = require('archiver');
const fs = require('fs');
const rcedit = require('rcedit')
const winresourcer = require('winresourcer')
const { ncp } = require('ncp');
const update = require('./update');

update().then(ver => {
    fs.rmSync('dist/win64', {
        recursive: true,
        force: true
    });

    ncp(`cache/nwjs-sdk-${ver}-win-x64`, 'dist/win64', () => {
        const output = fs.createWriteStream('dist/win64/app.nw');
        const archive = archiver('zip');

        archive.pipe(output);
        archive.directory('src');
        archive.directory('node_modules/ace-builds/src-min-noconflict');
        archive.file('node_modules/showdown/dist/showdown.min.js');
        archive.file('package.json');
        archive.finalize();

        console.log('Finalized archive');

        output.on('close', function() {
            rcedit('dist/win64/nw.exe', {
                'version-string': {
                    FileDescription: 'HTML & MD Viewer',
                    ProductName: 'HTML & MD Viewer',
                    LegalCopyright: 'Copyright ' + new Date().getFullYear(),
                    OriginalFilename: 'html-md-viewer.exe'
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

                            fs.rename('dist/win64/nw.exe', 'dist/win64/html-md-viewer.exe', () => {});
                            // fs.unlinkSync('dist/win64/app.nw');
                        });
                    });
                });
            });
        });
    });
});