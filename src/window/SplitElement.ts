import { EventEmitter } from 'events';
import './split.less';

export default class SplitElement extends EventEmitter {
	identifier: string;
	element: HTMLElement;
	resizeElement: HTMLElement;
	firstChild: HTMLElement;
	mouseMoveBound: (e: MouseEvent) => void;
	
	constructor(
		identifier: string,
		element: HTMLElement,
		direction: 'horizontal' | 'vertical',
		visible: boolean,
		width: string,
		height: string
	) {
		super();
		
		this.identifier = identifier;
		this.element = element;
		this.resizeElement = element.querySelector<HTMLElement>(':scope > .resize')!;
		this.firstChild = element.firstElementChild as HTMLElement;
		this.mouseMoveBound = this.mouseMove.bind(this);
		
		this.firstChild.style.width = width;
		this.firstChild.style.height = height;
		
		this.toggleDirection(direction);
		this.toggleVisible(visible);
	
		this.addMouseEvents();
		this.positionResize();
	}
	
	addMouseEvents(): void {
		this.resizeElement.addEventListener('mousedown', () => {
			this.resizeElement.classList.add('active');
			this.resizeElement.addEventListener('mousemove', this.mouseMoveBound);
		});
		
		this.resizeElement.addEventListener('mouseup', () => {
			this.resizeElement.removeEventListener('mousemove', this.mouseMoveBound);
			this.resizeElement.classList.remove('active');
			
			if (this.element.classList.contains('horizontal')) {
				this.emit('width', this.firstChild.style.width);
			} else {
				this.emit('height', this.firstChild.style.height);
			}
		});
	}
	
	positionResize(): void {
		if (this.element.classList.contains('horizontal')) {
			this.resizeElement.style.left = this.firstChild.offsetWidth / this.element.offsetWidth * 100 + '%';
		} else {
			this.resizeElement.style.top = this.firstChild.offsetHeight / this.element.offsetHeight * 100 + '%';
		}
	}
	
	mouseMove(event: MouseEvent): void {
		if (this.element.classList.contains('horizontal')) {
			this.firstChild.style.width = event.offsetX / this.element.offsetWidth * 100 + '%';
		} else {
			this.firstChild.style.height = event.offsetY / this.element.offsetHeight * 100 + '%';
		}
		
		this.positionResize();
	}

	toggleVisible(force?: boolean): boolean {
		const visible = !this.element.classList.toggle('hidden', force !== undefined ? !force : undefined);
		
		visible
			? document.body.setAttribute(`data-${this.identifier}`, '')
			: document.body.removeAttribute(`data-${this.identifier}`);
			
		this.positionResize();
		this.emit('visible', visible);
		
		return visible;
	}
	
	toggleDirection(force?: 'horizontal' | 'vertical'): 'horizontal' | 'vertical' {
		const becomeVertical = force !== undefined ? force === 'vertical' : !this.element.classList.contains('vertical');
		
		this.element.classList.toggle('vertical', becomeVertical);
		this.element.classList.toggle('horizontal', !becomeVertical);
		
		this.positionResize();
		
		return becomeVertical ? 'vertical' : 'horizontal';
	}
}