// ==UserScript==
// @name           Letter Tabs Sidebar Video (Zenslop)
// @include        chrome://browser/content/browser.xhtml
// Adapted from Firebolt9907/Zenslop; see ZENSLOP-LICENSE.txt.
// @version        0.1.0
// @description    Hooks into Zen's sidebar to render active video streams.
// ==/UserScript==

(async function () {
  if (window.__zenslopLoaded) return;
  window.__zenslopLoaded = true;
  // JSWindowActor modules are process-global; updates require a browser restart.
  // Embed the MIT upstream modules to keep installation independent of extra downloads.
  const actorSources = {"content-actor.sys.mjs": "const MAX_FRAME_DIMENSION = 480;\nconst CAPTION_TRACK_CHECK_MS = 2000;\n\nconst DEBUG = false;\n\nexport class ZenSidebarPiPChild extends JSWindowActorChild {\n  actorCreated() {\n    this._processingActive = false;\n    this._captionsActive = false;\n    this._captionMode = \"off\";\n    this._lastCaptionText = \"\";\n    this._captionText = \"\";\n    this._captionCues = null;\n    this._captionTrackKey = \"\";\n    this._captionTrackCheckAt = 0;\n    this._captionLoadSerial = 0;\n    this._captionLoadPendingKey = \"\";\n    this._debug(\n      \"[Zenslop/content] actorCreated\",\n      this.contentWindow?.location?.href,\n    );\n    // Sine can register this actor after session-restore has already resumed a\n    // video. In that case none of the media events below are replayed, so do\n    // an immediate scan as soon as the actor is forced into existence.\n    this._scanForPlayingVideo();\n\n    const win = this.contentWindow;\n    const doc = win?.document;\n    if (!win || !doc || this._videoObserver) return;\n\n    try {\n      this._videoObserver = new win.MutationObserver(() => {\n        if (!this._video) this._scanForPlayingVideo();\n      });\n      this._videoObserver.observe(doc, { childList: true, subtree: true });\n    } catch (_) {\n      this._videoObserver = null;\n    }\n  }\n\n  _debug(...args) {\n    if (!DEBUG) return;\n    try {\n      this.sendAsyncMessage(\"ZenPiP:Debug\", { args: args.map(a => {\n        try { return typeof a === \"object\" ? JSON.stringify(a) : String(a); }\n        catch (_) { return String(a); }\n      }) });\n    } catch (_) {}\n  }\n\n  _encodeSize(w, h, maxDim = MAX_FRAME_DIMENSION) {\n    const scale = Math.min(1, maxDim / Math.max(w, h));\n    let tw = Math.max(2, Math.round(w * scale));\n    let th = Math.max(2, Math.round(h * scale));\n    tw -= tw % 2;\n    th -= th % 2;\n    return { tw, th };\n  }\n\n  handleEvent(event) {\n    const target = event.target;\n    this._debug(\"[Zenslop/content]\", event.type, target?.tagName, \"muted=\", target?.muted, \"vw=\", target?.videoWidth);\n    if (event.type === \"DOMContentLoaded\" || event.type === \"pageshow\") {\n      this._scanForPlayingVideo();\n      return;\n    }\n\n    if (!target || target.tagName !== \"VIDEO\") return;\n\n    if (\n      event.type === \"play\" ||\n      event.type === \"playing\" ||\n      event.type === \"loadedmetadata\" ||\n      event.type === \"canplay\"\n    ) {\n      this._tryStart(target);\n      return;\n    }\n\n    if (event.type === \"volumechange\") {\n      if (this._isAudible(target)) {\n        if (!this._video && !target.paused && !target.ended) {\n          this._tryStart(target);\n        }\n      } else if (target === this._video) {\n        this._stopAndNotify(\"volumechange:muted\");\n      }\n      return;\n    }\n\n    if (event.type === \"pause\" || event.type === \"ended\" || event.type === \"emptied\") {\n      if (target !== this._video) return;\n      this._stopAndNotify(\"event:\" + event.type);\n    }\n  }\n\n  _isAudible(video) {\n    return !video.muted && video.volume > 0;\n  }\n\n  _scanForPlayingVideo() {\n    if (this._video) return;\n    let videos;\n    try {\n      videos = this.contentWindow?.document?.querySelectorAll(\"video\");\n    } catch (_) {\n      return;\n    }\n    if (!videos) return;\n\n    for (const video of videos) {\n      if (\n        !video.paused &&\n        !video.ended &&\n        video.readyState >= 2 &&\n        video.videoWidth > 0 &&\n        this._isAudible(video)\n      ) {\n        this._tryStart(video);\n        break;\n      }\n    }\n  }\n\n  _tryStart(target) {\n    this._debug(\"[Zenslop/content] tryStart readyState=\", target.readyState, \"vw=\", target.videoWidth, \"audible=\", this._isAudible(target), \"hasVideo=\", !!this._video);\n    if (this._video) return;\n    if (target.paused || target.ended) return;\n    if (target.readyState < 2 || target.videoWidth === 0) return;\n    if (!this._isAudible(target)) return;\n\n    this._attachVideoListeners(target);\n    this._startMirror(target);\n  }\n\n  _attachVideoListeners(video) {\n    const onEnd = (e) => this._stopAndNotify(\"listener:\" + e.type);\n    video.addEventListener(\"ended\", onEnd, { once: true });\n    video.addEventListener(\"emptied\", onEnd, { once: true });\n    this._videoListeners = { onEnd };\n\n    if (!this._pageHideBound) {\n      this._pageHideBound = () => this._stopAndNotify(\"pagehide\");\n      this.contentWindow.addEventListener(\"pagehide\", this._pageHideBound, {\n        once: true,\n      });\n    }\n  }\n\n  _startMirror(video) {\n    const win = this.contentWindow;\n    const srcWidth = video.videoWidth;\n    const srcHeight = video.videoHeight;\n\n    this._video = video;\n    this._startTime = win.performance.now();\n    let videoRef = null;\n    try {\n      const { ContentDOMReference } = ChromeUtils.importESModule(\n        \"resource://gre/modules/ContentDOMReference.sys.mjs\",\n      );\n      videoRef = ContentDOMReference.get(video);\n    } catch (_) { /* Older Gecko builds can still use canvas capture. */ }\n    this.sendAsyncMessage(\"ZenPiP:MirrorStarted\", {\n      width: srcWidth,\n      height: srcHeight,\n      videoRef,\n      documentId: win.windowGlobalChild?.innerWindowId,\n    });\n\n    const doc = this.contentWindow?.document;\n    if (doc && !this._visBound) {\n      this._visBound = () => {\n        const d = this.contentWindow?.document;\n        if (d) this.sendAsyncMessage(\"ZenPiP:SourceVisibility\", { hidden: d.hidden });\n      };\n      doc.addEventListener(\"visibilitychange\", this._visBound);\n    }\n    if (doc) {\n      this.sendAsyncMessage(\"ZenPiP:SourceVisibility\", { hidden: doc.hidden });\n    }\n\n    if (this._captionsActive) this._startCaptionTracking();\n  }\n\n  _isYouTubeDocument() {\n    try {\n      const host = this.contentWindow?.location?.hostname || \"\";\n      return (\n        host === \"youtube.com\" ||\n        host.endsWith(\".youtube.com\") ||\n        host === \"youtube-nocookie.com\" ||\n        host.endsWith(\".youtube-nocookie.com\")\n      );\n    } catch (_) {\n      return false;\n    }\n  }\n\n  _startCaptionTracking() {\n    if (!this._video || !this._captionsActive || this._captionMode === \"off\" ||\n        !this._isYouTubeDocument()) {\n      return;\n    }\n    if (this._captionRootObserver) {\n      this._refreshCaptionRoot();\n      this._syncCaption();\n      this._ensureCaptionTrack();\n      return;\n    }\n\n    const win = this.contentWindow;\n    const doc = win?.document;\n    const player = doc?.querySelector(\".html5-video-player\") || doc?.documentElement;\n    if (!win || !player) return;\n\n    try {\n      // This lightweight observer only looks for YouTube replacing its caption\n      // container. Caption text itself is observed on the much smaller\n      // container below, rather than on the entire player subtree.\n      this._captionRootObserver = new win.MutationObserver(() => {\n        this._refreshCaptionRoot();\n      });\n      this._captionRootObserver.observe(player, {\n        childList: true,\n        subtree: true,\n      });\n\n      const ccButton = doc.querySelector(\".ytp-subtitles-button\");\n      if (ccButton) {\n        this._ccButtonObserver = new win.MutationObserver(() => {\n          this._queueCaptionSync();\n        });\n        this._ccButtonObserver.observe(ccButton, {\n          attributes: true,\n          attributeFilter: [\"aria-pressed\"],\n        });\n      }\n    } catch (_) {\n      this._captionRootObserver = null;\n      this._ccButtonObserver = null;\n    }\n    this._refreshCaptionRoot();\n    this._syncCaption();\n    this._ensureCaptionTrack();\n  }\n\n  _refreshCaptionRoot() {\n    const win = this.contentWindow;\n    const doc = win?.document;\n    const nextRoot = doc?.querySelector(\".ytp-caption-window-container\") || null;\n    if (nextRoot === this._captionRoot) return;\n\n    try {\n      this._captionObserver?.disconnect();\n    } catch (_) {}\n    this._captionObserver = null;\n    this._captionRoot = nextRoot;\n\n    if (win && nextRoot) {\n      this._captionObserver = new win.MutationObserver(() => {\n        this._queueCaptionSync();\n      });\n      this._captionObserver.observe(nextRoot, {\n        childList: true,\n        characterData: true,\n        attributes: true,\n        attributeFilter: [\"class\", \"style\", \"aria-hidden\"],\n        subtree: true,\n      });\n    }\n    this._queueCaptionSync();\n  }\n\n  _queueCaptionSync() {\n    if (this._captionSyncQueued || !this._captionsActive) return;\n    const win = this.contentWindow;\n    if (!win) return;\n    this._captionSyncQueued = true;\n    win.queueMicrotask(() => {\n      this._captionSyncQueued = false;\n      const text = this._syncCaption();\n      if (!this._captionCues?.length) this._sendCaption(text);\n    });\n  }\n\n  _visibleCaptionText(root) {\n    const win = this.contentWindow;\n    if (!win || !root) return \"\";\n    const pieces = [];\n    const visit = (node) => {\n      if (node.nodeType === 3) {\n        pieces.push(node.nodeValue || \"\");\n        return;\n      }\n      if (node.nodeType !== 1) return;\n      if (node.getAttribute(\"aria-hidden\") === \"true\") return;\n      const style = win.getComputedStyle(node);\n      if (\n        style.display === \"none\" ||\n        style.visibility === \"hidden\" ||\n        style.visibility === \"collapse\" ||\n        Number.parseFloat(style.opacity) === 0\n      ) {\n        return;\n      }\n      for (const child of node.childNodes) visit(child);\n    };\n    visit(root);\n    return pieces.join(\"\").replace(/\\s+/g, \" \").trim();\n  }\n\n  _joinDistinctCaptionWindows(values) {\n    const seen = new Set();\n    const distinct = [];\n    for (const value of values) {\n      const normalized = String(value || \"\").replace(/\\s+/g, \" \").trim();\n      if (!normalized || seen.has(normalized)) continue;\n      seen.add(normalized);\n      distinct.push(normalized);\n    }\n    return distinct.join(\" \");\n  }\n\n  _sourceCaptionsEnabled() {\n    if (this._captionMode === \"on\") return true;\n    if (this._captionMode !== \"youtube\") return false;\n\n    const doc = this.contentWindow?.document;\n    const ccButton = doc?.querySelector(\".ytp-subtitles-button\");\n    if (ccButton) {\n      return (\n        ccButton.getAttribute(\"aria-pressed\") === \"true\" ||\n        ccButton.classList.contains(\"ytp-button-active\")\n      );\n    }\n\n    try {\n      const player = doc?.querySelector(\".html5-video-player\");\n      const track = player?.getOption?.(\"captions\", \"track\");\n      return Boolean(track?.languageCode);\n    } catch (_) {\n      return false;\n    }\n  }\n\n  _appendCaptionText(previous, next) {\n    previous = String(previous || \"\").replace(/\\s+/g, \" \").trim();\n    next = String(next || \"\").replace(/\\s+/g, \" \").trim();\n    if (!previous) return next;\n    if (!next || previous === next || previous.endsWith(` ${next}`)) {\n      return previous;\n    }\n    if (next.startsWith(`${previous} `)) return next;\n\n    const previousWords = previous.split(\" \");\n    const nextWords = next.split(\" \");\n    const maxOverlap = Math.min(previousWords.length, nextWords.length);\n    for (let count = maxOverlap; count >= 2; count--) {\n      if (\n        previousWords.slice(-count).join(\" \") ===\n        nextWords.slice(0, count).join(\" \")\n      ) {\n        return previousWords.concat(nextWords.slice(count)).join(\" \");\n      }\n    }\n    return `${previous} ${next}`;\n  }\n\n  _syncCaption() {\n    if (!this._video || !this._captionsActive || this._captionMode === \"off\" ||\n        !this._isYouTubeDocument()) {\n      this._captionText = \"\";\n      return \"\";\n    }\n\n    const doc = this.contentWindow?.document;\n    if (!doc) return this._captionText;\n    let text = \"\";\n    if (this._sourceCaptionsEnabled()) {\n      const windowParts = new Map();\n      for (const segment of doc.querySelectorAll(\".ytp-caption-segment\")) {\n        const windowEl = segment.closest(\".caption-window\");\n        const windowStyle = windowEl\n          ? this.contentWindow.getComputedStyle(windowEl)\n          : null;\n        if (\n          windowStyle?.display === \"none\" ||\n          windowStyle?.visibility === \"hidden\" ||\n          windowStyle?.opacity === \"0\"\n        ) {\n          continue;\n        }\n        // YouTube sometimes inserts a complete automatic-caption cue and\n        // reveals its descendants word by word. Reading only visible text\n        // keeps those rolling words incremental instead of exposing the full\n        // cue early.\n        const value = this._visibleCaptionText(segment);\n        if (!value) continue;\n        const windowKey = windowEl || segment;\n        const parts = windowParts.get(windowKey) || [];\n        parts.push(value);\n        windowParts.set(windowKey, parts);\n      }\n      text = this._joinDistinctCaptionWindows(\n        Array.from(windowParts.values(), parts => parts.join(\" \")),\n      );\n    }\n\n    this._captionText = text;\n    return text;\n  }\n\n  _extractJSONAt(text, start) {\n    const objectStart = text.indexOf(\"{\", start);\n    if (objectStart < 0) return null;\n    let depth = 0;\n    let inString = false;\n    let escaped = false;\n    for (let i = objectStart; i < text.length; i++) {\n      const char = text[i];\n      if (inString) {\n        if (escaped) escaped = false;\n        else if (char === \"\\\\\") escaped = true;\n        else if (char === '\"') inString = false;\n        continue;\n      }\n      if (char === '\"') inString = true;\n      else if (char === \"{\") depth++;\n      else if (char === \"}\" && --depth === 0) {\n        try {\n          return JSON.parse(text.slice(objectStart, i + 1));\n        } catch (_) {\n          return null;\n        }\n      }\n    }\n    return null;\n  }\n\n  _getInlinePlayerResponse(doc) {\n    const marker = \"ytInitialPlayerResponse\";\n    for (const script of doc?.scripts || []) {\n      const text = script.textContent || \"\";\n      let offset = 0;\n      while ((offset = text.indexOf(marker, offset)) >= 0) {\n        const response = this._extractJSONAt(text, offset + marker.length);\n        if (response?.captions?.playerCaptionsTracklistRenderer\n          ?.captionTracks?.length) {\n          return response;\n        }\n        offset += marker.length;\n      }\n    }\n    return null;\n  }\n\n  _getCaptionTrackInfo() {\n    const win = this.contentWindow;\n    const doc = win?.document;\n    if (!win || !doc) return null;\n\n    try {\n      // Prefer the exact caption request YouTube's player made. It can contain\n      // session-bound proof tokens that are absent from the public track URL\n      // in ytInitialPlayerResponse. Resource timing keeps the request URL even\n      // after YouTube has consumed its response.\n      const resources = win.performance?.getEntriesByType?.(\"resource\") || [];\n      const pageUrl = new win.URL(win.location.href);\n      const currentVideoId = pageUrl.searchParams.get(\"v\") ||\n        /^\\/(?:shorts|embed|live)\\/([^/?]+)/.exec(pageUrl.pathname)?.[1] ||\n        \"\";\n      for (let i = resources.length - 1; i >= 0; i--) {\n        try {\n          const url = new win.URL(resources[i].name);\n          if (url.hostname.endsWith(\"youtube.com\") &&\n              url.pathname.endsWith(\"/api/timedtext\")) {\n            const resourceVideoId = url.searchParams.get(\"v\") || \"\";\n            if (currentVideoId && resourceVideoId &&\n                resourceVideoId !== currentVideoId) {\n              continue;\n            }\n            const baseUrl = url.href;\n            return {\n              baseUrl,\n              translationCode: \"\",\n              key: `loaded|${baseUrl}`,\n            };\n          }\n        } catch (_) {}\n      }\n\n      const pageWindow = win.wrappedJSObject || win;\n      const playerElement = doc.querySelector(\"#movie_player, .html5-video-player\");\n      const player = playerElement?.wrappedJSObject || playerElement;\n      let playerResponse = null;\n      try {\n        playerResponse = player?.getPlayerResponse?.() || null;\n      } catch (_) {}\n      let globalResponse = null;\n      try {\n        globalResponse = pageWindow.ytInitialPlayerResponse || null;\n      } catch (_) {}\n      const responses = [\n        playerResponse,\n        globalResponse,\n        this._getInlinePlayerResponse(doc),\n      ];\n      const response = responses.find(candidate =>\n        candidate?.captions?.playerCaptionsTracklistRenderer\n          ?.captionTracks?.length,\n      );\n      const renderer = response?.captions?.playerCaptionsTracklistRenderer;\n      const tracks = Array.from(renderer?.captionTracks || []);\n      if (!tracks.length) return null;\n\n      let selected = null;\n      let current = null;\n      try {\n        current = player?.getOption?.(\"captions\", \"track\") || null;\n      } catch (_) {}\n\n      if (current) {\n        selected = tracks.find(track =>\n          current.vssId && track.vssId === current.vssId,\n        ) || tracks.find(track =>\n          current.languageCode &&\n          track.languageCode === current.languageCode &&\n          (!current.kind || track.kind === current.kind),\n        );\n      }\n\n      if (!selected) {\n        const audioIndex = Number(renderer.defaultAudioTrackIndex) || 0;\n        const captionIndex = Number(\n          renderer.audioTracks?.[audioIndex]?.defaultCaptionTrackIndex,\n        );\n        if (Number.isInteger(captionIndex)) selected = tracks[captionIndex];\n      }\n      selected ||= tracks[0];\n\n      const baseUrl = String(selected?.baseUrl || \"\");\n      if (!baseUrl) return null;\n      const translationCode = String(\n        current?.translationLanguage?.languageCode ||\n        current?.translationLanguage?.id ||\n        \"\",\n      );\n      const key = [baseUrl, translationCode].join(\"|\");\n      return { baseUrl, translationCode, key };\n    } catch (_) {\n      return null;\n    }\n  }\n\n  _parseCaptionJSON3(data) {\n    if (!Array.isArray(data?.events)) return [];\n    const cues = [];\n    for (const event of data.events) {\n      if (!Array.isArray(event?.segs)) continue;\n      const startMs = Number(event.tStartMs);\n      if (!Number.isFinite(startMs)) continue;\n      const durationMs = Number(event.dDurationMs);\n      const endMs = startMs +\n        (Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 3000);\n      const segments = event.segs\n        .map(segment => {\n          const text = String(segment?.utf8 || \"\");\n          const offsetMs = Number(segment?.tOffsetMs);\n          return {\n            text,\n            startMs: startMs +\n              (Number.isFinite(offsetMs) && offsetMs > 0 ? offsetMs : 0),\n          };\n        })\n        .filter(segment => segment.text && segment.text !== \"\\n\");\n      if (!segments.length) continue;\n      cues.push({\n        startMs,\n        endMs,\n        segments,\n        windowId: event.wWinId,\n        append: Boolean(event.aAppend),\n      });\n    }\n    return this._finalizeCaptionCues(cues);\n  }\n\n  _parseCaptionXML(text) {\n    if (!text) return [];\n    const parser = new this.contentWindow.DOMParser();\n    const doc = parser.parseFromString(text, \"text/xml\");\n    if (doc.querySelector(\"parsererror\")) return [];\n    const cues = [];\n\n    for (const paragraph of doc.querySelectorAll(\"p\")) {\n      const startValue = paragraph.getAttribute(\"t\");\n      if (startValue === null) continue;\n      const startMs = Number(startValue);\n      if (!Number.isFinite(startMs)) continue;\n      const durationMs = Number(paragraph.getAttribute(\"d\"));\n      const segments = Array.from(paragraph.querySelectorAll(\":scope > s\"))\n        .map(segment => ({\n          text: segment.textContent || \"\",\n          startMs: startMs + (Number(segment.getAttribute(\"t\")) || 0),\n        }))\n        .filter(segment => segment.text && segment.text !== \"\\n\");\n      if (!segments.length && paragraph.textContent) {\n        segments.push({ text: paragraph.textContent, startMs });\n      }\n      if (!segments.length) continue;\n      cues.push({\n        startMs,\n        endMs: startMs +\n          (Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 3000),\n        segments,\n        windowId: paragraph.getAttribute(\"w\") || undefined,\n        append: paragraph.getAttribute(\"a\") === \"1\",\n      });\n    }\n\n    for (const node of doc.querySelectorAll(\"transcript > text\")) {\n      const startValue = node.getAttribute(\"start\");\n      if (startValue === null) continue;\n      const startSeconds = Number(startValue);\n      if (!Number.isFinite(startSeconds)) continue;\n      const durationSeconds = Number(node.getAttribute(\"dur\"));\n      const startMs = startSeconds * 1000;\n      const value = node.textContent || \"\";\n      if (!value.trim()) continue;\n      cues.push({\n        startMs,\n        endMs: startMs +\n          (Number.isFinite(durationSeconds) && durationSeconds > 0\n            ? durationSeconds * 1000\n            : 3000),\n        segments: [{ text: value, startMs }],\n        windowId: undefined,\n        append: false,\n      });\n    }\n    return this._finalizeCaptionCues(cues);\n  }\n\n  _finalizeCaptionCues(cues) {\n    cues.sort((a, b) => a.startMs - b.startMs);\n    let maxEndThrough = -Infinity;\n    for (const cue of cues) {\n      maxEndThrough = Math.max(maxEndThrough, cue.endMs);\n      cue.maxEndThrough = maxEndThrough;\n    }\n    return cues;\n  }\n\n  async _ensureCaptionTrack() {\n    if (!this._video || !this._captionsActive || this._captionMode === \"off\" ||\n        !this._isYouTubeDocument()) {\n      return;\n    }\n    const now = this.contentWindow?.performance?.now?.() ?? Date.now();\n    if (now < this._captionTrackCheckAt) return;\n    this._captionTrackCheckAt = now + CAPTION_TRACK_CHECK_MS;\n\n    const track = this._getCaptionTrackInfo();\n    if (!track) return;\n    if (track.key === this._captionTrackKey && this._captionCues) return;\n    if (track.key === this._captionLoadPendingKey) return;\n\n    const serial = ++this._captionLoadSerial;\n    this._captionTrackKey = track.key;\n    this._captionLoadPendingKey = track.key;\n    this._captionCues = null;\n    const video = this._video;\n    try {\n      const url = new this.contentWindow.URL(track.baseUrl);\n      if (!url.hostname.endsWith(\"youtube.com\") &&\n          !url.hostname.endsWith(\"youtube-nocookie.com\")) {\n        throw new Error(\"Unexpected caption host\");\n      }\n      if (track.translationCode) {\n        url.searchParams.set(\"tlang\", track.translationCode);\n      }\n      let cues = [];\n      for (const format of [\"json3\", \"srv3\", \"\"]) {\n        if (format) url.searchParams.set(\"fmt\", format);\n        else url.searchParams.delete(\"fmt\");\n        const response = await this.contentWindow.fetch(url.href, {\n          credentials: \"include\",\n        });\n        if (!response.ok) continue;\n        const body = await response.text();\n        if (!body) continue;\n        if (format === \"json3\") {\n          try {\n            cues = this._parseCaptionJSON3(JSON.parse(body));\n          } catch (_) {\n            cues = [];\n          }\n        } else {\n          cues = this._parseCaptionXML(body);\n        }\n        if (cues.length) break;\n      }\n      if (!cues.length) throw new Error(\"Caption track contained no cues\");\n      if (serial !== this._captionLoadSerial || video !== this._video) return;\n      this._captionLoadPendingKey = \"\";\n      this._captionCues = cues;\n      this._updateCaptionFromClock();\n    } catch (error) {\n      if (serial !== this._captionLoadSerial) return;\n      this._captionLoadPendingKey = \"\";\n      this._captionTrackKey = \"\";\n      this._captionCues = null;\n      this._debug(\"[Zenslop/content] caption track load failed:\", error);\n    }\n  }\n\n  _timedCaptionAt(timeMs) {\n    const cues = this._captionCues;\n    if (!cues?.length) return \"\";\n\n    // Find the last cue that has started, then walk backward only while some\n    // earlier cue can still be active. The prefix maximum handles unusually\n    // long manual cues without scanning the full transcript on every tick.\n    let low = 0;\n    let high = cues.length;\n    while (low < high) {\n      const mid = (low + high) >> 1;\n      if (cues[mid].startMs <= timeMs) low = mid + 1;\n      else high = mid;\n    }\n\n    const active = [];\n    for (let i = low - 1; i >= 0; i--) {\n      const cue = cues[i];\n      if (cue.maxEndThrough <= timeMs) break;\n      if (timeMs < cue.endMs) active.push([i, cue]);\n    }\n    active.reverse();\n\n    const windows = new Map();\n    for (const [i, cue] of active) {\n      const text = cue.segments\n        .filter(segment => segment.startMs <= timeMs + 25)\n        .map(segment => segment.text)\n        .join(\"\")\n        .replace(/\\s+/g, \" \")\n        .trim();\n      if (!text) continue;\n      const windowKey = cue.windowId ?? `cue-${i}`;\n      const previous = windows.get(windowKey) || \"\";\n      windows.set(\n        windowKey,\n        cue.append && previous\n          ? this._appendCaptionText(previous, text)\n          : text,\n      );\n    }\n    return this._joinDistinctCaptionWindows(windows.values());\n  }\n\n  _updateCaptionFromClock() {\n    if (!this._video || !this._captionsActive || this._captionMode === \"off\" ||\n        !this._isYouTubeDocument()) {\n      return;\n    }\n    this._ensureCaptionTrack();\n    let text = \"\";\n    if (this._sourceCaptionsEnabled()) {\n      text = this._captionCues\n        ? this._timedCaptionAt(this._video.currentTime * 1000)\n        : this._syncCaption();\n    }\n    this._sendCaption(text);\n  }\n\n  _sendCaption(text) {\n    if (text === this._lastCaptionText) return;\n    this._lastCaptionText = text;\n    try {\n      this.sendAsyncMessage(\"ZenPiP:Caption\", { text });\n    } catch (_) {}\n  }\n\n  _stopCaptionTracking(clear = true) {\n    try {\n      this._captionObserver?.disconnect();\n      this._captionRootObserver?.disconnect();\n      this._ccButtonObserver?.disconnect();\n    } catch (_) {}\n    this._captionObserver = null;\n    this._captionRootObserver = null;\n    this._captionRoot = null;\n    this._ccButtonObserver = null;\n    this._captionSyncQueued = false;\n    this._captionText = \"\";\n    if (clear) {\n      this._captionLoadSerial++;\n      this._captionCues = null;\n      this._captionTrackKey = \"\";\n      this._captionTrackCheckAt = 0;\n      this._captionLoadPendingKey = \"\";\n    }\n    if (clear) this._sendCaption(\"\");\n  }\n\n  _setProcessingActive(\n    active,\n    captionMode = \"off\",\n    captionsActive = active,\n  ) {\n    active = Boolean(active);\n    captionMode = captionMode === \"on\" || captionMode === \"youtube\"\n      ? captionMode\n      : \"off\";\n    captionsActive = Boolean(captionsActive) && captionMode !== \"off\";\n    if (this._processingActive === active &&\n        this._captionMode === captionMode &&\n        this._captionsActive === captionsActive) return;\n    this._processingActive = active;\n    this._captionMode = captionMode;\n    this._captionsActive = captionsActive;\n    if (captionsActive) {\n      this._startCaptionTracking();\n    } else {\n      this._stopCaptionTracking(captionMode === \"off\");\n    }\n  }\n\n  _ensureScaleContext(tw, th) {\n    if (this._scaleCtx) return this._scaleCtx;\n    const win = this.contentWindow;\n    const ctxOpts = { alpha: false, willReadFrequently: true };\n    try {\n      if (typeof win.OffscreenCanvas === \"function\") {\n        this._scaleCanvas = new win.OffscreenCanvas(tw, th);\n      } else {\n        this._scaleCanvas = win.document.createElement(\"canvas\");\n        this._scaleCanvas.width = tw;\n        this._scaleCanvas.height = th;\n      }\n      this._scaleCtx = this._scaleCanvas.getContext(\"2d\", ctxOpts);\n    } catch (e) {\n      try {\n        this._scaleCanvas = win.document.createElement(\"canvas\");\n        this._scaleCanvas.width = tw;\n        this._scaleCanvas.height = th;\n        this._scaleCtx = this._scaleCanvas.getContext(\"2d\", ctxOpts);\n      } catch (err2) {\n        this._debug(\"[Zenslop/content] canvas creation failed:\", err2);\n        this._scaleCanvas = null;\n        this._scaleCtx = null;\n        this._stopAndNotify(\"canvas:construct\");\n      }\n    }\n    return this._scaleCtx;\n  }\n\n  _captureFrame(quality) {\n    const video = this._video;\n    if (!video || !this._processingActive) return;\n    if (!(video.videoWidth > 0) || video.readyState < 2) return;\n    // Note: we intentionally do NOT bail on video.seeking here. Holding the\n    // last frame through a fast-forward reads as a disruptive \"buffering\"\n    // freeze, and for music videos the visual is secondary \u2014 keeping the feed\n    // live is preferable to a stall.\n\n    const maxDim = parseInt(quality, 10) || MAX_FRAME_DIMENSION;\n    const { tw, th } = this._encodeSize(video.videoWidth, video.videoHeight, maxDim);\n\n    const ctx = this._ensureScaleContext(tw, th);\n    const canvas = this._scaleCanvas;\n    if (!ctx || !canvas) return;\n    if (canvas.width !== tw || canvas.height !== th) {\n      canvas.width = tw;\n      canvas.height = th;\n    }\n\n    try {\n      // Synchronous downscale + readback, shipped as a transferable RGBA\n      // buffer. An ImageBitmap cannot cross the JSActor boundary \u2014 Gecko's\n      // structured clone restricts it to same-process scope \u2014 so a copied\n      // ArrayBuffer is the wire format. willReadFrequently keeps the\n      // getImageData readback cheap.\n      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);\n      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);\n      this.sendAsyncMessage(\"ZenPiP:Frame\", {\n        buf: img.data.buffer,\n        width: canvas.width,\n        height: canvas.height,\n      }, [img.data.buffer]);\n    } catch (e) {\n      this._debug(\"[Zenslop/content] _captureFrame threw:\", String(e), e?.name, e?.message);\n    }\n  }\n\n  _stopAndNotify(reason) {\n    this._debug(\"[Zenslop/content] stopAndNotify reason=\", reason, \"hadVideo=\", !!this._video);\n    if (!this._video) return;\n    this._teardown();\n    try {\n      this.sendAsyncMessage(\"ZenPiP:VideoStopped\", { reason });\n    } catch (e) {}\n  }\n\n  _teardown() {\n    this._stopCaptionTracking(true);\n    if (this._video && this._videoListeners) {\n      try {\n        this._video.removeEventListener(\"ended\", this._videoListeners.onEnd);\n        this._video.removeEventListener(\"emptied\", this._videoListeners.onEnd);\n      } catch (_) {}\n    }\n    if (this._pageHideBound) {\n      try {\n        this.contentWindow?.removeEventListener(\"pagehide\", this._pageHideBound);\n      } catch (_) {}\n      this._pageHideBound = null;\n    }\n    if (this._visBound) {\n      try {\n        this.contentWindow?.document.removeEventListener(\"visibilitychange\", this._visBound);\n      } catch (_) {}\n      this._visBound = null;\n    }\n    this._video = null;\n    this._videoListeners = null;\n    this._scaleCanvas = null;\n    this._scaleCtx = null;\n  }\n\n  async receiveMessage(msg) {\n    if (msg.name === \"ZenPiP:Tick\") {\n      // No doc.hidden gate here: the mirror is shown precisely when the\n      // source tab is backgrounded, so hidden is the state we capture in.\n      // Visibility gating is controlled by the chrome-window controller.\n      this._captureFrame(msg.data?.quality);\n      return;\n    }\n    if (msg.name === \"ZenPiP:CaptionTick\") {\n      this._updateCaptionFromClock();\n      return;\n    }\n    if (msg.name === \"ZenPiP:Stop\") {\n      this._stopAndNotify(\"parent:stop\");\n      return;\n    }\n    if (msg.name === \"ZenPiP:SetProcessingState\") {\n      this._setProcessingActive(\n        msg.data?.active,\n        msg.data?.captionMode,\n        msg.data?.captionsActive,\n      );\n    }\n  }\n\n  didDestroy() {\n    try {\n      this._videoObserver?.disconnect();\n    } catch (_) {}\n    this._videoObserver = null;\n    this._teardown();\n  }\n}\n\n", "parent-actor.sys.mjs": "const QUALITY_TIERS = [\"640\", \"480\", \"360\", \"240\"];\nconst DEFAULT_FPS = 15;\nconst SLOW_FRAME_RATIO = 1.5;\nconst FAST_FRAME_RATIO = 0.5;\nconst SLOW_FRAMES_BEFORE_DOWNGRADE = 3;\nconst FAST_FRAMES_BEFORE_UPGRADE = 30;\n// Keepalive re-tick when a frame never comes back (tab throttled, video not\n// ready, capture threw). Keeps the loop alive at ~2fps instead of dead.\nconst SAFETY_TICK_MS = 500;\nconst CAPTION_TICK_MS = 50;\n\nconst DEBUG = false;\nconst dlog = DEBUG ? (...a) => console.log(...a) : () => {};\n\nexport class ZenSidebarPiPParent extends JSWindowActorParent {\n  actorCreated() {\n    dlog(\n      \"[Zenslop/parent] actorCreated for browsing context\",\n      this.browsingContext?.id,\n    );\n  }\n\n  async receiveMessage(msg) {\n    if (msg.name === \"ZenPiP:Debug\") {\n      if (DEBUG) {\n        const argsArr = Array.isArray(msg.data?.args) ? msg.data.args : null;\n        if (argsArr && argsArr.length > 0) console.log(...argsArr);\n      }\n      return;\n    }\n\n    const win = this.browsingContext.topChromeWindow;\n    if (!win) {\n      console.error(\"[Zenslop/parent] No chrome window available\");\n      return;\n    }\n\n    switch (msg.name) {\n      case \"ZenPiP:MirrorStarted\": {\n        console.log(\"[Zenslop/parent] MirrorStarted from tab\", this.browsingContext.id, msg.data.width, \"x\", msg.data.height);\n        const controller = win.ZenPiPController;\n        if (controller) {\n          controller.registerSource(this.browsingContext.id, {\n            startTick: (w) => { this._startTicking(w); },\n            stopTick: () => { this._stopTicking(); },\n            setProcessingActive: (active, captionMode, captionsActive) => {\n              this._setProcessingActive(active, captionMode, captionsActive);\n            },\n            setMaxDimension: (maxDimension) => {\n              this._setMaxDimension(maxDimension);\n            },\n            win,\n          });\n          controller.offerVideo(msg.data.width, msg.data.height, this.browsingContext, {\n            videoRef: msg.data.videoRef,\n            documentId: msg.data.documentId,\n          });\n        }\n        break;\n      }\n\n      case \"ZenPiP:Frame\": {\n        const controller = win.ZenPiPController;\n        if (!controller) return;\n\n        const activeBC = typeof controller.getActiveBC === \"function\" ? controller.getActiveBC() : null;\n        if (!activeBC || activeBC.id !== this.browsingContext.id) {\n          return;\n        }\n\n        // Deliberately no tick restart here: frames only exist in response to\n        // ticks, so a stray in-flight frame arriving after capture is stopped\n        // must not resurrect the loop while the mirror is hidden. Still draw\n        // it \u2014 it's the freshest frame we have.\n        try {\n          controller.drawFrame(msg.data);\n        } catch (e) {\n          console.error(\"[Zenslop/parent] drawFrame error:\", e?.name, e?.message);\n        }\n\n        this._onFrameDelivered();\n        this._scheduleNextTick();\n        break;\n      }\n\n      case \"ZenPiP:SourceVisibility\": {\n        const controller = win.ZenPiPController;\n        if (!controller) break;\n        const activeBC = typeof controller.getActiveBC === \"function\" ? controller.getActiveBC() : null;\n        if (activeBC && activeBC.id === this.browsingContext.id) {\n          controller.setSourceTabActive(!msg.data.hidden);\n        }\n        break;\n      }\n\n      case \"ZenPiP:Caption\": {\n        if (this._captionMode === \"off\") break;\n        const controller = win.ZenPiPController;\n        const activeBC = controller?.getActiveBC?.();\n        if (activeBC && activeBC.id === this.browsingContext.id) {\n          controller.setCaption(msg.data?.text || \"\");\n        }\n        break;\n      }\n\n      case \"ZenPiP:VideoStopped\": {\n        const reason = msg.data?.reason || \"\";\n        console.log(\"[Zenslop/parent] VideoStopped reason:\", reason);\n        const controller = win.ZenPiPController;\n        if (controller) {\n          if (controller.getActiveBC?.()?.id === this.browsingContext.id) {\n            if (reason.includes(\"pause\")) {\n              controller.hideCaption?.();\n            } else {\n              controller.setCaption?.(\"\");\n            }\n          }\n          controller.unregisterSource(this.browsingContext.id);\n          controller.notifySourceStopped(this.browsingContext);\n        }\n        this._setProcessingActive(false);\n        this._stopTicking();\n        try {\n          this.sendAsyncMessage(\"ZenPiP:Stop\", {});\n        } catch (_) {}\n        break;\n      }\n\n    }\n  }\n\n  _startTicking(win) {\n    if (this._tickScheduled && this._timerWindow === win) return;\n    this._stopTicking();\n    this._timerWindow = win;\n    this._tickScheduled = true;\n    this._currentQualityIndex = this._prefQualityIndex();\n    this._frameBudgetMs = this._prefFrameBudget();\n    this._lastTickSentAt = 0;\n    this._consecutiveSlow = 0;\n    this._consecutiveFast = 0;\n    if (this._captionsActive) this._startCaptionClock();\n    this._sendTick();\n    dlog(\"[Zenslop/parent] Ticking started (self-clocking)\");\n  }\n\n  _setProcessingActive(active, captionMode = \"off\", captionsActive = active) {\n    this._captionMode = captionMode === \"on\" || captionMode === \"youtube\"\n      ? captionMode\n      : \"off\";\n    this._captionsActive = Boolean(captionsActive) &&\n      this._captionMode !== \"off\";\n    try {\n      this.sendAsyncMessage(\"ZenPiP:SetProcessingState\", {\n        active: Boolean(active),\n        captionMode: this._captionMode,\n        captionsActive: this._captionsActive,\n      });\n    } catch (_) {}\n    if (this._captionsActive) {\n      this._startCaptionClock();\n    } else {\n      this._stopCaptionClock();\n    }\n  }\n\n  _setMaxDimension(maxDimension) {\n    const value = Math.round(Number(maxDimension));\n    this._displayMaxDimension = Number.isFinite(value)\n      ? Math.max(160, value)\n      : null;\n  }\n\n  _now() {\n    return this._timerWindow?.performance?.now?.() ?? Date.now();\n  }\n\n  // The pref names the best tier the adaptive controller may use; under load\n  // it can still downgrade below it, and recovery climbs back up to it.\n  _prefQualityIndex() {\n    let label = \"360\";\n    try {\n      label = Services.prefs.getStringPref(\"mod.zenslop.quality\", \"360\");\n    } catch (_) {}\n    const idx = QUALITY_TIERS.indexOf(label);\n    return idx === -1 ? 0 : idx;\n  }\n\n  _prefFrameBudget() {\n    let fps = DEFAULT_FPS;\n    try {\n      fps = parseInt(\n        Services.prefs.getStringPref(\n          \"mod.zenslop.framerate\",\n          String(DEFAULT_FPS),\n        ),\n        10,\n      );\n    } catch (_) {}\n    if (!Number.isFinite(fps)) fps = DEFAULT_FPS;\n    fps = Math.max(5, Math.min(30, fps));\n    return 1000 / fps;\n  }\n\n  _sendTick() {\n    if (!this._tickScheduled) return;\n    this._clearNextTick();\n    this._clearSafetyTimeout();\n\n    const minIndex = this._prefQualityIndex();\n    this._frameBudgetMs = this._prefFrameBudget();\n    if (this._currentQualityIndex < minIndex) {\n      this._currentQualityIndex = minIndex;\n    }\n\n    this._lastTickSentAt = this._now();\n    this._safetyTimeout = (this._timerWindow || this.browsingContext?.topChromeWindow)\n      ?.setTimeout(() => {\n        this._safetyTimeout = null;\n        if (this._tickScheduled) this._sendTick();\n      }, SAFETY_TICK_MS);\n\n    try {\n      const tierDimension = parseInt(\n        QUALITY_TIERS[this._currentQualityIndex],\n        10,\n      );\n      const captureDimension = this._displayMaxDimension\n        ? Math.min(tierDimension, this._displayMaxDimension)\n        : tierDimension;\n      this.sendAsyncMessage(\"ZenPiP:Tick\", {\n        quality: String(captureDimension),\n      });\n    } catch (e) {\n      console.error(\"[Zenslop/parent] Tick error:\", e?.name, e?.message);\n    }\n  }\n\n  _scheduleNextTick() {\n    // The pending-timer check keeps this a single chain: a stale frame from a\n    // pre-restart tick must not fork a second tick loop.\n    if (!this._tickScheduled || this._nextTickTimer) return;\n    const win = this._timerWindow || this.browsingContext?.topChromeWindow;\n    if (!win) return;\n    const elapsed = this._now() - this._lastTickSentAt;\n    const delay = Math.max(0, this._frameBudgetMs - elapsed);\n    this._nextTickTimer = win.setTimeout(() => {\n      this._nextTickTimer = null;\n      this._sendTick();\n    }, delay);\n  }\n\n  _clearNextTick() {\n    if (this._nextTickTimer) {\n      const win = this._timerWindow || this.browsingContext?.topChromeWindow;\n      try { win?.clearTimeout(this._nextTickTimer); } catch (_) {}\n      this._nextTickTimer = null;\n    }\n  }\n\n  _clearSafetyTimeout() {\n    if (this._safetyTimeout) {\n      const win = this._timerWindow || this.browsingContext?.topChromeWindow;\n      try { win?.clearTimeout(this._safetyTimeout); } catch (_) {}\n      this._safetyTimeout = null;\n    }\n  }\n\n  _startCaptionClock() {\n    const win = this._timerWindow || this.browsingContext?.topChromeWindow;\n    if (!win || this._captionTimer) return;\n    const tick = () => {\n      if (!this._captionsActive) return;\n      try {\n        this.sendAsyncMessage(\"ZenPiP:CaptionTick\", {});\n      } catch (_) {}\n    };\n    tick();\n    this._captionTimer = win.setInterval(tick, CAPTION_TICK_MS);\n  }\n\n  _stopCaptionClock() {\n    if (!this._captionTimer) return;\n    const win = this._timerWindow || this.browsingContext?.topChromeWindow;\n    try { win?.clearInterval(this._captionTimer); } catch (_) {}\n    this._captionTimer = null;\n  }\n\n  _onFrameDelivered() {\n    if (!this._tickScheduled || !this._lastTickSentAt) return;\n    const elapsed = this._now() - this._lastTickSentAt;\n\n    if (elapsed > this._frameBudgetMs * SLOW_FRAME_RATIO) {\n      this._consecutiveSlow++;\n      this._consecutiveFast = 0;\n      if (this._consecutiveSlow >= SLOW_FRAMES_BEFORE_DOWNGRADE &&\n          this._currentQualityIndex < QUALITY_TIERS.length - 1) {\n        this._currentQualityIndex++;\n        this._consecutiveSlow = 0;\n        dlog(`[Zenslop/parent] Quality \u2193 ${QUALITY_TIERS[this._currentQualityIndex]} (${Math.round(elapsed)}ms)`);\n      }\n    } else if (elapsed < this._frameBudgetMs * FAST_FRAME_RATIO) {\n      this._consecutiveFast++;\n      this._consecutiveSlow = 0;\n      if (this._consecutiveFast >= FAST_FRAMES_BEFORE_UPGRADE &&\n          this._currentQualityIndex > this._prefQualityIndex()) {\n        this._currentQualityIndex--;\n        this._consecutiveFast = 0;\n        dlog(`[Zenslop/parent] Quality \u2191 ${QUALITY_TIERS[this._currentQualityIndex]} (${Math.round(elapsed)}ms)`);\n      }\n    } else {\n      this._consecutiveSlow = 0;\n      this._consecutiveFast = 0;\n    }\n  }\n\n  _stopTicking() {\n    this._tickScheduled = false;\n    this._clearNextTick();\n    this._clearSafetyTimeout();\n    if (!this._captionsActive) this._stopCaptionClock();\n    this._timerWindow = null;\n  }\n\n  didDestroy() {\n    this._stopTicking();\n    this._setProcessingActive(false);\n    try {\n      this.sendAsyncMessage(\"ZenPiP:Stop\", {});\n    } catch (_) {}\n    const win = this.browsingContext?.topChromeWindow;\n    if (win && win.ZenPiPController) {\n      win.ZenPiPController.unregisterSource(this.browsingContext.id);\n      win.ZenPiPController.notifySourceStopped(this.browsingContext);\n    }\n  }\n}\n\n", "native-actor.sys.mjs": "// Runs only in the about:blank sidebar receiver. The parent creates this\n// receiver in the source process; no video pixels pass through JSActor IPC.\nexport class ZenSidebarNativeChild extends JSWindowActorChild {\n  receiveMessage({ name, data = {} }) {\n    switch (name) {\n      case \"ZenPiP:NativeReady\":\n        return { ready: this.document?.documentURI === \"about:blank\" &&\n          !!this.document.body };\n      case \"ZenPiP:NativeStart\":\n        return this._start(data);\n      case \"ZenPiP:NativeHealth\":\n        return this._health(data.sessionId);\n      case \"ZenPiP:NativeStop\":\n        if (this._session?.id === data.sessionId) this._stop();\n        return true;\n    }\n    return undefined;\n  }\n\n  _start({ videoRef, documentId, sessionId }) {\n    const doc = this.document;\n    if (doc?.documentURI !== \"about:blank\" || !doc.body) {\n      throw new Error(\"Native receiver must be an initialized about:blank document\");\n    }\n    this._stop();\n    const { ContentDOMReference } = ChromeUtils.importESModule(\n      \"resource://gre/modules/ContentDOMReference.sys.mjs\",\n    );\n    const source = ContentDOMReference.resolve(videoRef);\n    if (!source?.isConnected || source.localName !== \"video\" ||\n        source.ownerDocument.defaultView.windowGlobalChild.innerWindowId !== documentId) {\n      throw new Error(\"Native source reference expired or is in another process\");\n    }\n    const sourceAttrs = source.ownerDocument.nodePrincipal.originAttributes;\n    const targetAttrs = doc.nodePrincipal.originAttributes;\n    if ((sourceAttrs.userContextId || 0) !== (targetAttrs.userContextId || 0) ||\n        (sourceAttrs.privateBrowsingId || 0) !== (targetAttrs.privateBrowsingId || 0)) {\n      throw new Error(\"Native receiver context differs from source\");\n    }\n    if (!source.ownerDocument.hidden) throw new Error(\"Source video is visible\");\n    if (source.isCloningElementVisually) throw new Error(\"Source already has a PiP clone\");\n    if (typeof source.cloneElementVisually !== \"function\") {\n      throw new Error(\"Native cloning is unavailable\");\n    }\n\n    doc.body.style.cssText = \"margin:0;overflow:hidden;background:black\";\n    const target = doc.createElement(\"video\");\n    target.muted = target.defaultMuted = true;\n    target.style.cssText = \"position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:black\";\n    doc.body.appendChild(target);\n    const session = this._session = {\n      id: sessionId, source, target, src: source.currentSrc,\n      srcObject: source.srcObject, frames: 0, lastFrameAt: 0,\n    };\n    session.onHide = () => {\n      if (this._session === session) this._stop();\n    };\n    source.ownerDocument.defaultView.addEventListener(\"pagehide\", session.onHide);\n    if (typeof target.requestVideoFrameCallback === \"function\") {\n      const onFrame = () => {\n        if (this._session !== session) return;\n        session.frames++;\n        session.lastFrameAt = Date.now();\n        // Prove the first frame immediately, then sample at low frequency.\n        session.timer = this.contentWindow.setTimeout(() => {\n          if (this._session === session) {\n            session.callback = target.requestVideoFrameCallback(onFrame);\n          }\n        }, 2000);\n      };\n      session.callback = target.requestVideoFrameCallback(onFrame);\n    }\n    try {\n      // Gecko may never settle this promise. Parent-side startup is bounded\n      // and proves presentation separately rather than awaiting attachment.\n      Promise.resolve(source.cloneElementVisually(target)).catch(error => {\n        if (this._session === session) session.error = String(error);\n      });\n    } catch (error) {\n      this._stop();\n      throw error;\n    }\n    return { started: true };\n  }\n\n  _health(sessionId) {\n    const s = this._session;\n    if (!s || s.id !== sessionId) return { ok: false, error: \"Native session stopped\" };\n    const ok = !s.error && s.source.isConnected && s.target.isConnected &&\n      s.source.ownerDocument.hidden && s.source.isCloningElementVisually &&\n      s.source.currentSrc === s.src && s.source.srcObject === s.srcObject;\n    const rect = s.target.getBoundingClientRect();\n    return {\n      ok, error: s.error || (ok ? \"\" : \"Native source changed or clone disconnected\"),\n      presented: s.frames > 0 || s.target.mozPaintedFrames > 0,\n      frames: s.frames, lastFrameAt: s.lastFrameAt,\n      width: rect.width, height: rect.height,\n      paused: s.source.paused, time: s.source.currentTime,\n    };\n  }\n\n  _stop() {\n    const s = this._session;\n    if (!s) return;\n    this._session = null;\n    this.contentWindow.clearTimeout(s.timer);\n    try { s.target.cancelVideoFrameCallback?.(s.callback); } catch (_) {}\n    try {\n      s.source.ownerDocument.defaultView.removeEventListener(\"pagehide\", s.onHide);\n    } catch (_) {}\n    // Detachment ends this clone. A source-wide stop could terminate a newer\n    // PiP belonging to the user, so never call stopCloningElementVisually here.\n    s.target.remove();\n  }\n\n  didDestroy() {\n    this._stop();\n  }\n}\n\n"};
  const actorDirectory=PathUtils.join(PathUtils.profileDir,'chrome','letter-tabs-video-actors');
  try {
    await IOUtils.makeDirectory(actorDirectory,{ignoreExisting:true});
    for(const [name,source] of Object.entries(actorSources)){
      const path=PathUtils.join(actorDirectory,name);
      if(!(await IOUtils.exists(path)) || await IOUtils.readUTF8(path)!==source)
        await IOUtils.writeUTF8(path,source,{tmpPath:path+'.'+Services.uuid.generateUUID().toString()+'.tmp'});
    }
  } catch(error) { console.error('[Letter Tabs video] Actor setup failed',error);delete window.__zenslopLoaded;return; }


  const LOG_PREFIX = "[Zenslop]";
  const CAPTIONS_PREF = "mod.zenslop.captions";
  const RENDERER_PREF = "mod.zenslop.renderer";
  const CAPTIONS_WHEN_PIP_HIDDEN_PREF =
    "mod.zenslop.captionsWhenPipHidden";
  const CAPTION_MODES = new Set(["off", "on", "youtube"]);
  const log = (...a) => console.log(LOG_PREFIX, ...a);
  const warn = (...a) => console.warn(LOG_PREFIX, ...a);
  const err = (...a) => console.error(LOG_PREFIX, ...a);
  const safe = (fn) => {
    try {
      return fn();
    } catch (_) {
      return undefined;
    }
  };

  const CONFIG = Object.freeze({
    GAP: 6,
    TAB_LIST_GAP: 6,
    ANIM_MS: 220,
    LAYOUT_ANIM_MS: 180,
    CAPTION_ANIM_MS: 180,
    CAPTION_GAP_GRACE_MS: 1000,
    ANIM_TAIL_MS: 350,
    ELEVATED_HOLD_MS: 180,
    // A downward move of the player's top edge larger than this (px) is only
    // committed after the lower edge holds stable for DOWN_HOLD_MS. YouTube's
    // controls make the measured edge oscillate for a few seconds after a
    // fast-forward into buffered content while hovered; this asymmetric hold
    // lets the PiP rise instantly but resists transient drops.
    TOP_SPIKE_MAX: 32,
    DOWN_HOLD_MS: 400,
    MAX_HEIGHT: 600,
    DEFAULT_ASPECT: 16 / 9,
    PIP_OPEN_DEBOUNCE_MS: 1500,
    PIP_OBSERVE_TIMEOUT_MS: 3000,
  });
  const LAYOUT_TRANSITION =
    `top ${CONFIG.LAYOUT_ANIM_MS}ms ease-out, ` +
    `left ${CONFIG.LAYOUT_ANIM_MS}ms ease-out, ` +
    `width ${CONFIG.LAYOUT_ANIM_MS}ms ease-out, ` +
    `height ${CONFIG.LAYOUT_ANIM_MS}ms ease-out`;
  const ANIM_TRANSITION =
    `opacity ${CONFIG.ANIM_MS}ms ease, ` +
    `transform ${CONFIG.ANIM_MS}ms ease, ${LAYOUT_TRANSITION}`;

  const MUSIC_PLAYER_SELECTORS = [
    "#zen-media-controls-toolbar", ".zen-sidebar-bottom-buttons",
  ];
  // These are ordered fallbacks, not a comma-separated selector. querySelector
  // returns document order: the outer #tabbrowser-tabs wins over its children
  // and resizing it moves the controls that our next measurement depends on.
  // Never resize that outer strip (or Library's copies of workspace tabs).
  const TAB_LIST_SELECTORS = [
    "#zen-tabs-wrapper", "#tabbrowser-arrowscrollbox",
  ];
  const PIP_BUTTON_SELECTORS = [
    '[id*="pictureinpicture" i]',
    '[class*="pictureinpicture" i]',
    '[command*="pictureinpicture" i]',
    '[id*="pip" i]',
    '[class*="pip" i]',
    '[anonid*="pictureinpicture" i]',
  ].join(",");

  const musicPlayerUI = MUSIC_PLAYER_SELECTORS
    .map(selector => document.querySelector(selector)).find(Boolean);
  if (!musicPlayerUI) {
    err("Could not find the music player UI.");
    return;
  }

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #zen-sidebar-pip-container {
      position: fixed;
      background: transparent;
      display: none;
      border-radius: var(--zen-border-radius);
      overflow: hidden;
      contain: strict;
      z-index: 10;
      pointer-events: none;
      transform-origin: 50% 100%;
      transition: ${LAYOUT_TRANSITION};
      will-change: opacity, transform, top, left, width, height;
    }
    #zen-sidebar-pip-container::after {
      content: "";
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      border: 1px solid color-mix(in srgb, white 8%, transparent);
      border-radius: inherit;
      z-index: 2;
      pointer-events: none;
    }
    #zen-sidebar-pip-container > canvas {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      min-width: 0;
      min-height: 0;
      border-radius: calc(var(--zen-border-radius) + 2px);
      object-fit: fill;
      display: block;
    }
    #zen-sidebar-pip-container > browser {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      border: 0;
    }
    #zen-sidebar-pip-caption {
      position: fixed;
      display: none;
      box-sizing: border-box;
      padding: 7px 10px;
      color: white;
      background: color-mix(in srgb, black 78%, transparent);
      border: 1px solid color-mix(in srgb, white 8%, transparent);
      border-radius: var(--zen-border-radius);
      box-shadow: 0 3px 12px rgb(0 0 0 / 28%);
      font: 600 12px/1.35 system-ui, sans-serif;
      text-align: center;
      text-wrap: balance;
      overflow-wrap: anywhere;
      max-height: calc(4.05em + 14px);
      overflow: hidden;
      z-index: 11;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px) scale(0.96);
      transform-origin: 50% 100%;
      transition: opacity ${CONFIG.CAPTION_ANIM_MS}ms ease,
                  transform ${CONFIG.CAPTION_ANIM_MS}ms ease,
                  height ${CONFIG.LAYOUT_ANIM_MS}ms ease-out,
                  top ${CONFIG.LAYOUT_ANIM_MS}ms ease-out;
      will-change: opacity, transform, height, top;
    }
    #zen-sidebar-pip-caption[zenslop-caption-visible="true"] {
      opacity: var(--zenslop-caption-opacity, 1);
      transform: translateY(0) scale(1);
    }
    [zenslop-tab-list-sized="true"] {
      box-sizing: border-box !important;
      min-height: 0 !important;
      height: var(--zenslop-tab-list-height) !important;
      max-height: var(--zenslop-tab-list-height) !important;
      flex: 0 1 var(--zenslop-tab-list-height) !important;
      padding-bottom: 0 !important;
    }
    .zen-sidebar-pip-toggle {
      flex: 0 0 auto;
      max-width: 24px !important;
      max-height: 24px !important;
      width: 24px !important;
      height: 24px !important;
      margin: 0 2px !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    .zen-media-card:not([can-pip]) .zen-sidebar-pip-toggle {
      display: none !important;
    }
    [zenslop-parked="true"] {
      display: none !important;
      visibility: collapse !important;
      width: 0 !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }
  `;
  document.documentElement.appendChild(styleEl);

  const pipContainer = document.createElement("div");
  pipContainer.id = "zen-sidebar-pip-container";
  const canvasEl = document.createElement("canvas");
  const canvasCtx = canvasEl.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });
  pipContainer.appendChild(canvasEl);
  // A viewport-sized layer lets the preview inherit the toolbox's Library
  // transform without replacing its own entrance/layout animations.
  const libraryMotionLayer = document.createElement("div");
  libraryMotionLayer.id = "zenslop-library-motion";
  libraryMotionLayer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10";
  libraryMotionLayer.appendChild(pipContainer);
  document.documentElement.appendChild(libraryMotionLayer);

  const captionContainer = document.createElement("div");
  captionContainer.id = "zen-sidebar-pip-caption";
  captionContainer.setAttribute("aria-live", "off");
  libraryMotionLayer.appendChild(captionContainer);

  let lastTop = -1,
    lastLeft = -1,
    lastWidth = -1;
  let lastVisible = null;
  let lastOpacity = NaN;
  let lastCaptionOpacity = NaN;
  let isStreaming = false;
  let userHidden = false;
  let scheduled = false;
  let activeUntil = 0;
  let hoverActive = false;
  let lastElevatedTop = null;
  let lastElevatedAt = 0;
  let lastCommittedMediaTop = null;
  let pendingDownAt = 0;
  let animating = false;
  let animateOutTimer = null;
  let videoAspect = CONFIG.DEFAULT_ASPECT;
  let captionText = "";
  let captionHideTimer = null;
  let captionExitTimer = null;
  let captionNeedsMeasure = false;
  let captionResizeFromHeight = null;
  let browserWindowActive = true;
  let captureMaxDimension = -1;
  function getCaptionMode() {
    const mode = safe(() =>
      Services.prefs.getStringPref(CAPTIONS_PREF, "youtube"),
    );
    if (CAPTION_MODES.has(mode)) return mode;
    // Preserve the meaning of the short-lived checkbox version of this pref.
    const legacyEnabled = safe(() =>
      Services.prefs.getBoolPref(CAPTIONS_PREF),
    );
    if (typeof legacyEnabled === "boolean") {
      return legacyEnabled ? "youtube" : "off";
    }
    return "youtube";
  }
  let captionMode = getCaptionMode();
  let captionsWhenPipHidden = safe(() =>
    Services.prefs.getBoolPref(CAPTIONS_WHEN_PIP_HIDDEN_PREF, false),
  ) === true;

  function setCanvasDimensions(w, h) {
    if (!(w > 0) || !(h > 0)) return;
    if (canvasEl.width !== w) canvasEl.width = w;
    if (canvasEl.height !== h) canvasEl.height = h;
  }

  function setSourceDimensions(w, h) {
    if (!(w > 0) || !(h > 0)) return;
    setCanvasDimensions(w, h);
    const nextAspect = w / h;
    if (nextAspect !== videoAspect) {
      videoAspect = nextAspect;
      lastTop = lastLeft = lastWidth = -1;
      bump();
    }
  }

  let lastTabListHeight = -1;
  let lastDownloadsOpen = false;
  let sizedTabList = null;
  function getTabListTarget() {
    if (sizedTabList?.isConnected) return sizedTabList;
    for (const selector of TAB_LIST_SELECTORS) {
      const target = document.querySelector(selector);
      if (target && !target.contains(musicPlayerUI)) return target;
    }
    return null;
  }
  function clearTabListHeight() {
    if (sizedTabList?.isConnected) {
      sizedTabList.removeAttribute("zenslop-tab-list-sized");
      sizedTabList.style.removeProperty("--zenslop-tab-list-height");
    }
    sizedTabList = null;
    lastTabListHeight = -1;
  }
  function setTabListHeight(px) {
    const target = px >= 0 ? getTabListTarget() : null;
    if (px === lastTabListHeight && target === sizedTabList) return;

    if (target !== sizedTabList) clearTabListHeight();
    if (target) {
      // Clean up the attribute and property used by versions that reserved
      // space with bottom padding instead of changing the list height.
      target.removeAttribute("zenslop-tab-padding");
      target.style.removeProperty("--zenslop-tab-list-padding");
      target.setAttribute("zenslop-tab-list-sized", "true");
      target.style.setProperty("--zenslop-tab-list-height", px + "px");
      sizedTabList = target;
      lastTabListHeight = px;
    }
  }

  function getMediaTopEdge(walkDescendants) {
    const baseRect = musicPlayerUI.getBoundingClientRect();
    let top = baseRect.top;
    if (walkDescendants && (hoverActive || performance.now() < activeUntil)) {
      const kids = musicPlayerUI.querySelectorAll("*");
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        const r = kid.getBoundingClientRect();
        if (r.width !== 0 && r.height !== 0 && r.top < top) {
          const style = window.getComputedStyle(kid);
          if (style.position === "absolute" || style.position === "fixed") {
            continue;
          }
          if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
            continue;
          }
          top = r.top;
        }
      }
    }
    // Zen 1.23's recent downloads are an absolute overlay, not a taller
    // toolbar. Our fixed preview lives outside Zen's sidebar mask, so place
    // it above that overlay while Library's stack is open.
    const foot = document.getElementById("zen-sidebar-foot-buttons");
    const downloads = document.getElementById("zen-library-download-list");
    let downloadsOpen = false;
    if (foot?.hasAttribute("zen-library-stack-open") && downloads) {
      const style = window.getComputedStyle(downloads);
      const rect = downloads.getBoundingClientRect();
      if (style.display !== "none" && style.visibility !== "hidden" &&
          rect.width > 0 && rect.height > 0) {
        downloadsOpen = true;
        top = Math.min(top, rect.top);
      }
    }
    return {
      top,
      baseTop: baseRect.top,
      left: baseRect.left,
      width: baseRect.width,
      downloadsOpen,
    };
  }

  function getLibraryPresentation() {
    const library = document.querySelector("zen-library[open]");
    const toolbox = document.getElementById("navigator-toolbox");
    const progress = library ? Number(library.openProgress ?? 1) : 0;
    return {
      active: !!library,
      hidden: !!library && progress >= 0.999,
      toolbox,
      opacity: library && toolbox
        ? Number.parseFloat(window.getComputedStyle(toolbox).opacity) || 0
        : 1,
    };
  }

  function syncLibraryMotion(presentation) {
    if (!presentation.active || !presentation.toolbox) {
      libraryMotionLayer.style.removeProperty("transform");
      libraryMotionLayer.style.removeProperty("transform-origin");
      libraryMotionLayer.style.removeProperty("opacity");
      return;
    }
    const toolbox = presentation.toolbox;
    const style = window.getComputedStyle(toolbox);
    const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
    const [originX, originY] = style.transformOrigin.split(" ").map(Number.parseFloat);
    const rect = toolbox.getBoundingClientRect();
    // Convert the toolbox's local pivot to viewport coordinates. Zen uses
    // uniform scale in normal mode and horizontal translation in compact mode.
    libraryMotionLayer.style.transformOrigin =
      `${rect.left - matrix.e + matrix.a * originX}px ${rect.top - matrix.f + matrix.d * originY}px`;
    libraryMotionLayer.style.transform = style.transform;
    // Apply the toolbox fade outside local entrance/caption transitions so
    // they cannot add another easing curve or delay to Zen's spring samples.
    libraryMotionLayer.style.opacity = String(presentation.opacity);
  }

  function getMediaPlayerVisibility() {
    const library = getLibraryPresentation();
    if (library.hidden) {
      return { visible: false, opacity: 0 };
    }
    if (musicPlayerUI.hidden || musicPlayerUI.hasAttribute("hidden")) {
      return { visible: false, opacity: 0 };
    }
    const cs = window.getComputedStyle(musicPlayerUI);
    if (cs.display === "none" || cs.visibility === "hidden") {
      return { visible: false, opacity: 0 };
    }
    if (musicPlayerUI.offsetParent === null && cs.position !== "fixed") {
      return { visible: false, opacity: 0 };
    }
    const r = musicPlayerUI.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      return { visible: false, opacity: 0 };
    }
    return { visible: true, opacity: parseFloat(cs.opacity) * library.opacity };
  }

  function syncPosition() {
    scheduled = false;
    if (!isStreaming) return;

    const library = getLibraryPresentation();
    syncLibraryMotion(library);
    const { visible, opacity } = getMediaPlayerVisibility();
    const pipVisible =
      visible &&
      opacity > 0.01 &&
      !userHidden &&
      !sourceTabActive &&
      browserWindowActive;
    const captionVisible =
      visible &&
      opacity > 0.01 &&
      captionMode !== "off" &&
      (!userHidden || captionsWhenPipHidden) &&
      !sourceTabActive &&
      browserWindowActive;
    const visibilityState = `${pipVisible}:${captionVisible}`;
    if (visibilityState !== lastVisible) {
      pipContainer.style.visibility = pipVisible ? "visible" : "hidden";
      captionContainer.style.visibility = captionVisible
        ? "visible"
        : "hidden";
      lastVisible = visibilityState;
      _notifyTickState();
    }
    if (!animating) {
      const localOpacity = library.active && library.toolbox && library.opacity > 0
        ? opacity / library.opacity : opacity;
      const op = userHidden ? 0 : localOpacity;
      if (op !== lastOpacity) {
        pipContainer.style.opacity = String(op);
        lastOpacity = op;
      }
      const captionOpacity = captionVisible ? localOpacity : 0;
      if (captionOpacity !== lastCaptionOpacity) {
        captionContainer.style.setProperty(
          "--zenslop-caption-opacity",
          String(captionOpacity),
        );
        lastCaptionOpacity = captionOpacity;
      }
    }

    // Keep untransformed geometry while Library moves the toolbox. Measuring
    // its transformed controls and also transforming our layer would double
    // the movement and feed animated coordinates back into tab sizing.
    if ((pipVisible || captionVisible) && !library.active) {
      const {
        top: mediaTopRaw,
        baseTop,
        left,
        width: playerWidth,
        downloadsOpen,
      } = getMediaTopEdge(true);
      if (playerWidth !== 0) {
        const now = performance.now();
        if (downloadsOpen !== lastDownloadsOpen) {
          lastElevatedTop = null;
          lastCommittedMediaTop = null;
          pendingDownAt = 0;
          lastDownloadsOpen = downloadsOpen;
        }
        let mediaTop = mediaTopRaw;
        if (mediaTopRaw < baseTop - 1) {
          lastElevatedTop = mediaTopRaw;
          lastElevatedAt = now;
        } else if (
          lastElevatedTop !== null &&
          now - lastElevatedAt < CONFIG.ELEVATED_HOLD_MS
        ) {
          mediaTop = lastElevatedTop;
          schedule();
        } else {
          lastElevatedTop = null;
        }

        // Asymmetric hold for the player's top edge: the PiP may rise
        // immediately (to stay above the controls), but a downward move is only
        // committed once the lower edge has held stable for DOWN_HOLD_MS. While
        // holding we substitute the last committed (higher) edge rather than
        // skipping the frame, so the position still updates (left/width/aspect)
        // and always has a value — but doesn't drop for the transient control
        // oscillation YouTube emits for a few seconds after a fast-forward or a
        // pause/play while the controls are hovered. The reference persists
        // across stop/restart (see stopTracking) so pause/play keeps its stable
        // pre-pause baseline instead of re-seeding mid-oscillation.
        if (
          lastCommittedMediaTop !== null &&
          mediaTop - lastCommittedMediaTop > CONFIG.TOP_SPIKE_MAX
        ) {
          if (pendingDownAt === 0) pendingDownAt = now;
          if (now - pendingDownAt < CONFIG.DOWN_HOLD_MS) {
            mediaTop = lastCommittedMediaTop;
            schedule();
          } else {
            pendingDownAt = 0;
            lastCommittedMediaTop = mediaTop;
          }
        } else {
          pendingDownAt = 0;
          lastCommittedMediaTop = mediaTop;
        }

        let captionHeight = 0;
        let videoBottom = mediaTop - CONFIG.GAP;
        let captionTop = null;
        if (captionVisible && captionText) {
          const cs = captionContainer.style;
          const wasDisplayed = cs.display !== "none";
          const currentHeight = wasDisplayed
            ? captionContainer.getBoundingClientRect().height
            : 0;
          const nextWidth = playerWidth + "px";
          const widthChanged = cs.width !== nextWidth;
          cs.display = "block";
          cs.width = nextWidth;
          cs.left = left + "px";

          if (captionNeedsMeasure || widthChanged) {
            const fromHeight = captionResizeFromHeight ?? currentHeight;
            cs.height = "auto";
            const targetHeight = Math.ceil(
              captionContainer.getBoundingClientRect().height,
            );
            if (fromHeight > 0 && Math.abs(targetHeight - fromHeight) > 0.5) {
              cs.height = fromHeight + "px";
              void captionContainer.getBoundingClientRect();
              cs.height = targetHeight + "px";
              activeUntil = Math.max(
                activeUntil,
                now + CONFIG.LAYOUT_ANIM_MS + CONFIG.ANIM_TAIL_MS,
              );
            } else {
              cs.height = targetHeight + "px";
            }
            captionNeedsMeasure = false;
            captionResizeFromHeight = null;
          }

          captionHeight = Math.ceil(
            Number.parseFloat(cs.height) ||
            captionContainer.getBoundingClientRect().height,
          );
          captionTop = mediaTop - CONFIG.GAP - captionHeight;
          cs.top = captionTop + "px";
          if (pipVisible) videoBottom = captionTop - CONFIG.GAP;
        } else {
          captionContainer.style.display = "none";
        }

        let occupiedTop = captionTop;
        if (pipVisible) {
          const availableHeight = Math.max(2, videoBottom);
          let width = playerWidth;
          let height = width / videoAspect;
          const effectiveMaxHeight = Math.max(
            2,
            Math.min(playerWidth, availableHeight),
          );
          if (height > effectiveMaxHeight) {
            height = effectiveMaxHeight;
            width = height * videoAspect;
          }
          const adjustedLeft = left + (playerWidth - width) / 2;

          const nextCaptureMaxDimension = Math.max(
            160,
            Math.ceil(Math.max(width, height)),
          );
          if (nextCaptureMaxDimension !== captureMaxDimension) {
            captureMaxDimension = nextCaptureMaxDimension;
            const info = sourceBC ? actorRegistry.get(sourceBC.id) : null;
            info?.setMaxDimension?.(captureMaxDimension);
          }

          const top = videoBottom - height;
          occupiedTop = top;
          if (
            top !== lastTop ||
            adjustedLeft !== lastLeft ||
            width !== lastWidth
          ) {
            const s = pipContainer.style;
            s.width = width + "px";
            s.height = height + "px";
            s.left = adjustedLeft + "px";
            s.top = top + "px";
            lastTop = top;
            lastLeft = adjustedLeft;
            lastWidth = width;
            activeUntil = now + CONFIG.ANIM_TAIL_MS;
          }
        }
        const tabList = getTabListTarget();
        if (tabList && occupiedTop !== null) {
          const tabListTop = tabList.getBoundingClientRect().top;
          // Keep a small separation between the final tab and the fixed PiP.
          const availableTabListHeight = Math.max(
            0,
            Math.floor(occupiedTop - CONFIG.TAB_LIST_GAP - tabListTop),
          );
          setTabListHeight(availableTabListHeight);
        } else if (!pipVisible) {
          clearTabListHeight();
        }
      }
    } else if (!pipVisible && !captionVisible) {
      captionContainer.style.display = "none";
      clearTabListHeight();
    }

    if (performance.now() < activeUntil) schedule();
  }

  function schedule() {
    if (scheduled || !isStreaming) return;
    scheduled = true;
    requestAnimationFrame(syncPosition);
  }

  function bump() {
    activeUntil = performance.now() + CONFIG.ANIM_TAIL_MS;
    schedule();
  }

  function clearCaptionTimers() {
    if (captionHideTimer) {
      clearTimeout(captionHideTimer);
      captionHideTimer = null;
    }
    if (captionExitTimer) {
      clearTimeout(captionExitTimer);
      captionExitTimer = null;
    }
  }

  function clearCaptionImmediately() {
    clearCaptionTimers();
    captionContainer.removeAttribute("zenslop-caption-visible");
    captionContainer.textContent = "";
    captionContainer.style.display = "none";
    captionContainer.style.removeProperty("height");
    captionText = "";
    captionNeedsMeasure = false;
    captionResizeFromHeight = null;
    lastTop = lastLeft = lastWidth = -1;
  }

  function showCaption(next) {
    const wasEmpty = !captionText;
    clearCaptionTimers();
    if (captionContainer.style.display !== "none") {
      const currentHeight = captionContainer.getBoundingClientRect().height;
      if (currentHeight > 0) captionResizeFromHeight = currentHeight;
    }
    captionNeedsMeasure = true;
    captionText = next;
    captionContainer.textContent = next;
    lastTop = lastLeft = lastWidth = -1;
    if (isStreaming) bump();

    if (wasEmpty) {
      captionContainer.removeAttribute("zenslop-caption-visible");
      requestAnimationFrame(() => {
        if (!captionText) return;
        // syncPosition has now made the caption measurable and positioned it.
        // Flush that hidden state so the following attribute change transitions.
        void captionContainer.getBoundingClientRect();
        captionContainer.setAttribute("zenslop-caption-visible", "true");
      });
    } else {
      captionContainer.setAttribute("zenslop-caption-visible", "true");
    }
  }

  function hideCaptionNow() {
    clearCaptionTimers();
    if (!captionText) {
      captionContainer.removeAttribute("zenslop-caption-visible");
      return;
    }
    captionContainer.removeAttribute("zenslop-caption-visible");
    captionExitTimer = setTimeout(() => {
      captionExitTimer = null;
      captionText = "";
      captionContainer.textContent = "";
      captionContainer.style.removeProperty("height");
      captionNeedsMeasure = false;
      captionResizeFromHeight = null;
      lastTop = lastLeft = lastWidth = -1;
      if (isStreaming) bump();
    }, CONFIG.CAPTION_ANIM_MS);
  }

  function hideCaptionAfterGap() {
    if (!captionText || captionHideTimer || captionExitTimer) return;
    captionHideTimer = setTimeout(() => {
      captionHideTimer = null;
      captionContainer.removeAttribute("zenslop-caption-visible");
      captionExitTimer = setTimeout(() => {
        captionExitTimer = null;
        captionText = "";
        captionContainer.textContent = "";
        captionContainer.style.removeProperty("height");
        captionNeedsMeasure = false;
        captionResizeFromHeight = null;
        lastTop = lastLeft = lastWidth = -1;
        if (isStreaming) bump();
      }, CONFIG.CAPTION_ANIM_MS);
    }, CONFIG.CAPTION_GAP_GRACE_MS);
  }

  function startTracking() {
    lastTop = lastLeft = lastWidth = -1;
    lastVisible = null;
    lastOpacity = NaN;
    lastCaptionOpacity = NaN;
    captureMaxDimension = -1;
    bump();
    _notifyTickState();
  }
  function stopTracking() {
    activeUntil = 0;
    hoverActive = false;
    lastElevatedTop = null;
    lastElevatedAt = 0;
    // NB: lastCommittedMediaTop is intentionally NOT reset here. The sidebar
    // player's top edge is stable across a pause/play, so keeping the reference
    // lets the asymmetric hold resist the transient control oscillation on
    // restart instead of re-seeding mid-glitch. (pendingDownAt is reset — a
    // fresh timer per stream is fine and self-heals on the next up-frame.)
    pendingDownAt = 0;
    clearTabListHeight();
    sourceTabActive = false;
    _notifyTickState();
  }

  musicPlayerUI.addEventListener("mouseenter", () => {
    hoverActive = true;
    bump();
  });
  musicPlayerUI.addEventListener("mouseleave", () => {
    hoverActive = false;
    bump();
  });
  for (const ev of [
    "transitionrun",
    "transitionend",
    "animationstart",
    "animationend",
  ]) {
    musicPlayerUI.addEventListener(ev, bump);
  }

  safe(() => {
    const ro = new ResizeObserver(bump);
    ro.observe(musicPlayerUI);
    ro.observe(document.documentElement);
  });

  new MutationObserver(bump).observe(musicPlayerUI, {
    attributes: true,
    attributeFilter: ["hidden", "style", "class", "open"],
  });
  const sidebarLayout = musicPlayerUI.parentElement;
  if (sidebarLayout) {
    // Library changes sibling hover attributes/animations without resizing
    // the media toolbar itself. Watch the shared layout, not just the player.
    const libraryObserver = new MutationObserver(bump);
    libraryObserver.observe(sidebarLayout, {
      attributes: true,
      subtree: true,
      attributeFilter: ["zen-library-stack-open", "zen-library-stack-closing"],
    });
    for (const type of ["transitionrun", "transitionend", "animationstart", "animationend"]) {
      sidebarLayout.addEventListener(type, bump);
    }
    window.addEventListener("unload", () => {
      libraryObserver.disconnect();
      for (const type of ["transitionrun", "transitionend", "animationstart", "animationend"]) {
        sidebarLayout.removeEventListener(type, bump);
      }
      clearTabListHeight();
    }, { once: true });
  }
  window.addEventListener("resize", bump);

  // Zen writes the toolbox transform/opacity on each spring update. Follow
  // those exact samples, including swipe gestures and interrupted animations.
  const libraryVisibilityObserver = new MutationObserver(records => {
    if (!records.some(record => record.target.localName === "zen-library" ||
        record.target.id === "navigator-toolbox")) return;
    _notifyTickState();
    bump();
  });
  libraryVisibilityObserver.observe(document.documentElement, {
    attributes: true, subtree: true, attributeFilter: ["open", "style"],
  });
  window.addEventListener("unload", () => libraryVisibilityObserver.disconnect(), { once: true });

  function updateBrowserActivity() {
    const nextActive =
      document.visibilityState !== "hidden" &&
      window.windowState !== window.STATE_MINIMIZED &&
      safe(() => Services.focus.activeWindow === window) !== false;
    if (nextActive === browserWindowActive) return;
    browserWindowActive = nextActive;
    if (!browserWindowActive) {
      pipContainer.style.visibility = "hidden";
      captionContainer.style.visibility = "hidden";
      clearTabListHeight();
    }
    if (isStreaming) bump();
    _notifyTickState();
  }

  window.addEventListener("activate", updateBrowserActivity);
  window.addEventListener("deactivate", updateBrowserActivity);
  window.addEventListener("sizemodechange", updateBrowserActivity);
  document.addEventListener("visibilitychange", updateBrowserActivity);
  setTimeout(updateBrowserActivity, 0);

  const EYE_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='context-fill' fill-opacity='context-fill-opacity'>" +
    "<path d='M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'/></svg>";
  const EYE_OFF_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='context-fill' fill-opacity='context-fill-opacity'>" +
    "<path d='M2 2l20 20-1.4 1.4-3.5-3.5A12 12 0 0 1 12 21C5 21 1 14 1 14a20 20 0 0 1 4.6-5.6L.6 3.4 2 2zm10 6a4 4 0 0 1 4 4c0 .6-.1 1.1-.3 1.6l-5.3-5.3c.5-.2 1-.3 1.6-.3zM12 5c7 0 11 7 11 7a20 20 0 0 1-3.7 4.6l-2.1-2.1A8 8 0 0 0 12 7c-.7 0-1.4.1-2 .3L7.7 5C9 4.4 10.4 5 12 5z'/></svg>";
  const eyeUrl = (svg) =>
    `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  const EYE_URL = eyeUrl(EYE_SVG);
  const EYE_OFF_URL = eyeUrl(EYE_OFF_SVG);
  const STRIPPED_ATTRS = [
    "command",
    "oncommand",
    "onclick",
    "data-l10n-id",
    "style",
    "hidden",
    "collapsed",
    "disabled",
    "aria-hidden",
  ];

  const togglesByNativeButton = new Map();

  function syncToggleIcons() {
    for (const [nativeButton, toggle] of togglesByNativeButton) {
      if (!nativeButton.isConnected || !toggle.isConnected) {
        togglesByNativeButton.delete(nativeButton);
        continue;
      }
      const icon = userHidden ? EYE_OFF_URL : EYE_URL;
      if (toggle.style.listStyleImage !== icon) {
        toggle.style.listStyleImage = icon;
      }
    }
  }

  function parkNativePipButton(btn) {
    if (!btn || btn.hasAttribute("zenslop-toggle")) return;
    if (btn.getAttribute("zenslop-parked") !== "true") {
      btn.setAttribute("zenslop-parked", "true");
    }
    if (btn.style.display !== "none") {
      btn.style.display = "none";
    }
    if (btn.getAttribute("aria-hidden") !== "true") {
      btn.setAttribute("aria-hidden", "true");
    }
  }

  function buildToggle(template) {
    const btn = template.cloneNode(true);
    btn.removeAttribute("id");
    btn.classList.remove("zen-media-pip-button");
    btn.classList.add("zen-sidebar-pip-toggle");
    btn.removeAttribute("zenslop-parked");
    btn.setAttribute("zenslop-toggle", "true");
    btn.setAttribute("tooltiptext", "Toggle sidebar PiP");
    for (const a of STRIPPED_ATTRS) btn.removeAttribute(a);
    btn.style.listStyleImage = userHidden ? EYE_OFF_URL : EYE_URL;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      userHidden = !userHidden;
      syncToggleIcons();
      if (userHidden) clearTabListHeight();
      bump();
      _notifyTickState();
    });
    return btn;
  }

  function placeToggles() {
    for (const [nativeButton, toggle] of togglesByNativeButton) {
      if (!nativeButton.isConnected || !toggle.isConnected) {
        togglesByNativeButton.delete(nativeButton);
      }
    }

    const nativeButtons = musicPlayerUI.querySelectorAll(PIP_BUTTON_SELECTORS);
    for (const nativeButton of nativeButtons) {
      if (nativeButton.hasAttribute("zenslop-toggle")) continue;
      const existingToggle = togglesByNativeButton.get(nativeButton);
      if (existingToggle?.isConnected) {
        parkNativePipButton(nativeButton);
        continue;
      }
      if (!nativeButton.parentNode) continue;
      const toggle = buildToggle(nativeButton);
      nativeButton.parentNode.insertBefore(toggle, nativeButton);
      togglesByNativeButton.set(nativeButton, toggle);
      parkNativePipButton(nativeButton);
    }
    syncToggleIcons();
  }

  placeToggles();
  new MutationObserver(() => {
    placeToggles();
  }).observe(musicPlayerUI, {
    attributes: true,
    attributeFilter: ["hidden", "style", "class", "collapsed"],
    childList: true,
    subtree: true,
  });

  let sourceBC = null;
  let sourceTabActive = false;
  let lastPipOpenAt = 0;
  const availableSources = new Map();
  const actorRegistry = new Map();
  const nativeSources = new Map();
  let nativeSession = null;
  let nativeSerial = 0;
  let nativeFailedSource = null;
  let nativeFallbackReason = "";
  let rendererDisposed = false;
  const nativeMediaAdapters = new Map();

  function installNativeMediaAdapter() {
    // Zen 1.23 hides cards whenever Gecko reports PiP mode. Visual cloning
    // sets that flag too, causing hide -> stop clone -> show -> clone loops.
    // Override only the visibility decision for OUR source while OUR receiver
    // is attaching/presenting; regular PiP/fullscreen keeps Zen's behavior.
    const card = window.gZenMediaController?.frontCard;
    const prototype = card && Object.getPrototypeOf(card);
    if (nativeMediaAdapters.has(prototype)) return;
    const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, "shouldBeVisible");
    if (!descriptor?.get || !descriptor.configurable) {
      throw new Error("Zen media visibility adapter unavailable; using canvas");
    }
    const getter = function () {
      if (nativeSession?.cloning && this.controller &&
          this.browser?.browsingContext?.id === nativeSession.bc.top.id &&
          !document.documentElement.hasAttribute("inDOMFullscreen")) {
        return gBrowser.selectedBrowser.browserId !== this.browser.browserId;
      }
      return descriptor.get.call(this);
    };
    Object.defineProperty(prototype, "shouldBeVisible", { ...descriptor, get: getter });
    nativeMediaAdapters.set(prototype, { descriptor, getter });
  }

  function restoreNativeMediaAdapters() {
    for (const [prototype, { descriptor, getter }] of nativeMediaAdapters) {
      if (Object.getOwnPropertyDescriptor(prototype, "shouldBeVisible")?.get === getter) {
        Object.defineProperty(prototype, "shouldBeVisible", descriptor);
      }
    }
    nativeMediaAdapters.clear();
  }

  function nativeQuery(session, name, data = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${name} timed out`)), 2000);
      try {
        const actor = session.browser.browsingContext.currentWindowGlobal
          .getActor("ZenSidebarNative");
        Promise.resolve(actor.sendQuery(name, {
          ...data, sessionId: session.id,
        })).then(resolve, reject).finally(() => clearTimeout(timer));
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  function stopNativePreview() {
    const session = nativeSession;
    if (!session) return;
    nativeSession = null;
    clearTimeout(session.healthTimer);
    safe(() => session.browser.browsingContext.currentWindowGlobal
      .getActor("ZenSidebarNative").sendAsyncMessage("ZenPiP:NativeStop", {
        sessionId: session.id,
      }));
    session.browser.remove();
    // Retain the fallback object and restore it after native output ends.
    if (!canvasEl.isConnected) pipContainer.appendChild(canvasEl);
  }

  function failNativePreview(session, error) {
    if (nativeSession !== session) return;
    nativeFailedSource = session.source;
    nativeFallbackReason = String(error);
    warn("Native preview unavailable; using canvas:", nativeFallbackReason);
    stopNativePreview();
    _notifyTickState();
  }

  async function nativePictureVisible(session, width, height) {
    // Native clones sometimes leave all media-element counters at zero.
    // A tiny receiver snapshot is an alternative first-frame proof, only
    // during startup. All-black output is inconclusive and falls back safely.
    const snapshot = await new Promise((resolve, reject) => {
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        reject(new Error("Native presentation snapshot timed out"));
      }, 1500);
      Promise.resolve().then(() => session.browser.browsingContext.currentWindowGlobal
        .drawSnapshot(new DOMRect(0, 0, width, height),
          Math.min(1, 32 / Math.max(width, height)), "rgb(0, 0, 0)"))
        .then(bitmap => {
          if (expired) bitmap.close();
          else resolve(bitmap);
        }, reject).finally(() => clearTimeout(timer));
    });
    try {
      const probe = document.createElement("canvas");
      probe.width = probe.height = 16;
      const ctx = probe.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(snapshot, 0, 0, 16, 16);
      const pixels = ctx.getImageData(0, 0, 16, 16).data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 8 || pixels[i + 1] > 8 || pixels[i + 2] > 8) return true;
      }
      return false;
    } finally {
      snapshot.close();
    }
  }

  async function startNativePreview(bc, source) {
    const browser = document.createXULElement("browser");
    const session = nativeSession = {
      id: ++nativeSerial, browser, bc, source, ready: false,
    };
    const check = () => {
      if (nativeSession !== session || rendererDisposed ||
          sourceBC !== bc || nativeSources.get(bc.id) !== source ||
          bc.currentWindowGlobal?.innerWindowId !== source.documentId) {
        throw new Error("Native startup cancelled or source navigated");
      }
    };
    try {
      const global = bc.currentWindowGlobal;
      const sourceBrowser = Array.from(gBrowser.tabs).find(tab =>
        tab.linkedBrowser?.browsingContext?.id === bc.top.id)?.linkedBrowser;
      const pid = global?.domProcess?.childID;
      if (!sourceBrowser || pid == null || !source.videoRef || !source.documentId) {
        throw new Error("Native source/process identity unavailable");
      }
      // A remote type alone does not prove process equality. For isolated
      // subframes, use canvas until a reliable affinity mechanism is available.
      if (sourceBrowser.browsingContext.currentWindowGlobal?.domProcess?.childID !== pid) {
        throw new Error("Source iframe is in a separate content process");
      }
      browser.setAttribute("type", "content");
      browser.setAttribute("remote", "true");
      browser.setAttribute("nodefaultsrc", "true");
      browser.sameProcessAsFrameLoader = sourceBrowser.frameLoader;
      browser.setAttribute("remoteType", global.domProcess.remoteType);
      browser.setAttribute("initialBrowsingContextGroupId", bc.group.id);
      const attrs = global.documentPrincipal.originAttributes;
      browser.setAttribute("usercontextid", attrs.userContextId || 0);
      if (attrs.privateBrowsingId) browser.setAttribute("privatebrowsing", "true");
      browser.setAttribute("tabindex", "-1");
      browser.setAttribute("aria-label", "Sidebar video preview");
      pipContainer.insertBefore(browser, pipContainer.firstChild);
      browser.loadURI(Services.io.newURI("about:blank"), {
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      });
      const deadline = Date.now() + 6000;
      let ready = false;
      while (Date.now() < deadline) {
        check();
        safe(() => { browser.docShellIsActive = true; });
        if (browser.browsingContext?.currentWindowGlobal) {
          try { ready = (await nativeQuery(session, "ZenPiP:NativeReady"))?.ready; }
          catch (_) { /* Actor propagation or document load may still be pending. */ }
          if (ready) break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      check();
      if (!ready) throw new Error("Native receiver did not initialize");
      const receiver = browser.browsingContext.currentWindowGlobal;
      const receiverAttrs = receiver.documentPrincipal.originAttributes;
      if (receiver.domProcess?.childID !== pid ||
          (receiverAttrs.userContextId || 0) !== (attrs.userContextId || 0) ||
          (receiverAttrs.privateBrowsingId || 0) !== (attrs.privateBrowsingId || 0)) {
        throw new Error("Native receiver process/container/private context mismatch");
      }
      installNativeMediaAdapter();
      session.cloning = true;
      await nativeQuery(session, "ZenPiP:NativeStart", source);
      const presentationDeadline = Date.now() + 3000;
      let presented = false;
      while (Date.now() < presentationDeadline) {
        check();
        const health = await nativeQuery(session, "ZenPiP:NativeHealth");
        check();
        if (!health?.ok) throw new Error(health?.error || "Native attachment failed");
        if (health.width > 0 && health.height > 0 &&
            (health.presented || await nativePictureVisible(session, health.width, health.height))) {
          presented = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      check();
      if (!presented) throw new Error("Native video presentation could not be confirmed");
      // Detach rather than CSS-hide: user-origin !important styles can leave
      // the fallback canvas covering an otherwise working native receiver.
      canvasEl.remove();
      session.ready = true;
      nativeFallbackReason = "";
      _notifyTickState();
      log("Native video preview active");
      const monitor = async () => {
        if (nativeSession !== session) return;
        try {
          check();
          const health = await nativeQuery(session, "ZenPiP:NativeHealth");
          check();
          if (!health?.ok) throw new Error(health?.error || "Native preview disconnected");
          if (!health.paused && health.lastFrameAt && Date.now() - health.lastFrameAt > 15000) {
            throw new Error("Native preview stopped presenting frames");
          }
          session.healthTimer = setTimeout(monitor, 5000);
        } catch (error) { failNativePreview(session, error); }
      };
      session.healthTimer = setTimeout(monitor, 5000);
    } catch (error) {
      failNativePreview(session, error);
    }
  }

  const rendererObserver = {
    observe() {
      nativeFailedSource = null;
      nativeFallbackReason = "";
      stopNativePreview();
      _notifyTickState();
    },
  };
  Services.prefs.addObserver(RENDERER_PREF, rendererObserver);
  window.addEventListener("unload", () => {
    rendererDisposed = true;
    stopNativePreview();
    restoreNativeMediaAdapters();
    for (const info of actorRegistry.values()) {
      info.setProcessingActive?.(false, "off", false);
      info.stopTick();
    }
    Services.prefs.removeObserver(RENDERER_PREF, rendererObserver);
  }, { once: true });

  const captionsPrefObserver = {
    observe() {
      const nextMode = getCaptionMode();
      const nextWhenHidden = safe(() =>
        Services.prefs.getBoolPref(CAPTIONS_WHEN_PIP_HIDDEN_PREF, false),
      ) === true;
      if (nextMode === captionMode &&
          nextWhenHidden === captionsWhenPipHidden) return;
      captionMode = nextMode;
      captionsWhenPipHidden = nextWhenHidden;
      if (captionMode === "off") clearCaptionImmediately();
      if (isStreaming) bump();
      _notifyTickState();
    },
  };
  safe(() => Services.prefs.addObserver(CAPTIONS_PREF, captionsPrefObserver));
  safe(() => Services.prefs.addObserver(
    CAPTIONS_WHEN_PIP_HIDDEN_PREF,
    captionsPrefObserver,
  ));
  window.addEventListener("unload", () => {
    safe(() => Services.prefs.removeObserver(CAPTIONS_PREF, captionsPrefObserver));
    safe(() => Services.prefs.removeObserver(
      CAPTIONS_WHEN_PIP_HIDDEN_PREF,
      captionsPrefObserver,
    ));
  }, { once: true });

  function isTabPlaying(bc) {
    if (!bc) return false;
    try {
      for (const tab of gBrowser.tabs) {
        if (tab.linkedBrowser?.browsingContext?.id === bc.id) {
          return tab.hasAttribute("soundplaying");
        }
      }
    } catch (_) {}
    return false;
  }

  function getActiveActor() {
    if (!sourceBC) return null;
    return (
      safe(() => sourceBC.currentWindowGlobal?.getActor("ZenSidebarPiP")) ||
      null
    );
  }

  function _notifyTickState() {
    if (rendererDisposed) return;
    const { visible, opacity } = getMediaPlayerVisibility();
    const frameProcessingActive =
      isStreaming && !userHidden && !sourceTabActive && browserWindowActive &&
      visible && opacity > 0.01;
    const source = sourceBC ? nativeSources.get(sourceBC.id) : null;
    if (nativeSession && (!frameProcessingActive || nativeSession.bc !== sourceBC ||
        nativeSession.source !== source)) stopNativePreview();
    if (frameProcessingActive && source && !nativeSession &&
        nativeFailedSource !== source &&
        Services.prefs.getStringPref(RENDERER_PREF, "auto") !== "canvas") {
      startNativePreview(sourceBC, source);
    }
    const info = sourceBC ? actorRegistry.get(sourceBC.id) : null;
    if (!info) return;

    const captionProcessingActive =
      isStreaming &&
      captionMode !== "off" &&
      !sourceTabActive &&
      browserWindowActive &&
      visible && opacity > 0.01 &&
      (!userHidden || captionsWhenPipHidden);
    const canvasProcessingActive = frameProcessingActive && !nativeSession?.ready;
    info.setProcessingActive?.(
      canvasProcessingActive || captionProcessingActive,
      captionMode,
      captionProcessingActive,
    );
    if (canvasProcessingActive) {
      info.startTick(info.win || window);
    } else {
      info.stopTick();
    }
  }

  function awaitNextPipWindow() {
    let timeoutId = null;
    const unregister = () =>
      safe(() => Services.ww.unregisterNotification(observer));
    const observer = {
      observe(subject, topic) {
        if (topic !== "domwindowopened") return;
        subject.addEventListener(
          "load",
          () => {
            const wt =
              subject.document?.documentElement?.getAttribute("windowtype");
            if (wt !== "Toolkit:PictureInPicture") return;
            unregister();
            if (timeoutId) clearTimeout(timeoutId);
          },
          { once: true },
        );
      },
    };
    Services.ww.registerNotification(observer);
    timeoutId = setTimeout(unregister, CONFIG.PIP_OBSERVE_TIMEOUT_MS);
  }

  window.addEventListener("deactivate", () => {
    if (!isStreaming) return;
    if (performance.now() - lastPipOpenAt < CONFIG.PIP_OPEN_DEBOUNCE_MS) return;
    if (!getActiveActor()) return;
    awaitNextPipWindow();
    lastPipOpenAt = performance.now();
  });

  window.ZenPiPController = {
    diagnostics() {
      return {
        renderer: nativeSession?.ready ? "native" : "canvas",
        nativeStarting: !!nativeSession && !nativeSession.ready,
        fallbackReason: nativeFallbackReason,
      };
    },
    getActiveBC() {
      return sourceBC;
    },
    drawFrame({ buf, width, height }) {
      if (nativeSession?.ready) return;
      try {
        // Adaptive capture resolution is independent from layout. The source
        // aspect is established by MirrorStarted/offerVideo; using each
        // downscaled frame here created a resolution -> aspect -> layout
        // feedback loop because even-number rounding slightly changes ratios.
        setCanvasDimensions(width, height);
        const img = new ImageData(new Uint8ClampedArray(buf), width, height);
        canvasCtx.putImageData(img, 0, 0);
      } catch (e) {
        err("drawFrame error:", e?.name, e?.message);
      }
    },
    setCaption(text) {
      if (captionMode === "off") {
        clearCaptionImmediately();
        return;
      }
      const next = String(text || "").replace(/\s+/g, " ").trim().slice(0, 1000);
      if (next) {
        if (next === captionText && !captionHideTimer && !captionExitTimer) return;
        showCaption(next);
      } else {
        hideCaptionAfterGap();
      }
    },
    hideCaption() {
      hideCaptionNow();
    },
    setSourceTabActive(active) {
      if (sourceTabActive === active) return;
      sourceTabActive = active;
      if (sourceTabActive) clearTabListHeight();
      if (isStreaming) bump();
      _notifyTickState();
    },
    registerSource(id, callbacks) {
      if (!actorRegistry.has(id)) {
        actorRegistry.set(id, callbacks);
      }
    },
    unregisterSource(id) {
      actorRegistry.delete(id);
      nativeSources.delete(id);
      if (nativeSession?.bc.id === id) stopNativePreview();
    },
    offerVideo(width, height, browsingContext, nativeSource = null) {
      const id = browsingContext.id;
      if (nativeSource) nativeSources.set(id, nativeSource);
      if (availableSources.has(id)) return;
      availableSources.set(id, { bc: browsingContext, width, height });

      // Only defer when a *different* tab is already mirroring. A re-offer from
      // the same tab (e.g. YouTube swapping an ad for the real video on the same
      // <video>, which fires emptied -> playing) must re-activate immediately
      // instead of queuing behind its own in-flight hide animation.
      if (sourceBC && sourceBC.id !== id && isTabPlaying(sourceBC)) {
        log("source queued (existing still playing):", id, "active:", sourceBC.id);
        return;
      }

      this._activateSource(width, height, browsingContext);
    },
    notifySourceStopped(bc) {
      availableSources.delete(bc.id);

      if (sourceBC && sourceBC.id === bc.id) {
        if (availableSources.size > 0) {
          this._activateSourceAfterHide();
        } else {
          this.hideVideo();
        }
      }
    },
    _activateSourceAfterHide() {
      if (animateOutTimer) return;
      const s = pipContainer.style;
      animating = true;
      s.transition = "none";
      s.opacity = userHidden ? "0" : "1";
      s.transform = "scale(1) translateY(0)";
      void pipContainer.getBoundingClientRect();

      requestAnimationFrame(() => {
        s.transition = ANIM_TRANSITION;
        requestAnimationFrame(() => {
          s.opacity = "0";
          s.transform = "scale(0.9) translateY(8px)";
        });
      });

      animateOutTimer = setTimeout(() => {
        animateOutTimer = null;
        animating = false;
        sourceBC = null;
        isStreaming = false;
        stopTracking();

        if (availableSources.size > 0) {
          const next = availableSources.values().next().value;
          this._activateSource(next.width, next.height, next.bc);
        }
      }, CONFIG.ANIM_MS + 60);
    },
    _activateSource(width, height, browsingContext) {
      availableSources.delete(browsingContext.id);
      log("showVideo", width, "x", height, "tab", browsingContext?.id);
      setSourceDimensions(width, height);
      const previousSourceBC = sourceBC;
      const nextSourceBC = browsingContext || null;
      const sourceChanged =
        previousSourceBC && nextSourceBC && previousSourceBC.id !== nextSourceBC.id;
      if (sourceChanged) {
        const previous = actorRegistry.get(previousSourceBC.id);
        previous?.setProcessingActive?.(false, "off", false);
        previous?.stopTick();
        stopNativePreview();
      }
      if (sourceChanged) clearCaptionImmediately();
      sourceBC = nextSourceBC;

      if (sourceBC) {
        try {
          sourceTabActive = gBrowser?.selectedBrowser?.browsingContext?.id === sourceBC.id;
        } catch (_) {
          sourceTabActive = false;
        }
      }

      if (animateOutTimer) {
        // We're pre-empting an in-flight hide to re-activate; we're no longer
        // animating out, so clear the flag or it stays stuck true.
        clearTimeout(animateOutTimer);
        animateOutTimer = null;
        animating = false;
      }

      const wasStreaming = isStreaming;
      isStreaming = true;
      startTracking();

      if (wasStreaming && !sourceChanged) {
        const s = pipContainer.style;
        s.opacity = userHidden || sourceTabActive ? "0" : "1";
        s.visibility = userHidden || sourceTabActive ? "hidden" : "visible";
        s.transform = "";
        return;
      }

      const s = pipContainer.style;
      s.display = "block";
      s.visibility = userHidden || sourceTabActive ? "hidden" : "visible";

      if (sourceTabActive) {
        isStreaming = true;
        animating = false;
        startTracking();
      } else {
        animating = true;
        s.transition = "none";
        s.opacity = "0";
        s.transform = "scale(0.9) translateY(8px)";
        void pipContainer.getBoundingClientRect();

        requestAnimationFrame(() => {
          s.transition = ANIM_TRANSITION;
          requestAnimationFrame(() => {
            s.opacity = userHidden ? "0" : "1";
            s.transform = "scale(1) translateY(0)";
          });
        });
        setTimeout(() => {
          animating = false;
          lastOpacity = NaN;
          lastCaptionOpacity = NaN;
          s.transition = "";
        }, CONFIG.ANIM_MS + 60);
      }
    },

    hideVideo() {
      log("hideVideo");
      if (!isStreaming && !animating) return;
      if (animateOutTimer) {
        clearTimeout(animateOutTimer);
        animateOutTimer = null;
      }

      animating = true;
      const s = pipContainer.style;
      s.transition = "none";
      s.opacity = userHidden ? "0" : "1";
      s.transform = "scale(1) translateY(0)";
      void pipContainer.getBoundingClientRect();

      requestAnimationFrame(() => {
        s.transition = ANIM_TRANSITION;
        requestAnimationFrame(() => {
          s.opacity = "0";
          s.transform = "scale(0.9) translateY(8px)";
        });
      });

      animateOutTimer = setTimeout(() => {
        animateOutTimer = null;
        animating = false;
        safe(() => canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height));
        clearCaptionImmediately();
        sourceBC = null;
        s.display = "none";
        s.transition = "";
        s.transform = "";
        isStreaming = false;
        stopTracking();
        lastOpacity = NaN;
        lastCaptionOpacity = NaN;
        lastVisible = null;

        // A different source may have been queued while this hide was running;
        // drain it so it isn't stranded until the next pause/play.
        if (availableSources.size > 0) {
          const next = availableSources.values().next().value;
          this._activateSource(next.width, next.height, next.bc);
        }
      }, CONFIG.ANIM_MS + 60);
    },
  };

  function instantiateActorForOpenTabs() {
    try {
      for (const browser of gBrowser?.browsers || []) {
        const pending = [browser.browsingContext];
        while (pending.length) {
          const bc = pending.pop();
          if (!bc) continue;
          safe(() => bc.currentWindowGlobal?.getActor("ZenSidebarPiP"));
          safe(() => pending.push(...bc.children));
        }
      }
    } catch (e) {
      warn("Could not initialize actors for open tabs:", e);
    }
  }

  try {
    const profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile);
    const modDir = profileDir.clone();
    for (const seg of ["chrome", "letter-tabs-video-actors"]) modDir.append(seg);
    const modUri = Services.io.newFileURI(modDir);
    const resProto = Services.io
      .getProtocolHandler("resource")
      .QueryInterface(Ci.nsIResProtocolHandler);
    if (!resProto.hasSubstitution("zen-sidebar-pip")) {
      resProto.setSubstitution("zen-sidebar-pip", modUri);
    }
    log("resource mapped to:", modUri.spec, "exists:", modDir.exists());

    // Keep the receiver actor separate: it must never discover its own clone
    // as a new source video or run the source caption/capture machinery.
    try {
      ChromeUtils.registerWindowActor("ZenSidebarNative", {
        child: { esModuleURI: "resource://zen-sidebar-pip/native-actor.sys.mjs" },
        allFrames: true,
        matches: ["about:blank"],
        safeForUntrustedWebProcess: true,
      });
    } catch (error) {
      if (error.name !== "NotSupportedError") warn("Native actor registration failed:", error);
    }
    ChromeUtils.registerWindowActor("ZenSidebarPiP", {
      parent: {
        esModuleURI: "resource://zen-sidebar-pip/parent-actor.sys.mjs",
      },
      child: {
        esModuleURI: "resource://zen-sidebar-pip/content-actor.sys.mjs",
        events: {
          DOMContentLoaded: {},
          pageshow: {},
          play: { capture: true, mozSystemGroup: true },
          playing: { capture: true, mozSystemGroup: true },
          loadedmetadata: { capture: true, mozSystemGroup: true },
          canplay: { capture: true, mozSystemGroup: true },
          pause: { capture: true, mozSystemGroup: true },
          ended: { capture: true, mozSystemGroup: true },
          emptied: { capture: true, mozSystemGroup: true },
          volumechange: { capture: true, mozSystemGroup: true },
        },
      },
      messageManagerGroups: ["browsers"],
      allFrames: true,
      safeForUntrustedWebProcess: true,
    });
  } catch (e) {
    if (e.name !== "NotSupportedError")
      err("Failed to register JSWindowActor:", e);
  }

  // Actor registration is process-global and lazy. Force an instance for
  // already-open documents so restored playback is discovered, then retry as
  // the registration reaches existing content processes.
  instantiateActorForOpenTabs();
  setTimeout(instantiateActorForOpenTabs, 500);
  setTimeout(instantiateActorForOpenTabs, 1500);

  log("Zenslop initialized.");
})();

