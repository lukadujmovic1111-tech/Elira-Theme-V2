# Elira Studio — Shopify Theme V2

Komplett neu entwickeltes Online Store 2.0 Theme für **Elira Pilates** (elirapilates.com).
Design-Sprache inspiriert von moderner Premium-Activewear (Referenz: exercere.com):
Luxury-Minimalismus, warmes Ivory & Sand, Uppercase-Typografie mit Letter-Spacing,
großzügiger Weißraum und reduzierte, präzise UI.

## Installation

**Option A – ZIP-Upload (empfohlen):**
1. Repository als ZIP herunterladen (oder das beiliegende Release-ZIP verwenden — die ZIP muss die Ordner `assets/`, `config/`, `layout/` … direkt enthalten, ohne übergeordneten Ordner).
2. Shopify Admin → **Onlineshop → Themes → Theme hinzufügen → ZIP-Datei hochladen**.
3. Das Theme erscheint als unveröffentlichtes Theme in der Bibliothek → **Anpassen** zum Konfigurieren, **Veröffentlichen** wenn bereit. Das aktuelle Live-Theme bleibt unberührt.

**Option B – Shopify CLI:**
```bash
shopify theme push --unpublished --store elirapilates.com
```

## Was nach dem Upload zu tun ist

1. **Bilder zuweisen** (Theme-Editor): Hero, Editorial-Karten, Kategorie-Grid, Lifestyle-Galerie und Mega-Menü-Bilder nutzen Platzhalter, bis eigene Bilder gewählt sind.
2. **Logo & Favicon** unter Theme-Einstellungen → Logo hochladen (ohne Logo erscheint automatisch die ELIRA-Wortmarke).
3. **Menüs prüfen**: Header nutzt `main-menu`, Footer `footer` (Navigation im Shopify Admin). Untermenüs werden im Desktop automatisch als Mega-Menü gerendert.
4. **Kontaktseite**: Eine Seite mit Template `page.contact` anlegen.
5. **Filter**: Im Shopify Admin unter Onlineshop → Navigation → Filter die gewünschten Filter (Größe, Farbe, Preis …) aktivieren — die Kollektionsseite rendert sie automatisch.

## Struktur

| Bereich | Highlights |
|---|---|
| **Header** | Sticky (blendet beim Runterscrollen aus), zentriertes Logo, CSS-Mega-Menü mit Bild-Slots, Such-Overlay mit Live-Vorschlägen (Predictive Search) |
| **Homepage** | Hero → Marquee → Bestseller → Editorial-Duo → Brand-Story → Zubehör → Kategorie-Grid → Testimonials → „Elira + Du" → USP-Leiste → Newsletter |
| **Produktkarte** | Hover-Bildwechsel, Sale/Neu-Badges, Quick-Add mit Varianten-Popover, Farbanzahl |
| **Produktseite** | Gestapelte Galerie (Desktop) / Swipe-Carousel (Mobil), Farb-Swatches + Größen-Pills mit Verfügbarkeits-Logik, Akkordeons, USP-Box, Dynamic Checkout |
| **Warenkorb** | Ajax-Drawer mit Gratisversand-Fortschrittsbalken (Schwelle einstellbar), volle Warenkorb-Seite |
| **Kollektion** | Filter-Drawer (Storefront-Filter), Sortierung, aktive Filter-Chips, Pagination |
| **Sonstiges** | Suche, Blog, Artikel, 404, Passwort-Seite, Geschenkgutschein, komplette Kundenkonto-Seiten |

## Theme-Einstellungen

Farben (Ivory/Sand/Ink/Akzent/Sale), Typografie (Schriftwahl + Skalierung), Seitenbreite,
Button-/Karten-Rundung, Produktkarten-Verhalten, Badges, Warenkorb-Typ & Gratisversand-Schwelle,
Social-Links. Alle Sektionen haben einstellbare Abstände und Farbschemata (Hell/Sand/Dunkel).

## Sprachen

Deutsch (`de.default.json`, Standard) und Englisch (`en.json`).
