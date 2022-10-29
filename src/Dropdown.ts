import './dropdown.less';

type GetItems = () => (typeof Dropdown.Separator | {
	label: string;
	click: (e: MouseEvent) => unknown;
	stayOpen?: boolean;
})[];

export class Dropdown {
	static readonly Separator = 1;
	
	element;
	dropdown: HTMLElement;
	showBound: (e: MouseEvent) => void;
	hideBound: (e: MouseEvent) => void;
	getItems: GetItems;
	
	constructor(element: HTMLElement, getItems: GetItems) {
		this.element = element;
		this.showBound = this.show.bind(this);
		this.hideBound = this.hide.bind(this);
		this.getItems = getItems;
	}
	
	start() {
		this.element.addEventListener('mouseenter', this.showBound);
		this.element.addEventListener('focusin', this.showBound);
		this.element.addEventListener('mouseleave', this.hideBound);
		this.element.addEventListener('focusout', this.hideBound);
	}
	
	createDropdown() {
		const items = this.getItems(),
			menuItems = document.createElement('div');
			
		menuItems.classList.add('menu-items');
		this.element.classList.add('menu-parent');
			
		this.dropdown = document.createElement('div');
		this.dropdown.className = 'menu';
		this.dropdown.append(menuItems);
		this.element.append(this.dropdown);

		items.forEach(item => {
			if (!item) return;
			
			const el = document.createElement('div');
			
			if (item === Dropdown.Separator) {
				el.classList.add('menu-separator');
				menuItems.append(el);
				
				return;
			}

			el.classList.add('menu-item');
			el.addEventListener('click', e => {
				if (item.stayOpen !== true) this.forceHide();
				
				item.click(e);
			});
			el.innerText = item.label;
			menuItems.append(el);
		});
	}
	
	show() {
		if (this.dropdown) return;
		
		this.createDropdown();
	}
	
	hide() {
		if (this.element.matches(':focus-within') || this.element.matches(':hover')) return;

		this.forceHide();
	}
	
	forceHide() {
		this.dropdown?.remove();
		this.element.classList.remove('menu-parent');
		this.dropdown = undefined;
	}
}