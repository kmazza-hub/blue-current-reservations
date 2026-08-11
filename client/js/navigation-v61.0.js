(function(){
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
  const links=Array.from(document.querySelectorAll(".desktop-nav a[href^='#'], .mobile-nav a[href^='#']"));
  links.forEach(link=>{
    link.addEventListener("click",event=>{
      const id=link.getAttribute("href")?.slice(1);
      const target=id?document.getElementById(id):null;
      if(!target)return;
      event.preventDefault();
      document.querySelectorAll(".bc-deep-tool.bc-nav-open").forEach(x=>x.classList.remove("bc-nav-open"));
      const hiddenParent=target.closest(".bc-deep-tool");
      if(hiddenParent)hiddenParent.classList.add("bc-nav-open");
      target.scrollIntoView({behavior:"smooth",block:"start"});
      history.replaceState(null,"",`#${id}`);
      document.querySelectorAll(".desktop-nav a").forEach(a=>a.removeAttribute("aria-current"));
      document.querySelector(`.desktop-nav a[href="#${CSS.escape(id)}"]`)?.setAttribute("aria-current","page");
      const mobile=document.getElementById("mobileNav");
      if(mobile&&!mobile.hidden){
        mobile.hidden=true;
        document.querySelector(".menu-button")?.setAttribute("aria-expanded","false");
      }
    });
  });
});
})();