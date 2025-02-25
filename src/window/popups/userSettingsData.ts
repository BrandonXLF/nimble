import { fileTypes } from "../../utils/fileTypes";

export default function getUserSettingData(fontFamilies: string[]) {
	const fontValues = [
		{
			value: '',
			label: 'Unset'
		},
		...fontFamilies.map(family => ({
			value: family,
			label: family
		}))
	];

	return [
		{
			name: 'Behaviour',
			settings: [
				{
					type: 'checkbox',
					name: 'autoRun',
					label: 'Automatic preview'
				},
				{
					type: 'checkbox',
					name: 'autoSave',
					label: 'Autosave'
				},
				{
					type: 'checkbox',
					name: 'autoEdit',
					label: 'Show editor on launch with file'
				},
				{
					type: 'checkbox',
					name: 'autoDevtools',
					label: 'Show devtools on launch'
				},
				{
					type: 'select',
					name: 'defaultType',
					label: 'Default file type',
					values: fileTypes.map(typeInfo => ({
						value: typeInfo.type,
						label: typeInfo.name
					}))
				}
			]
		},
		{
			name: 'Appearance',
			settings: [
				{
					type: 'select',
					name: 'theme',
					label: 'Theme',
					values: [
						{
							value: 'dark',
							label: 'Dark'
						},
						{
							value: 'light',
							label: 'Light'
						},
						{
							value: 'system',
							label: 'System'
						}
					]
				},
				{
					type: 'checkbox',
					name: 'viewerUseTheme',
					label: 'Apply theme to viewer'
				},
				{
					type: 'number',
					name: 'fontSize',
					label: 'Font size'
				},
				{
					type: 'select',
					name: 'standardFont',
					label: 'Standard font',
					values: fontValues
				},
				{
					type: 'select',
					name: 'monospaceFont',
					label: 'Editor and code font',
					values: fontValues
				},
				{
					type: 'select',
					name: 'sherifFont',
					label: 'Sherif font',
					values: fontValues
				},
				{
					type: 'select',
					name: 'sansFont',
					label: 'Sans-sherif font',
					values: fontValues
				}
			]
		},
		{
			name: 'Editor',
			settings: [
				{
					type: 'checkbox',
					name: 'softTabs',
					label: 'Use spaces as tabs'
				},
				{
					type: 'number',
					name: 'tabSize',
					label: 'Tab length'
				},
				{
					type: 'checkbox',
					name: 'showInvisible',
					label: 'Show invisible characters'
				},
				{
					type: 'checkbox',
					name: 'gutter',
					label: 'Show line numbers'
				},
				{
					type: 'checkbox',
					name: 'wordWrap',
					label: 'Wrap long lines'
				},
				{
					type: 'checkbox',
					name: 'autocomplete',
					label: 'Autocompletion'
				},
				{
					type: 'checkbox',
					name: 'enableSnippets',
					label: 'Enable code snippets'
				}
			]
		}
	];
}