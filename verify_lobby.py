from playwright.sync_api import sync_playwright
import time

def verify_lobby():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        context = browser.new_context(permissions=['camera', 'microphone'])
        page = context.new_page()

        print("Navigating to test lobby...")
        page.goto("http://localhost:3000/test-lobby")

        # Wait for content to load
        try:
            page.wait_for_selector("text=Waiting to join", timeout=10000)
            print("Found text 'Waiting to join'")
        except:
            print("Timeout waiting for text. Saving page source...")
            with open("page_source.html", "w") as f:
                f.write(page.content())

        # Take screenshot
        output_path = "/home/jules/verification/lobby_verification.png"
        page.screenshot(path=output_path)
        print(f"Screenshot saved to {output_path}")

        browser.close()

if __name__ == "__main__":
    verify_lobby()
