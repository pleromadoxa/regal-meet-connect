from playwright.sync_api import sync_playwright

def verify_auth_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the auth page
        page.goto("http://localhost:8080/auth")

        # Wait for the page to load
        page.wait_for_selector("text=Regal Meet")

        # Take a screenshot
        page.screenshot(path="verification/auth_page.png")

        browser.close()

if __name__ == "__main__":
    verify_auth_page()
