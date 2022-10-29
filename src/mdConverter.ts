import { Converter } from 'showdown';

let converter: Converter;

export default function markdownToHTML(markdown: string) {
	if (!converter) converter = new Converter();
	
	return converter.makeHtml(markdown);
}