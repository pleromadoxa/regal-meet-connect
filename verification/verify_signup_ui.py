from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_auth_page(page: Page):
    # 1. Go to the auth page
    print("Navigating to http://localhost:3000/auth")
    page.goto("http://localhost:3000/auth")

    # Wait for the page to load
    page.wait_for_selector("text=Regal Meet")

    # 2. Switch to Create Account
    print("Switching to 'Create Account' mode")
    signup_button = page.get_by_role("button", name="Don't have an account? Sign up")
    signup_button.click()

    # 3. Verify 'Create Account' title is visible
    expect(page.get_by_role("heading", name="Create Account")).to_be_visible()

    # 4. Fill in the form
    print("Filling in the registration form")
    page.get_by_placeholder("Enter your display name").fill("Test User")
    page.get_by_placeholder("Enter your email").fill("testuser@example.com")
    page.get_by_placeholder("Enter your password").fill("password123")

    # 5. Take a screenshot of the filled form
    print("Taking screenshot of the form")
    page.screenshot(path="verification/signup_form.png")

    # Note: We cannot actually submit the form because it would hit the real Supabase API
    # and fail due to environment/credentials issues in the sandbox.
    # We've verified the UI state and the code logic in previous steps.

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_auth_page(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
