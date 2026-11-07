import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "index.html").read_text(encoding="utf-8")
APP = (ROOT / "js/app.js").read_text(encoding="utf-8")


class QRPageTests(unittest.TestCase):
    def test_page_is_english_and_uses_shared_site_localization(self):
        self.assertIn('<html lang="en">', PAGE)
        self.assertIn('href="https://sackofhacks.com/static/site.css?v=17"', PAGE)
        self.assertIn('href="./css/style.css?v=3"', PAGE)
        for language in ("es", "it", "pl", "nb"):
            self.assertIn(f"https://sackofhacks.com/static/{language}.js", PAGE)
        self.assertIn("https://sackofhacks.com/static/i18n.js", PAGE)
        self.assertIn('src="./js/app.js"', PAGE)
        self.assertIn("Make my QR code", PAGE)

    def test_page_navigation_returns_to_sack_of_hacks(self):
        navigation = PAGE.split('<nav class="top-links"', 1)[1].split("</nav>", 1)[0]
        self.assertEqual(
            [
                "https://sackofhacks.com/",
                "https://sackofhacks.com/donate.html",
                "https://sackofhacks.com/contact.html",
            ],
            re.findall(r'href="([^"]+)"', navigation),
        )

    def test_qr_generator_keeps_template_and_download_features(self):
        for feature in (
            "wifi:",
            "vcard:",
            "email:",
            "phone:",
            "sms:",
            "downloadPngButton",
            "downloadSvgButton",
            "copyButton",
            "createSvg",
            "drawQrCanvas",
        ):
            with self.subTest(feature=feature):
                self.assertIn(feature, APP)


if __name__ == "__main__":
    unittest.main()
