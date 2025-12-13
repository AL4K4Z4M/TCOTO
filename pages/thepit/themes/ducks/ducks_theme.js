export class DucksTheme {
    constructor(engine) {
        this.engine = engine;
        this.name = "Ducks & Toasters";

        // Paths relative to thepit.html
        this.duckPath = 'themes/ducks/assets/Rubber_Duck.png';
        this.toasterPath = 'themes/ducks/assets/Toaster.png';

        // Audio
        this.audioCtx = null;
        this.buffers = {};

        // Binds
        this.collisionHook = this.collisionHook.bind(this);
        this.renderHook = this.renderHook.bind(this);
    }

    async load() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Preload Images
        await this.loadImage(this.duckPath);
        await this.loadImage(this.toasterPath);

        // Load Audio (Using Fetch for simplicity in this port)
        await this.loadAudio('toaster', 'themes/ducks/assets/toaster.wav');
        for(let i=1; i<=6; i++) await this.loadAudio(`duck${i}`, `themes/ducks/assets/duck${i}.wav`);
    }

    init() {
        this.engine.Events.on(this.engine.engine, 'collisionStart', this.collisionHook);
        this.engine.Events.on(this.engine.render, 'afterRender', this.renderHook);
    }

    unload() {
        this.engine.Events.off(this.engine.engine, 'collisionStart', this.collisionHook);
        this.engine.Events.off(this.engine.render, 'afterRender', this.renderHook);
    }

    handleEvent(event, payload) {
        const getSafeData = (p) => p.data ? p.data : p;
        const getName = (p) => {
            const d = getSafeData(p);
            if (typeof d.user === 'string') return d.user;
            if (d.user_name) return d.user_name;
            if (d.display_name) return d.display_name;
            if (d.displayName) return d.displayName;
            if (d.userName) return d.userName;
            if (d.name) return d.name;
            return "User";
        };

        if (['Twitch.Follow', 'Twitch.Cheer'].includes(event)) {
            this.spawnEvent(getName(payload));
        }
        else if (event.startsWith('Twitch.Sub') || event === 'Twitch.Subscribe' || event === 'Twitch.ReSubscribe' || event === 'Twitch.GiftSubscription') {
            // Showstopper logic not fully ported yet for simplicity, treating as spawn for now or TODO
            // User asked for "essentially the same physics", Showstopper is a big visual event.
            // Let's spawn a toaster for subs for now to distinguish.
            this.spawnEvent(getName(payload), 'toaster');
        }
        else if (event === 'Twitch.ChatMessage') {
            const d = getSafeData(payload);
            const msg = (d.message?.message || d.message || "").trim().toLowerCase();
            const username = getName(payload);

            if (msg.startsWith("!duck")) this.spawnEvent(username, 'duck');
            else if (msg.startsWith("!toaster")) this.spawnEvent(username, 'toaster');
        }
    }

    spawnEvent(username, forcedType = null) {
        const x = Math.random() * (window.innerWidth - 100) + 50;
        let isDuck = Math.random() < 0.5;

        if (forcedType === 'duck') isDuck = true;
        if (forcedType === 'toaster') isDuck = false;

        const scaleMult = 1.0 + Math.random() * 1.5;
        let body;

        if (isDuck) {
            const size = 60 * scaleMult;
            body = this.engine.Bodies.circle(x, -100, size/2, {
                restitution: 0.9, density: 0.001, friction: 0.05,
                render: { sprite: { texture: this.duckPath, xScale: size/512, yScale: size/512 } }
            });
            body.bodyType = 'duck';
            body.visualSize = size;
        } else {
            const w = 80 * scaleMult;
            const h = 60 * scaleMult;
            const paddingScale = 1.15;
            body = this.engine.Bodies.rectangle(x, -100, w, h, {
                restitution: 0.1, density: 0.05, friction: 0.5,
                render: { sprite: { texture: this.toasterPath, xScale: (w/500) * paddingScale, yScale: (h/500) * paddingScale } }
            });
            body.bodyType = 'toaster';
            body.visualSize = w;
        }

        body.scaleMult = scaleMult;
        body.username = username;
        this.engine.Composite.add(this.engine.engine.world, body);
    }

    collisionHook(event) {
        event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            const impact = bodyA.speed + bodyB.speed;
            if (impact > 2.0) {
                if (bodyA.bodyType) this.playSound(bodyA.bodyType, bodyA.scaleMult || 1.0);
                if (bodyB.bodyType) this.playSound(bodyB.bodyType, bodyB.scaleMult || 1.0);
            }
        });
    }

    renderHook() {
        const ctx = this.engine.render.context;
        const bodies = this.engine.Composite.allBodies(this.engine.engine.world);

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3;

        bodies.forEach(b => {
            if (b.username) {
                const visualWidth = b.visualSize || 35;
                let fontSize = Math.max(12, visualWidth * 0.5);
                ctx.font = `800 ${fontSize}px "Barlow", Arial, sans-serif`;
                let textWidth = ctx.measureText(b.username).width;
                const maxWidth = visualWidth * 0.9;

                if (textWidth > maxWidth) {
                    fontSize = Math.max(10, fontSize * (maxWidth / textWidth));
                    ctx.font = `800 ${fontSize}px "Barlow", Arial, sans-serif`;
                }

                ctx.fillStyle = 'white'; ctx.strokeStyle = 'black';
                ctx.save();
                ctx.translate(b.position.x, b.position.y);
                ctx.rotate(b.angle);
                ctx.strokeText(b.username, 0, 0);
                ctx.fillText(b.username, 0, 0);
                ctx.restore();
            }
        });
    }

    playSound(type, scale = 1.0) {
        const rate = 1.0 / scale;
        if (type === 'toaster') {
            this.playAudio('toaster', rate);
        } else if (type === 'duck') {
            const idx = Math.ceil(Math.random() * 6);
            this.playAudio(`duck${idx}`, rate);
        }
    }

    // Asset Loading Helpers
    loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = () => { console.warn("Failed to load image", src); resolve(); };
            img.src = src;
        });
    }

    async loadAudio(key, src) {
        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            this.buffers[key] = await this.audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn("Failed to load audio", src, e);
        }
    }

    playAudio(key, rate) {
        if (!this.buffers[key]) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        try {
            const source = this.audioCtx.createBufferSource();
            source.buffer = this.buffers[key];
            source.playbackRate.value = Math.max(0.1, Math.min(rate, 4.0));
            const gain = this.audioCtx.createGain();
            gain.gain.value = 0.5;
            source.connect(gain);
            gain.connect(this.audioCtx.destination);
            source.start(0);
        } catch(e) {}
    }
}
