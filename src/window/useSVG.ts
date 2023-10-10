export function useSVG(id: string, className?: string) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
		use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

	svg.setAttributeNS(null, 'viewBox', '0 0 100 100');
	svg.classList.add('icon');
	if (className) svg.classList.add(className);

	use.setAttributeNS(null, 'href', '#' + id);
	svg.append(use);

	return svg;
}