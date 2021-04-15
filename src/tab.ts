class Tab implements TransferableTabInfo {
	static current: Tab;
	public element: TabElement;
	public name: string;
	public titleElement: HTMLElement;
	public closeElement: SVGElement;
	public unsavedIndicator: SVGElement;
	public mode: string;
	public path: string;
	public session: AceAjax.IEditSession;
	public aborter: AbortController;
	public watcher: any;
	public saved: boolean;
	public text: string;

	constructor(data: TransferableTabInfo) {
		this.element = create('div') as TabElement;
		this.name = data.name || data.path.split(/\/|\\/).pop();
		this.titleElement = create('span');
		this.closeElement = createSVG('close', 'close');
		this.unsavedIndicator = createSVG('circle', 'indicator');
		this.mode = fileTypes[(data.path || data.name).split('.').pop()] || 'text';
		this.path = data.path || undefined;
		this.session = data.session || ace.createEditSession(data.text || '', `ace/mode/${this.mode}` as unknown as AceAjax.TextMode);

		this.element.tabData = this;
		this.element.draggable = true;

		this.element.addEventListener('dragstart', () => {
			this.select();
			global.movingTab = this;
		});

		this.element.addEventListener('dragend', async e => {
			// Wait for drop event listener to run
			await new Promise(resolve => setTimeout(resolve, 0));

			if (!global.movingTab) return;

			let rect = tabs.getBoundingClientRect(),
				win = undefined;

			if (tabs.children.length > 1) {
				win = await global.openApp();
				this.close();
			} else {
				win = nw.Window.get();
				global.movingTab = undefined;
			}

			win.moveTo(e.screenX - rect.x - rect.height, e.screenY - rect.height / 2);
		});

		this.element.addEventListener('drop', e => {
			e.preventDefault();

			for (let i = 0; i < e.dataTransfer.files.length; i++) openPath((e.dataTransfer.files[i] as NW_File).path);
			if (global.movingTab) global.movingTab = undefined;
		});

		this.element.addEventListener('dragover', e => {
			e.preventDefault()

			if (!global.movingTab) return;

			let rect = this.element.getBoundingClientRect(),
				before = Math.abs(e.clientX - rect.left) < Math.abs(e.clientX - rect.right);

			if (global.movingTab.element.ownerDocument != document) {
				global.movingTab.close();
				global.movingTab = Tab.create(global.movingTab);
			}

			this.element[before ? 'before' : 'after'](global.movingTab.element);
		});

		this.element.addEventListener('click', () => this.select());

		this.titleElement.className = 'title';
		this.titleElement.innerText = this.name;
		this.titleElement.title = `${this.name}${this.path ? ' - ' + this.path : ''}`;

		this.closeElement.addEventListener('click', async e => {
			e.stopPropagation();
			await this.checkForUnsaved();
			this.close();
		});

		this.element.append(this.unsavedIndicator, this.titleElement, this.closeElement);
		tabs.append(this.element);

		if (!Tab.current?.path && Tab.current?.session?.getValue() === '') Tab.current.close();
		this.initWatcher();
		this.select();
		this.setSaved(data.saved ?? true);
	}

	static create(data: TransferableTabInfo) {
		if (data.path) {
			let match = [...(tabs.children as unknown as TabElement[])].find(tab => tab.tabData.path === data.path);

			if (match) {
				match.tabData.select();
				return match.tabData;
			}
		}

		return new Tab(data);
	}

	select() {
		editor.setSession(this.session);
		configAce();
		Tab.current?.element?.classList.remove('active');
		this.element.classList.add('active');
		Tab.current = this;
		document.title = `${this.name} - ${nw.App.manifest.productName}`;
		this.preview();
	}

	close() {
		if (this.element.classList.contains('active')) {
			let sibling = (
					this.element.nextElementSibling ||
					this.element.previousElementSibling ||
					tabs.children[0]
				) as TabElement,
				siblingTab = sibling?.tabData;

			if (!siblingTab || siblingTab === this) nw.Window.get().close();
			siblingTab.select();
		}

		this.element.remove();
	}

	async initWatcher() {
		if (this.watcher) this.aborter.abort();
		if (!this.path) return;

		this.aborter = new AbortController();
		this.watcher = fs.watch(this.path, {signal: this.aborter.signal});

		for await (let type of this.watcher) {
			if (type === 'rename') {
				this.aborter.abort();
				this.setSaved(false);
			} else {
				this.readFile();
			}
		}
	}

	setSaved(saved) {
		this.saved = saved;
		this.element.classList.toggle('unsaved', !saved);
	}

	async checkForUnsaved() {
		if (this.saved) return;

		await new Promise<void>(resolve => {
			popup('Unsaved changes!', 'You have unsaved changes, would you like to save them now?', [
				{text: 'Yes', click: () => this.save().then(resolve)},
				{text: 'No', click: () => resolve()},
				{text: 'Cancel'}
			]);
		});
	}

	async writeToFile(path) {
		try {
			await fs.writeFile(path, this.session.getValue());
		} catch (err) {
			await new Promise<void>(resolve => {
				popup('Could not save file!', 'An error occurred while saving your changes, would you like to try again?', [
					{text: 'Yes', click: () => this.writeToFile(path).then(resolve)},
					{text: 'No', click: () => resolve()}
				]);
			});

			return;
		}

		if (this.path !== path) {
			this.path = path;
			this.name = this.path.split(/\/|\\/).pop();
			this.mode = fileTypes[this.path.split('.').pop()] || 'text';
			this.session.setMode(`ace/mode/${this.mode}`);
			this.initWatcher();
			this.titleElement.innerText = this.name;
			this.titleElement.title = `${this.name} - ${this.path}`;

			if (this.element.classList.contains('active')) {
				document.title = `${this.name} - ${nw.App.manifest.productName}`;
			}
		}

		this.preview();
		this.setSaved(true);
	}

	async readFile() {
		let buffer = await fs.readFile(this.path),
			text = buffer.toString();

		if (text === this.session.getValue()) return;
		this.session.setValue(text);
		if (settings.autoPreview) this.preview();
	}

	async save(useCurrent = false) {
		if (useCurrent && this.path) {
			await this.writeToFile(this.path);
			return;
		}

		let chooser = create('input');

		chooser.setAttribute('nwsaveas', this.name);
		if (this.path) chooser.setAttribute('nwworkingdir', dirname(this.path));
		chooser.setAttribute('accept', acceptedTypes[this.mode]);
		chooser.type = 'file';
		chooser.style.display = 'none';

		await new Promise(resolve => {
			chooser.addEventListener('change', () => this.writeToFile(chooser.value).then(resolve));
			chooser.addEventListener('cancel', resolve);
			chooser.click();
		});
	}

	preview() {
		let value = this.session.getValue();

		if (this.mode === 'markdown') value = getConverter().makeHtml(value);
		loadData(value, this.path || 'data:text/html,');
	}
}