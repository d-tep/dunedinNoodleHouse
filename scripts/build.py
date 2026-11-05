"""Build the GitHub Pages site using only the Python standard library."""

import json
import re
import shutil
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
ID_PATTERN = re.compile(r"[a-z][a-z0-9-]*")
PRICE_PATTERN = re.compile(r"(?:0|[1-9][0-9]*)\.[0-9]{2}")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value, context, allow_empty=False):
    require(isinstance(value, str), f"{context} must be text")
    require(allow_empty or bool(value.strip()), f"{context} cannot be empty")


def validate_menu(menu):
    require(isinstance(menu, dict), "Menu must be an object")
    sections = menu.get("sections")
    require(isinstance(sections, list) and sections, "Menu needs sections")
    ids = {"menu", "popular", "contact", "hamburger", "nav-links", "navorderbutton",
           "backToTop", "restaurant", "icon-facebook", "icon-instagram"}
    popular_orders = set()

    def unique_id(value, prefix, context, suffix=""):
        require(isinstance(value, str) and ID_PATTERN.fullmatch(value),
                f"{context} needs a lowercase, hyphenated id")
        rendered_id = prefix + value + suffix
        require(rendered_id not in ids, f"Duplicate id: {rendered_id}")
        ids.add(rendered_id)

    for section in sections:
        require(isinstance(section, dict), "Each section must be an object")
        unique_id(section.get("id"), "", "Section")
        context = f"Section {section['id']}"
        for field in ("name", "nav_label", "mobile_label"):
            text(section.get(field), f"{context}.{field}")
        text(section.get("description", ""), f"{context}.description", allow_empty=True)
        columns = section.get("columns")
        require(isinstance(columns, list) and 1 <= len(columns) <= 2,
                f"{context} needs one or two columns")
        for column in columns:
            require(isinstance(column, dict), f"{context}: column must be an object")
            text(column.get("title", ""), f"{context}: column title", allow_empty=True)
            items = column.get("items")
            require(isinstance(items, list) and items, f"{context}: column needs items")
            for item in items:
                require(isinstance(item, dict), f"{context}: item must be an object")
                unique_id(item.get("id"), "item-", context)
                item_context = f"{context}, item {item['id']}"
                text(item.get("name"), f"{item_context}.name")
                for field in ("description", "rating", "spice"):
                    text(item.get(field, ""), f"{item_context}.{field}", allow_empty=True)
                prices = item.get("prices")
                require(isinstance(prices, list) and prices, f"{item_context} needs prices")
                labels = set()
                for price in prices:
                    require(isinstance(price, dict), f"{item_context}: price must be an object")
                    label, amount = price.get("label"), price.get("amount")
                    text(label, f"{item_context}: price label", allow_empty=True)
                    require(label not in labels, f"{item_context}: duplicate price label {label!r}")
                    labels.add(label)
                    require(isinstance(amount, str) and PRICE_PATTERN.fullmatch(amount)
                            and amount != "0.00",
                            f"{item_context}: price must be a positive string like \"14.00\"")
                require(len(prices) == 1 or "" not in labels,
                        f"{item_context}: multiple prices need size labels")
                if "popular_order" in item:
                    order = item["popular_order"]
                    require(type(order) is int and order > 0,
                            f"{item_context}: popular_order must be a positive integer")
                    require(order not in popular_orders, f"Duplicate popular_order: {order}")
                    popular_orders.add(order)
                    unique_id(item["id"], "item-", item_context + " popular", suffix="-popular")
                    require("image" in item, f"{item_context}: popular dishes need an image")
                if "image" in item:
                    image = item["image"]
                    require(isinstance(image, dict), f"{item_context}: image must be an object")
                    text(image.get("src"), f"{item_context}: image src")
                    text(image.get("alt"), f"{item_context}: image alt")
                    path = Path(image["src"])
                    require(not path.is_absolute() and ".." not in path.parts
                            and path.parts[:1] == ("images",) and (ROOT / path).is_file(),
                            f"{item_context}: image must be an existing file inside images/")


def menu_items(menu):
    return [item for section in menu["sections"]
            for column in section["columns"] for item in column["items"]]


def price_text(price):
    label = f"{escape(price['label'])} " if price["label"] else ""
    return f"{label}${price['amount']}"


def description(item):
    result = escape(item.get("description", ""))
    if item.get("spice"):
        result += f" <strong>{escape(item['spice'])}</strong>"
    return result.strip()


def render_popular(items):
    cards = []
    dots = []
    for item in sorted((i for i in items if "popular_order" in i),
                       key=lambda i: i["popular_order"]):
        image = item["image"]
        # Use the final size in the same price list, rather than a second price.
        price = price_text(item["prices"][-1])
        rating = f" &bull; {escape(item['rating'])}" if item.get("rating") else ""
        cards.append(f"""<div class="menu-item" id="item-{item['id']}-popular">
    <img src="{escape(image['src'])}" alt="{escape(image['alt'])}">
    <h3>{escape(item['name'])}</h3>
    <p>{description(item)}</p>
    <span>{price}{rating}</span>
</div>""")
        dots.append(
            f'<button type="button" class="carousel-dot" '
            f'aria-label="Show {escape(item["name"])}" '
            f'aria-controls="item-{item["id"]}-popular" aria-current="false"></button>'
        )
    if not cards:
        return ""
    return """<section id="popular" class="menu-section">
    <div class="container">
        <h2 class="section-title">Most Popular</h2>
        <p style="margin: 0 0 14px; color:#666;">New here? These are the dishes our customers love most.</p>
        <div class="popular-carousel">
            <div class="carousel-viewport">
                <div class="menu-grid carousel-track">
""" + "\n".join(cards) + """
                </div>
            </div>
            <div class="carousel-controls" hidden>
                <div class="carousel-dots" role="group" aria-label="Choose a featured dish">
""" + "\n".join(dots) + """
                </div>
            </div>
        </div>
    </div>
</section>"""


def render_sections(menu):
    sections = []
    for index, section in enumerate(menu["sections"]):
        columns = []
        for column in section["columns"]:
            title = (f'<h3 class="column-title">{escape(column["title"])}</h3>'
                     if column.get("title") else "")
            items = []
            for item in column["items"]:
                desc = f'<p class="item-desc">{description(item)}</p>' if description(item) else ""
                rating = (f'<p class="item-rating">{escape(item["rating"])}</p>'
                          if item.get("rating") else "")
                prices = " ".join(price_text(price) for price in item["prices"])
                items.append(f"""<div class="list-item" id="item-{item['id']}">
    <div class="item-info">
        <p class="item-name">{escape(item['name'])}</p>
        {desc}
    </div>
    <div class="item-meta">
        <p class="item-price">{prices}</p>
        {rating}
    </div>
</div>""")
            columns.append('<div class="menu-column">\n' + title + "\n" +
                           "\n".join(items) + "\n</div>")
        desc = (f'<p style="margin: 0 0 14px; color:#666;">{escape(section["description"])}</p>'
                if section.get("description") else "")
        alt = " alt" if index % 2 == 0 else ""
        sections.append(f"""<section id="{section['id']}" class="menu-section{alt}">
    <div class="container">
        <h2 class="section-title">{escape(section['name'])}</h2>
        {desc}
        <div class="two-column-menu">
""" + "\n".join(columns) + "\n        </div>\n    </div>\n</section>")
    return "\n".join(sections)


def menu_schema(menu):
    return {
        "@type": "Menu",
        "@id": "https://dunedinnoodlehouse.online/#menu",
        "name": "Dunedin Noodle House Menu",
        "url": "https://dunedinnoodlehouse.online/#menu",
        "hasMenuSection": [
            {
                "@type": "MenuSection",
                "name": section["name"],
                "hasMenuItem": [
                    {
                        "@type": "MenuItem",
                        "name": item["name"],
                        "description": " ".join(filter(None, [
                            item.get("description", ""), item.get("spice", "")
                        ])),
                        "offers": [
                            {
                                "@type": "Offer",
                                "name": price["label"] or "Standard",
                                "price": price["amount"],
                                "priceCurrency": "NZD",
                            }
                            for price in item["prices"]
                        ],
                    }
                    for column in section["columns"] for item in column["items"]
                ],
            }
            for section in menu["sections"]
        ],
    }


def render_page(template, menu):
    validate_menu(menu)
    items = menu_items(menu)
    popular = render_popular(items)
    replacements = {
        "<!-- MENU_CONTENT -->": popular + "\n" + render_sections(menu),
        "<!-- MENU_SCHEMA -->": json.dumps(menu_schema(menu), ensure_ascii=False,
                                          indent=2).replace("<", "\\u003c"),
    }
    for mode, field in (("MOBILE", "mobile_label"), ("DESKTOP", "nav_label")):
        links = [f'<a href="#{section["id"]}">{escape(section[field])}</a>'
                 for section in menu["sections"]]
        replacements[f"<!-- MENU_NAV_{mode} -->"] = "\n".join(links)
    for marker, content in replacements.items():
        require(template.count(marker) == 1, f"Template must contain exactly one {marker}")
        template = template.replace(marker, content, 1)
    if not popular:
        template = re.sub(r'\s*<a href="#popular">[^<]+</a>', "", template)
    return template


def build():
    menu = json.loads((ROOT / "menu.json").read_text(encoding="utf-8"))
    template = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    page = render_page(template, menu)
    OUTPUT.mkdir(exist_ok=True)
    for filename in ("style.css", "script.js", "404.html", "robots.txt", "sitemap.xml", "CNAME"):
        shutil.copy2(ROOT / filename, OUTPUT / filename)
    shutil.copytree(ROOT / "images", OUTPUT / "images", dirs_exist_ok=True)
    (OUTPUT / "index.html").write_text(page, encoding="utf-8")
    (OUTPUT / ".nojekyll").touch()
    print(f"Built {len(menu_items(menu))} menu items into {OUTPUT}")


if __name__ == "__main__":
    try:
        build()
    except (OSError, ValueError) as error:
        raise SystemExit(f"Site build failed: {error}")
