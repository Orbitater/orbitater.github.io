import { makeBgm } from "./bgm.js";
import "./style.css";

/* ORBITATER
   Four small things, no framework, nothing that runs when it is not seen. */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- start at the start ---------------------------------------------------
   A browser restores your last scroll position on a revisit. On a page built
   as one screen per idea that means opening it lands you in the middle of a
   sentence with no hero, which reads as the site being broken. The first
   screen is the point of the first screen, so it is always the first screen.
--------------------------------------------------------------------------- */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (!location.hash) {
  // before paint, so nobody sees the jump
  scrollTo(0, 0);
  addEventListener("load", () => { if (!location.hash) scrollTo(0, 0); }, { once: true });
}

/* ---- reveals ---------------------------------------------------------------
   Nothing is hidden by something that can fail. --------------------------------*/
(() => {
  const all = document.querySelectorAll(".reveal");
  // only now is it safe to hide anything: the script is running and can undo it
  document.documentElement.classList.add("js");
  // and even so, everything is shown after four seconds no matter what happened
  setTimeout(() => all.forEach((el) => el.classList.add("in")), 4000);

  // each reveal watches itself once, then lets go
  all.forEach((el) => {
    const once = new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      el.classList.add("in");
      o.disconnect();
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    once.observe(el);
  });
})();

/* ---- parallax on the hero -------------------------------------------------
   Pointer on a desktop, tilt on a phone. It stops the moment the hero leaves
   the screen, because moving something nobody is looking at is pure battery. */
(() => {
  if (reduce) return;
  const hero = document.querySelector(".hero");
  const root = document.documentElement;
  if (!hero) return;

  let live = true;
  new IntersectionObserver(([e]) => { live = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  const set = (x, y) => {
    if (!live) return;
    root.style.setProperty("--px", x.toFixed(3));
    root.style.setProperty("--py", y.toFixed(3));
  };

  addEventListener("pointermove", (e) => {
    set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  }, { passive: true });

  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null || e.beta == null) return;
    set(Math.max(-1, Math.min(1, e.gamma / 34)), Math.max(-1, Math.min(1, (e.beta - 45) / 34)));
  }, { passive: true });
})();

/* ---- the field -------------------------------------------------------------
   Three depths of star. Depth is the whole point: they drift at different
   speeds and answer the pointer by different amounts, and that difference is
   what parallax actually is. One layer moving is just a moving layer.

   It stops dead when the tab is hidden, so a page left open costs nothing.
--------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById("space");
  if (!cv || reduce) return;
  const ctx = cv.getContext("2d", { alpha: true });

  let stars = [], W = 0, H = 0, dpr = 1, raf = 0, last = performance.now();

  const seed = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.width = innerWidth * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px";
    cv.style.height = innerHeight + "px";
    const n = Math.min(320, Math.round(innerWidth * innerHeight / 5400));
    stars = Array.from({ length: n }, () => {
      const d = Math.random();                 // 0 far, 1 near
      return {
        x: Math.random() * W, y: Math.random() * H, d,
        r: (0.4 + d * 1.5) * dpr,
        a: 0.12 + d * 0.62,
        v: (0.012 + d * 0.075) * dpr,
        t: Math.random() * 6.283,
        s: 0.5 + Math.random() * 1.8,
        warm: Math.random() < 0.14,            // a few take the gold
      };
    });
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--px")) || 0;
    const py = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--py")) || 0;

    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.y += s.v; if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      s.t += dt * s.s;
      // near stars answer the pointer far more than distant ones
      const ox = px * s.d * 26 * dpr;
      const oy = py * s.d * 18 * dpr;
      const a = s.a * (0.68 + 0.32 * Math.sin(s.t));
      ctx.fillStyle = s.warm
        ? `rgba(232,182,71,${a})`
        : `rgba(244,238,220,${a})`;
      ctx.fillRect(s.x + ox, s.y + oy, s.r, s.r);
    }
    raf = requestAnimationFrame(frame);
  };

  addEventListener("resize", seed, { passive: true });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });

  seed();
  raf = requestAnimationFrame(frame);
})();

/* ---- the one real number on the page --------------------------------------
   The panel this replaced showed an altitude and a speed that were invented in
   a loop. It measured nothing. It was a film of an instrument.

   This is the live position of the ISS, which is the one thing in low earth
   orbit that is genuinely doing what the section above describes. If the API
   cannot be reached the panel removes itself, because a readout that guesses is
   worse than no readout.

   One person runs that API and it allows 350 requests every five minutes, so it
   is only asked while the panel is actually on screen, and a failure slows the
   asking down instead of knocking harder. */
(() => {
  const box = document.getElementById("iss");
  const note = document.getElementById("iss-note");
  const lead = document.getElementById("iss-lead");
  if (!box) return;

  const put = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const place = (lat, lon) =>
    Math.abs(lat).toFixed(1) + "\u00b0 " + (lat >= 0 ? "N" : "S") + ", " +
    Math.abs(lon).toFixed(1) + "\u00b0 " + (lon >= 0 ? "E" : "W");
  /* Ang panel ay nagsasabi ng ISS sa isang seksyong tungkol sa patatas, kaya
     mukhang walang kinalaman kung walang paunang salita. Sabay silang lumalabas
     at sabay ding nawawala, para walang sandaling nakabitin ang mga numero na
     walang nagsasabi kung ano sila. */
  const show = (on) => {
    box.hidden = !on;
    if (note) note.hidden = !on;
    if (lead) lead.hidden = !on;
  };

  const BASE = 15000;
  let gap = BASE, timer = 0, onScreen = false;

  const later = () => { clearTimeout(timer); timer = setTimeout(tick, gap); };

  const pull = () => {
    fetch("https://api.wheretheiss.at/v1/satellites/25544", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (typeof d.altitude !== "number" || typeof d.velocity !== "number") return Promise.reject();
        put("iss-alt", d.altitude.toFixed(1));
        put("iss-vel", Math.round(d.velocity).toLocaleString("en-GB"));
        put("iss-pos", place(d.latitude, d.longitude));
        gap = BASE;
        show(true);
      })
      .catch(() => { gap = Math.min(gap * 2, 300000); show(false); })
      .then(later);
  };

  const tick = () => { if (onScreen && !document.hidden) pull(); else later(); };

  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) { gap = BASE; tick(); }
  }, { threshold: 0 }).observe(box.parentElement || box);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && onScreen) tick();
  });
})();

/* ---- the address ----------------------------------------------------------
   A mistyped mint address is somebody else's money gone, so the page never asks
   anyone to copy it by hand. The clipboard API needs a secure context and this
   page has one, but the old command is kept behind it, and if both fail the
   text is selected so a long press can finish the job. */
(() => {
  const code = document.getElementById("ca");
  const b = document.getElementById("ca-copy");
  if (!code || !b) return;

  const flash = (t) => {
    b.textContent = t; b.classList.add("done");
    setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done"); }, 1800);
  };
  const legacy = (text) => {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", "");
    t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(t);
    return ok;
  };
  const select = () => {
    const r = document.createRange(); r.selectNodeContents(code);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  };

  b.addEventListener("click", () => {
    const text = code.textContent.trim();
    if (navigator.clipboard && isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => flash("Copied"))
        .catch(() => { if (legacy(text)) flash("Copied"); else { select(); flash("Select"); } });
      return;
    }
    if (legacy(text)) flash("Copied"); else { select(); flash("Select"); }
  });
})();

/* ---- sound -----------------------------------------------------------------
   Every modern browser blocks audio that starts on its own, and they are right
   to. So this never starts by itself. What it does remember is the choice: if
   the sound was on last time, it waits for the first touch or key anywhere on
   the page and starts there, because that is the gesture a browser accepts.

   The music has no file behind it. It is built note by note while it plays, so
   there is nothing to download and nothing to license. */
(() => {
  const btn = document.getElementById("snd");
  const lbl = document.getElementById("snd-lbl");
  if (!btn) return;

  const bgm = makeBgm();
  if (!bgm) return;                       // walang Web Audio, walang pindutan
  btn.hidden = false;

  const KEY = "orbitater.sound";
  const remember = (v) => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} };
  const recall = () => { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };

  const paint = (on) => {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (lbl) lbl.textContent = on ? "Sound on" : "Sound";
  };

  let want = false;
  const set = async (on) => {
    want = on;
    paint(on);
    remember(on);
    if (on) {
      try {
        await bgm.start();
        /* Kung hindi tumakbo ang konteksto, huwag magsabing tumutugtog. */
        if (bgm.state !== "running" && lbl) lbl.textContent = "Blocked";
      } catch (e) {
        paint(false); want = false;
        if (lbl) lbl.textContent = "No sound";
      }
    } else bgm.stop();
  };

  btn.addEventListener("click", () => set(!want));

  /* Walang pagtigil kapag lumipat ka ng app. Iyon mismo ang punto: dapat
     tumuloy ito habang naka-lock ang screen. */

  if (recall()) {
    paint(true);
    const wake = () => {
      removeEventListener("pointerdown", wake);
      removeEventListener("keydown", wake);
      set(true);
    };
    addEventListener("pointerdown", wake, { once: true });
    addEventListener("keydown", wake, { once: true });
  }
})();
