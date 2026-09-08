(() => {
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new CustomEvent('bluecurrent:predictive-integration-ready'));
});
})();