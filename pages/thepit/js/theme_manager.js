export class ThemeManager {
    constructor(engine) {
        this.engine = engine;
        this.currentTheme = null;
        this.themes = {};
    }

    registerTheme(name, themeInstance) {
        this.themes[name] = themeInstance;
    }

    async switchTheme(name) {
        if (!this.themes[name]) {
            console.error(`Theme '${name}' not found.`);
            return;
        }

        if (this.currentTheme) {
            console.log(`Unloading theme: ${this.currentTheme.name}`);
            if (this.currentTheme.unload) this.currentTheme.unload();
        }

        // Flush existing objects
        this.engine.flushPit();
        // Note: FlushPit removes the ground temporarily.
        // If we want an INSTANT clear for theme switch, we might prefer clearWorld().
        // Let's do clearWorld() for immediate switch, but maybe the user wants the "Flush" animation?
        // User said: "when you switch themes, that should flush the pit of its current items"
        // Let's interpret that as the "Flush Mechanic" (dropping them out).

        // However, if we drop them out, they are still in the world until GC catches them.
        // We should probably ensure the new theme doesn't interact weirdly with falling old objects.
        // But Matter.js handles collisions fine.

        // Wait for a moment if we want the flush to be visual, but typically theme switch is instant.
        // Let's force clear for now to ensure clean state, or maybe call flush then load new.
        // Actually, let's just use `clearWorld()` to instantly remove them so we don't have Ducks falling while Balls appear.
        this.engine.clearWorld();

        this.currentTheme = this.themes[name];
        console.log(`Loading theme: ${name}`);

        if (this.currentTheme.load) await this.currentTheme.load();

        // Initialize Theme
        if (this.currentTheme.init) this.currentTheme.init();
    }

    handleEvent(eventName, data) {
        if (this.currentTheme && this.currentTheme.handleEvent) {
            this.currentTheme.handleEvent(eventName, data);
        }
    }
}
