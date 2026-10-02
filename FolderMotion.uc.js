// ==UserScript==
// @name Letter Tabs Folder Motion
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
// Folder animation adapted from Zia 2.81.2, MIT, Copyright (c) 2026 z1nk.
// See Zia-LICENSE. No drag or folder-design modules are included.
(() => {
if (window.__letterTabsFolderMotion) return;
window.__letterTabsFolderMotion = true;
let notedErrors = new Set();

function noteError(where, err) {
    if (notedErrors.has(where)) {
      return;
    }
    notedErrors.add(where);
    console.debug(`[Zia] ${where}:`, err);
  }

let FOLDER_SPRING_MS = 420;

let FOLDER_OVERSHOOT_PX = 2;

let FOLDER_CLOSE_BOUNCE_PX = 1.5;

let FOLDER_SELECTOR = "zen-folder, tab-group:not([split-view-group])";

let cubicBezier = (x1, y1, x2, y2) => (t) => {
    let u = t;
    for (let i = 0; i < 8; i++) {
      const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u - t;
      const dx = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
      if (Math.abs(x) < 1e-5 || !dx) {
        break;
      }
      u = Math.min(1, Math.max(0, u - x / dx));
    }
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  };

let EASE_OUT = cubicBezier(0.25, 1, 0.5, 1);

let EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);

let STEPS_PER_SECOND = 120;

function pixelSteps(prop, points, duration, restValue) {
    const scale = window.devicePixelRatio || 1;
    const count = Math.max(2, Math.ceil((duration / 1000) * STEPS_PER_SECOND));
    const valueAt = (t) => {
      for (let i = 0; i < points.length - 1; i++) {
        const [a, from, ease] = points[i];
        const [b, to] = points[i + 1];
        if (t <= b) {
          const local = b > a ? (t - a) / (b - a) : 1;
          return from + (to - from) * (ease ? ease(local) : local);
        }
      }
      return points.at(-1)[1];
    };
    const frames = [];
    let last = null;
    for (let i = 0; i <= count; i++) {
      const offset = i / count;
      const exact = i === count ? restValue : valueAt(offset);
      const value = i === count ? restValue : restValue + Math.round((exact - restValue) * scale) / scale;
      if (value === last && i !== count) {
        continue;
      }
      last = value;
      frames.push({ [prop]: `${value}px`, offset, easing: "steps(1, end)" });
    }
    if (frames[0].offset !== 0) {
      frames.unshift({ [prop]: `${points[0][1]}px`, offset: 0, easing: "steps(1, end)" });
    }
    delete frames.at(-1).easing;
    return frames;
  }

let isFolder = (el) =>
    el?.localName === "zen-folder" || (el?.localName === "tab-group" && !el.hasAttribute("split-view-group"));

function springFolderAnimation(element, keyframes, options) {
    if (
      !element.classList?.contains("zen-tab-group-start") ||
      !isFolder(element.parentElement?.parentElement) ||
      !Array.isArray(keyframes) ||
      keyframes.length !== 2 ||
      !(typeof options === "object" && options?.duration > 0)
    ) {
      return null;
    }
    // Clicked open and shut quickly, Zen's own ends go stale (opening "from
    // 0 to 0", closing short of shut), so which way it's going comes from
    // the folder, and the ends from where open (0) and shut really are
    const folder = element.parentElement.parentElement;
    // With a tab selected inside, Zen shows just that tab (picked from the
    // closed folder's list, say, the folder stays "collapsed" while Zen
    // opens it round the tab), and the other tabs' own animations carry the
    // motion (springFolderItem): Zen's, as it was
    if (folder.hasAttribute("has-active") || folder.contains(gBrowser.selectedTab)) {
      element.parentElement.ziaHold?.();
      return null;
    }
    const closing = folder.hasAttribute("collapsed");
    // (a folder whose one showing tab was just dragged out of it already
    // looks shut: its room closes, without the bounce, 28-tab-dragging)
    const lentOut = (folder.ziaLentUntil || 0) > Date.now();
    const zenFrom = parseFloat(keyframes[0]?.marginTop);
    const zenTo = parseFloat(keyframes[1]?.marginTop);
    const shut = -Math.max(
      1,
      element.parentElement.getBoundingClientRect().height,
      ...[closing ? -zenTo : -zenFrom].filter(Number.isFinite)
    );
    const from = closing ? 0 : Number.isFinite(zenFrom) && zenFrom < 0 ? zenFrom : shut;
    const to = closing ? (Number.isFinite(zenTo) && zenTo < 0 ? Math.min(zenTo, shut) : shut) : 0;
    let bounce = true;
    try {
      bounce = Services.prefs.getBoolPref("lettertabs.folders.bounce", true);
    } catch (err) {
      bounce = false;
    }
    // Spring off: Zen's own timing, but still the folder opening over its
    // tabs (holdFolderContents); the setting is for the bounce only
    if (!bounce || lentOut) {
      return {
        from,
        to,
        closing,
        plain: true,
        keyframes: [{ marginTop: `${from}px` }, { marginTop: `${to}px` }],
        options,
      };
    }
    // Opening, the margin rises to 0 and goes a little past; closing, it
    // falls and goes a little further, so the rows below rise past their
    // place and drop back.
    const past = to + Math.sign(to - from) * Math.min(FOLDER_OVERSHOOT_PX, Math.abs(to - from) / 4);
    return {
      from,
      to,
      closing,
      keyframes: pixelSteps("marginTop", [[0, from, EASE_OUT], [0.62, past, EASE_IN_OUT], [1, to]], FOLDER_SPRING_MS, to),
      options: { ...options, duration: FOLDER_SPRING_MS, easing: "linear" },
    };
  }

function bounceUpAfterClosing(container, animate) {
    if (!container?.classList?.contains("tab-group-container")) {
      return;
    }
    animate.call(
      container,
      pixelSteps("marginBottom", [[0, 0, null], [0.45, 0, EASE_OUT], [0.66, -FOLDER_CLOSE_BOUNCE_PX, EASE_IN_OUT], [1, 0]], FOLDER_SPRING_MS, 0),
      { duration: FOLDER_SPRING_MS }
    );
  }

function holdFolderContents(start, spring, animate) {
    const container = start.parentElement;
    if (!container?.classList?.contains("tab-group-container")) {
      return null;
    }
    const { to, closing } = spring;
    // It goes from the height it's at (turned round part way, clicked
    // again before it finished, measured before the last one's stopped)
    // (reopened mid-close, the close was stopped a moment ago, when the
    // folder said it was opening: the height it had got to was kept then)
    const kept = container.ziaShown;
    container.ziaShown = null;
    const fromHeight = kept && performance.now() - kept.at < 100 ? kept.height : container.getBoundingClientRect().height;
    container.ziaHold?.();
    // to the folder's height open or shut, measured, not taken from the
    // margin: Zen's ends go stale mid-way, and an empty folder's margin
    // moves just a few pixels, which made the height move in steps
    const saved = start.style.marginTop;
    start.style.marginTop = "0px";
    const openHeight = container.getBoundingClientRect().height;
    let toHeight = openHeight;
    if (closing) {
      start.style.marginTop = `${-2 * openHeight - 1}px`;
      toHeight = container.getBoundingClientRect().height;
    }
    start.style.marginTop = saved;
    // Shut, the margin takes everything in the folder out of sight (Zen's
    // own end can fall short when it's turned round part way)
    const shut = Math.min(to, -openHeight);
    // Already there: nothing moves (Zen's own slide would move the tabs)
    if (!(Math.abs(toHeight - fromHeight) > 0.5)) {
      const still = `${closing ? shut : 0}px`;
      return [{ marginTop: still }, { marginTop: still }];
    }
    const heights = spring.plain
      ? [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }]
      : pixelSteps(
          "height",
          [
            [0, fromHeight, EASE_OUT],
            [0.62, Math.max(0, toHeight + Math.sign(toHeight - fromHeight) * Math.min(FOLDER_OVERSHOOT_PX, Math.abs(toHeight - fromHeight) / 4)), EASE_IN_OUT],
            [1, toHeight],
          ],
          spring.options.duration,
          toHeight
        );
    const margin = closing
      ? [{ marginTop: "0px" }, { marginTop: "0px", offset: 0.999 }, { marginTop: `${shut}px` }]
      : [{ marginTop: "0px" }, { marginTop: "0px" }];

    const items = [...container.children].filter((child) => child !== start);
    const fades = closing
      ? items.map((item) =>
          animate.call(item, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" })
        )
      : [];
    container.setAttribute("zia-folder-holding", "true");
    const growing = animate.call(container, heights, { duration: spring.options.duration, easing: spring.options.easing || "linear" });
    let done = false;
    const unfade = () => {
      for (const fade of fades) {
        fade.cancel();
      }
      gBrowser.tabContainer.removeEventListener("TabSelect", onSelect);
      window.removeEventListener("TabGroupExpand", onOpen, true);
    };
    // (however it's opened: not every opening comes through here)
    const onOpen = (event) => {
      if (event.target !== container.parentElement) {
        return;
      }
      // Opened again part way through closing: the folder grows back from
      // where it had got to, rather than snapping open (Zen doesn't animate
      // it then, as its margin never got as far as closed)
      const midway = growing.playState === "running";
      const shown = container.getBoundingClientRect().height;
      // (for Zen's opening animation, which comes just after)
      container.ziaShown = { height: shown, at: performance.now() };
      stop();
      if (!midway) {
        return;
      }
      requestAnimationFrame(() => {
        if (container.ziaHold || !container.isConnected) {
          return;
        }
        const full = container.getBoundingClientRect().height;
        if (Math.abs(full - shown) < 1) {
          return;
        }
        container.setAttribute("zia-folder-holding", "true");
        const back = animate.call(container, [{ height: `${shown}px` }, { height: `${full}px` }], {
          duration: FOLDER_SPRING_MS,
          easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        });
        const done = () => {
          if (!container.ziaHold) {
            container.removeAttribute("zia-folder-holding");
          }
        };
        back.finished.then(done, done);
      });
    };
    // A tab selected inside the closed folder is shown by Zen: it can't
    // stay faded out
    const onSelect = () => {
      if (container.contains(gBrowser.selectedTab)) {
        unfade();
      }
    };
    const stop = () => {
      if (done) {
        return;
      }
      done = true;
      if (container.ziaHold === stop) {
        container.ziaHold = null;
      }
      container.removeAttribute("zia-folder-holding");
      growing.cancel();
      unfade();
    };
    container.ziaHold = stop;
    // Closing, it's watched for opening again from the start: clicked again
    // before it finished, the opening needn't come back through here, and
    // the tabs were left faded out in an open folder
    if (closing) {
      window.addEventListener("TabGroupExpand", onOpen, true);
    }
    growing.finished.then(() => {
      if (!closing || !container.parentElement?.hasAttribute("collapsed")) {
        stop();
        return;
      }
      // Closed, the tabs stay faded out: Zen leaves them just above the
      // folder, and shown again there they flashed over the rows above.
      // They come back as it opens again (stop, from its next animation)
      // or when one of them is selected.
      // It's shut all the way, whatever end Zen keeps: Zen writes its own
      // end (short, turned round part way) just after, so this comes the
      // frame after, before anything's drawn.
      requestAnimationFrame(() => {
        if (done || !container.parentElement?.hasAttribute("collapsed")) {
          return;
        }
        if (parseFloat(getComputedStyle(start).marginTop) > shut + 0.5) {
          start.style.marginTop = `${shut}px`;
        }
        container.removeAttribute("zia-folder-holding");
        growing.cancel();
      });
      gBrowser.tabContainer.addEventListener("TabSelect", onSelect);
    }, () => {});
    return margin;
  }

let FOLDER_ARRIVE = 0.62;

let folderMotion = null;

function noteFolderMotion(event) {
    const group = event.target;
    if (!isFolder(group)) {
      return;
    }
    const motion = {
      group,
      closing: event.type === "TabGroupCollapse",
      hadActive: group.hasAttribute("has-active"),
      bounced: false,
    };
    folderMotion = motion;
    setTimeout(() => {
      if (folderMotion === motion) {
        folderMotion = null;
      }
    }, 0);
  }

function springFolderItem(element, keyframes, options) {
    const motion = folderMotion;
    if (
      !motion ||
      !Array.isArray(keyframes) ||
      keyframes.length !== 2 ||
      !(typeof options === "object" && options?.duration > 0) ||
      !(motion.closing ? motion.group.hasAttribute("has-active") : motion.hadActive)
    ) {
      return null;
    }
    const container = motion.group.groupContainer;
    if (!container?.contains(element) || container === element) {
      return null;
    }
    const [a, b] = keyframes;
    const props = Object.keys(b).filter((prop) => prop !== "offset" && prop !== "easing" && prop !== "composite");
    if (!props.includes("height")) {
      return null;
    }
    const scale = window.devicePixelRatio || 1;
    const tracks = [];
    for (const prop of props) {
      const from = parseFloat(a?.[prop]);
      const to = parseFloat(b[prop]);
      const numeric = Number.isFinite(from) && Number.isFinite(to);
      if (prop === "height" && (!numeric || from === to)) {
        return null;
      }
      if (numeric) {
        tracks.push({ prop, from, to, unit: prop === "opacity" ? "" : "px" });
      } else if (Number.isFinite(from)) {
        // Growing back to a natural size ("auto"): hold the size it starts
        // at until the very end, when the tab is its full height anyway.
        tracks.push({ prop, hold: a[prop], end: b[prop] });
      } else {
        tracks.push({ prop, hold: b[prop], end: b[prop] });
      }
    }
    try {
      if (!Services.prefs.getBoolPref("lettertabs.folders.bounce", true)) {
        return null;
      }
    } catch (err) {
      return null;
    }
    const count = Math.max(2, Math.ceil((FOLDER_SPRING_MS / 1000) * STEPS_PER_SECOND));
    const frames = [];
    for (let i = 0; i <= count; i++) {
      const offset = i / count;
      const k = offset >= FOLDER_ARRIVE ? 1 : EASE_OUT(offset / FOLDER_ARRIVE);
      const frame = { offset, easing: "steps(1, end)" };
      for (const track of tracks) {
        if (track.hold !== undefined) {
          frame[track.prop] = i === count ? track.end : track.hold;
          continue;
        }
        let value = track.from + (track.to - track.from) * k;
        if (track.unit) {
          value = track.to + Math.round((value - track.to) * scale) / scale;
        }
        frame[track.prop] = `${value}${track.unit}`;
      }
      frames.push(frame);
    }
    delete frames.at(-1).easing;
    const bounce = motion.bounced
      ? null
      : {
          container,
          keyframes: pixelSteps(
            "marginBottom",
            [
              [0, 0, EASE_OUT],
              [FOLDER_ARRIVE, motion.closing ? -FOLDER_CLOSE_BOUNCE_PX : FOLDER_OVERSHOOT_PX, EASE_IN_OUT],
              [1, 0],
            ],
            FOLDER_SPRING_MS,
            0
          ),
        };
    motion.bounced = true;
    return {
      bounce,
      keyframes: frames,
      options: { ...options, duration: FOLDER_SPRING_MS, easing: "linear" },
    };
  }

function fadeBackIn(element, keyframes) {
    if (element.localName !== "tab" || !element.closest?.(FOLDER_SELECTOR)) {
      return keyframes;
    }
    if (Array.isArray(keyframes)) {
      const last = keyframes.at(-1);
      if (keyframes.length >= 2 && last && "opacity" in last && (last.opacity === "" || last.opacity == null)) {
        return [...keyframes.slice(0, -1), { ...last, opacity: 1 }];
      }
      return keyframes;
    }
    const opacity = keyframes?.opacity;
    if (Array.isArray(opacity) && opacity.length >= 2 && (opacity.at(-1) === "" || opacity.at(-1) == null)) {
      return { ...keyframes, opacity: [...opacity.slice(0, -1), 1] };
    }
    return keyframes;
  }

function settleTuckedPins(element, keyframes) {
    const pins = window.gZenWorkspaces?.activeWorkspaceElement?.collapsiblePins;
    if (!pins || element !== pins.groupStartElement || !pins.collapsed || pins.hasAttribute("has-active")) {
      return keyframes;
    }
    // (only with folders squashed from showing one tab: tucked away with
    // none showing, Zen's push is right)
    // (held there by Zen's finished animations, not a style of their own)
    // (Zen's hidden placeholder tab and any row not shown are always
    // nothing high: not a sign of it)
    const rows = (pins.allItems || []).filter((item) => !item.hasAttribute("zen-empty-tab") && !item.hidden && getComputedStyle(item).display !== "none");
    if (!rows.some((item) => item.getBoundingClientRect().height < 1)) {
      return keyframes;
    }
    const px = (v) => parseFloat(v);
    const target = -4;
    if (Array.isArray(keyframes) && keyframes.length >= 2) {
      const from = px(keyframes[0]?.marginTop);
      const to = px(keyframes.at(-1)?.marginTop);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to >= target || from === to) {
        return keyframes;
      }
      const scale = (target - from) / (to - from);
      return keyframes.map((frame) => {
        const v = px(frame?.marginTop);
        return Number.isFinite(v) ? { ...frame, marginTop: `${from + (v - from) * scale}px` } : frame;
      });
    }
    const list = keyframes?.marginTop;
    if (Array.isArray(list) && list.length >= 2) {
      const from = px(list[0]);
      const to = px(list.at(-1));
      if (!Number.isFinite(from) || !Number.isFinite(to) || to >= target || from === to) {
        return keyframes;
      }
      const scale = (target - from) / (to - from);
      return { ...keyframes, marginTop: list.map((v) => (Number.isFinite(px(v)) ? `${from + (px(v) - from) * scale}px` : v)) };
    }
    return keyframes;
  }

function addFolderBounce() {
    const animate = Element.prototype.animate;
    if (animate.__zia) {
      return;
    }
    const patched = function (keyframes, options) {
      try {
        keyframes = fadeBackIn(this, keyframes);
        keyframes = settleTuckedPins(this, keyframes);
      } catch (err) {
        noteError("folder bounce: fade back in", err);
      }
      const spring = springFolderAnimation(this, keyframes, options);
      if (!spring) {
        const item = springFolderItem(this, keyframes, options);
        if (!item) {
          return animate.call(this, keyframes, options);
        }
        if (item.bounce) {
          animate.call(item.bounce.container, item.bounce.keyframes, { duration: FOLDER_SPRING_MS });
        }
        return animate.call(this, item.keyframes, item.options);
      }
      if (spring.closing && !spring.plain) {
        bounceUpAfterClosing(this.parentElement, animate);
      }
      let margin = null;
      try {
        margin = holdFolderContents(this, spring, animate);
      } catch (err) {
        noteError("folder bounce: hold contents", err);
      }
      return animate.call(this, margin || spring.keyframes, spring.options);
    };
    patched.__zia = true;
    Element.prototype.animate = patched;
    window.addEventListener("TabGroupCollapse", noteFolderMotion, true);
    window.addEventListener("TabGroupExpand", noteFolderMotion, true);

  }
function initialize() {
  // Restore a pending preference change from the removed drag module.
  const key = 'lettertabs.drag.haptic-snapshot';
  const saved = Services.prefs.getStringPref(key, '');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (state.hadUserValue) Services.prefs.setBoolPref('zen.haptic-feedback.enabled', state.value);
      else Services.prefs.clearUserPref('zen.haptic-feedback.enabled');
      Services.prefs.clearUserPref(key);
    } catch (error) { console.error('[Letter Tabs] Haptic preference recovery', error); }
  }
  addFolderBounce();
}
if (document.readyState === 'complete') initialize();
else window.addEventListener('load', initialize, {once: true});
})();
