import { fileTypes } from "../../utils/fileTypes";

export const userSettingsData = [
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
		label: 'Show editor by default'
	},
	{
		type: 'checkbox',
		name: 'autoDevtools',
		label: 'Show devtools by default'
	},
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
		type: 'select',
		name: 'defaultType',
		label: 'Default file type',
		values: fileTypes.map(typeInfo => ({
            value: typeInfo.type,
            label: typeInfo.name
        }))
	},
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
	}
];