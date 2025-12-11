from playwright.sync_api import sync_playwright

def verify_audio_loader():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Subscribe to console events to see our custom log
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Navigating to Ducks & Toasters...")
        page.goto('http://localhost:8000/pages/ducks_toasters.html')

        # Check initial overlays
        click_overlay = page.locator('#click-overlay')
        status_overlay = page.locator('#status-overlay')

        if click_overlay.is_visible():
            print("Click Overlay is visible.")

        # Simulate click to enable audio
        print("Clicking overlay...")
        click_overlay.click()

        page.wait_for_timeout(1000)

        # Verify status logs for loading (Will fail in this env but we want to see the ATTEMPT logs)
        # We expect to see logs about failed loading in console

        # Inject Spawn
        print("Spawning items...")
        page.evaluate("spawnEvent('DebugUser')")

        page.wait_for_timeout(2000)

        page.screenshot(path='verification/debug_view.png')
        print("Screenshot saved to verification/debug_view.png")

        browser.close()

if __name__ == "__main__":
    verify_audio_loader()
