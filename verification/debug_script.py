
import os
from playwright.sync_api import sync_playwright

def check_page_errors(page_path):
    print(f"Checking {page_path}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))

        # Capture page errors (uncaught exceptions)
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Capture failed requests
        page.on("requestfailed", lambda req: print(f"REQUEST FAILED: {req.url} - {req.failure}"))

        try:
            # We use absolute file path for loading
            abs_path = os.path.abspath(page_path)
            url = f"file://{abs_path}"
            print(f"Loading URL: {url}")

            page.goto(url)

            # Wait a bit for potential load events/scripts
            page.wait_for_timeout(3000)

            # Screenshot to see what's happening
            screenshot_path = f"verification/debug_{os.path.basename(page_path)}.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"SCRIPT EXCEPTION: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    # Check Main Menu
    check_page_errors("obs_tcoto.html")

    # Check Ballpit as a sample overlay
    check_page_errors("pages/ballpit/ballpit.html")
