import { fileTypes } from "../../utils/fileTypes";

export const userSettingsData = [
	{
		type: 'checkbox',
		name: 'autoRun',
		label: 'Preview changes automatically'
	},
	{
		type: 'checkbox',
		name: 'autoSave',
		label: 'Save changes automatically'
	},
		{
		type: 'checkbox',
		name: 'autoEdit',
		label: 'Show the editor by default'
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
		label: 'Use spaces instead of tabs'
	},
	{
		type: 'number',
		name: 'tabSize',
		label: 'Length of tabs'
	},
	{
		type: 'checkbox',
		name: 'showInvisible',
		label: 'Show invisible characters'
	},
	{
		type: 'checkbox',
		name: 'gutter',
		label: 'Show line numbers while editing'
	},
	{
		type: 'checkbox',
		name: 'wordWrap',
		label: 'Wrap long lines in the editor'
	}
];