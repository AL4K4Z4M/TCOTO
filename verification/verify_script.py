from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Verify obs_tcoto.html
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        try:
            print("Loading obs_tcoto.html...")
            response = page.goto("http://localhost:8080/obs_tcoto.html")
            print(f"Status: {response.status}")

            # Wait for content to load
            page.wait_for_selector("body", timeout=5000)

            # Screenshot main page
            page.screenshot(path="verification/obs_tcoto_main.png")
            print("Screenshot saved: verification/obs_tcoto_main.png")

        except Exception as e:
            print(f"Error checking obs_tcoto.html: {e}")

        # 2. Verify liquid_sim.html
        page2 = browser.new_page(viewport={"width": 800, "height": 600})
        try:
            print("Loading liquid_simulation/liquid_sim.html...")
            response = page2.goto("http://localhost:8080/liquid_simulation/liquid_sim.html")
            print(f"Status: {response.status}")

            # Capture console logs to check for errors
            page2.on("console", lambda msg: print(f"Console: {msg.text}"))
            page2.on("pageerror", lambda err: print(f"PageError: {err}"))

            # Wait a bit for simulation to start
            page2.wait_for_timeout(2000)

            # Screenshot sim
            page2.screenshot(path="verification/liquid_sim.png")
            print("Screenshot saved: verification/liquid_sim.png")

        except Exception as e:
            print(f"Error checking liquid_sim.html: {e}")

        browser.close()

if __name__ == "__main__":
    verify_changes()
