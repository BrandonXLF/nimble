import './popup.less';

export function popup(
	title: string,
	msg: string|Node|(string|Node)[],
	buttons: {text: string|Node, click?: () => any, keepOpen?: boolean}[] = [{text: 'OK'}],
	parent = document.getElementById('main'),
	small = false
) {
	const popupElement = document.createElement('div'),
		text = document.createElement('div'),
		buttonCnt = document.createElement('div');
	
	let	container: HTMLDivElement;

	popupElement.classList.add('popup');

	if (small) {
		popupElement.classList.add('mini-popup');

		parent.append(popupElement);
	} else {
		container = document.createElement('div')

		container.className = 'popup-container';
		container.style.cssText = '';

		container.append(popupElement);
		parent.append(container);
	}

	if (title) {
		const titleElement = document.createElement('h3');

		titleElement.style.cssText = 'margin: 0;';
		titleElement.innerText = title;
		popupElement.append(titleElement);
	}

	Array.isArray(msg) ? text.append(...msg) : text.append(msg);
	popupElement.append(text);

	buttonCnt.style.textAlign = 'right';
	popupElement.append(buttonCnt);

	buttons.forEach(button => {
		const buttonElement = document.createElement('button');

		buttonElement.append(button.text);
		buttonElement.addEventListener('click', () => {
			if (!button.keepOpen) {
				container ? container.remove() : popupElement.remove();
			}

			button.click?.();
		});
		buttonCnt.append(buttonElement);
	});

	return popupElement;
}