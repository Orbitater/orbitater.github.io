/* Ang tugtog: anim na bahagi, halos pitong minuto.
 *
 * Ang unang bersyon ay binubuo ang bawat nota sa browser habang tumutugtog.
 * Walang file, walang lisensya, malinis. Pero tumitigil iyon sa sandaling lumipat
 * ka ng app: sinususpinde ng iPhone ang Web Audio ng pahinang hindi tinitingnan,
 * at walang paraan para pigilan iyon.
 *
 * Ang tunog lang na dumadaan sa tunay na media element ang pinapayagang tumuloy
 * kapag naka-lock ang screen. Kaya ang parehong musika ay isinulat bilang file sa
 * art/build_music.py, parehong chord at parehong Rhodes. Ako pa rin ang gumawa
 * nito, kaya wala pa ring lisensyang hihingin ninuman.
 *
 * Anim na bahagi ito na magkakasunod, bawat isa ay may sariling bilis, susi at
 * mga instrumento: Rhodes, pluck, kampana, pad, bass, at tambol. Ang isang maikling
 * loop ay halata sa ikalawang ikot, kaya wala nang maikling loop.
 *
 * Wala itong kinukuha hangga't walang pumipindot. Ang 3.3 MB ay hindi dapat
 * pasanin ng taong hindi naman nakikinig.
 */
import MARKS from "./marks.json";

const SRC = "/orbit-loop.m4a";
const COVER = "/cover.jpg";
const LAST = "orbitater.sound.part";


export function makeBgm(onChange) {
  if (typeof Audio === "undefined") return null;

  let el = null;

  const build = () => {
    el = document.createElement("audio");
    el.src = SRC;
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    el.volume = 0.62;

    /* Magsimula sa ibang bahagi sa bawat pagbukas.
       Ang unang bersyon ay iniingatan ang eksaktong posisyon, kaya lagi kang
       bumabalik sa parehong lugar at parang iisa lang ang tugtog. Anim ang bahagi
       at bawat isa ay may sariling tunog, kaya walang saysay na palaging ang una
       ang naririnig. Iniiwasan din nito ang huling narinig mo. */
    const parts = (MARKS && MARKS.marks) || [];
    if (parts.length > 1) {
      let prev = -1;
      try { prev = parseInt(localStorage.getItem(LAST), 10); } catch (e) {}
      let i = Math.floor(Math.random() * parts.length);
      if (i === prev) i = (i + 1 + Math.floor(Math.random() * (parts.length - 1))) % parts.length;
      try { localStorage.setItem(LAST, String(i)); } catch (e) {}
      const go = () => { try { el.currentTime = parts[i].at + 0.05; } catch (e) {} };
      if (el.readyState > 0) go(); else el.addEventListener("loadedmetadata", go, { once: true });
    }

    /* Ang pindutan ay dapat sumunod sa tunay na estado. Kung ang telepono mismo
       ang huminto, kailangang malaman iyon ng pindutan at hindi magsinungaling. */
    const tell = () => {
      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.playbackState = el.paused ? "paused" : "playing"; } catch (e) {}
      }
      if (onChange) onChange(!el.paused);
    };
    el.addEventListener("play", tell);
    el.addEventListener("pause", tell);
    el.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
    document.body.appendChild(el);

    /* Ipakita kung aling bahagi ang tumutugtog. Kung hindi mo nakikita ang
       pagpalit, walang nagsasabing nagpapalit nga ito. */
    const TITLES = {
      room: "Still falling", rain: "Nobody sent him", tilt: "Seven point six six",
      bells: "Below the potato radius", bap: "It never lands", "return": "Still falling",
    };
    const nameAt = (t) => {
      let n = parts.length ? parts[0].name : "room";
      for (const m of parts) if (t >= m.at) n = m.name;
      return n;
    };
    let shown = "";
    el.addEventListener("timeupdate", () => {
      const n = nameAt(el.currentTime);
      if (n === shown) return;
      shown = n;
      if (!("mediaSession" in navigator)) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: TITLES[n] || "Still falling",
          artist: "ORBITATER",
          album: "$TATER",
          artwork: [{ src: COVER, sizes: "800x800", type: "image/jpeg" }],
        });
      } catch (e) {}
    });

    /* Ang lock screen: pangalan, hindi "orbit-loop.m4a" */
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Still falling",
          artist: "ORBITATER",
          album: "$TATER",
          artwork: [{ src: COVER, sizes: "800x800", type: "image/jpeg" }],
        });
        navigator.mediaSession.setActionHandler("play", () => el.play().catch(() => {}));
        navigator.mediaSession.setActionHandler("pause", () => el.pause());
        navigator.mediaSession.setActionHandler("stop", () => el.pause());
        // walang saysay ang mga ito sa isang loop, pero pinipigilan nila ang iOS
        // na maglagay ng kulay abong pindutan na walang ginagawa
        for (const a of ["previoustrack", "nexttrack", "seekbackward", "seekforward"]) {
          try { navigator.mediaSession.setActionHandler(a, null); } catch (e) {}
        }
      } catch (e) { /* walang media session, tumutugtog pa rin */ }
    }
  };

  return {
    get playing() { return !!el && !el.paused; },
    get state() { return el ? (el.paused ? "paused" : "running") : "none"; },
    async start() {
      if (!el) build();
      await el.play();
    },
    stop() {
      if (el) el.pause();
    },
  };
}
