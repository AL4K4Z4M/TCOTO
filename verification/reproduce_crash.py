
import os
from playwright.sync_api import sync_playwright

def inject_bad_data_and_check(page_path):
    print(f"Testing {page_path} with CORRUPT localStorage...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context that lets us modify storage
        context = browser.new_context()

        # Pre-seed local storage with garbage
        # We need to load a page first to set local storage for the origin
        # Since we use file://, we need to be careful.
        # Actually, for file:// urls, local storage is often isolated or restricted.
        # But let's try to simulate the condition by using page.evaluate on load.

        page = context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        abs_path = os.path.abspath(page_path)
        url = f"file://{abs_path}"

        # Navigate
        print(f"Loading URL: {url}")

        # We use a script to inject bad data BEFORE the window.load event fires if possible.
        # But window.load fires after parsing.
        # The best way is to inject a script that writes to localStorage immediately.

        bad_settings = '{"statModules": "THIS_IS_NOT_AN_ARRAY", "masterStats": true}'

        # We can't easily set localStorage for file:// before load in Playwright without a domain.
        # But we can try to mock localStorage.getItem to return garbage.

        page.add_init_script(f"""
            const originalGetItem = Storage.prototype.getItem;
            Storage.prototype.getItem = function(key) {{
                if (key === 'tcoto_settings') {{
                    console.log("Mocking corrupt localStorage for tcoto_settings");
                    return '{bad_settings}';
                }}
                return originalGetItem.call(this, key);
            }};
        """)

        page.goto(url)

        page.wait_for_timeout(2000)

        # Check if the "Stat Bar" text is visible (it's part of the main menu HTML)
        # If JS crashed, the menu might be stuck in a weird state, or if we are right, the menu is visible by HTML default.
        # But if the JS crashed during renderStatSettings, the dynamic list won't be populated.

        screenshot_path = f"verification/crash_test_{os.path.basename(page_path)}.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    inject_bad_data_and_check("obs_tcoto.html")
