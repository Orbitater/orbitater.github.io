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

export function makeBgm() {
  if (typeof Audio === "undefined") return null;

  let el = null;

  const build = () => {
    el = document.createElement("audio");
    el.src = SRC;
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    el.volume = 0.62;
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
