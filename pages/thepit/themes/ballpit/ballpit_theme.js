export class BallpitTheme {
    constructor(engine) {
        this.engine = engine; // PhysicsEngine instance
        this.name = "Ballpit";
        this.colors = ['rgb(255, 0, 0)', 'rgb(255, 234, 0)', 'rgb(5, 255, 116)', 'rgb(95, 255, 255)'];

        // Initialize settings (will be populated by SettingsManager)
        this.settings = {};

        // Bind functions
        this.renderHook = this.renderHook.bind(this);
        this.updateHook = this.updateHook.bind(this);
        this.collisionHook = this.collisionHook.bind(this);
    }

    getSettingsSchema() {
        return [
            { type: 'header', label: 'Global Settings' },
            { id: 'global_scale_mult', label: 'Ball Size Multiplier (Global)', type: 'range', default: 1.0, min: 0.5, max: 2.5, step: 0.1 },

            { type: 'header', label: 'Follow Events' },
            { id: 'follow_enabled', label: 'Enable Follow Drops', type: 'checkbox', default: true },
            { id: 'follow_min_size', label: 'Min Size', type: 'number', default: 15 },
            { id: 'follow_max_size', label: 'Max Size', type: 'number', default: 85 },

            { type: 'header', label: 'Subscription Events' },
            { id: 'sub_enabled', label: 'Enable Sub Drops', type: 'checkbox', default: true },
            { id: 'sub_prime_size', label: 'Prime/Tier 1 Size', type: 'number', default: 50 },
            { id: 'sub_t2_size', label: 'Tier 2 Size', type: 'number', default: 75 },
            { id: 'sub_t3_size', label: 'Tier 3 Size', type: 'number', default: 100 },

            { type: 'header', label: 'Cheer (Bits) Events' },
            { id: 'bits_enabled', label: 'Enable Bit Drops', type: 'checkbox', default: true },
            { id: 'bits_cluster_threshold', label: 'Cluster Threshold (Bits)', type: 'number', default: 100 },
            { id: 'bits_explosion_threshold', label: 'Explosion Threshold (Bits)', type: 'number', default: 1000 },
            { id: 'bits_mega_threshold', label: 'Mega Explosion Threshold (Bits)', type: 'number', default: 10000 },
        ];
    }

    async load() {
        // Load Audio
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    init() {
        // Register Hooks
        this.engine.Events.on(this.engine.render, 'afterRender', this.renderHook);
        this.engine.Events.on(this.engine.engine, 'afterUpdate', this.updateHook);
        this.engine.Events.on(this.engine.engine, 'collisionStart', this.collisionHook);
    }

    unload() {
        // Remove Hooks
        this.engine.Events.off(this.engine.render, 'afterRender', this.renderHook);
        this.engine.Events.off(this.engine.engine, 'afterUpdate', this.updateHook);
        this.engine.Events.off(this.engine.engine, 'collisionStart', this.collisionHook);
    }

    // Helper to safely get setting or default
    getSetting(key, defaultVal) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultVal;
    }

    handleEvent(event, payload) {
        // Map Streamer.bot events to Spawn Logic
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

        const globalMult = this.getSetting('global_scale_mult', 1.0);

        if (event === 'Twitch.Follow') {
            if (!this.getSetting('follow_enabled', true)) return;

            const username = getName(payload);
            const dropType = this.determineDropType();

            const min = this.getSetting('follow_min_size', 15);
            const max = this.getSetting('follow_max_size', 85);
            const rawRadius = min + Math.random() * (max - min);

            this.spawnEvent(dropType, username, rawRadius * globalMult);
        }
        else if (event === 'Twitch.Subscribe' || event === 'Twitch.ReSubscribe' || event === 'Twitch.GiftSubscription' || event === 'Twitch.Sub') {
            if (!this.getSetting('sub_enabled', true)) return;

            const username = getName(payload);
            const d = getSafeData(payload);
            const tierCodeRaw = d.tier || d.sub_tier || '1000';
            const tierCode = String(tierCodeRaw).toLowerCase().replace(/\s/g, '');
            const isPrime = d.is_prime === true || d.isPrime === true;

            let baseRadius = this.getSetting('sub_prime_size', 50);
            let tierText = "Tier 1";

            if (tierCode === '3000') {
                baseRadius = this.getSetting('sub_t3_size', 100);
                tierText = "Tier 3";
            }
            else if (tierCode === '2000') {
                baseRadius = this.getSetting('sub_t2_size', 75);
                tierText = "Tier 2";
            }
            else if (tierCode.includes('prime') || isPrime) {
                baseRadius = this.getSetting('sub_prime_size', 50);
                tierText = "Prime";
            }

            this.spawnEvent('normal', username, baseRadius * globalMult, 0, false, "SUB", tierText);
        }
        else if (event === 'Twitch.Cheer') {
            if (!this.getSetting('bits_enabled', true)) return;

            const username = getName(payload);
            const d = getSafeData(payload);
            const bits = d.bits || 1;
            const bitLabel = bits + " bits";

            // Thresholds
            const megaThresh = this.getSetting('bits_mega_threshold', 10000);
            const exploThresh = this.getSetting('bits_explosion_threshold', 1000);
            const clusterThresh = this.getSetting('bits_cluster_threshold', 100);

            if (bits >= exploThresh) this.playDing();

            let baseRadius = 15 + Math.sqrt(bits) * 2.5;
            baseRadius = Math.min(baseRadius, 200);

            if (bits >= megaThresh) {
                this.spawnEvent('exploding', username, 200 * globalMult, 1, false, "", bitLabel);
            } else if (bits >= exploThresh) {
                // Calculate scale based on range between explosion and mega thresholds
                const progress = (bits - exploThresh) / (megaThresh - exploThresh);
                const clamped = Math.max(0, Math.min(1, progress));
                const debrisCount = 11 + Math.floor(clamped * 9);
                const debrisRadius = 15 + Math.sqrt(99) * 2.5;
                this.spawnEvent('exploding', username, baseRadius * globalMult, 0, false, "", bitLabel, debrisCount, debrisRadius * globalMult);
            } else if (bits >= clusterThresh) {
                const numBalls = 1 + Math.floor(bits / 100);
                const clusterRadius = 15 + Math.sqrt(99) * 2.5;
                for(let i=0; i < numBalls; i++) {
                    setTimeout(() => this.spawnEvent('normal', username, (clusterRadius + Math.random() * 5) * globalMult, 0, false, "", (i===0?bitLabel:"")), i * 30);
                }
            } else {
                this.spawnEvent('normal', username, baseRadius * globalMult, 0, false, "", bitLabel);
            }
        }
        else if (event === 'Twitch.ChatMessage') {
             const d = getSafeData(payload);
             const msg = (d.message?.message || d.message || "").trim().toLowerCase();
             const username = getName(payload);

             if (msg === "!ball") {
                 const dropType = this.determineDropType();
                 const radius = 15 + Math.random() * 70;
                 this.spawnEvent(dropType, username, radius * globalMult, 0, false, "", "!ball");
             }
        }
    }

    determineDropType() {
        const rand = Math.random();
        if (rand < 0.015) return 'huge';
        if (rand < 0.065) return 'cluster';
        if (rand < 0.15) return 'exploding';
        return 'normal';
    }

    spawnEvent(type, username, customRadius = 30, explosionTier = 0, isFading = false, topLabel = "", bottomLabel = "", customDebrisCount = 0, customDebrisRadius = 0) {
        const x = Math.random() * window.innerWidth;
        const y = 150;

        let ball;
        const Bodies = this.engine.Bodies;
        const Composite = this.engine.Composite;

        if (type === 'huge') {
            const radius = (customRadius > 60 ? customRadius : 100) + Math.random() * 30;
            ball = this.createBallBody(x, y, radius, username);
        } else if (type === 'cluster') {
            for(let i=0; i<10; i++) setTimeout(() => {
                const rainX = Math.random() * window.innerWidth;
                let r = 15 + Math.random() * 30;
                let b = this.createBallBody(rainX, y + (Math.random() * 300), r, username);
                Composite.add(this.engine.engine.world, b);
            }, i * 50);
            return;
        } else if (type === 'exploding') {
            const radius = customRadius + Math.random() * 10;
            ball = this.createBallBody(x, y, radius, username, true);
            ball.explosionTier = explosionTier;
            if (customDebrisCount > 0) ball.customDebrisCount = customDebrisCount;
            if (customDebrisRadius > 0) ball.customDebrisRadius = customDebrisRadius;
        } else {
            const radius = customRadius;
            ball = this.createBallBody(x, y, radius, username);
            if (isFading) {
                ball.isSettledFading = true;
                ball.flashTimer = performance.now() + (Math.random() * 8000);
            }
        }

        if (ball) {
            if (topLabel) ball.topLabel = topLabel;
            if (bottomLabel) ball.bottomLabel = bottomLabel;
            Composite.add(this.engine.engine.world, ball);
        }
        this.playDing();
    }

    createBallBody(x, y, radius, username, isExplosive = false) {
        let color = this.colors[Math.floor(Math.random() * this.colors.length)];
        if (isExplosive) color = '#333';

        const ball = this.engine.Bodies.circle(x, y, radius, {
            restitution: 0.9,
            friction: 0.001,
            render: { fillStyle: color }
        });
        ball.username = username.toUpperCase();
        ball.isExplosive = isExplosive;
        return ball;
    }

    detonateBall(bombBody) {
        const explosionCenter = bombBody.position;
        const explosionRadius = bombBody.circleRadius * 6;
        const explosionForce = 0.05 + (bombBody.circleRadius / 200);
        const storedLabel = bombBody.bottomLabel;

        this.engine.Composite.remove(this.engine.engine.world, bombBody);
        this.playBounce(20, bombBody.circleRadius); // Sound

        const currentTier = bombBody.explosionTier || 0;
        const isMegaBombLaunch = currentTier === 1;
        const isSecondaryBomb = currentTier === 2;
        let debrisRadius, debrisIsExplosive, nextTier = 0, isFading = false, debrisCount;

        // Simplified logic from original
        if (isMegaBombLaunch) {
            debrisCount = 2; debrisRadius = bombBody.circleRadius; debrisIsExplosive = true; nextTier = 2;
        } else if (isSecondaryBomb) {
            debrisCount = Math.floor(Math.random() * 2) + 5; debrisRadius = Math.floor(bombBody.circleRadius * 0.9); debrisIsExplosive = false; nextTier = 0; isFading = true;
        } else {
            debrisCount = bombBody.customDebrisCount || Math.max(5, Math.floor(bombBody.circleRadius / 10));
            debrisRadius = bombBody.customDebrisRadius || Math.min(35, Math.max(12, Math.floor(bombBody.circleRadius / 4)));
            debrisIsExplosive = false;
        }
        debrisRadius = Math.max(12, debrisRadius);

        for (let i = 0; i < debrisCount; i++) {
            const angle = (Math.PI * 2 / debrisCount) * i;
            let variedRadius = debrisRadius * (0.8 + Math.random() * 0.4);
            const debris = this.createBallBody(explosionCenter.x + Math.cos(angle)*10, explosionCenter.y + Math.sin(angle)*10, variedRadius, bombBody.username, debrisIsExplosive);

            if (i === 0 && storedLabel) debris.bottomLabel = storedLabel;
            if (nextTier > 0) debris.explosionTier = nextTier;
            if (isFading) {
                debris.isFading = true;
                debris.flashTimer = performance.now();
                debris.render.fillStyle = this.colors[Math.floor(Math.random() * this.colors.length)];
            } else if (nextTier === 2) debris.render.fillStyle = 'gold';

            this.engine.Body.applyForce(debris, debris.position, { x: Math.cos(angle) * 0.005, y: Math.sin(angle) * 0.005 });
            this.engine.Composite.add(this.engine.engine.world, debris);
        }

        // Blast Wave
        const Vector = this.engine.Vector;
        this.engine.Composite.allBodies(this.engine.engine.world).forEach(body => {
            if (body.isStatic) return;
            const forceVector = Vector.sub(body.position, explosionCenter);
            const distance = Vector.magnitude(forceVector);
            if (distance < explosionRadius) {
                let normal = distance > 0.1 ? Vector.normalise(forceVector) : { x: Math.random() - 0.5, y: -1 };
                const forceMagnitude = explosionForce * (1 - distance / explosionRadius);
                this.engine.Sleeping.set(body, false);
                this.engine.Body.applyForce(body, body.position, { x: normal.x * forceMagnitude, y: normal.y * forceMagnitude });
            }
        });
    }

    // Hooks
    updateHook() {
        // Explosion Check
        const bodies = this.engine.Composite.allBodies(this.engine.engine.world);
        bodies.forEach(body => {
            if (body.isExplosive && body.isSleeping) this.detonateBall(body);
            if (body.isFading && body.isSleeping) {
                body.isFading = false; body.isSettledFading = true;
                body.flashTimer = performance.now() + (Math.random() * 8000);
            }
        });
    }

    collisionHook(event) {
        event.pairs.forEach((pair) => {
            const speedA = pair.bodyA.speed; const speedB = pair.bodyB.speed; const impact = speedA + speedB;
            if (impact > 3.0) {
                const maxRadius = Math.max(pair.bodyA.circleRadius || 0, pair.bodyB.circleRadius || 0);
                if (maxRadius > 0) this.playBounce(impact, maxRadius);
            }
        });
    }

    renderHook() {
        const context = this.engine.render.context;
        const bodies = this.engine.Composite.allBodies(this.engine.engine.world);
        context.textAlign = 'center'; context.textBaseline = 'middle';

        bodies.forEach(body => {
            if (body.username) {
                // Fading Logic for rendering colors
                if (body.isFading || body.isSettledFading) {
                    const time = performance.now();
                    const cycleTime = body.isSettledFading ? 8000 : 6000;
                    const opacity = 0.5 + 0.5 * Math.sin((time - (body.flashTimer || 0)) * (2 * Math.PI / cycleTime));
                    // Note: This relies on re-setting render.fillStyle every frame which is okay but heavy-ish.
                    // Keeping simple port.
                    // Actually, let's skip complex RGB parsing for now and just set global alpha if needed,
                    // or assume colors are hex/rgb strings we can slice.
                }

                // Text Rendering
                const radius = body.circleRadius || 20;
                let fontSize = radius * 0.7;
                context.font = `600 ${fontSize}px "Barlow", Arial, sans-serif`;
                context.lineWidth = Math.max(2.5, fontSize * 0.08);
                context.strokeStyle = `rgba(0, 0, 0, 1.0)`;
                context.strokeText(body.username, body.position.x, body.position.y);
                context.fillStyle = `rgba(255, 255, 255, 1.0)`;
                context.fillText(body.username, body.position.x, body.position.y);

                // Labels (Top/Bottom)
                if (body.bottomLabel) {
                     const subSize = Math.max(10, radius * 0.25);
                     context.font = `600 ${subSize}px "Barlow", Arial, sans-serif`;
                     context.fillText(body.bottomLabel, body.position.x, body.position.y + (radius * 0.4));
                }
            }
        });
    }

    playDing() {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain); gain.connect(this.audioCtx.destination); osc.start(now); osc.stop(now + 1.5);
    }

    playBounce(intensity, radius) {
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
        const volume = Math.min(intensity * 0.1, 0.4);
        if (volume < 0.02) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        const safeRadius = radius || 30;
        const baseFreq = 25000 / safeRadius;
        const frequency = baseFreq + (intensity * 10);
        osc.frequency.setValueAtTime(frequency, now);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + 0.08);
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(this.audioCtx.destination); osc.start(now); osc.stop(now + 0.1);
    }
}
