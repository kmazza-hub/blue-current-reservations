"use strict";

(() => {
  const FIX_CLASS = "bc-auto-light-contrast";
  const ROOT_CLASS = "bc-contrast-guard-ready";
  const TEXT_SELECTOR = [
    "h1","h2","h3","h4","h5","h6","p","span","small","strong","b","em",
    "label","legend","li","dt","dd","th","td","caption","a","button",
    "input","textarea","select","option","output","summary"
  ].join(",");

  const parseColor = value => {
    const m = String(value || "").match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i);
    if (!m) return null;
    return {
      r: Math.max(0, Math.min(255, Number(m[1]))),
      g: Math.max(0, Math.min(255, Number(m[2]))),
      b: Math.max(0, Math.min(255, Number(m[3]))),
      a: m[4] == null ? 1 : Math.max(0, Math.min(1, Number(m[4])))
    };
  };

  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1
  });

  const channel = c => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const luminance = c => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  const contrast = (a,b) => {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  };

  const effectiveBackground = element => {
    let bg = {r:255,g:255,b:255,a:1};
    const stack = [];
    let node = element;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      const color = parseColor(style.backgroundColor);
      if (color && color.a > 0) stack.push(color);
      node = node.parentElement;
    }
    // Blend from outermost to innermost.
    for (let i=stack.length-1;i>=0;i--) bg = blend(stack[i],bg);
    return bg;
  };

  const isVisible = el => {
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity || 1) > 0.05;
  };

  const requiresFix = el => {
    if (!isVisible(el)) return false;
    if (el.closest("[hidden],[aria-hidden='true']")) return false;

    const style = getComputedStyle(el);
    const fg = parseColor(style.color);
    if (!fg) return false;
    const bg = effectiveBackground(el);

    // Only enforce dark ink on genuinely light surfaces.
    if (luminance(bg) < 0.62) return false;

    const actualFg = fg.a < 1 ? blend(fg,bg) : fg;
    const ratio = contrast(actualFg,bg);
    const size = parseFloat(style.fontSize) || 16;
    const weight = parseInt(style.fontWeight,10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const minimum = large ? 3 : 4.5;

    return ratio < minimum;
  };

  const evaluate = root => {
    const nodes = root.matches?.(TEXT_SELECTOR)
      ? [root, ...root.querySelectorAll(TEXT_SELECTOR)]
      : [...root.querySelectorAll(TEXT_SELECTOR)];

    for (const el of nodes) {
      const shouldFix = requiresFix(el);
      el.classList.toggle(FIX_CLASS, shouldFix);
      if (shouldFix) el.setAttribute("data-bc-contrast-fix","dark-on-light");
      else el.removeAttribute("data-bc-contrast-fix");
    }
  };

  let scheduled = false;
  const schedule = root => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      evaluate(root || document.body);
    });
  };

  const start = () => {
    document.documentElement.classList.add(ROOT_CLASS);
    schedule(document.body);

    const observer = new MutationObserver(mutations => {
      let root = null;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.target?.nodeType === 1) {
          root = mutation.target;
          break;
        }
        if (mutation.type === "attributes" && mutation.target?.nodeType === 1) {
          root = mutation.target.closest("section,main,article,div") || mutation.target;
          break;
        }
      }
      schedule(root || document.body);
    });
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:["class","style","hidden","aria-hidden"]
    });

    window.addEventListener("resize",() => schedule(document.body),{passive:true});
    window.addEventListener("hashchange",() => schedule(document.body),{passive:true});
    document.addEventListener("bc:view-change",() => schedule(document.body));
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.BlueCurrentLightSurfaceContrastGuard = { refresh:() => schedule(document.body) };
})();
