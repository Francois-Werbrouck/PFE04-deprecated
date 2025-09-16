# backend/selenium_runner.py
import os, time
from typing import Dict, List, Tuple
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

SELENIUM_REMOTE_URL = os.getenv("SELENIUM_REMOTE_URL", "http://localhost:4444/wd/hub")

def run_selenium(params: dict) -> Tuple[bool, str, List[Dict]]:
    url = params.get("url") or "https://example.org"
    caps = DesiredCapabilities.CHROME.copy()
    driver = webdriver.Remote(command_executor=SELENIUM_REMOTE_URL, desired_capabilities=caps)
    try:
        driver.get(url)
        time.sleep(1.0)
        title = driver.title
        logs = [f"[SELENIUM] Remote {SELENIUM_REMOTE_URL}",
                f"[SELENIUM] URL: {url}",
                f"[SELENIUM] Title: {title!r}",
                "[SELENIUM] SUCCESS"]
        return True, "\n".join(logs)+"\n", []
    except Exception as e:
        return False, f"[SELENIUM] ERREUR: {e}\n", []
    finally:
        try: driver.quit()
        except Exception: pass
