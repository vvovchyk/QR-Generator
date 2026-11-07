import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "js" / "app.js"


class QRBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.page = self.browser.new_page(accept_downloads=True)
        self.page.set_content("""
            <form id="qrForm">
                <select id="qrType" name="qrType">
                    <option value="text">Text</option>
                    <option value="wifi">Wi-Fi</option>
                    <option value="vcard">vCard</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                </select>
                <div id="templateFields"></div>
                <select id="qrPreset">
                    <option value="screen">Screen</option>
                    <option value="print">Print</option>
                    <option value="natural">Natural</option>
                    <option value="custom">Custom</option>
                </select>
                <select id="qrSize">
                    <option value="200">200</option>
                    <option value="300" selected>300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                </select>
                <input id="darkColor" type="color" value="#172033">
                <input id="lightColor" type="color" value="#ffffff">
                <button type="submit">Make my QR code</button>
                <button id="downloadPngButton" type="button" disabled>Download PNG</button>
                <button id="downloadSvgButton" type="button" disabled>Download SVG</button>
                <button id="copyButton" type="button" disabled>Copy image</button>
                <button id="clearButton" type="button">Clear</button>
            </form>
            <div id="qrcode"></div>
            <p id="status" role="status"></p>
            <p id="contrastWarning" hidden></p>
            <div id="qrEngine"></div>
        """)
        self.page.add_script_tag(content="""
            window.__language = 'en';
            window.__languageHandlerCount = 0;
            window.SACK_OF_HACKS_I18N = {
                translate: (text) => window.__language === 'es' ? `[ES] ${text}` : text
            };
            const addEventListener = window.addEventListener.bind(window);
            window.addEventListener = (type, ...args) => {
                if (type === 'site-language-change') window.__languageHandlerCount += 1;
                return addEventListener(type, ...args);
            };
            window.QRCode = class {
                constructor(_container, options) {
                    window.__lastQrPayload = options.text;
                    this._oQRCode = {
                        getModuleCount: () => 3,
                        isDark: (row, column) => (row + column) % 2 === 0
                    };
                }
            };
            window.QRCode.CorrectLevel = { H: 2 };
        """)
        self.page.add_script_tag(path=str(APP))

    def tearDown(self):
        self.page.close()

    def test_language_change_keeps_wifi_values_and_only_registers_once(self):
        self.page.locator("#qrType").select_option("wifi")
        self.page.locator("#qrType").select_option("text")
        self.page.locator("#qrType").select_option("wifi")
        self.assertEqual(1, self.page.evaluate("window.__languageHandlerCount"))

        self.page.locator("#field-ssid").fill("Studio, West")
        self.page.locator("#field-password").fill(r"pa;ss\word")
        self.page.locator("#field-hidden").check()
        self.page.get_by_role("button", name="Make my QR code").click()
        self.page.evaluate("""
            window.__language = 'es';
            window.dispatchEvent(new Event('site-language-change'));
        """)

        self.assertEqual("Studio, West", self.page.locator("#field-ssid").input_value())
        self.assertEqual(r"pa;ss\word", self.page.locator("#field-password").input_value())
        self.assertTrue(self.page.locator("#field-hidden").is_checked())
        self.assertEqual("[ES] Network name (SSID)", self.page.locator("label[for=field-ssid]").inner_text())
        self.assertEqual(1, self.page.locator("#qrcode canvas").count())
        self.assertFalse(self.page.locator("#downloadPngButton").is_disabled())
        self.assertEqual("[ES] Your QR code is ready. Download a PNG or SVG, or copy the image.",
                         self.page.locator("#status").inner_text())
        self.assertEqual(
            r"WIFI:T:WPA;S:Studio\, West;P:pa\;ss\\word;H:true;;",
            self.page.evaluate("window.__lastQrPayload"),
        )

    def test_downloads_work_and_editing_invalidates_stale_qr(self):
        self.page.locator("#field-text").fill("https://example.com")
        self.page.get_by_role("button", name="Make my QR code").click()
        self.assertFalse(self.page.locator("#downloadPngButton").is_disabled())
        self.assertFalse(self.page.locator("#downloadSvgButton").is_disabled())

        with self.page.expect_download() as download:
            self.page.locator("#downloadSvgButton").click()
        self.assertEqual("qr-code.svg", download.value.suggested_filename)

        self.page.locator("#field-text").fill("https://example.org")
        self.assertTrue(self.page.locator("#downloadPngButton").is_disabled())
        self.assertTrue(self.page.locator("#downloadSvgButton").is_disabled())
        self.assertEqual(0, self.page.locator("#qrcode canvas").count())


if __name__ == "__main__":
    unittest.main()
