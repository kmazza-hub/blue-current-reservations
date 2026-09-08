(function(){
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
 const body=document.body;
 if(!body?.matches('[data-web-certified="36"]'))return;

 const menuButton=document.querySelector(".menu-button");
 const mobileNav=document.getElementById("mobileNav");

 mobileNav?.querySelectorAll('a[href^="#"]').forEach(link=>{
   link.addEventListener("click",()=>{
     mobileNav.hidden=true;
     menuButton?.setAttribute("aria-expanded","false");
   });
 });
 document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&mobileNav&&!mobileNav.hidden){
     mobileNav.hidden=true;
     menuButton?.setAttribute("aria-expanded","false");
     menuButton?.focus();
   }
 });

 const desktopMq=window.matchMedia("(min-width: 1101px)");
 const closeForDesktop=()=>{
   if(desktopMq.matches&&mobileNav&&!mobileNav.hidden){
     mobileNav.hidden=true;
     menuButton?.setAttribute("aria-expanded","false");
   }
 };
 desktopMq.addEventListener?.("change",closeForDesktop);
 closeForDesktop();

 const navLinks=[...document.querySelectorAll('.desktop-nav a[href^="#"]')];
 const navPairs=navLinks.map(link=>({link,target:document.getElementById(link.getAttribute("href").slice(1))})).filter(x=>x.target);
 if("IntersectionObserver" in window){
   const observer=new IntersectionObserver(entries=>{
     const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
     if(!visible)return;
     navPairs.forEach(({link,target})=>{
       if(target===visible.target)link.setAttribute("aria-current","page");
       else link.removeAttribute("aria-current");
     });
   },{rootMargin:"-22% 0px -62% 0px",threshold:[0,.08,.2,.4]});
   navPairs.forEach(({target})=>observer.observe(target));
 }

 document.addEventListener("click",event=>{
   const link=event.target.closest('a[href^="#"]');
   if(!link)return;
   const id=link.getAttribute("href").slice(1);
   const target=document.getElementById(id);
   if(!target)return;
   if(!target.hasAttribute("tabindex"))target.setAttribute("tabindex","-1");
   setTimeout(()=>target.focus({preventScroll:true}),450);
 });

 document.querySelectorAll('a[target="_blank"]').forEach(link=>{
   const rel=new Set((link.getAttribute("rel")||"").split(/\s+/).filter(Boolean));
   rel.add("noopener");rel.add("noreferrer");
   link.setAttribute("rel",[...rel].join(" "));
 });

 const floating=document.getElementById("bcConversionFloat");
 const updateFloat=()=>{
   if(!floating)return;
   floating.classList.toggle("is-compact",window.innerHeight<620);
 };
 window.addEventListener("resize",updateFloat);
 updateFloat();

 document.documentElement.dataset.bcWebsiteCertification="WEB-036";
});
})();