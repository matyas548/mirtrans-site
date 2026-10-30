document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const toggle = document.querySelector('#nav-toggle');
    if (toggle) toggle.checked = false;
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const items = document.querySelectorAll(".faq-item");

  items.forEach((item) => {
    const btn = item.querySelector(".faq-question");
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("faq-open");

      // zavřít všechny
      items.forEach(i => i.classList.remove("faq-open"));

      // když nebyl otevřený, znovu ho otevřít
      if (!isOpen) {
        item.classList.add("faq-open");
      }
    });
  });
});

(() => {
  const wrap = document.getElementById("whyNetwork");
  if (!wrap) return;

  const svg = wrap.querySelector(".why-network__lines");
  const lines = Array.from(svg.querySelectorAll("line"));
  const bubbles = Array.from(wrap.querySelectorAll(".why-bubble"));

  const getCenter = (el) => {
    const r = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return {
      x: r.left - w.left + r.width / 2,
      y: r.top - w.top + r.height / 2
    };
  };

  const layoutLines = () => {
    const w = wrap.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${w.width} ${w.height}`);

    lines.forEach((ln) => {
      const from = document.getElementById(ln.dataset.from);
      const to = document.getElementById(ln.dataset.to);
      if (!from || !to) return;

      const a = getCenter(from);
      const b = getCenter(to);

      ln.setAttribute("x1", a.x);
      ln.setAttribute("y1", a.y);
      ln.setAttribute("x2", b.x);
      ln.setAttribute("y2", b.y);
    });
  };

  const clearActive = () => {
    lines.forEach((l) => l.classList.remove("is-active"));
  };

  const setActive = (id) => {
    lines.forEach((l) => {
      const on = l.dataset.from === id || l.dataset.to === id;
      l.classList.toggle("is-active", on);
    });
  };

  bubbles.forEach((b) => {
    b.setAttribute("tabindex", "0"); // ať jde i přes klávesnici
    b.addEventListener("mouseenter", () => setActive(b.id));
    b.addEventListener("focus", () => setActive(b.id));
  });

  wrap.addEventListener("mouseleave", clearActive);
  wrap.addEventListener("blur", clearActive, true);

  window.addEventListener("resize", layoutLines);
  window.addEventListener("load", layoutLines);

  layoutLines();
})();

(() => {
  const marquee = document.getElementById("whyMarquee");
  if (!marquee) return;

  const track = marquee.querySelector(".marquee__track");
  if (!track) return;

  // px za sekundu – klidný premium pohyb
  const speed = 55;

  const setDuration = () => {
    const trackWidth = track.scrollWidth;
    // díky duplikaci chceme projet polovinu obsahu
    const half = trackWidth / 2;
    const seconds = Math.max(24, Math.round(half / speed));
    track.style.setProperty("--marquee-duration", `${seconds}s`);
  };

  window.addEventListener("load", setDuration);
  window.addEventListener("resize", setDuration);
  setDuration();
})();

// Infinite auto-scroll for #bigRail / .rail
document.addEventListener("DOMContentLoaded", () => {
  const rail =
    document.getElementById("bigRail") ||
    document.querySelector(".rail");

  if (!rail) {
    console.warn("[rail] Nenalezen #bigRail ani .rail – jsi na správné stránce?");
    return;
  }

  const scroller = rail.querySelector(".rail__track");
  if (!scroller) {
    console.warn("[rail] Nenalezen .rail__track uvnitř railu – zkontroluj HTML strukturu.");
    return;
  }

  // Když někdo nechce animace
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Vypni snap při auto režimu (jinak to může cukat)
  rail.classList.add("is-auto");

  // --- helper: odstraní id atributy v klonech (aby nebyly duplicitní) ---
  const stripIds = (node) => {
    if (node.nodeType !== 1) return;
    node.removeAttribute("id");
    for (const ch of node.children) stripIds(ch);
  };

  // --- Duplikuj jen karty (děti tracku), ne přes innerHTML ---
  const originals = Array.from(scroller.children);
  const clones = originals.map((el) => {
    const c = el.cloneNode(true);
    stripIds(c);
    c.setAttribute("aria-hidden", "true");
    c.dataset.clone = "1";
    return c;
  });
  clones.forEach((c) => scroller.appendChild(c));

  let pausedHover = false;
  let pausedUser = false;

  // „premium" rychlost
  const pxPerSec = 40;

  let last = performance.now();

  const tick = (now) => {
    const dt = (now - last) / 1000;
    last = now;

    if (!pausedHover && !pausedUser) {
      scroller.scrollLeft += pxPerSec * dt;

      const half = scroller.scrollWidth / 2;
      if (scroller.scrollLeft >= half) scroller.scrollLeft -= half;
    }

    requestAnimationFrame(tick);
  };

  rail.addEventListener("mouseenter", () => (pausedHover = true));
  rail.addEventListener("mouseleave", () => (pausedHover = false));

  // Když user scrolluje / draguje, dej mu přednost a pak pokračuj
  let resumeTimer;
  const pauseTemporarily = () => {
    pausedUser = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => (pausedUser = false), 1200);
  };

  scroller.addEventListener("wheel", pauseTemporarily, { passive: true });
  scroller.addEventListener("pointerdown", pauseTemporarily);
  scroller.addEventListener("touchstart", pauseTemporarily, { passive: true });

  requestAnimationFrame(tick);
});

document.addEventListener("DOMContentLoaded", () => {
  const viewport = document.getElementById("mapViewport");
  const content  = document.getElementById("mapContent");
  const tooltip  = document.getElementById("mapTooltip");

  if (!viewport || !content || !tooltip) return;

  // DŮLEŽITÉ: naše výpočty berou transform origin vlevo nahoře
  content.style.transformOrigin = "0 0";

  const svg = content.querySelector("svg.eu-map");
  if (!svg) return;

  const regions = svg.querySelectorAll("[id]");
  if (!regions.length) return;

  const isCoarse =
    window.matchMedia("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  // Na mobilu nechceme, aby se stránka prala s mapou při gestách
  viewport.style.touchAction = "auto";

  // ISO -> názvy
  const names = {
    CZ: "Česko", SK: "Slovensko", DE: "Německo", AT: "Rakousko", PL: "Polsko",
    HU: "Maďarsko", IT: "Itálie", FR: "Francie", ES: "Španělsko", PT: "Portugalsko",
    GB: "Spojené království", IE: "Irsko", DK: "Dánsko", SE: "Švédsko", FI: "Finsko",
    NO: "Norsko", IS: "Island", EE: "Estonsko", LV: "Lotyšsko", LT: "Litva",
    NL: "Nizozemsko", BE: "Belgie", LU: "Lucembursko", CH: "Švýcarsko",
    SI: "Slovinsko", HR: "Chorvatsko", BA: "Bosna a Hercegovina", RS: "Srbsko",
    ME: "Černá Hora", AL: "Albánie", MK: "Severní Makedonie", BG: "Bulharsko",
    RO: "Rumunsko", GR: "Řecko", TR: "Turecko", UA: "Ukrajina", BY: "Bělorusko",
    MD: "Moldavsko", GE: "Gruzie", AM: "Arménie", AZ: "Ázerbájdžán",
  };
  const getName = (id) => names[id] || id;

  const moveTooltip = (clientX, clientY) => {
    const r = viewport.getBoundingClientRect();
    tooltip.style.left = `${clientX - r.left}px`;
    tooltip.style.top  = `${clientY - r.top}px`;
  };

  regions.forEach((el) => {
    el.setAttribute("aria-label", getName(el.id));

    // Desktop hover tooltip
    el.addEventListener("mouseenter", (e) => {
      if (isCoarse) return;
      tooltip.textContent = getName(el.id);
      tooltip.classList.add("is-visible");
      moveTooltip(e.clientX, e.clientY);
    });
    el.addEventListener("mousemove", (e) => {
      if (isCoarse) return;
      moveTooltip(e.clientX, e.clientY);
    });
    el.addEventListener("mouseleave", () => {
      if (isCoarse) return;
      tooltip.classList.remove("is-visible");
    });
  });
});
