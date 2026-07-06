/* ==========================================================================
   Dawn-compatible global.js — Essalam Elegance
   Core utilities + web components
   ========================================================================== */

// ---- Utility functions ----

function getFocusableElements(container) {
  return [
    ...container.querySelectorAll(
      'summary, a[href], button:enabled, [tabindex]:not([tabindex^=\'-\']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe'
    )
  ];
}

function trapFocus(container, elementToFocus = container) {
  const elements = getFocusableElements(container);
  const first = elements[0];
  const last = elements[elements.length - 1];

  removeTrapFocus(container);

  container.addEventListener('focusin', onFocusIn);
  container.addEventListener('keydown', onKeyDown);

  function onFocusIn(e) {
    if (e.target !== container && !container.contains(e.target)) {
      first && first.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container._trapFocusHandlers = { onFocusIn, onKeyDown };
  elementToFocus.focus();
}

function removeTrapFocus(container) {
  if (container._trapFocusHandlers) {
    container.removeEventListener('focusin', container._trapFocusHandlers.onFocusIn);
    container.removeEventListener('keydown', container._trapFocusHandlers.onKeyDown);
  }
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach(video => {
    video.contentWindow.postMessage('{ "event": "command", "func": "pauseVideo", "args": "" }', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach(video => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach(video => video.pause());
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    return fn(...args);
  };
}

// Pub/sub
const subscribers = {};
function subscribe(eventName, callback) {
  if (!subscribers[eventName]) subscribers[eventName] = [];
  subscribers[eventName].push(callback);
  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter(cb => cb !== callback);
  };
}
function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach(callback => callback(data));
  }
}

// PUB_SUB_EVENTS constants
const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  variantChange: 'variant-change',
  cartError: 'cart-error',
};

// ---- Quantity Input Component ----
class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach(button =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
    const button = event.currentTarget;
    button.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector('.quantity__button[name="minus"]');
      if (buttonMinus) buttonMinus.classList.toggle('disabled', value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector('.quantity__button[name="plus"]');
      if (buttonPlus) buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}
customElements.define('quantity-input', QuantityInput);

// ---- Menu Drawer ----
class MenuDrawer extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach(summary => {
      summary.addEventListener('click', this.onSummaryClick.bind(this));
    });
  }

  onKeyUp(event) {
    if (event.code !== 'Escape') return;
    this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'));
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addShieldListener() {
      document.body.addEventListener('click', closeShield);
    }

    function closeShield({ target }) {
      if (!detailsElement.contains(target)) {
        detailsElement.removeAttribute('open');
        document.body.removeEventListener('click', closeShield);
      }
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen === false) {
        this.openMenuDrawer(summaryElement);
        if (reducedMotion.matches) {
          addShieldListener();
        } else {
          addShieldListener();
        }
      } else {
        this.closeMenuDrawer(event, summaryElement);
      }
    }
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) {
        this.closeMenuDrawer();
      }
    });
  }

  openMenuDrawer(summaryElement) {
    this.mainDetailsToggle.setAttribute('open', true);
    document.body.classList.add('overflow-hidden');
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (!this.mainDetailsToggle.hasAttribute('open')) return;
    this.mainDetailsToggle.removeAttribute('open');
    document.body.classList.remove('overflow-hidden');
    if (elementToFocus) elementToFocus.focus();
  }
}
customElements.define('menu-drawer', MenuDrawer);

// ---- Modal Dialog ----
class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose"]')?.addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code !== 'Escape') return;
      this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) {
          this.hide();
        }
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    removeTrapFocus(this);
    this.removeAttribute('open');
    if (this.openedBy) this.openedBy.focus();
  }
}
customElements.define('modal-dialog', ModalDialog);

// ---- Product Recommendations ----
class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      const url = this.dataset.url;
      if (!url) return;

      fetch(url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');
          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }
        })
        .catch((e) => {
          console.error('Failed to load recommendations:', e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  }
}
customElements.define('product-recommendations', ProductRecommendations);

// ---- Variant Selects ----
class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange.bind(this));
  }

  onVariantChange(event) {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select, fieldset'), (element) => {
      if (element.tagName === 'SELECT') return element.value;
      return Array.from(element.querySelectorAll('input')).find((radio) => radio.checked)?.value;
    });
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => this.options[index] === option)
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant || !this.currentVariant.featured_media) return;
    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
    mediaGalleries.forEach((mediaGallery) => {
      mediaGallery.setActiveMedia?.(
        `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
        true
      );
    });
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      if (input) input.value = this.currentVariant.id;
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;
    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;
    const productForm = section.querySelector('product-form');
    productForm?.handleErrorMessage?.();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection || this.dataset.section;

    const priceWrapper = document.querySelectorAll(`.price-wrapper`);
    if (priceWrapper.length === 0) return;

    fetch(`${this.dataset.url}?variant=${requestedVariantId}&section_id=${sectionId}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');

        ['price', 'Inventory', 'Sku', 'price-per-item'].forEach((id) => {
          const sourceEl = html.getElementById(`${id}-${sectionId}`);
          const destEl = document.getElementById(`${id}-${this.dataset.section}`);
          if (sourceEl && destEl) destEl.innerHTML = sourceEl.innerHTML;
        });
      })
      .catch((e) => console.error('Variant info update failed:', e));
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > .btn-label');
    if (!addButton) return;
    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText && (addButtonText.textContent = text);
    } else {
      addButton.removeAttribute('disabled');
      addButtonText && (addButtonText.textContent = window.variantStrings?.addToCart || 'Ajouter au panier');
    }
    if (!modifyClass) return;
    addButton.classList.toggle('loading', disable);
  }

  setUnavailable() {
    const addButton = document.getElementById(`product-form-${this.dataset.section}`)?.querySelector('[name="add"]');
    const addButtonText = addButton?.querySelector('.btn-label');
    const priceWrapper = document.querySelectorAll('.price-wrapper');
    if (addButton) addButton.setAttribute('disabled', true);
    if (addButtonText) addButtonText.textContent = window.variantStrings?.unavailable || 'Indisponible';
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}
customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked)?.value;
    });
  }
}
customElements.define('variant-radios', VariantRadios);

// ---- Cart notification (simple) ----
class CartNotification extends HTMLElement {
  constructor() {
    super();
    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);
    this.notification?.querySelector('#cart-notification-button')?.addEventListener('click', this.close.bind(this));
    this.querySelectorAll('.js-close')?.forEach(el => el.addEventListener('click', this.close.bind(this)));
  }

  open() {
    this.notification?.classList.add('animate', 'active');
    this.notification?.addEventListener('transitionend', () => {
      this.notification.focus();
      trapFocus(this.notification);
    }, { once: true });
    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification?.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);
    removeTrapFocus(this.notification);
  }

  handleBodyClick(event) {
    const target = event.target;
    if (target !== this.notification && !this.notification?.contains(target)) {
      this.close();
    }
  }
}
customElements.define('cart-notification', CartNotification);

// ---- Product Form ----
class ProductForm extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector('form');
    this.form?.addEventListener('submit', this.onSubmitHandler.bind(this));
    this.cartNotification = document.querySelector('cart-notification');
    this.submitButton = this.querySelector('[type="submit"]');
  }

  onSubmitHandler(event) {
    event.preventDefault();
    if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

    this.handleErrorMessage();
    this.submitButton.setAttribute('aria-disabled', true);
    this.submitButton.classList.add('loading');
    this.querySelector('.loading-overlay')?.classList.add('loading');

    const config = {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/javascript',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...JSON.parse(this.form.querySelector('[name="properties"]')?.value || '{}'),
        items: [
          {
            id: this.form.querySelector('[name="id"]').value,
            quantity: this.form.querySelector('[name="quantity"]')?.value || 1,
          },
        ],
        sections: this.cartNotification ? this.cartNotification.getSectionsToRender().map(s => s.id) : [],
        sections_url: window.location.pathname,
      }),
    };

    fetch(`${routes.cart_add_url}`, config)
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          this.handleErrorMessage(response.description || response.message);
          return;
        }
        if (this.cartNotification) this.cartNotification.renderContents(response);
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form', productVariantId: response.variant_id });
      })
      .catch((e) => {
        console.error('Add to cart error:', e);
      })
      .finally(() => {
        this.submitButton.classList.remove('loading');
        this.submitButton.removeAttribute('aria-disabled');
        this.querySelector('.loading-overlay')?.classList.remove('loading');
      });
  }

  handleErrorMessage(errorMessage = false) {
    this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
    if (!this.errorMessageWrapper) return;
    this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');
    this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
    if (errorMessage) this.errorMessage.textContent = errorMessage;
  }
}
customElements.define('product-form', ProductForm);

// ---- Header sticky behavior ----
function initStickyHeader() {
  const stickyHeader = document.querySelector('.shopify-section-header-sticky .header');
  if (!stickyHeader) return;

  const headerWrapper = stickyHeader.closest('.shopify-section');
  let prevScrollY = window.scrollY;

  const onScroll = throttle(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > 100) {
      headerWrapper.classList.add('header-wrapper--scrolled');
    } else {
      headerWrapper.classList.remove('header-wrapper--scrolled');
    }
    prevScrollY = currentScrollY;
  }, 100);

  window.addEventListener('scroll', onScroll, { passive: true });
}

document.addEventListener('DOMContentLoaded', initStickyHeader);

// ---- Routes (injected by Shopify) ---- 
window.routes = window.routes || {
  cart_add_url: '/cart/add',
  cart_change_url: '/cart/change',
  cart_update_url: '/cart/update',
  cart_url: '/cart',
  predictive_search_url: '/search/suggest',
};
