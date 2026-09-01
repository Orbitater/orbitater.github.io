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

  /* Landed at burned up.
     Walang API na nagsasabi kung tubo o lugi ang isang nagbenta. Ang ibinibigay
     ng GeckoTerminal ay ang mismong listahan ng kalakalan, kaya dito bilangin.
     Sa bawat wallet, ang binili ay nagiging katamtamang halaga ng nabili nito.
     Kapag nagbenta ito, ang presyo ng pagbenta laban sa halagang iyon ang
     nagsasabi kung nakalapag ito o nasunog.

     Ang hindi masasagot: ang bumili bago pa magsimula ang nakikitang kasaysayan
     ay walang alam na halaga, kaya hindi ito binibilang sa kahit alin. Mas
     mabuting kulang kaysa hulaan. */
  const pnl = document.getElementById("pnl");
  let lastPool = "";

  const landings = (pool) => {
    if (!pnl || pool === lastPool + "#busy") return;
    lastPool = pool;
    fetch("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + pool + "/trades",
          { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const rows = (d && d.data) || [];
        if (!rows.length) { pnl.hidden = true; return; }
        const held = new Map();          // wallet -> { tok, cost }
        let win = 0, lose = 0;
        for (let i = rows.length - 1; i >= 0; i--) {      // pinakaluma muna
          const a = rows[i].attributes || {};
          const who = a.tx_from_address;
          if (!who) continue;
          const buy = a.kind === "buy";
          const tok = Number(buy ? a.to_token_amount : a.from_token_amount);
          const px = Number(buy ? a.price_to_in_usd : a.price_from_in_usd);
          if (!(tok > 0) || !(px > 0)) continue;
          const h = held.get(who) || { tok: 0, cost: 0 };
          if (buy) {
            h.tok += tok; h.cost += tok * px;
          } else if (h.tok > 0) {
            const avg = h.cost / h.tok;
            if (px > avg) win++; else lose++;
            const used = Math.min(tok, h.tok);
            h.cost -= avg * used; h.tok -= used;
          }
          held.set(who, h);
        }
        put("pnl-win", String(win));
        put("pnl-lose", String(lose));
        put("pnl-all", String(win + lose));
        pnl.hidden = false;
      })
      .catch(() => { if (pnl) pnl.hidden = true; });
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
   anyone to copy it by hand. There are two buttons: one in the header, reachable
   from anywhere on the page, and one beside the address itself.

   The clipboard API needs a secure context and this page has one, but the old
   command is kept behind it, and if both fail the text is selected so a long
   press can finish the job. */
(() => {
  const code = document.getElementById("ca");
  if (!code) return;
  const text = code.textContent.trim();

  const legacy = () => {
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

  const wire = (btn, ok, fail, rest) => {
    if (!btn) return;
    const flash = (t) => {
      btn.textContent = t; btn.classList.add("done");
      setTimeout(() => { btn.textContent = rest; btn.classList.remove("done"); }, 1800);
    };
    btn.addEventListener("click", () => {
      if (navigator.clipboard && isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => flash(ok))
          .catch(() => { if (legacy()) flash(ok); else { select(); flash(fail); } });
        return;
      }
      if (legacy()) flash(ok); else { select(); flash(fail); }
    });
  };

  wire(document.getElementById("ca-copy"), "Copied", "Select", "Copy");
  wire(document.getElementById("ca-top"), "Copied", "Select", "Copy CA");
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

  const KEY = "orbitater.sound";
  const remember = (v) => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} };
  const recall = () => { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };

  /* Ipakita ang pangalan ng bahaging tumutugtog. Ang pagpalit na hindi mo
     nakikita ay pagpalit na hindi mo pinaniniwalaan. */
  let part = "";
  const paint = (on) => {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (!lbl) return;
    lbl.textContent = on ? (part || "Sound on") : "Sound";
  };

  let want = false;

  /* Ang pindutan ay sumasalamin sa tunay na estado ng tugtog, hindi sa huling
     iniutos ko. Kung ang telepono, ang lock screen, o ang ibang tab ang huminto,
     makikita mo iyon dito. Nasa ibaba ito ng paint at ng remember dahil ginagamit
     sila nito, at ang const ay hindi maaaring gamitin bago ito idineklara. */
  const bgm = makeBgm(
    (playing) => { want = playing; paint(playing); remember(playing); },
    (name) => { part = name; if (want) paint(true); },
  );
  if (!bgm) return;
  btn.hidden = false;

  const set = async (on) => {
    want = on;
    paint(on);
    remember(on);
    if (on) {
      try {
        await bgm.start();
      } catch (e) {
        /* Ang AbortError ay hindi kabiguan. Ganito tumatanggi ang play() kapag
           may humintong iba habang naghihintay pa ito, at nangyayari iyon sa
           tuwing hinahawakan ng lock screen o ng ibang tab ang tugtog. Ang
           pagtawag doong sira ay pagsisinungaling ng pindutan. */
        if (e && e.name === "AbortError") return;
        paint(false); want = false; remember(false);
        if (lbl) lbl.textContent = "No sound";
        return;
      }
      if (bgm.state !== "running" && lbl) lbl.textContent = "Blocked";
    } else bgm.stop();
  };

  btn.addEventListener("click", () => set(!want));

  /* Walang pagtigil kapag lumipat ka ng app. Iyon mismo ang punto: dapat
     tumuloy ito habang naka-lock ang screen. */

  /* Kung naka-on ito noong huli, subukan agad. Kadalasan ay pinapayagan ito ng
     browser sa isang site na pinatugtog mo na dati, at doon nawawala ang pagkaputol
     sa bawat refresh. Kung hindi, maghihintay ito ng unang paghawak, dahil iyon
     ang senyas na tinatanggap ng browser. */
  if (recall()) {
    paint(true);
    want = true;
    bgm.start().catch(() => {
      const wake = () => {
        removeEventListener("pointerdown", wake);
        removeEventListener("keydown", wake);
        set(true);
      };
      addEventListener("pointerdown", wake, { once: true });
      addEventListener("keydown", wake, { once: true });
    });
  }
})();

/* ---- the market ------------------------------------------------------------
   Buys, sells and volume for the last 24 hours, read from DexScreener, which is
   the one source that answers a browser at all. Solana's public RPC refuses with
   429 and Pump.fun's own API says Not allowed by CORS, so the holder count that
   would sit here cannot be fetched by a page like this. It is left out rather
   than approximated, for the same reason the panel above it disappears instead
   of inventing an altitude. */
(() => {
  const box = document.getElementById("mkt");
  const note = document.getElementById("mkt-note");
  if (!box) return;

  const MINT = "9Y3TM9LjEuuz7s6twHd4UPT7HE1SXSZTM2fLbaizpump";
  const URL = "https://api.dexscreener.com/latest/dex/tokens/" + MINT;

  const put = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const show = (on) => { box.hidden = !on; if (note) note.hidden = !on; };
  const money = (n) =>
    n >= 1000 ? "$" + Math.round(n).toLocaleString("en-GB")
              : "$" + n.toFixed(2);

  const BASE = 45000;
  let gap = BASE, timer = 0, onScreen = false;
  const later = () => { clearTimeout(timer); timer = setTimeout(tick, gap); };

  const pull = () => {
    fetch(URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const p = (d && d.pairs && d.pairs[0]) || null;
        if (!p || !p.txns || !p.txns.h24) return Promise.reject();
        put("mkt-buy", String(Number(p.txns.h24.buys ?? 0)));
        put("mkt-sell", String(Number(p.txns.h24.sells ?? 0)));
        put("mkt-vol", money(Number((p.volume && p.volume.h24) || 0)));
        gap = BASE;
        show(true);
        if (p.pairAddress) landings(p.pairAddress);
      })
      .catch(() => { gap = Math.min(gap * 2, 600000); show(false); })
      .then(later);
  };

  /* Landed at burned up.
     Walang API na nagsasabi kung tubo o lugi ang isang nagbenta. Ang ibinibigay
     ng GeckoTerminal ay ang mismong listahan ng kalakalan, kaya dito bilangin.
     Sa bawat wallet, ang binili ay nagiging katamtamang halaga ng nabili nito.
     Kapag nagbenta ito, ang presyo ng pagbenta laban sa halagang iyon ang
     nagsasabi kung nakalapag ito o nasunog.

     Ang hindi masasagot: ang bumili bago pa magsimula ang nakikitang kasaysayan
     ay walang alam na halaga, kaya hindi ito binibilang sa kahit alin. Mas
     mabuting kulang kaysa hulaan. */
  const pnl = document.getElementById("pnl");
  let lastPool = "";

  const landings = (pool) => {
    if (!pnl || pool === lastPool + "#busy") return;
    lastPool = pool;
    fetch("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + pool + "/trades",
          { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const rows = (d && d.data) || [];
        if (!rows.length) { pnl.hidden = true; return; }
        const held = new Map();          // wallet -> { tok, cost }
        let win = 0, lose = 0;
        for (let i = rows.length - 1; i >= 0; i--) {      // pinakaluma muna
          const a = rows[i].attributes || {};
          const who = a.tx_from_address;
          if (!who) continue;
          const buy = a.kind === "buy";
          const tok = Number(buy ? a.to_token_amount : a.from_token_amount);
          const px = Number(buy ? a.price_to_in_usd : a.price_from_in_usd);
          if (!(tok > 0) || !(px > 0)) continue;
          const h = held.get(who) || { tok: 0, cost: 0 };
          if (buy) {
            h.tok += tok; h.cost += tok * px;
          } else if (h.tok > 0) {
            const avg = h.cost / h.tok;
            if (px > avg) win++; else lose++;
            const used = Math.min(tok, h.tok);
            h.cost -= avg * used; h.tok -= used;
          }
          held.set(who, h);
        }
        put("pnl-win", String(win));
        put("pnl-lose", String(lose));
        put("pnl-all", String(win + lose));
        pnl.hidden = false;
      })
      .catch(() => { if (pnl) pnl.hidden = true; });
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
