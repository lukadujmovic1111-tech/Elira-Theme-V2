/* ==========================================================================
   ELIRA STUDIO — Global JS
   Vanilla, keine Abhängigkeiten. Komponenten als Custom Elements.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  const overlay = () => qs('[data-overlay]');

  function lockBody(lock) {
    document.body.classList.toggle('is-locked', lock);
  }

  /* ------------------------------------------------------------------------
     Drawer-System (Menü, Cart, Filter) + Overlay
     ------------------------------------------------------------------------ */
  const DrawerManager = {
    active: null,
    lastTrigger: null,

    open(id, trigger) {
      const drawer = document.getElementById(id);
      if (!drawer) return;
      if (this.active && this.active !== drawer) this.close(true);

      this.active = drawer;
      this.lastTrigger = trigger || document.activeElement;

      const ov = overlay();
      if (ov) {
        ov.hidden = false;
        requestAnimationFrame(() => ov.classList.add('is-visible'));
      }

      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      lockBody(true);

      const focusable = drawer.querySelector('button, [href], input, select, textarea');
      if (focusable) setTimeout(() => focusable.focus(), 120);
    },

    close(keepOverlay) {
      if (!this.active) return;
      this.active.classList.remove('is-open');
      this.active.setAttribute('aria-hidden', 'true');
      this.active = null;

      if (!keepOverlay) {
        const ov = overlay();
        if (ov) {
          ov.classList.remove('is-visible');
          setTimeout(() => { if (!this.active) ov.hidden = true; }, 350);
        }
        lockBody(false);
      }

      if (this.lastTrigger && typeof this.lastTrigger.focus === 'function') {
        this.lastTrigger.focus();
        this.lastTrigger = null;
      }
    }
  };

  window.EliraDrawers = DrawerManager;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-drawer-trigger]');
    if (trigger) {
      e.preventDefault();
      DrawerManager.open(trigger.getAttribute('data-drawer-trigger'), trigger);
      return;
    }
    const closer = e.target.closest('[data-drawer-close]');
    if (closer) {
      e.preventDefault();
      DrawerManager.close();
      return;
    }
    if (e.target.matches('[data-overlay]')) {
      DrawerManager.close();
      document.dispatchEvent(new CustomEvent('elira:overlay-click'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      DrawerManager.close();
      document.dispatchEvent(new CustomEvent('elira:escape'));
    }
  });

  /* ------------------------------------------------------------------------
     Announcement-Rotation
     ------------------------------------------------------------------------ */
  class AnnouncementRotator extends HTMLElement {
    connectedCallback() {
      this.items = qsa('.announcement__item', this);
      if (this.items.length < 2) return;
      this.index = 0;
      this.interval = parseInt(this.dataset.interval || '4500', 10);
      this.timer = setInterval(() => this.next(), this.interval);
    }
    disconnectedCallback() { clearInterval(this.timer); }
    next() {
      this.items[this.index].classList.remove('is-active');
      this.index = (this.index + 1) % this.items.length;
      this.items[this.index].classList.add('is-active');
    }
  }
  customElements.define('announcement-rotator', AnnouncementRotator);

  /* ------------------------------------------------------------------------
     Sticky Header (versteckt sich beim Runterscrollen)
     ------------------------------------------------------------------------ */
  class StickyHeader extends HTMLElement {
    connectedCallback() {
      this.lastY = window.scrollY;
      this.onScroll = this.onScroll.bind(this);
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
    disconnectedCallback() { window.removeEventListener('scroll', this.onScroll); }
    onScroll() {
      const y = window.scrollY;
      const goingDown = y > this.lastY;
      if (goingDown && y > 280 && !this.matches(':focus-within') && !DrawerManager.active) {
        this.classList.add('is-hidden');
      } else if (!goingDown || y < 280) {
        this.classList.remove('is-hidden');
      }
      this.lastY = y;
    }
  }
  customElements.define('sticky-header', StickyHeader);

  /* ------------------------------------------------------------------------
     Such-Overlay + Predictive Search
     ------------------------------------------------------------------------ */
  class SearchOverlay extends HTMLElement {
    connectedCallback() {
      this.panel = qs('.search-overlay', this);
      this.input = qs('.search-overlay__input', this);
      this.results = qs('.search-overlay__results', this);

      qsa('[data-search-toggle]', this).forEach((btn) =>
        btn.addEventListener('click', () => this.toggle())
      );
      document.addEventListener('elira:escape', () => this.close());
      document.addEventListener('elira:overlay-click', () => this.close());

      if (this.input) {
        this.input.addEventListener('input', debounce(() => this.fetchResults(), 280));
      }
    }

    toggle() {
      if (this.panel.classList.contains('is-open')) this.close();
      else this.openPanel();
    }

    openPanel() {
      this.panel.classList.add('is-open');
      this.panel.setAttribute('aria-hidden', 'false');
      const ov = overlay();
      if (ov) {
        ov.hidden = false;
        requestAnimationFrame(() => ov.classList.add('is-visible'));
      }
      setTimeout(() => this.input && this.input.focus(), 150);
    }

    close() {
      if (!this.panel || !this.panel.classList.contains('is-open')) return;
      this.panel.classList.remove('is-open');
      this.panel.setAttribute('aria-hidden', 'true');
      if (!DrawerManager.active) {
        const ov = overlay();
        if (ov) {
          ov.classList.remove('is-visible');
          setTimeout(() => { if (!DrawerManager.active) ov.hidden = true; }, 350);
        }
        lockBody(false);
      }
    }

    fetchResults() {
      const q = this.input.value.trim();
      if (q.length < 2) {
        this.results.innerHTML = '';
        return;
      }
      const url = `${window.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=8&section_id=predictive-search`;
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const inner = doc.querySelector('#PredictiveSearchResults');
          this.results.innerHTML = inner ? inner.innerHTML : '';
        })
        .catch(() => { this.results.innerHTML = ''; });
    }
  }
  customElements.define('search-overlay', SearchOverlay);

  /* ------------------------------------------------------------------------
     Quantity Stepper
     ------------------------------------------------------------------------ */
  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = qs('input', this);
      qsa('button', this).forEach((btn) =>
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const step = btn.dataset.action === 'increase' ? 1 : -1;
          const min = parseInt(this.input.min || '1', 10);
          const next = Math.max(min, (parseInt(this.input.value, 10) || min) + step);
          if (this.input.max && next > parseInt(this.input.max, 10)) return;
          this.input.value = next;
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        })
      );
    }
  }
  customElements.define('quantity-input', QuantityInput);

  /* ------------------------------------------------------------------------
     Cart API + Drawer
     ------------------------------------------------------------------------ */
  const Cart = {
    sectionsFor() {
      const ids = ['cart-drawer'];
      const main = qs('[data-cart-section]');
      if (main) ids.push(main.getAttribute('data-cart-section'));
      return ids;
    },

    async add(formData) {
      this.sectionsFor().forEach((id) => formData.append('sections', id));
      formData.append('sections_url', window.location.pathname);
      const res = await fetch(`${window.routes.cartAdd}.js`, {
        method: 'POST',
        headers: { Accept: 'application/javascript' },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || 'error');
      this.renderSections(data.sections);
      document.dispatchEvent(new CustomEvent('elira:cart-updated'));
      return data;
    },

    async change(line, quantity) {
      const res = await fetch(`${window.routes.cartChange}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          line,
          quantity,
          sections: this.sectionsFor(),
          sections_url: window.location.pathname
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || 'error');
      this.renderSections(data.sections);
      if (typeof data.item_count !== 'undefined') this.updateCount(data.item_count);
      document.dispatchEvent(new CustomEvent('elira:cart-updated'));
      return data;
    },

    renderSections(sections) {
      if (!sections) return;
      const drawerHtml = sections['cart-drawer'];
      if (drawerHtml) {
        const doc = new DOMParser().parseFromString(drawerHtml, 'text/html');
        const fresh = doc.querySelector('#CartDrawerShell');
        const current = qs('#CartDrawerShell');
        if (fresh && current) {
          current.innerHTML = fresh.innerHTML;
          const count = fresh.getAttribute('data-item-count');
          if (count !== null) this.updateCount(count);
        }
      }
      const main = qs('[data-cart-section]');
      if (main) {
        const id = main.getAttribute('data-cart-section');
        if (sections[id]) {
          const doc = new DOMParser().parseFromString(sections[id], 'text/html');
          const fresh = doc.querySelector('[data-cart-section]');
          if (fresh) main.innerHTML = fresh.innerHTML;
        }
      }
    },

    updateCount(count) {
      qsa('[data-cart-count]').forEach((el) => {
        el.textContent = count;
        el.setAttribute('data-count', count);
      });
    },

    openDrawer() {
      if (window.eliraSettings.cartType === 'drawer' && qs('#CartDrawer')) {
        DrawerManager.open('CartDrawer');
      } else {
        window.location.href = window.routes.cart;
      }
    }
  };

  window.EliraCart = Cart;

  /* Cart-Zeilen (Drawer + Seite): Menge ändern / entfernen */
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-line-qty]');
    if (!input) return;
    const line = parseInt(input.getAttribute('data-line-qty'), 10);
    const shell = input.closest('.cart-drawer-shell, [data-cart-section]');
    if (shell) shell.classList.add('is-loading');
    Cart.change(line, parseInt(input.value, 10) || 0).catch(() => {
      if (shell) shell.classList.remove('is-loading');
      window.location.reload();
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-line-remove]');
    if (!btn) return;
    e.preventDefault();
    const line = parseInt(btn.getAttribute('data-line-remove'), 10);
    const shell = btn.closest('.cart-drawer-shell, [data-cart-section]');
    if (shell) shell.classList.add('is-loading');
    Cart.change(line, 0).catch(() => window.location.reload());
  });

  /* ------------------------------------------------------------------------
     Product Form (PDP + Quick-Add): Ajax Add-to-Cart
     ------------------------------------------------------------------------ */
  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = qs('form', this);
      if (!this.form) return;
      this.button = qs('[data-atc]', this.form);
      this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }

    onSubmit(e) {
      if (window.eliraSettings.cartType !== 'drawer') return; // klassischer Submit
      e.preventDefault();
      if (this.button && this.button.disabled) return;

      const original = this.button ? this.button.textContent : '';
      if (this.button) {
        this.button.setAttribute('aria-busy', 'true');
        this.button.textContent = window.eliraStrings.adding;
      }

      Cart.add(new FormData(this.form))
        .then(() => {
          if (this.button) this.button.textContent = window.eliraStrings.added;
          setTimeout(() => {
            if (this.button) {
              this.button.textContent = original;
              this.button.removeAttribute('aria-busy');
            }
          }, 1600);
          Cart.openDrawer();
          this.dispatchEvent(new CustomEvent('elira:added', { bubbles: true }));
        })
        .catch((err) => {
          if (this.button) {
            this.button.textContent = original;
            this.button.removeAttribute('aria-busy');
          }
          this.showError(err.message || window.eliraStrings.cartError);
        });
    }

    showError(msg) {
      let el = qs('.product-form__error', this);
      if (!el) {
        el = document.createElement('p');
        el.className = 'product-form__error form-status form-status--error';
        el.setAttribute('role', 'alert');
        this.form.appendChild(el);
      }
      el.textContent = msg;
      setTimeout(() => el.remove(), 5000);
    }
  }
  customElements.define('product-form', ProductForm);

  /* ------------------------------------------------------------------------
     Variant Picker (PDP)
     ------------------------------------------------------------------------ */
  class VariantPicker extends HTMLElement {
    connectedCallback() {
      const dataEl = qs('script[type="application/json"]', this);
      if (!dataEl) return;
      try {
        this.variants = JSON.parse(dataEl.textContent);
      } catch (err) {
        return;
      }
      this.optionCount = (this.variants[0] && this.variants[0].options.length) || 0;
      this.addEventListener('change', () => this.onChange());
      this.onChange(true);
    }

    selectedOptions() {
      const opts = [];
      for (let i = 0; i < this.optionCount; i++) {
        const checked = qs(`input[data-option-position="${i}"]:checked, select[data-option-position="${i}"]`, this);
        opts.push(checked ? checked.value : null);
      }
      return opts;
    }

    onChange(initial) {
      const selected = this.selectedOptions();
      const variant = this.variants.find((v) =>
        v.options.every((opt, i) => opt === selected[i])
      );
      this.updateAvailabilityStyles(selected);
      this.updateLabels(selected);

      const root = this.closest('.pdp__info') || document;
      const idInput = qs('input[name="id"]', root);
      const button = qs('[data-atc]', root);
      const priceEl = qs('[data-price-wrap]', root);

      if (!variant) {
        if (button) {
          button.disabled = true;
          button.textContent = window.eliraStrings.unavailable;
        }
        return;
      }

      if (idInput) idInput.value = variant.id;

      if (button) {
        button.disabled = !variant.available;
        button.textContent = variant.available
          ? window.eliraStrings.addToCart
          : window.eliraStrings.soldOut;
      }

      if (priceEl) {
        let html = '';
        if (variant.compare_at) {
          html = `<span class="price__sale">${variant.price}</span><s class="price__compare">${variant.compare_at}</s>`;
        } else {
          html = `<span>${variant.price}</span>`;
        }
        priceEl.innerHTML = html;
      }

      if (!initial) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
        if (variant.media_index !== null && variant.media_index >= 0) {
          this.scrollToMedia(variant.media_index);
        }
      }
    }

    updateLabels(selected) {
      qsa('[data-option-value-label]', this).forEach((el, i) => {
        if (selected[i]) el.textContent = selected[i];
      });
    }

    updateAvailabilityStyles(selected) {
      for (let pos = 0; pos < this.optionCount; pos++) {
        qsa(`input[data-option-position="${pos}"]`, this).forEach((input) => {
          const test = selected.slice();
          test[pos] = input.value;
          const match = this.variants.find((v) =>
            v.options.every((opt, i) => (test[i] === null ? true : opt === test[i]))
          );
          const available = match ? this.variants.some((v) =>
            v.available && v.options.every((opt, i) => (test[i] === null ? true : opt === test[i]))
          ) : false;
          input.closest('.opt-pill, .opt-swatch')?.classList.toggle('is-unavailable', !available);
        });
      }
    }

    scrollToMedia(index) {
      const items = qsa('.pdp__media-item');
      const target = items[index];
      if (!target) return;
      if (window.matchMedia('(min-width: 990px)').matches) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const track = target.parentElement;
        track.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
      }
    }
  }
  customElements.define('variant-picker', VariantPicker);

  /* ------------------------------------------------------------------------
     Quick-Add (Produktkarte)
     ------------------------------------------------------------------------ */
  class QuickAdd extends HTMLElement {
    connectedCallback() {
      this.trigger = qs('.quick-add__trigger', this);
      this.panel = qs('.quick-add__panel', this);
      const dataEl = qs('script[type="application/json"]', this);
      this.variants = null;
      if (dataEl) {
        try { this.variants = JSON.parse(dataEl.textContent); } catch (err) { /* noop */ }
      }

      const form = qs('form', this);
      if (form) form.addEventListener('submit', (e) => this.onSubmit(e, form));

      if (this.trigger && this.panel) {
        this.trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePanel();
        });
        document.addEventListener('elira:escape', () => this.closePanel());
        document.addEventListener('click', (e) => {
          if (!this.contains(e.target)) this.closePanel();
        });
      }
    }

    togglePanel() {
      if (this.panel.hidden) {
        qsa('quick-add').forEach((qa) => { if (qa !== this) qa.closePanel && qa.closePanel(); });
        this.panel.hidden = false;
        this.classList.add('is-open');
      } else {
        this.closePanel();
      }
    }

    closePanel() {
      if (!this.panel || this.panel.hidden) return;
      this.panel.hidden = true;
      this.classList.remove('is-open');
    }

    onSubmit(e, form) {
      e.preventDefault();
      const btn = qs('[data-qa-submit]', form);
      const label = qs('[data-qa-label]', form) || btn;
      const defaultText = label ? label.textContent : '';
      let variantId = form.getAttribute('data-single-variant');

      if (!variantId && this.variants) {
        const count = this.variants[0].options.length;
        const selected = [];
        for (let i = 0; i < count; i++) {
          const checked = qs(`input[data-qa-position="${i}"]:checked`, form);
          selected.push(checked ? checked.value : null);
        }
        const variant = this.variants.find((v) =>
          v.options.every((opt, i) => opt === selected[i])
        );
        if (!variant || !variant.available) {
          if (label) {
            label.textContent = window.eliraStrings.soldOut;
            setTimeout(() => { label.textContent = defaultText; }, 1800);
          }
          return;
        }
        variantId = variant.id;
      }

      if (!variantId) return;

      const fd = new FormData();
      fd.append('id', variantId);
      fd.append('quantity', '1');

      if (btn) btn.setAttribute('aria-busy', 'true');
      if (label) label.textContent = window.eliraStrings.adding;

      Cart.add(fd)
        .then(() => {
          if (btn) btn.removeAttribute('aria-busy');
          if (label) {
            label.textContent = window.eliraStrings.added;
            setTimeout(() => { label.textContent = defaultText; }, 1500);
          }
          this.closePanel();
          Cart.openDrawer();
        })
        .catch(() => {
          if (btn) btn.removeAttribute('aria-busy');
          if (label) {
            label.textContent = window.eliraStrings.cartError;
            setTimeout(() => { label.textContent = defaultText; }, 2500);
          }
        });
    }
  }
  customElements.define('quick-add', QuickAdd);

  /* ------------------------------------------------------------------------
     Scroll-Carousel (Pfeile)
     ------------------------------------------------------------------------ */
  class ScrollCarousel extends HTMLElement {
    connectedCallback() {
      this.row = qs('.scroll-row', this);
      this.prev = qs('[data-carousel-prev]', this);
      this.next = qs('[data-carousel-next]', this);
      if (!this.row) return;

      if (this.prev) this.prev.addEventListener('click', () => this.scrollByDir(-1));
      if (this.next) this.next.addEventListener('click', () => this.scrollByDir(1));
      this.row.addEventListener('scroll', debounce(() => this.updateButtons(), 80), { passive: true });
      this.updateButtons();
    }

    scrollByDir(dir) {
      const item = this.row.firstElementChild;
      const width = item ? item.getBoundingClientRect().width + 20 : this.row.clientWidth * 0.8;
      this.row.scrollBy({ left: dir * width * 2, behavior: 'smooth' });
    }

    updateButtons() {
      if (!this.prev || !this.next) return;
      const max = this.row.scrollWidth - this.row.clientWidth - 4;
      this.prev.toggleAttribute('disabled', this.row.scrollLeft <= 4);
      this.next.toggleAttribute('disabled', this.row.scrollLeft >= max);
    }
  }
  customElements.define('scroll-carousel', ScrollCarousel);

  /* ------------------------------------------------------------------------
     PDP-Galerie: Mobile-Zähler
     ------------------------------------------------------------------------ */
  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.track = qs('.pdp__gallery-stack', this);
      this.counter = qs('[data-gallery-current]', this);
      if (!this.track || !this.counter) return;
      this.track.addEventListener('scroll', debounce(() => {
        const index = Math.round(this.track.scrollLeft / this.track.clientWidth);
        this.counter.textContent = index + 1;
      }, 60), { passive: true });
    }
  }
  customElements.define('product-gallery', ProductGallery);

  /* ------------------------------------------------------------------------
     Facetten-Filter: Auto-Submit
     ------------------------------------------------------------------------ */
  class FacetForm extends HTMLElement {
    connectedCallback() {
      this.form = qs('form', this);
      if (!this.form) return;
      this.form.addEventListener('change', debounce(() => this.form.submit(), 350));
    }
  }
  customElements.define('facet-form', FacetForm);

  /* Sortier-Select außerhalb des Filterformulars */
  document.addEventListener('change', (e) => {
    const sort = e.target.closest('[data-sort-select]');
    if (!sort) return;
    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', sort.value);
    url.searchParams.delete('page');
    window.location.href = url.toString();
  });

  /* ------------------------------------------------------------------------
     Related Products (Recommendations API)
     ------------------------------------------------------------------------ */
  class RelatedProducts extends HTMLElement {
    connectedCallback() {
      const url = this.dataset.url;
      if (!url) return;
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        fetch(url)
          .then((r) => r.text())
          .then((text) => {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const fresh = doc.querySelector('related-products');
            if (fresh && fresh.innerHTML.trim().length) {
              this.innerHTML = fresh.innerHTML;
            } else {
              const section = this.closest('.section');
              if (section) section.remove();
            }
          })
          .catch(() => { /* noop */ });
      }, { rootMargin: '320px' });
      io.observe(this);
    }
  }
  customElements.define('related-products', RelatedProducts);

  /* ------------------------------------------------------------------------
     Lokalisierung: Auto-Submit
     ------------------------------------------------------------------------ */
  document.addEventListener('change', (e) => {
    const select = e.target.closest('[data-localization-select]');
    if (!select) return;
    const form = select.closest('form');
    const input = form && form.querySelector('[data-localization-input]');
    if (input) input.value = select.value;
    if (form) form.submit();
  });
})();
