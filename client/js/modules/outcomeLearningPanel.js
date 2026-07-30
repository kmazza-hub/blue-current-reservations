(() => {
'use strict';
window.addEventListener('DOMContentLoaded',()=>{
  window.dispatchEvent(new CustomEvent('bluecurrent:outcome-learning-ready'));
});
})();