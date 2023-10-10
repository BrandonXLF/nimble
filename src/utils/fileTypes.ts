import { FileFilter } from 'electron';
import { extname } from 'path';

export const fileTypes = [
	{
		type: 'html',
		name: 'HTML',
		extensions: ['html', 'htm']
	},
	{
		type: 'svg',
		name: 'SVG',
		extensions: ['svg']
	},
	{
		type: 'markdown',
		name: 'Markdown',
		shortName: 'MD',
		extensions: ['md', 'markdown']
	}
];

const defaultExtensionMap: Record<string, string> = {};
const fileTypeMap: Record<string, string> = {};

for (const typeInfo of fileTypes) {
	defaultExtensionMap[typeInfo.type] = typeInfo.extensions[0];
	
	for (const extension of typeInfo.extensions) {
		fileTypeMap[extension] = typeInfo.type;
	}
}

export function getDefaultExtension(fileType: string): string|undefined {
	return defaultExtensionMap[fileType];
}

export function getFileType(path: string): string|undefined {
	return fileTypeMap[extname(path).substring(1)];
}

export function getSaveFilters(first?: string): FileFilter[] {
	const saveFilters = fileTypes.map(fileType => ({
		name: fileType.name,
		extensions: fileType.extensions
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
			extensions: Object.values(fileTypes).map(fileType => fileType.extensions).flat()
		},
		...getSaveFilters()
	]
}