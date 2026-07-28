(function () {
  document.querySelectorAll('.essalem-landing').forEach(function (root) {
    var revealTargets = root.querySelectorAll('[data-lp-reveal]');
    if (revealTargets.length) {
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
        );
        revealTargets.forEach(function (el) { observer.observe(el); });
      } else {
        revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
      }
    }

    root.querySelectorAll('[data-lp-gallery]').forEach(function (gallery) {
      var track = gallery.querySelector('[data-lp-gallery-track]');
      if (!track) return;
      var step = function () {
        var item = track.querySelector('[data-lp-gallery-item]');
        return item ? item.getBoundingClientRect().width + 20 : 300;
      };
      gallery.querySelectorAll('[data-lp-gallery-prev]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          track.scrollBy({ left: step(), behavior: 'smooth' });
        });
      });
      gallery.querySelectorAll('[data-lp-gallery-next]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          track.scrollBy({ left: -step(), behavior: 'smooth' });
        });
      });
    });

    root.querySelectorAll('[data-lp-qty]').forEach(function (wrapper) {
      var input = wrapper.querySelector('[data-lp-qty-input]');
      if (!input) return;
      wrapper.querySelectorAll('[data-lp-qty-minus]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
          input.value = v;
        });
      });
      wrapper.querySelectorAll('[data-lp-qty-plus]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = Math.max(1, (parseInt(input.value, 10) || 1) + 1);
          input.value = v;
        });
      });
    });

    root.querySelectorAll('[data-lp-offer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qty = parseInt(btn.getAttribute('data-lp-offer-qty'), 10) || 1;
        var qtyInput = root.querySelector('[data-lp-qty-input]');
        if (qtyInput) qtyInput.value = qty;
        var order = root.querySelector('[data-lp-order]');
        if (order) order.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    root.querySelectorAll('[data-lp-scroll-to]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = root.querySelector(btn.getAttribute('data-lp-scroll-to'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  });
})();
