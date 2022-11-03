import { FileFilter } from 'electron';

const fileTypes = [
	{
		type: 'html',
		name: 'HTML',
		extensions: ['.html', '.htm']
	},
	{
		type: 'svg',
		name: 'SVG',
		extensions: ['.svg']
	},
	{
		type: 'markdown',
		name: 'Markdown',
		extensions: ['.md', '.markdown']
	}
];

export function getDefaultExtension(fileType: string): string|undefined {
	return fileTypes.find(x => x.type === fileType)?.extensions[0];
}

export function getFileType(extension: string): string|undefined {
	return fileTypes.find(x => x.extensions.includes(extension))?.type;
}

export function getSaveFilters(first?: string): FileFilter[] {
	const saveFilters = fileTypes.map(fileType => ({
		name: fileType.name,
		extensions: fileType.extensions.map(x => x.slice(1))
	}));
	
	if (first) {
		const index = fileTypes.findIndex(x => x.type === first);
		
		saveFilters.unshift(saveFilters.splice(index, 1)[0]);
	}
	
	return saveFilters;
}

export function getOpenFilters(): FileFilter[] {
	return [
		{
			name: 'All Supported Files',
			extensions: Object.values(fileTypes).map(fileType => fileType.extensions).flat().map(x => x.slice(1))
		},
		...getSaveFilters()
	]
}