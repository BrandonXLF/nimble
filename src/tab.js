class Tab {
    constructor(data) {
        this.saved = data.saved ?? true;
        this.element = create('div');
        this.name = data.name || data.path.split(/\/|\\/).pop();
        this.titleElement = create('span');
        this.closeElement = create('span');
        this.mode = fileTypes[(data.path || data.name).split('.').pop()] || 'text';
        this.path = data.path || undefined;
        this.session = data.session || ace.createEditSession(data.text || '', `ace/mode/${this.mode}`);

        this.element.tabData = this;
        this.element.className = 'tab';
        this.element.draggable = true;
    
        this.element.addEventListener('dragstart', () => {
            this.select();
            global.movingTab = this;
        });
        this.element.addEventListener('dragend', () => {
            setTimeout(() => {
                if (global.movingTab) global.openApp();
                this.close();
            }, 0);
        });
        this.element.addEventListener('drop', e => {
            e.preventDefault();
            for (let i = 0; i < e.dataTransfer.files.length; i++) openPath(e.dataTransfer.files[i].path);
            let box = this.element.getBoundingClientRect();
            let ref = Math.abs(e.clientX - box.left) < Math.abs(e.clientX - box.right) ? this.element : this.element.nextSibling;
            if (global.movingTab) {
                let nTab = Tab.create(global.movingTab);
                global.movingTab = undefined;
                tabs.insertBefore(nTab.element, ref);
            }
        });
        this.element.addEventListener('dragover', e => e.preventDefault());
        this.element.addEventListener('click', () => this.select());
    
        this.titleElement.className = 'title';
        this.titleElement.innerText = this.name;
        this.titleElement.title = `${this.name}${this.path ? ' - ' + this.path : ''}`;
        this.element.append(this.titleElement);
    
        this.closeElement.innerHTML = '&times;';
        this.closeElement.className = 'close';
        this.closeElement.addEventListener('click', e => {
            e.stopPropagation();
            this.checkForUnsaved().then(() => this.close());
        });
        this.element.append(this.closeElement);
    
        tabs.append(this.element);
    
        if (!currentTab?.path && currentTab?.session && !currentTab?.session.getValue()) currentTab.close();
        this.initWatcher();
        this.select();
    }

    static create(data) {
        if (data.path) {
            let match = Array.from(byClass('tab')).find(tab => tab.tabData.path === data.path)
            if (match) {
                match.select();
                return match;
            }
        }
        return new Tab(data);
    }

    select() {
        editor.setSession(this.session);
        configAce();
        currentTab?.element?.classList.remove('active');
        this.element.classList.add('active');
        currentTab = this;
        document.title = `${this.name} - ${nw.App.manifest.productName}`;
        this.preview();
    }

    update() {
        if (path) this.name = path.split(/\/|\\/).pop();
        this.mode = fileTypes[(data.path || data.name).split('.').pop()] || 'text';
        this.session.setMode(`ace/mode/${this.mode}`);
        this.initWatcher();
        this.titleElement.innerText = this.name;
        this.titleElement.title = `${this.name}${this.path ? ' - ' + this.path : ''}`;
        if (this.element.classList.contains('active')) {
            document.title = `${this.name} - ${nw.App.manifest.productName}`;
        }
    }

    close() {
        if (this.element.classList.contains('active')) {
            let nTab = (this.element.nextElementSibling || this.element.previousElementSibling || byClass('tab')[0])?.tabData;
            // if (!nTab || nTab == this) nTab = Tab.create({ name: 'unnamed.html' });
            if (!nTab || nTab == this) nw.Window.get().close();
            nTab.select();
        }
        this.element.remove();
    }

    initWatcher() {
        if (this.watcher) this.watcher.close();
        if (this.path) this.watcher = fs.watch(this.path, type => {
            if (type === 'rename') {
                this.path = '';
                updateTab(this);
            } else {
                fs.readFile(this.path, (err, buffer) => {
                    if (err) throw err;
                    if (buffer.toString() === this.session.getValue()) return;
                    this.session.setValue(buffer.toString());
                    if (settings.autopreview) this.preview();
                });
            }
        });
    }

    checkForUnsaved() {
        return new Promise(resolve => {
            if (!this.saved) {
                popup('Unsaved changes!', 'You have unsaved changes, would you like to save them now?', [
                    {
                        text: 'Yes',
                        click: () => this.save().then(resolve)
                    }, {
                        text: 'No',
                        click: () => resolve()
                    }, {
                        text: 'Cancel'
                    }
                ]);
                return;
            }
            resolve();
        });
    }

    writeToFile() {
        return new Promise(resolve => {
            fs.writeFile(this.path, editor.getValue(), err => {
                if (err) {
                    popup('Could not save file!', 'An error occured while saving your changes, would you like to try again?', [
                        {
                            text: 'Yes',
                            click: () => this.writeToFile().then(resolve)
                        }, {
                            text: 'No',
                            click: () => resolve()
                        }
                    ]);
                    return;
                }
                this.update();
                this.preview();
                this.saved = true;
                resolve();
            });
        });
    }

    save(useCurrent) {
        return new Promise(resolve => {
            if (useCurrent && this.path) {
                this.writeToFile(this).then(resolve);
                return;
            }
            var chooser = create('input');
            chooser.setAttribute('nwsaveas', this.name);
            if (this.path) chooser.setAttribute('nwworkingdir', dirname(this.path));
            chooser.setAttribute('accept', acceptedTypes[this.mode]);
            chooser.type = 'file';
            chooser.addEventListener('change', () => {
                this.path = chooser.value;
                this.writeToFile(this).then(resolve);
            });
            chooser.click();
        });
    }

    preview() {
        let value = this.session.getValue();
        if (this.mode === 'markdown') {
            value = converter.makeHtml(value);
        }
        loadData(value, this.path || 'data:text/html,');
    }
}