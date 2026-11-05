import json
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import urlparse

from scripts import build


class SEOPage(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.title = ""
        self.h1 = ""
        self.schema = ""
        self.current = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag in ("title", "h1"):
            self.current = tag
        elif tag == "script" and attrs.get("type") == "application/ld+json":
            self.current = "schema"

    def handle_endtag(self, tag):
        if tag in ("title", "h1", "script"):
            self.current = None

    def handle_data(self, data):
        if self.current:
            setattr(self, self.current, getattr(self, self.current) + data)

    def elements(self, tag):
        return [attrs for name, attrs in self.tags if name == tag]

    def metadata(self, key):
        return [attrs["content"] for attrs in self.elements("meta")
                if attrs.get("name", attrs.get("property")) == key]


class SEOTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        menu = json.loads((build.ROOT / "menu.json").read_text(encoding="utf-8"))
        template = (build.ROOT / "templates/index.html").read_text(encoding="utf-8")
        cls.page = SEOPage(build.render_page(template, menu))
        cls.schema = json.loads(cls.page.schema)

    def test_title_description_and_indexability(self):
        self.assertEqual(len(self.page.elements("title")), 1)
        self.assertTrue(20 <= len(self.page.title) <= 60)
        descriptions = self.page.metadata("description")
        self.assertEqual(len(descriptions), 1)
        self.assertTrue(100 <= len(descriptions[0]) <= 160)
        self.assertEqual(self.page.metadata("robots"), ["index, follow"])
        self.assertEqual(self.page.h1, self.schema["name"])
        self.assertEqual(len(self.page.elements("h1")), 1)
        self.assertEqual(self.page.elements("html")[0]["lang"], "en")
        self.assertEqual(self.page.metadata("viewport"), ["width=device-width, initial-scale=1.0"])

    def test_canonical_social_and_sitemap_urls_agree(self):
        canonical = [attrs["href"] for attrs in self.page.elements("link")
                     if attrs.get("rel") == "canonical"]
        self.assertEqual(canonical, [self.schema["url"]])
        self.assertTrue(canonical[0].startswith("https://"))
        self.assertEqual(self.page.metadata("og:url"), canonical)
        for key in ("og:title", "og:description", "og:image", "og:image:alt",
                    "twitter:card", "twitter:title", "twitter:description",
                    "twitter:image", "twitter:image:alt"):
            self.assertTrue(self.page.metadata(key), key)
        for key in ("og:image", "twitter:image"):
            url = urlparse(self.page.metadata(key)[0])
            self.assertEqual(url.netloc, urlparse(canonical[0]).netloc)
            self.assertTrue((build.ROOT / url.path.lstrip("/")).is_file())
        sitemap = ET.parse(build.ROOT / "sitemap.xml")
        urls = [node.text for node in sitemap.findall(".//{*}loc")]
        self.assertIn(canonical[0], urls)
        robots = (build.ROOT / "robots.txt").read_text(encoding="utf-8")
        self.assertIn("Allow: /", robots)
        self.assertNotIn("Disallow: /", robots)
        self.assertIn(f"Sitemap: {canonical[0]}sitemap.xml", robots)

    def test_local_business_schema_has_contact_hours_image_and_socials(self):
        self.assertEqual(self.schema["@type"], "Restaurant")
        self.assertEqual(self.schema["@context"], "https://schema.org")
        self.assertEqual(self.schema["image"], self.page.metadata("og:image")[0])
        self.assertEqual(self.schema["address"]["streetAddress"], "16 Hanover Street")
        hours = self.schema["openingHoursSpecification"][0]
        self.assertEqual(len(set(hours["dayOfWeek"])), 7)
        self.assertEqual((hours["opens"], hours["closes"]), ("11:00", "21:00"))
        links = [attrs.get("href") for attrs in self.page.elements("a")]
        self.assertIn("tel:" + self.schema["telephone"], links)
        for url in self.schema["sameAs"]:
            self.assertIn(url, links)

    def test_new_tab_links_explicitly_isolate_opener(self):
        for attrs in self.page.elements("a"):
            if attrs.get("target") == "_blank":
                self.assertIn("noopener", attrs.get("rel", "").split(), attrs["href"])

    def test_images_have_alt_text_and_food_photos_stay_under_budget(self):
        for attrs in self.page.elements("img"):
            self.assertTrue(attrs.get("alt", "").strip(), attrs["src"])
            path = build.ROOT / attrs["src"]
            self.assertTrue(path.is_file())
            self.assertLessEqual(path.stat().st_size, 300 * 1024, attrs["src"])
            if attrs.get("class") == "logo":
                self.assertTrue(attrs.get("width"))
                self.assertTrue(attrs.get("height"))
            else:
                self.assertEqual(attrs.get("loading"), "lazy")
                self.assertEqual(attrs.get("decoding"), "async")

    def test_404_is_not_indexed_and_does_not_redirect(self):
        page = SEOPage((build.ROOT / "404.html").read_text(encoding="utf-8"))
        self.assertEqual(page.metadata("robots"), ["noindex, follow"])
        self.assertFalse(any(attrs.get("http-equiv", "").lower() == "refresh"
                             for attrs in page.elements("meta")))
        self.assertIn("/#menu", [attrs.get("href") for attrs in page.elements("a")])


if __name__ == "__main__":
    unittest.main()
