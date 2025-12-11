from playwright.sync_api import sync_playwright

def verify_ducks_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Subscribe to console events to catch errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Subscribe to request failed events
        page.on("requestfailed", lambda request: print(f"FAILED: {request.url} {request.failure}"))

        print("Navigating to Ducks & Toasters...")
        page.goto('http://localhost:8000/pages/ducks_toasters.html')

        # Inject spawns to trigger audio loading and rendering
        print("Spawning items...")
        for i in range(5):
            page.evaluate(f"spawnEvent('Duck_{i}')")
            page.evaluate(f"spawnEvent('Toaster_{i}')")
            page.wait_for_timeout(200)

        # Allow time for physics and potential audio loads
        page.wait_for_timeout(2000)

        # Check for size variation
        # We can extract the bounds of the bodies from the Matter.js engine via evaluate
        sizes = page.evaluate("""() => {
            const bodies = Matter.Composite.allBodies(engine.world);
            return bodies.map(b => {
                const bounds = b.bounds;
                return {
                    type: b.bodyType,
                    width: bounds.max.x - bounds.min.x,
                    height: bounds.max.y - bounds.min.y
                };
            }).filter(b => b.type); // Filter out walls
        }""")

        print("\nObject Sizes:")
        for s in sizes:
            print(f"{s['type']}: {s['width']:.2f} x {s['height']:.2f}")

        # Basic check for variation
        duck_widths = [s['width'] for s in sizes if s['type'] == 'duck']
        if len(set(duck_widths)) > 1:
            print("\nSUCCESS: Duck sizes vary.")
        else:
            print("\nWARNING: All ducks have the same size.")

        page.screenshot(path='verification/ducks_variation.png')
        print("Screenshot saved to verification/ducks_variation.png")

        browser.close()

if __name__ == "__main__":
    verify_ducks_fix()
