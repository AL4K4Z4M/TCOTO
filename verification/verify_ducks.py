from playwright.sync_api import sync_playwright

def verify_overlay():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("Testing OBS_COTO.html...")
        page.goto('http://localhost:8000/OBS_COTO.html')

        # Click Main Menu to open sidebar
        print("Clicking Main Menu...")
        page.click('.system-btn')

        # Wait for sidebar animation
        page.wait_for_timeout(1000)

        # Verify "Ducks & Toasters" is in the list
        print("Checking for Ducks & Toasters...")
        ducks_btn = page.locator('text=Ducks & Toasters')
        if ducks_btn.is_visible():
            print("FOUND: Ducks & Toasters button is visible.")
        else:
            print("ERROR: Ducks & Toasters button NOT found.")

        page.screenshot(path='verification/sidebar.png')

        # Now test the Ducks Page directly
        print("Testing Ducks Page...")
        page.goto('http://localhost:8000/pages/ducks_toasters.html')

        # Inject some spawns
        print("Injecting spawns...")
        page.evaluate("spawnEvent('DuckUser')")
        page.evaluate("spawnEvent('ToasterUser')")

        # Wait for physics to settle/render
        page.wait_for_timeout(2000)

        page.screenshot(path='verification/ducks_scene.png')
        print("Screenshots saved.")

        browser.close()

if __name__ == "__main__":
    verify_overlay()
