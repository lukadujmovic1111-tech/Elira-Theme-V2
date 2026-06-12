/* ==========================================================================
   ELIRA STUDIO — Theme JavaScript
   Vanilla JS, kein Framework. Module: Drawers, Cart (AJAX + Section
   Rendering), Variant-Picker, Galerie, Sticky-ATC, Predictive Search,
   Scroller, Reveal-Animationen, Filter & Sortierung.
   ========================================================================== */
(function () {
  'use strict';

  var theme = window.theme || { routes: {}, strings: {}, moneyFormat: '€{{amount_with_comma_separator}}' };

  /* ------------------------------------------------------------------
     Utilities
  ------------------------------------------------------------------ */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || theme.moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision == null ? 2 : precision;
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number == null) return 0;
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount': value = formatWithDelimiters(cents, 2); break;
      case 'amount_no_decimals': value = formatWithDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = formatWithDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = formatWithDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = formatWithDelimiters(cents, 2, "'", '.'); break;
      default: value = formatWithDelimiters(cents, 2);
    }
    return formatString.replace(placeholderRegex, value);
  }

  /* ------------------------------------------------------------------
     Toast
  ------------------------------------------------------------------ */
  var toastEl = null;
  var toastTimer = null;
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2600);
  }

  /* ------------------------------------------------------------------
     Drawer-Manager (Mobile-Menü, Cart, Filter, Suche, Modals)
  ------------------------------------------------------------------ */
  var openDrawers = [];

  function lockBody() { document.body.classList.add('drawer-locked'); }
  function unlockBody() {
    if (!qs('.is-open[data-cart-drawer], .is-open[data-mobile-menu], .is-open[data-filter-drawer], .search-overlay.is-open, .modal.is-open')) {
      document.body.classList.remove('drawer-locked');
    }
  }

  function openDrawer(el, focusTarget) {
    if (!el) return;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    lockBody();
    openDrawers.push(el);
    if (focusTarget) {
      setTimeout(function () { focusTarget.focus(); }, 120);
    }
  }

  function closeDrawer(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    openDrawers = openDrawers.filter(function (d) { return d !== el; });
    unlockBody();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openDrawers.length) {
      closeDrawer(openDrawers[openDrawers.length - 1]);
    }
  });

  /* ------------------------------------------------------------------
     Header: Scroll-State & Announcement-Rotation
  ------------------------------------------------------------------ */
  var header = qs('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var announcementBar = qs('[data-announcement-bar]');
  if (announcementBar) {
    var items = qsa('.announcement-bar__item', announcementBar);
    if (items.length > 1) {
      var current = 0;
      setInterval(function () {
        items[current].classList.remove('is-active');
        current = (current + 1) % items.length;
        items[current].classList.add('is-active');
      }, 4200);
    }
  }

  /* ------------------------------------------------------------------
     Reveal-Animationen
  ------------------------------------------------------------------ */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      qsa('[data-reveal], [data-reveal-stagger]').forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    qsa('[data-reveal], [data-reveal-stagger]').forEach(function (el) {
      if (el.hasAttribute('data-reveal-stagger')) {
        qsa(':scope > *', el).forEach(function (child, i) {
          child.style.setProperty('--stagger', (Math.min(i, 7) * 70) + 'ms');
        });
      }
      observer.observe(el);
    });
  }
  initReveal();

  /* ------------------------------------------------------------------
     Produkt-Scroller (Pfeil-Navigation)
  ------------------------------------------------------------------ */
  qsa('[data-scroller]').forEach(function (scroller) {
    var section = scroller.closest('.section') || document;
    var prev = qs('[data-scroll-prev]', section);
    var next = qs('[data-scroll-next]', section);
    if (!prev || !next) return;

    function updateButtons() {
      var maxScroll = scroller.scrollWidth - scroller.clientWidth - 4;
      prev.disabled = scroller.scrollLeft <= 4;
      next.disabled = scroller.scrollLeft >= maxScroll;
    }
    prev.addEventListener('click', function () {
      scroller.scrollBy({ left: -scroller.clientWidth * 0.8, behavior: 'smooth' });
    });
    next.addEventListener('click', function () {
      scroller.scrollBy({ left: scroller.clientWidth * 0.8, behavior: 'smooth' });
    });
    scroller.addEventListener('scroll', debounce(updateButtons, 80), { passive: true });
    window.addEventListener('resize', debounce(updateButtons, 150));
    updateButtons();
  });

  /* ------------------------------------------------------------------
     Warenkorb: AJAX + Section Rendering
  ------------------------------------------------------------------ */
  function getCartDrawer() { return qs('[data-cart-drawer]'); }

  function updateCartCount() {
    return fetch(theme.routes.cart + '.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        qsa('[data-cart-count]').forEach(function (el) {
          el.textContent = cart.item_count;
          el.classList.toggle('is-empty', cart.item_count === 0);
          el.classList.remove('is-bumping');
          void el.offsetWidth;
          el.classList.add('is-bumping');
        });
        return cart;
      });
  }

  function refreshCartDrawer(openAfter) {
    var drawer = getCartDrawer();
    if (!drawer) {
      if (openAfter) window.location.href = theme.routes.cart;
      return Promise.resolve();
    }
    return fetch(theme.routes.root + '?sections=cart-drawer')
      .then(function (r) { return r.json(); })
      .then(function (sections) {
        var holder = document.createElement('div');
        holder.innerHTML = sections['cart-drawer'];
        var fresh = qs('[data-cart-drawer]', holder);
        if (fresh) {
          var wasOpen = drawer.classList.contains('is-open') || openAfter;
          if (wasOpen) {
            fresh.classList.add('is-open');
            fresh.setAttribute('aria-hidden', 'false');
            openDrawers = openDrawers.filter(function (d) { return d !== drawer; });
            openDrawers.push(fresh);
            lockBody();
          }
          drawer.replaceWith(fresh);
        }
      });
  }

  function addToCart(body) {
    return fetch(theme.routes.cartAdd + '.js', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: body
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw data;
        return data;
      });
    });
  }

  function addVariantById(variantId, button) {
    if (button) button.classList.add('is-loading');
    var fd = new FormData();
    fd.append('id', variantId);
    fd.append('quantity', '1');
    addToCart(fd)
      .then(function () {
        updateCartCount();
        return refreshCartDrawer(theme.cartDrawerEnabled);
      })
      .then(function () { showToast(theme.strings.added || 'Hinzugefügt'); })
      .catch(function (err) {
        showToast((err && err.description) || theme.strings.cartError || 'Fehler');
      })
      .finally(function () {
        if (button) button.classList.remove('is-loading');
      });
  }

  function changeCartLine(key, quantity) {
    return fetch(theme.routes.cartChange + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        updateCartCount();
        return refreshCartDrawer(false);
      });
  }

  /* Globale Klick-Delegation (überlebt Section-Re-Renders) */
  document.addEventListener('click', function (e) {
    var target;

    /* Cart-Drawer öffnen */
    target = e.target.closest('[data-cart-toggle]');
    if (target && theme.cartDrawerEnabled) {
      e.preventDefault();
      var drawer = getCartDrawer();
      if (drawer) openDrawer(drawer, qs('.cart-drawer', drawer));
      return;
    }

    /* Drawer schließen */
    target = e.target.closest('[data-cart-close]');
    if (target) { closeDrawer(getCartDrawer()); return; }

    /* Menge im Drawer ändern */
    target = e.target.closest('[data-cart-qty]');
    if (target) {
      var line = target.closest('[data-line-item]');
      if (line) line.style.opacity = '0.45';
      changeCartLine(target.getAttribute('data-line-key'), parseInt(target.getAttribute('data-target-qty'), 10));
      return;
    }

    /* Quick-Add (Karte, Upsell, Größen-Pill) */
    target = e.target.closest('[data-quick-add-id]');
    if (target) {
      e.preventDefault();
      addVariantById(target.getAttribute('data-quick-add-id'), target);
      var quick = target.closest('.card-quick');
      if (quick) {
        quick.classList.remove('is-open');
        var opts = qs('.card-quick__options', quick);
        if (opts) opts.hidden = true;
      }
      return;
    }

    /* Quick-Add: Größenauswahl ein-/ausblenden */
    target = e.target.closest('[data-quick-toggle]');
    if (target) {
      e.preventDefault();
      var wrap = target.closest('.card-quick');
      var options = qs('.card-quick__options', wrap);
      var willOpen = options.hidden;
      qsa('.card-quick__options').forEach(function (o) { o.hidden = true; });
      qsa('.card-quick.is-open').forEach(function (c) { c.classList.remove('is-open'); });
      options.hidden = !willOpen;
      wrap.classList.toggle('is-open', willOpen);
      target.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }

    /* Mobile-Menü */
    target = e.target.closest('[data-menu-open]');
    if (target) {
      openDrawer(qs('[data-mobile-menu]'));
      target.setAttribute('aria-expanded', 'true');
      return;
    }
    target = e.target.closest('[data-menu-close]');
    if (target) {
      closeDrawer(qs('[data-mobile-menu]'));
      var burger = qs('[data-menu-open]');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      return;
    }

    /* Suche */
    target = e.target.closest('[data-search-open]');
    if (target) {
      var overlay = qs('[data-search-overlay]');
      openDrawer(overlay, qs('[data-search-input]', overlay));
      return;
    }
    target = e.target.closest('[data-search-close]');
    if (target) { closeDrawer(qs('[data-search-overlay]')); return; }

    /* Filter-Drawer */
    target = e.target.closest('[data-filter-open]');
    if (target) { openDrawer(qs('[data-filter-drawer]')); return; }
    target = e.target.closest('[data-filter-close]');
    if (target) { closeDrawer(qs('[data-filter-drawer]')); return; }

    /* Modals (z. B. Größentabelle) */
    target = e.target.closest('[data-modal-open]');
    if (target) {
      e.preventDefault();
      openDrawer(qs('[data-modal="' + target.getAttribute('data-modal-open') + '"]'));
      return;
    }
    target = e.target.closest('[data-modal-close]');
    if (target) { closeDrawer(target.closest('.modal')); return; }

    /* Offene Quick-Add-Panels schließen bei Klick außerhalb */
    if (!e.target.closest('.card-quick')) {
      qsa('.card-quick__options').forEach(function (o) { o.hidden = true; });
      qsa('.card-quick.is-open').forEach(function (c) { c.classList.remove('is-open'); });
    }
  });

  /* ------------------------------------------------------------------
     Produktformular (PDP) — AJAX Add-to-Cart
  ------------------------------------------------------------------ */
  qsa('[data-product-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = qs('[data-add-to-cart]', form);
      var errorEl = qs('[data-form-error]', form);
      if (errorEl) errorEl.hidden = true;
      if (button) button.classList.add('is-loading');

      addToCart(new FormData(form))
        .then(function () {
          updateCartCount();
          return refreshCartDrawer(theme.cartDrawerEnabled);
        })
        .then(function () {
          if (!theme.cartDrawerEnabled) showToast(theme.strings.added || 'Hinzugefügt');
        })
        .catch(function (err) {
          if (errorEl) {
            errorEl.textContent = (err && err.description) || theme.strings.cartError || 'Fehler';
            errorEl.hidden = false;
          }
        })
        .finally(function () {
          if (button) button.classList.remove('is-loading');
        });
    });
  });

  /* ------------------------------------------------------------------
     PDP: Variant-Picker, Galerie, Sticky-ATC
  ------------------------------------------------------------------ */
  qsa('[data-product-section]').forEach(function (section) {
    var dataEl = qs('[data-variant-data]', section);
    var variants = [];
    try { variants = JSON.parse(dataEl ? dataEl.textContent : '[]'); } catch (err) { variants = []; }

    var picker = qs('[data-variant-picker]', section);
    var form = qs('[data-product-form]', section);
    var priceWrapper = qs('[data-price-wrapper]', section);
    var stickyBar = qs('[data-sticky-atc]', section);
    var stickyPrice = qs('[data-sticky-price]', section);
    var stickySubmit = qs('[data-sticky-submit]', section);
    var stockNote = qs('[data-stock-note]', section);
    var galleryTrack = qs('[data-gallery-track]', section);

    function selectedOptions() {
      return qsa('[data-option-group]', picker).map(function (group) {
        var checked = qs('input:checked', group);
        return checked ? checked.value : null;
      });
    }

    function findVariant(options) {
      return variants.find(function (v) {
        return v.options.every(function (opt, i) { return opt === options[i]; });
      });
    }

    function renderPrice(variant) {
      if (!priceWrapper || !variant) return;
      var html = '<div class="price price--pdp' + (variant.compare_at_price > variant.price ? ' price--sale' : '') + '">';
      html += '<span class="price__current">' + formatMoney(variant.price) + '</span>';
      if (variant.compare_at_price > variant.price) {
        var saving = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
        html += '<s class="price__compare">' + formatMoney(variant.compare_at_price) + '</s>';
        html += '<span class="price__badge">&minus;' + saving + '%</span>';
      }
      html += '</div>';
      var oldPrice = qs('.price', priceWrapper);
      if (oldPrice) oldPrice.outerHTML = html;
      if (stickyPrice) stickyPrice.textContent = formatMoney(variant.price);
    }

    function updateAvailabilityMarks(options) {
      qsa('[data-option-group]', picker).forEach(function (group, groupIndex) {
        qsa('input.option-input', group).forEach(function (input) {
          var testOptions = options.slice();
          testOptions[groupIndex] = input.value;
          var match = variants.find(function (v) {
            return v.options.every(function (opt, i) { return opt === testOptions[i]; });
          });
          input.classList.toggle('is-unavailable', !match || !match.available);
        });
      });
    }

    function jumpToMedia(mediaId) {
      if (!galleryTrack || !mediaId) return;
      var item = qs('[data-media-id="' + mediaId + '"]', galleryTrack);
      if (!item) return;
      var isMobileCarousel = getComputedStyle(galleryTrack).display === 'flex';
      if (isMobileCarousel) {
        galleryTrack.scrollTo({ left: item.offsetLeft, behavior: 'smooth' });
      }
    }

    function onVariantChange() {
      var options = selectedOptions();
      var variant = findVariant(options);

      qsa('[data-option-group]', picker).forEach(function (group, i) {
        var label = qs('[data-selected-value]', group);
        if (label && options[i]) label.textContent = options[i];
      });

      var atcButtons = [qs('[data-add-to-cart]', form || section), stickySubmit].filter(Boolean);
      var atcText = form ? qs('[data-atc-text]', form) : null;

      if (!variant) {
        atcButtons.forEach(function (b) { b.disabled = true; });
        if (atcText) atcText.textContent = theme.strings.unavailable || 'Nicht verfügbar';
        if (stockNote) stockNote.hidden = true;
        return;
      }

      var idInput = form ? qs('[data-variant-id]', form) : null;
      if (idInput) idInput.value = variant.id;

      atcButtons.forEach(function (b) { b.disabled = !variant.available; });
      if (atcText) {
        atcText.textContent = variant.available
          ? (theme.strings.addToCart || 'In den Warenkorb')
          : (theme.strings.soldOut || 'Ausverkauft');
      }

      renderPrice(variant);
      updateAvailabilityMarks(options);
      jumpToMedia(variant.media_id);

      if (stockNote) {
        stockNote.hidden = !(variant.available && variant.managed && variant.qty > 0 && variant.qty <= 5);
      }

      if (window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }

    if (picker && variants.length) {
      picker.addEventListener('change', onVariantChange);
      onVariantChange();
    }

    /* Galerie-Dots (mobil) */
    var dots = qsa('.product-gallery__dot', section);
    if (galleryTrack && dots.length) {
      galleryTrack.addEventListener('scroll', debounce(function () {
        var index = Math.round(galleryTrack.scrollLeft / galleryTrack.clientWidth);
        dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === index); });
      }, 60), { passive: true });
      dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
          var index = parseInt(dot.getAttribute('data-dot-index'), 10);
          galleryTrack.scrollTo({ left: index * galleryTrack.clientWidth, behavior: 'smooth' });
        });
      });
    }

    /* Sticky Add-to-Cart einblenden, sobald der Haupt-Button aus dem Viewport scrollt */
    var buyArea = qs('.pdp__buy', section);
    if (stickyBar && buyArea && 'IntersectionObserver' in window) {
      var stickyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var pastButton = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          stickyBar.classList.toggle('is-visible', pastButton);
          stickyBar.setAttribute('aria-hidden', pastButton ? 'false' : 'true');
        });
      }, { threshold: 0 });
      stickyObserver.observe(buyArea);
    }
  });

  /* ------------------------------------------------------------------
     Produkt-Empfehlungen (Recommendations API)
  ------------------------------------------------------------------ */
  qsa('[data-recommendations]').forEach(function (sectionEl) {
    var url = sectionEl.getAttribute('data-url');
    if (!url) return;
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var holder = document.createElement('div');
        holder.innerHTML = text;
        var fresh = qs('[data-recommendations]', holder);
        if (fresh && fresh.innerHTML.trim().length) {
          sectionEl.innerHTML = fresh.innerHTML;
          initReveal();
        } else {
          sectionEl.remove();
        }
      })
      .catch(function () {});
  });

  /* ------------------------------------------------------------------
     Predictive Search
  ------------------------------------------------------------------ */
  var searchInput = qs('[data-search-input]');
  var searchResults = qs('[data-search-results]');
  var searchDefault = qs('[data-search-default]');

  if (searchInput && searchResults) {
    var renderResults = function (data, query) {
      var products = (data.resources && data.resources.results && data.resources.results.products) || [];
      if (!products.length) {
        searchResults.innerHTML = '<p class="search-overlay__empty">' + (theme.strings.searchNoResults || 'Keine Ergebnisse') + '</p>';
        return;
      }
      var html = '<div class="search-results__grid">';
      products.slice(0, 8).forEach(function (p) {
        var img = p.featured_image && p.featured_image.url ? p.featured_image.url : '';
        if (img) img += (img.indexOf('?') > -1 ? '&' : '?') + 'width=400';
        var price = '';
        try { price = formatMoney(Math.round(parseFloat(p.price) * 100)); } catch (err) { price = ''; }
        html += '<a class="search-result" href="' + p.url + '">' +
          '<div class="search-result__media">' + (img ? '<img src="' + img + '" alt="" loading="lazy">' : '') + '</div>' +
          '<span class="search-result__title">' + p.title + '</span>' +
          (price ? '<span class="search-result__price">' + price + '</span>' : '') +
          '</a>';
      });
      html += '</div>';
      html += '<div class="search-overlay__footer"><a class="btn btn--secondary" href="' + theme.routes.search + '?q=' + encodeURIComponent(query) + '">' + (theme.strings.searchViewAll || 'Alle Ergebnisse') + '</a></div>';
      searchResults.innerHTML = html;
    };

    searchInput.addEventListener('input', debounce(function () {
      var query = searchInput.value.trim();
      if (query.length < 2) {
        searchResults.hidden = true;
        searchResults.innerHTML = '';
        if (searchDefault) searchDefault.hidden = false;
        return;
      }
      fetch(theme.routes.predictiveSearch + '.json?q=' + encodeURIComponent(query) + '&resources[type]=product&resources[limit]=8&resources[options][unavailable_products]=last')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (searchDefault) searchDefault.hidden = true;
          searchResults.hidden = false;
          renderResults(data, query);
        })
        .catch(function () {});
    }, 280));
  }

  /* ------------------------------------------------------------------
     Kollektion: Sortierung & Filter
  ------------------------------------------------------------------ */
  var sortSelect = qs('[data-sort-by]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  }

  var filterForm = qs('[data-filter-form]');
  if (filterForm) {
    filterForm.addEventListener('submit', function () {
      qsa('input', filterForm).forEach(function (input) {
        if ((input.type === 'number' || input.type === 'text') && input.value === '') {
          input.disabled = true;
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Warenkorbseite: Mengen-Stepper mit Auto-Update
  ------------------------------------------------------------------ */
  var cartPageForm = qs('[data-cart-page-form]');
  if (cartPageForm) {
    var submitCart = debounce(function () {
      if (cartPageForm.requestSubmit) cartPageForm.requestSubmit();
      else cartPageForm.submit();
    }, 600);

    cartPageForm.addEventListener('click', function (e) {
      var minus = e.target.closest('[data-qty-minus]');
      var plus = e.target.closest('[data-qty-plus]');
      if (!minus && !plus) return;
      var stepper = e.target.closest('.qty-stepper');
      var input = qs('[data-qty-input]', stepper);
      var value = parseInt(input.value, 10) || 0;
      input.value = Math.max(0, value + (plus ? 1 : -1));
      submitCart();
    });
    cartPageForm.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-qty-input')) submitCart();
    });
  }

  /* ------------------------------------------------------------------
     Adressformulare: Länder-Select vorbelegen
  ------------------------------------------------------------------ */
  qsa('select[data-default]').forEach(function (select) {
    var def = select.getAttribute('data-default');
    if (def) select.value = def;
  });

})();
