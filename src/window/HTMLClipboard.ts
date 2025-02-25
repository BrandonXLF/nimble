import { Ace } from "ace-builds";

export default class HTMLClipboard {
	constructor(public editor: Ace.Editor) { }

	private get range() {
		return this.editor.selection.getRange();
	}

	async cut() {
		await this.copy();
		this.editor.getSession().replace(this.range, '');
	}

	async copy() {
		const html = this.editor.getSession().doc.getTextRange(this.range),
			frame = document.createElement('iframe');

		frame.src = 'about:blank';
		document.body.appendChild(frame);

		const doc = frame.contentDocument!,
			div = doc.createElement('div');

		div.innerHTML = html;
		doc.body.appendChild(div);

		const text = div.innerText;

		div.remove();
		frame.remove();

		const item = new ClipboardItem({
			'text/html': new Blob([html], {type: 'text/html'}),
			'text/plain': new Blob([text], {type: 'text/plain'}),
		});

		await navigator.clipboard.write([item]);
	}

	async paste() {
		const items = await navigator.clipboard.read();

		for (const item of items) {
			if (!item.types.includes('text/html')) continue;

			const blob = await item.getType('text/html');
			this.editor.getSession().replace(this.range, await blob.text());

			return;
		}
	}
}
