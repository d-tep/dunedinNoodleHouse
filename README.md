# Dunedin Noodle House

A static GitHub Pages website. All dishes live in **[menu.json](menu.json)**.
A small Python build generates the full menu, popular dishes, navigation, and
search-engine menu data as HTML. No server, npm packages, or JavaScript is needed
to display the menu.

## Updating the menu

1. Open [menu.json](menu.json) on GitHub and click the pencil to edit.
2. Find a dish by its `name` and update its details.
3. Commit the change to `main` (or merge a pull request).
4. The **Build and deploy static site** workflow validates the data and publishes
   the update. Check the repository's **Actions** tab if it fails; an invalid menu
   prevents deployment rather than replacing the live site.

A typical dish looks like this:

```json
{
  "id": "chicken-satay",
  "name": "Chicken Satay",
  "description": "Chicken with peanut satay sauce, served with rice.",
  "prices": [
    { "label": "M", "amount": "14.00" },
    { "label": "L", "amount": "16.00" }
  ],
  "rating": "97% (212)",
  "popular_order": 2,
  "image": {
    "src": "images/chickenSatay.png",
    "alt": "Chicken satay with peanut sauce"
  }
}
```

- **Prices:** use quoted NZD amounts with two decimal places, without `$`.
  For a single price, use `"prices": [{ "label": "", "amount": "7.00" }]`.
- **Popular dishes:** add a unique positive `popular_order` and an `image` to
  feature a dish. Its name, description, rating, and price come from this same
  entry. The card shows the **last price** in its price list (currently the large
  size for sized dishes), including the size label. Remove `popular_order` to
  stop featuring it.
- **Ratings:** `rating` is optional and manually maintained; it is not live Uber
  Eats data. Delete it if you do not want to display it.
- **Spice:** optional `spice` text is displayed in bold after the description.
- **Images:** upload photos into [images/](images/) and use their relative paths.
  Popular dishes require an existing image and descriptive `alt` text.
- **Adding/removing dishes:** copy/delete an item in a column's `items` array.
  Give each new dish a unique lowercase, hyphenated `id`. Keep existing IDs
  stable so links to dishes keep working.
- **Categories:** sections and their columns appear in file order. Each section
  has an `id`, `name`, `nav_label`, `mobile_label`, optional `description`, and one
  or two `columns`. Each column has an optional `title` and an `items` array.
  Navigation is generated automatically when categories change.
- Use plain text, not HTML, in menu fields. JSON requires double quotes, commas
  between entries, and no trailing commas or comments.

The migration retains the existing prices and ratings. Laksa, previously only
shown in the popular cards, is also listed under noodle soups. Featured cards
now use the full-menu name and description rather than separately edited copies.
The previously hardcoded structured-data price is replaced with actual menu
prices.

Website edits do **not** update your Uber Eats listing.

## Featured carousel

The Most Popular carousel uses dishes with `popular_order`, in that order. With
two or more featured dishes it advances by one dish every ten seconds while
visible. Desktop screens (900px and wider) show two dishes side by side; smaller
screens show one. The first dish appears beside the last when wrapping around.
Visitors can swipe horizontally or choose a dish using its
dot below the image. The active dot highlights the first displayed dish.
Hovering pauses rotation temporarily; focus, manual navigation, and swiping stop
it for the rest of the page visit. It also pauses in background tabs. Reduced-motion
preferences disable autoplay by default and remove slide animation.

With JavaScript disabled, featured dishes remain a normal static card grid.
A single featured dish stays a card without carousel controls.

## GitHub Pages setup (once)

In the repository's **Settings > Pages > Build and deployment**, set **Source**
to **GitHub Actions**. Push these changes to `main`, or run **Build and deploy
static site** manually from the Actions tab.

The workflow tests the menu, builds `_site/`, and deploys **only** that static
output. Pull requests are tested and built but never deployed.
The existing custom domain in [CNAME](CNAME) is included in the output.

## SEO and safety checks

The workflow runs [SEO regression tests](tests/test_seo.py) on every push and pull
request alongside the menu tests. They check titles/descriptions, one primary
heading, language/viewport, canonical/social/sitemap URLs, restaurant contact
and opening-hours metadata, image alt text and a 300 KB image budget, new-tab
link isolation, and a non-indexable 404 page. Menu tests also verify HTML/JSON
escaping and that structured prices match the visible menu.

Food photos use compressed JPEG copies; the original PNGs are kept as source
assets. When adding photos, optimise them before changing `image.src` in the
menu. Featured photos are lazy-loaded, while the logo loads immediately.

These are local regression checks, not a Lighthouse score or a guarantee of
rankings or rich results. Keep the published hours, prices, address, and Google
Business Profile accurate. GitHub Pages controls HTTP response headers; header
policies such as CSP and HSTS cannot be configured using a `_headers` file here.

## Local preview and tests

Python 3.9 or newer is sufficient; no dependencies need installing.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory _site
```

Visit `http://localhost:8000`. Re-run the build and refresh after menu edits.
Do not open the template directly: it contains build placeholders.

The page layout is in [templates/index.html](templates/index.html); the menu HTML
is generated by [scripts/build.py](scripts/build.py). CSS and existing client-side
navigation are in [style.css](style.css) and [script.js](script.js). Generated files
in `_site/` are ignored by Git and should not be edited.
