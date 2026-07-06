// Reveal-on-scroll for .lux-fade-up elements
(function () {
  if (!('IntersectionObserver' in window)) return;

  function init() {
    var targets = document.querySelectorAll('.lux-fade-up, .lux-reveal');
    if (!targets.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            entry.target.classList.add('lux-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
