(function () {
  "use strict";

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) {
    const element = byId(id);
    if (!element || value === undefined || value === null) return false;
    element.textContent = String(value);
    return true;
  }
  function setHtml(id, value) {
    const element = byId(id);
    if (!element) return false;
    element.innerHTML = value ?? "";
    return true;
  }
  function setClass(id, value) {
    const element = byId(id);
    if (!element) return false;
    element.className = value || "";
    return true;
  }
  function on(id, type, handler, options) {
    const element = byId(id);
    if (!element) return () => {};
    element.addEventListener(type, handler, options);
    return () => element.removeEventListener(type, handler, options);
  }

  window.BlueCurrentDOM = Object.freeze({ byId, setText, setHtml, setClass, on });
})();
