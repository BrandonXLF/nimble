import { Converter } from 'showdown';

let mdConverter: Converter;

export default function convertText(mode: string, text: string) {
	if (mode === 'markdown') {
		if (!mdConverter) mdConverter = new Converter();
	
		return mdConverter.makeHtml(text);
	}

	return text;
}