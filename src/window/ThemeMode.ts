import { EventEmitter } from 'events';

export default class ThemeMode extends EventEmitter {
    static darkMatch = matchMedia('(prefers-color-scheme: dark)');

    constructor() {
        super();
        ThemeMode.darkMatch.addEventListener('change', e => this.emit('change', e.matches));
    }

    get darkMode() {
        return ThemeMode.darkMatch.matches;
    }
}