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
 * Labindalawang bahagi ito na magkakasunod, labintatlong minuto, bawat isa ay may
 * sariling bilis, susi at mga instrumento: Rhodes, pluck, kampana, pad, bass, at
 * tambol. Ang isang maikling loop ay halata sa ikalawang ikot, kaya wala nang
 * maikling loop.
 *
 * Wala itong kinukuha hangga't walang pumipindot. Ang 5.7 MB ay hindi dapat
 * pasanin ng taong hindi naman nakikinig.
 */
import MARKS from "./marks.json";

const SRC = "/orbit-loop.m4a";
const COVER = "/cover.jpg";
const LAST = "orbitater.sound.part";


export function makeBgm(onChange, onPart) {
  if (typeof Audio === "undefined") return null;

  let el = null, from = 0, seeded = false;

  const build = () => {
    /* Pumili ng bahagi na iiwasan ang huli mong narinig. Ang paglukso mismo ay
       nasa start(), pagkatapos magsimula ang tugtog. */
    const parts = (MARKS && MARKS.marks) || [];
    let idx = 0;
    if (parts.length > 1) {
      let prev = -1;
      try { prev = parseInt(localStorage.getItem(LAST), 10); } catch (e) {}
      idx = Math.floor(Math.random() * parts.length);
      if (idx === prev) idx = (idx + 1 + Math.floor(Math.random() * (parts.length - 1))) % parts.length;
      try { localStorage.setItem(LAST, String(idx)); } catch (e) {}
    }
    from = parts.length ? parts[idx].at + 0.05 : 0;

    /* Walang #t= sa URL. Ginagawa niyon ang simula na simula rin ng loop, kaya
       kung nagsimula ka sa ikaanim na bahagi ay iyon na lang ang paulit-ulit at
       hindi mo na maririnig ang lima. Ang paglukso ay ginagawa pagkatapos
       magsimula ang tugtog, kung saan tiyak nang alam ng browser ang buong file. */
    el = document.createElement("audio");
    el.src = SRC;
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    el.volume = 0.62;



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
      drift: "No agency", bells: "Below the potato radius", swing: "The ground curves away",
      bap: "It never lands", dust: "Unscheduled object", lift: "He has not hit anything",
      night: "Low earth orbit", close: "Nobody sent him", "return": "Still falling",
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
      if (onPart) onPart(TITLES[n] || "");
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
      if (seeded || !from) { await el.play(); return; }
      /* Patahimikin habang lumulukso, para walang kalahating segundo ng maling
         bahagi bago dumating sa tama. */
      seeded = true;
      el.muted = true;
      try {
        await el.play();
        el.currentTime = from;
      } finally {
        el.muted = false;
      }
    },
    stop() {
      if (el) el.pause();
    },
  };
}
