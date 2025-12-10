from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        # Load the OBS_COTO.html file
        # We need absolute path for file://
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/OBS_COTO.html")

        # Wait for the main menu wrapper to be active (it has class active by default in the file)
        # But let's give it a moment to render the fonts and everything
        page.wait_for_timeout(1000)

        # Take a screenshot of the whole screen
        page.screenshot(path="verification/verification_obs_coto.png")

        # Also let's try to verify the ballpit page load
        page.goto(f"file://{cwd}/pages/ballpit.html")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/verification_ballpit.png")

        browser.close()

if __name__ == "__main__":
    run()
