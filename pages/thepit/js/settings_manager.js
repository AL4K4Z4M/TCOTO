export class SettingsManager {
    constructor(modalId, contentId, titleId) {
        this.modal = document.getElementById(modalId);
        this.contentContainer = document.getElementById(contentId);
        this.titleElement = document.getElementById(titleId);

        this.currentTheme = null;
        this.currentSettings = {};

        // Bindings
        this.handleInput = this.handleInput.bind(this);
    }

    /**
     * Opens the settings modal for a specific theme
     * @param {Object} themeInstance - The theme object (must have .name and .getSettingsSchema())
     */
    openForTheme(themeInstance) {
        try {
            this.currentTheme = themeInstance;
            this.titleElement.innerText = `${themeInstance.name} Settings`;

            let loadedSettings = this.loadFromLocalStorage(themeInstance.name);

            if (!themeInstance.settings || Object.keys(themeInstance.settings).length === 0) {
                const defaults = this.extractDefaults(themeInstance.getSettingsSchema());
                this.currentSettings = { ...defaults, ...loadedSettings };
            } else {
                this.currentSettings = themeInstance.settings;
            }

            // Render UI
            this.renderUI(themeInstance.getSettingsSchema(), this.currentSettings);

            // Show Modal
            this.modal.style.display = 'flex';
        } catch (e) {
            console.error('SettingsManager Error:', e);
        }
    }

    close() {
        this.modal.style.display = 'none';
    }

    apply() {
        if (this.currentTheme) {
            this.currentTheme.settings = { ...this.currentSettings };
            this.saveToLocalStorage(this.currentTheme.name, this.currentSettings);
        }
        return this.currentSettings;
    }

    /**
     * Generates default values object from schema
     */
    extractDefaults(schema) {
        const defaults = {};
        schema.forEach(item => {
            if (item.type !== 'header' && item.id) {
                defaults[item.id] = item.default;
            }
        });
        return defaults;
    }

    /**
     * Renders the settings form
     */
    renderUI(schema, values) {
        this.contentContainer.innerHTML = ''; // Clear

        schema.forEach(item => {
            if (item.type === 'header') {
                const h = document.createElement('h3');
                h.className = "text-lg font-bold text-gray-700 mt-4 mb-2 border-b border-gray-200 pb-1";
                h.innerText = item.label;
                this.contentContainer.appendChild(h);
                return;
            }

            // Wrapper
            const wrapper = document.createElement('div');
            wrapper.className = "mb-3 flex flex-col";

            // Label
            const label = document.createElement('label');
            label.className = "text-sm font-medium text-gray-600 mb-1";
            label.innerText = item.label;
            wrapper.appendChild(label);

            let input;

            if (item.type === 'number' || item.type === 'range') {
                input = document.createElement('input');
                input.type = item.type === 'range' ? 'range' : 'number';
                input.className = "w-full border rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-blue-500";
                if (item.min !== undefined) input.min = item.min;
                if (item.max !== undefined) input.max = item.max;
                if (item.step !== undefined) input.step = item.step;
                input.value = values[item.id] !== undefined ? values[item.id] : item.default;

                // Add value display for ranges
                if (item.type === 'range') {
                    const valDisp = document.createElement('span');
                    valDisp.className = "text-xs text-gray-500";
                    valDisp.innerText = input.value;
                    input.addEventListener('input', (e) => valDisp.innerText = e.target.value);
                    wrapper.appendChild(input);
                    wrapper.appendChild(valDisp);
                } else {
                    wrapper.appendChild(input);
                }

            } else if (item.type === 'checkbox') {
                wrapper.className = "mb-3 flex flex-row items-center gap-2";
                input = document.createElement('input');
                input.type = "checkbox";
                input.className = "h-5 w-5 text-blue-600 rounded";
                input.checked = values[item.id] !== undefined ? values[item.id] : item.default;

                // Re-order for checkbox: Input then Label
                wrapper.innerHTML = '';
                wrapper.appendChild(input);
                label.className = "text-sm font-medium text-gray-700"; // Reset margin
                wrapper.appendChild(label);
            } else if (item.type === 'text') {
                input = document.createElement('input');
                input.type = "text";
                input.className = "w-full border rounded px-2 py-1 text-gray-700";
                input.value = values[item.id] || item.default || "";
                wrapper.appendChild(input);
            }

            // Event Listener
            if (input) {
                input.addEventListener('change', (e) => {
                    const val = input.type === 'checkbox' ? input.checked : (input.type === 'number' || input.type === 'range' ? parseFloat(input.value) : input.value);
                    this.handleInput(item.id, val);
                });
            }

            this.contentContainer.appendChild(wrapper);
        });
    }

    handleInput(key, value) {
        this.currentSettings[key] = value;
    }

    // --- Persistence ---

    saveToLocalStorage(themeName, data) {
        try {
            localStorage.setItem(`tcoto_pit_${themeName}`, JSON.stringify(data));
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    loadFromLocalStorage(themeName) {
        try {
            const raw = localStorage.getItem(`tcoto_pit_${themeName}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error("Load failed", e);
            return {};
        }
    }

    exportToFile() {
        if (!this.currentTheme) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.currentSettings, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${this.currentTheme.name}_settings.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    importFromFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                // Validate? For now assume good faith.
                this.currentSettings = { ...this.currentSettings, ...json };
                // Re-render
                this.renderUI(this.currentTheme.getSettingsSchema(), this.currentSettings);
            } catch (err) {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    }
}
