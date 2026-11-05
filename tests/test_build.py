import copy
import json
import re
import tempfile
import unittest
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch

from scripts import build


class PageParser(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = []
        self.links = []
        self.scripts = []
        self.in_schema = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.in_schema = True

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_schema = False

    def handle_data(self, data):
        if self.in_schema:
            self.scripts.append(data)


class MenuBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.current_menu = json.loads((build.ROOT / "menu.json").read_text(encoding="utf-8"))
        cls.template = (build.ROOT / "templates/index.html").read_text(encoding="utf-8")
        cls.fixture = {
            "sections": [{
                "id": "noodlesoup",
                "name": "Noodle Soup",
                "nav_label": "Noodle Soup",
                "mobile_label": "Soup",
                "description": "Test category",
                "columns": [
                    {"title": "", "items": [
                        {
                            "id": "kua-teaw", "name": "Noodle Soup",
                            "description": "Test noodle soup",
                            "prices": [{"label": "M", "amount": "12.00"},
                                       {"label": "L", "amount": "14.00"}],
                            "rating": "98% (84)", "popular_order": 1,
                            "image": {"src": "images/logo.jpg", "alt": "Test soup"},
                        },
                        {
                            "id": "spicy-soup", "name": "Spicy Soup",
                            "description": "Test spicy soup", "spice": "Hot Spicy",
                            "prices": [{"label": "", "amount": "15.00"}],
                        },
                    ]},
                    {"title": "More soups", "items": [{
                        "id": "laksa", "name": "Laksa", "description": "Test laksa",
                        "prices": [{"label": "", "amount": "18.00"}],
                        "popular_order": 2,
                        "image": {"src": "images/logo.jpg", "alt": "Test laksa"},
                    }]},
                ],
            }],
        }

    def setUp(self):
        self.menu = copy.deepcopy(self.fixture)
        self.items = build.menu_items(self.menu)
        self.featured = next(item for item in self.items if "popular_order" in item)

    def render(self):
        return build.render_page(self.template, self.menu)

    def schema(self, page):
        return json.loads("".join(PageParser(page).scripts))["hasMenu"]

    def assert_complete_render(self):
        page = self.render()
        parsed = PageParser(page)
        schema = self.schema(page)
        self.assertNotIn("<!-- MENU_", page)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        self.assertIn("menu", parsed.ids)
        self.assertEqual(len(schema["hasMenuSection"]), len(self.menu["sections"]))
        for section, structured in zip(self.menu["sections"], schema["hasMenuSection"]):
            self.assertEqual(structured["name"], section["name"])
            items = [item for column in section["columns"] for item in column["items"]]
            self.assertEqual(len(structured["hasMenuItem"]), len(items))
            for item, entry in zip(items, structured["hasMenuItem"]):
                self.assertIn("item-" + item["id"], parsed.ids)
                self.assertIn(escape(item["name"]), page)
                self.assertEqual(entry["name"], item["name"])
                self.assertEqual([offer["price"] for offer in entry["offers"]],
                                 [price["amount"] for price in item["prices"]])
                self.assertTrue(all(offer["priceCurrency"] == "NZD" for offer in entry["offers"]))

    def test_all_items_render_as_static_html_and_structured_data(self):
        self.assert_complete_render()

    def test_current_menu_renders_completely(self):
        self.menu = copy.deepcopy(self.current_menu)
        self.assert_complete_render()

    def test_single_edit_updates_full_menu_popular_card_and_schema(self):
        self.featured["name"] = "Updated dish"
        self.featured["description"] = "Updated description"
        self.featured["rating"] = "95% (100)"
        self.featured["prices"][-1]["amount"] = "23.45"
        page = self.render()
        self.assertEqual(page.count("$23.45"), 2)
        self.assertIn("<h3>Updated dish</h3>", page)
        self.assertIn('<p class="item-name">Updated dish</p>', page)
        self.assertEqual(page.count("Updated description"), 3)
        self.assertEqual(page.count("95% (100)"), 2)
        entry = self.schema(page)["hasMenuSection"][0]["hasMenuItem"][0]
        self.assertEqual(entry["offers"][-1]["price"], "23.45")

    def test_featured_cards_have_canonical_content_and_size(self):
        page = self.render()
        ids = re.findall(r'class="menu-item" id="item-([^"]+)-popular"', page)
        featured = sorted((i for i in self.items if "popular_order" in i),
                          key=lambda i: i["popular_order"])
        self.assertEqual(ids, [item["id"] for item in featured])
        self.assertIn("<span>L $14.00 &bull; 98% (84)</span>", page)
        self.assertIn('id="item-laksa"', page)
        self.assertIn('id="item-laksa-popular"', page)

    def test_carousel_controls_are_hidden_until_javascript_initializes(self):
        page = self.render()
        self.assertIn('class="popular-carousel"', page)
        self.assertIn('class="menu-grid carousel-track"', page)
        self.assertIn('class="carousel-controls" hidden', page)
        self.assertNotIn('carousel-prev', page)
        self.assertNotIn('carousel-next', page)
        self.assertNotIn('carousel-toggle', page)
        self.assertNotIn('carousel-status', page)
        featured = sorted((i for i in self.items if "popular_order" in i),
                          key=lambda i: i["popular_order"])
        targets = re.findall(r'class="carousel-dot".*?aria-controls="([^"]+)"', page)
        self.assertEqual(targets, [f'item-{item["id"]}-popular' for item in featured])
        for item in featured:
            self.assertIn(f'aria-label="Show {escape(item["name"])}"', page)
        self.assertNotIn('aria-hidden="true"', build.render_popular(self.items))

    def test_one_featured_dish_is_still_rendered(self):
        self.items[-1].pop("popular_order")
        page = self.render()
        self.assertEqual(len(re.findall(r'class="menu-item" id=', page)), 1)
        self.assertIn('id="item-kua-teaw-popular"', page)
        self.assertEqual(page.count('class="carousel-dot"'), 1)

    def test_plain_text_is_escaped_in_html_and_json_script(self):
        value = 'A & B "</script><script>alert(1)</script>'
        self.featured["name"] = value
        self.featured["description"] = value
        self.featured["image"]["alt"] = value
        page = self.render()
        self.assertIn(escape(value), page)
        self.assertNotIn("</script><script>alert(1)</script>", page)
        entry = self.schema(page)["hasMenuSection"][0]["hasMenuItem"][0]
        self.assertEqual(entry["name"], value)

    def test_all_fragment_links_point_to_existing_anchors(self):
        parsed = PageParser(self.render())
        for link in parsed.links:
            if link.startswith("#"):
                self.assertIn(link[1:], parsed.ids)

    def test_new_category_generates_both_navigation_menus(self):
        self.menu["sections"].append({
            "id": "specials", "name": "Today's Specials", "nav_label": "Specials",
            "mobile_label": "Specials", "columns": [{"items": [{
                "id": "special-dish", "name": "Special Dish",
                "prices": [{"label": "", "amount": "10.00"}],
            }]}],
        })
        page = self.render()
        self.assertEqual(page.count('<a href="#specials">Specials</a>'), 2)
        self.assertIn('id="item-special-dish"', page)
        self.assertEqual(self.schema(page)["hasMenuSection"][-1]["name"], "Today's Specials")

    def test_removing_popular_flags_leaves_no_dead_navigation(self):
        for item in self.items:
            item.pop("popular_order", None)
        page = self.render()
        self.assertNotIn('id="popular"', page)
        self.assertNotIn('href="#popular"', page)
        self.assertNotIn('class="popular-carousel"', page)
        self.assertIn('id="item-kua-teaw"', page)

    def test_optional_fields_can_be_omitted(self):
        self.featured.pop("description")
        self.featured.pop("rating")
        page = self.render()
        self.assertIn('id="item-kua-teaw-popular"', page)
        self.assertIn('<span>L $14.00</span>', page)

    def test_spice_stays_emphasized(self):
        page = self.render()
        for item in self.items:
            if item.get("spice"):
                self.assertIn(f'<strong>{escape(item["spice"])}</strong>', page)

    def test_missing_or_duplicate_template_markers_fail(self):
        for replacement in ("", "<!-- MENU_CONTENT --><!-- MENU_CONTENT -->"):
            with self.subTest(replacement=replacement), self.assertRaisesRegex(ValueError, "exactly one"):
                build.render_page(self.template.replace("<!-- MENU_CONTENT -->", replacement), self.menu)

    def test_invalid_prices_fail_with_item_context(self):
        for amount in ("$14.00", "14", "14.001", "-1.00", "0.00", "NaN", 14, None):
            with self.subTest(amount=amount):
                self.featured["prices"][0]["amount"] = amount
                with self.assertRaisesRegex(ValueError, "kua-teaw.*price"):
                    self.render()

    def test_duplicate_ids_fail(self):
        self.items[1]["id"] = self.featured["id"]
        with self.assertRaisesRegex(ValueError, "Duplicate id"):
            self.render()

    def test_card_id_collisions_fail(self):
        self.items[1]["id"] = self.featured["id"] + "-popular"
        with self.assertRaisesRegex(ValueError, "Duplicate id"):
            self.render()

    def test_duplicate_price_labels_fail(self):
        self.featured["prices"][1]["label"] = self.featured["prices"][0]["label"]
        with self.assertRaisesRegex(ValueError, "duplicate price label"):
            self.render()

    def test_duplicate_popular_orders_fail(self):
        self.items[1]["popular_order"] = self.featured["popular_order"]
        with self.assertRaisesRegex(ValueError, "Duplicate popular_order"):
            self.render()

    def test_invalid_popular_orders_fail(self):
        for order in (True, 0, -1, "1"):
            with self.subTest(order=order):
                self.featured["popular_order"] = order
                with self.assertRaisesRegex(ValueError, "popular_order"):
                    self.render()

    def test_missing_popular_image_fails(self):
        del self.featured["image"]
        with self.assertRaisesRegex(ValueError, "need an image"):
            self.render()

    def test_missing_or_external_images_fail(self):
        for src in ("images/missing.png", "../images/logo.jpg", "https://example.com/image.jpg", "."):
            with self.subTest(src=src):
                self.featured["image"]["src"] = src
                with self.assertRaisesRegex(ValueError, "existing file inside images"):
                    self.render()

    def test_invalid_menu_shapes_fail_explicitly(self):
        for menu in ([], {}, {"sections": []}, {"sections": [None]}):
            with self.subTest(menu=menu), self.assertRaises(ValueError):
                build.render_page(self.template, menu)

    def test_build_output_contains_only_publishable_static_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "site"
            with patch.object(build, "OUTPUT", destination):
                build.build()
            self.assertTrue((destination / ".nojekyll").is_file())
            self.assertEqual((destination / "CNAME").read_bytes(),
                             (build.ROOT / "CNAME").read_bytes())
            self.assertTrue((destination / "images" / "logo.jpg").is_file())
            self.assertTrue((destination / "404.html").is_file())
            page = (destination / "index.html").read_text(encoding="utf-8")
            parsed = PageParser(page)
            self.assertIn("menu", parsed.ids)
            for item in build.menu_items(self.current_menu):
                self.assertIn("item-" + item["id"], parsed.ids)
            for private in ("menu.json", "scripts", "templates", "tests", ".github", "README.md"):
                self.assertFalse((destination / private).exists())


if __name__ == "__main__":
    unittest.main()
