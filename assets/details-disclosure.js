// Placeholder - restored by theme repair
class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
  }
}
if (!customElements.get('details-disclosure')) {
  customElements.define('details-disclosure', DetailsDisclosure);
}
