/* Ang tugtog.
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
 * Wala itong kinukuha hangga't walang pumipindot. Ang 781 KB ay hindi dapat
 * pasanin ng taong hindi naman nakikinig.
 */
const SRC = "/orbit-loop.mp3";
const COVER = "/cover.jpg";

const POS = "orbitater.sound.pos";

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

    /* Ipagpatuloy kung saan tumigil. Ang refresh ay hindi dapat nagsisimula ulit
       sa parehong unang nota sa tuwing tumitingin ka ng ibang bagay. */
    try {
      const at = parseFloat(localStorage.getItem(POS));
      if (at > 0) el.currentTime = at;
    } catch (e) {}
    let last = 0;
    el.addEventListener("timeupdate", () => {
      if (el.currentTime - last < 4) return;
      last = el.currentTime;
      try { localStorage.setItem(POS, String(el.currentTime)); } catch (e) {}
    });

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

    /* Ang lock screen: pangalan, hindi "orbit-loop.mp3" */
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
