export class PhysicsEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error("Container not found");

        // Matter.js aliases
        this.Engine = Matter.Engine;
        this.Render = Matter.Render;
        this.Runner = Matter.Runner;
        this.Bodies = Matter.Bodies;
        this.Body = Matter.Body;
        this.Composite = Matter.Composite;
        this.Events = Matter.Events;
        this.Vector = Matter.Vector;
        this.Sleeping = Matter.Sleeping;

        this.init();
    }

    init() {
        // Engine Setup
        this.engine = this.Engine.create({
            positionIterations: 20,
            velocityIterations: 20,
            enableSleeping: true
        });

        // Renderer Setup
        this.render = this.Render.create({
            element: this.container,
            engine: this.engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                pixelRatio: 1,
                background: 'transparent',
                wireframes: false
            }
        });

        // Runner Setup
        this.runner = this.Runner.create();

        // Environment (Walls)
        this.setupWalls();

        // Resize Handler
        window.addEventListener('resize', () => this.handleResize());

        // Garbage Collector
        this.startGarbageCollector();

        // Flush Hook
        this.isPitOpen = false;

        // Expose to window for debugging
        window.engine = this.engine;
    }

    start() {
        this.Runner.run(this.runner, this.engine);
        this.Render.run(this.render);
    }

    stop() {
        this.Runner.stop(this.runner);
        this.Render.stop(this.render);
    }

    setupWalls() {
        const wallOpts = { isStatic: true, render: { visible: false } };
        const width = window.innerWidth;
        const height = window.innerHeight;
        const thickness = 200;

        this.ground = this.Bodies.rectangle(width/2, height + 100, width, thickness, wallOpts);
        this.leftWall = this.Bodies.rectangle(-100, height/2, thickness, height * 5, wallOpts);
        this.rightWall = this.Bodies.rectangle(width + 100, height/2, thickness, height * 5, wallOpts);
        // Ceiling is optional depending on theme, but generally good to keep objects in
        this.ceiling = this.Bodies.rectangle(width/2, -1000, width, thickness, wallOpts);

        this.Composite.add(this.engine.world, [this.ground, this.leftWall, this.rightWall, this.ceiling]);
    }

    handleResize() {
        this.render.canvas.width = window.innerWidth;
        this.render.canvas.height = window.innerHeight;

        // Reposition walls
        this.Body.setPosition(this.ground, { x: window.innerWidth/2, y: window.innerHeight + 100 });
        this.Body.setPosition(this.rightWall, { x: window.innerWidth + 100, y: window.innerHeight/2 });
        // Update ground width
        // Note: Changing body geometry at runtime is tricky in Matter.js, usually easier to replace or scale.
        // For now, we assume simple repositioning is "good enough" or we might need to recreate them.
        // Actually, let's just scale the ground if needed.
    }

    clearWorld() {
        // Keeps walls, removes everything else
        const bodies = this.Composite.allBodies(this.engine.world);
        bodies.forEach(body => {
            if (!body.isStatic) {
                this.Composite.remove(this.engine.world, body);
            }
        });
    }

    flushPit() {
        if (this.isPitOpen) return;
        this.isPitOpen = true;

        // Remove ground
        this.Composite.remove(this.engine.world, this.ground);

        // Wake all bodies and push them down
        this.Composite.allBodies(this.engine.world).forEach(body => {
            if (!body.isStatic) {
                this.Sleeping.set(body, false);
                this.Body.setVelocity(body, { x: (Math.random() - 0.5) * 5, y: 15 });
            }
        });

        // Restore ground after delay
        setTimeout(() => {
            this.Body.setPosition(this.ground, { x: window.innerWidth / 2, y: window.innerHeight + 100 });
            this.Body.setVelocity(this.ground, { x: 0, y: 0 });
            this.Composite.add(this.engine.world, this.ground);
            this.isPitOpen = false;
        }, 5000);
    }

    startGarbageCollector() {
        setInterval(() => {
            const bodies = this.Composite.allBodies(this.engine.world);
            bodies.forEach(body => {
                if (body.position.y > window.innerHeight + 2000) {
                    this.Composite.remove(this.engine.world, body);
                }
            });
        }, 2000);
    }
}
