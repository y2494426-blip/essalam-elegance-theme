/* DERMATOOL® — Product Template behavior. No external libraries. */
(function () {
  'use strict';

  function formatMoney(cents, format) {
    format = format || window.dtMoneyFormat || '{{amount}}';
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;

    function withDelimiters(number, precision, thousands, decimal) {
      precision = precision == null ? 2 : precision;
      thousands = thousands == null ? ',' : thousands;
      decimal = decimal == null ? '.' : decimal;
      if (isNaN(number) || number == null) return 0;
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }

    var match = format.match(placeholderRegex);
    var key = match ? match[1] : 'amount';
    var value;
    switch (key) {
      case 'amount_no_decimals':
        value = withDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = withDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = withDelimiters(cents, 0, '.', ',');
        break;
      default:
        value = withDelimiters(cents, 2);
    }
    return match ? format.replace(placeholderRegex, value) : value;
  }

  function initProductPage(root) {
    var variantsScript = root.querySelector('[data-dt-variants]');
    var variants = variantsScript ? JSON.parse(variantsScript.textContent) : [];

    /* Gallery thumbnails */
    var mainImg = root.querySelector('[id^="dt-featured-img-"]');
    root.querySelectorAll('[data-dt-thumb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (mainImg) mainImg.src = btn.getAttribute('data-dt-thumb-src');
        root.querySelectorAll('[data-dt-thumb]').forEach(function (b) { b.classList.remove('dt-thumb--active'); });
        btn.classList.add('dt-thumb--active');
      });
    });

    /* Quantity stepper */
    root.querySelectorAll('.dt-qty-selector').forEach(function (group) {
      var input = group.querySelector('.dt-qty-input');
      var minus = group.querySelector('[data-dt-qty-minus]');
      var plus = group.querySelector('[data-dt-qty-plus]');
      if (minus) minus.addEventListener('click', function () {
        var v = parseInt(input.value, 10) || 1;
        if (v > 1) input.value = v - 1;
      });
      if (plus) plus.addEventListener('click', function () {
        var v = parseInt(input.value, 10) || 1;
        input.value = v + 1;
      });
    });

    /* Variant selection: update price, compare price, availability, hidden id everywhere */
    function updateVariantUI(variant) {
      if (!variant) return;

      root.querySelectorAll('[data-dt-variant-id], [data-dt-variant-id-order]').forEach(function (input) {
        input.value = variant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      var priceStr = formatMoney(variant.price);
      root.querySelectorAll('[data-dt-price]').forEach(function (el) { el.textContent = priceStr; });
      root.querySelectorAll('[data-dt-sticky-price]').forEach(function (el) { el.textContent = priceStr; });

      var hasDiscount = variant.compare_at_price && variant.compare_at_price > variant.price;
      root.querySelectorAll('[data-dt-compare-price]').forEach(function (el) {
        if (hasDiscount) {
          el.textContent = formatMoney(variant.compare_at_price);
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
      root.querySelectorAll('[data-dt-discount-badge]').forEach(function (el) {
        if (hasDiscount) {
          var pct = Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100);
          el.textContent = '-' + pct + '%';
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });

      root.querySelectorAll('[data-dt-availability]').forEach(function (el) {
        el.hidden = !!variant.available;
      });
      root.querySelectorAll('[data-dt-add-to-cart]').forEach(function (btn) {
        btn.disabled = !variant.available;
        var label = btn.querySelector('[data-dt-add-to-cart-label]');
        if (label && !label.dataset.dtCustomLabel) {
          label.textContent = variant.available ? label.dataset.dtAvailableText || label.textContent : 'RUPTURE DE STOCK';
        }
      });

      root.dispatchEvent(new CustomEvent('dermatool:variant:change', { bubbles: true, detail: { variant: variant } }));
    }

    root.querySelectorAll('[data-dt-form]').forEach(function (form) {
      var optionInputs = form.querySelectorAll('[data-dt-option]');
      if (!optionInputs.length) return;
      optionInputs.forEach(function (input) {
        input.addEventListener('change', function () {
          var groups = {};
          optionInputs.forEach(function (i) {
            if (i.checked) groups[i.dataset.dtOption] = i.value;
          });
          var values = Object.keys(groups).sort().map(function (k) { return groups[k]; });
          var match = variants.find(function (v) {
            return v.options.length === values.length && v.options.every(function (val, idx) { return val === values[idx]; });
          });
          if (match) updateVariantUI(match);
        });
      });
    });

    /* Add to cart (AJAX, real order) — EasySell App Embed intercepts this same form when active */
    root.querySelectorAll('[data-dt-add-to-cart]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (btn.disabled) return;
        var form = btn.closest('form');
        if (!form) return;
        var label = btn.querySelector('[data-dt-add-to-cart-label]');
        var originalText = label ? label.textContent : '';

        var formData = new FormData(form);
        btn.disabled = true;
        if (label) label.textContent = 'Ajout en cours...';

        fetch('/cart/add.js', {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' }
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Add to cart failed');
            return res.json();
          })
          .then(function () {
            if (label) label.textContent = '✓ Ajouté au panier';
            return fetch('/cart.js').then(function (res) { return res.json(); });
          })
          .then(function (cart) {
            document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
          })
          .catch(function () {
            if (label) label.textContent = 'Erreur, réessayez';
          })
          .finally(function () {
            setTimeout(function () {
              btn.disabled = false;
              if (label) label.textContent = originalText;
            }, 1800);
          });
      });
    });

    /* Smooth scroll CTAs */
    root.querySelectorAll('[data-dt-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-dt-scroll'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    /* Before / After interactive slider */
    root.querySelectorAll('[data-dt-ba-slider]').forEach(function (slider) {
      var range = slider.querySelector('[data-dt-ba-range]');
      var before = slider.querySelector('[data-dt-ba-before]');
      var handle = slider.querySelector('[data-dt-ba-handle]');
      if (!range || !before) return;
      function apply(value) {
        before.style.clipPath = 'inset(0 ' + (100 - value) + '% 0 0)';
        if (handle) handle.style.left = value + '%';
      }
      range.addEventListener('input', function () { apply(range.value); });
      apply(range.value);
    });

    /* Sticky mobile bar visibility (shows once order section is out of view) */
    var stickyBar = root.querySelector('[data-dt-sticky-bar]');
    var orderSection = root.querySelector('.dt-order');
    if (stickyBar && orderSection) {
      window.addEventListener('scroll', function () {
        var r = orderSection.getBoundingClientRect();
        var isOrderVisible = r.top < window.innerHeight && r.bottom > 0;
        stickyBar.classList.toggle('is-visible', !isOrderVisible && window.scrollY > 200);
      }, { passive: true });
    }
  }

  document.querySelectorAll('.dt-page').forEach(initProductPage);
})();
