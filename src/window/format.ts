import { Ace } from "ace-builds";
import SettingStore from "src/utils/SettingStore";
import prettier from 'prettier/standalone';
import htmlPlugin from 'prettier/plugins/html';
import mdPlugin from 'prettier/plugins/markdown';
import xmlPlugin from '@prettier/plugin-xml';
import babelPlugin from 'prettier/plugins/babel';
import estreePlugin from 'prettier/plugins/estree';
import cssPlugin from 'prettier/plugins/postcss';

export default async function format(editor: Ace.Editor, mode: string, settings: SettingStore) {
	const code = editor.getValue(),
		parser = mode === 'svg' ? 'xml' : mode,
		formatted = await prettier.format(code, {
			parser,
			plugins: [htmlPlugin, xmlPlugin, mdPlugin, babelPlugin, estreePlugin, cssPlugin],
			useTabs: !settings.get('softTabs'),
			tabWidth: settings.get('tabSize'),
			embeddedLanguageFormatting: 'auto'
		});

	editor.setValue(formatted, 1);
}