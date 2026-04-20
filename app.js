(function () {
  "use strict";

  const STORAGE_KEY = "ukraine-app-progress-v2";
  const LEGACY_STORAGE_KEY = "ukraine-app-progress-v1";
  const WELCOME_SEEN_KEY = "ukraine-app-welcome-seen-v1";
  const VOICE_SETTINGS_KEY = "ukraine-voice-settings-v1";
  const UNLOCK_THRESHOLD = 0.8; // 80% of previous lesson required to unlock the next
  const REVIEW_ITEM_COUNT = 3;  // Number of spiral-review items prepended to each lesson after the first

  const LESSON_ICONS = {
    greetings: "👋", essentials: "✨", numbers: "🔢", family: "👨‍👩‍👧",
    colors: "🎨", food: "🍎", verbs: "🏃",
    "small-talk": "💬", survival: "🆘", "at-the-cafe": "☕",
    "about-me": "🪪", "getting-around": "🗺", conversation: "🗣",
  };

  const LEVEL_META = {
    words:     { title: "Level 1 · Words",       desc: "Start here. One word at a time." },
    phrases:   { title: "Level 2 · Short phrases", desc: "Put words together." },
    sentences: { title: "Level 3 · Sentences",   desc: "Full thoughts. You've got this." },
  };

  // ---------- State ----------
  // Progress shape:
  // {
  //   lessons: { [lessonId]: { [itemIndex]: { completed: true, at: timestamp } } },
  //   lastPosition: { lessonId, itemIndex }
  // }
  const state = {
    lessonId: null,
    itemIndex: 0,
    // Items actually shown during this lesson session: may start with a few review picks
    // followed by the current lesson's items. Each entry: { uk, translit, en, accept?, review, sourceLessonId, sourceIndex, sourceTitle }
    runtimeItems: [],
    reviewCount: 0,
    progress: loadProgress(),
    availableVoice: null,
    recognizing: false,
    voiceSettings: loadVoiceSettings(),
  };

  function loadVoiceSettings() {
    const defaults = {
      provider: "system",
      azure: { key: "", region: "eastus", voice: "uk-UA-PolinaNeural" },
    };

    // If the user has a local config.local.js with credentials, it wins over
    // the in-browser settings panel. (The file is gitignored — see README.)
    if (typeof window !== "undefined" && window.UKRAINE_APP_CONFIG && window.UKRAINE_APP_CONFIG.voice) {
      const fromFile = window.UKRAINE_APP_CONFIG.voice;
      const merged = Object.assign({}, defaults, fromFile, {
        azure: Object.assign({}, defaults.azure, fromFile.azure || {}),
      });
      // Only treat the file as "configured" if a real key was provided.
      if (merged.provider !== "azure" || (merged.azure.key && merged.azure.key !== "PASTE_YOUR_AZURE_KEY_HERE")) {
        return merged;
      }
    }

    try {
      const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return Object.assign({}, defaults, parsed, {
        azure: Object.assign({}, defaults.azure, parsed.azure || {}),
      });
    } catch (_) { return defaults; }
  }

  function saveVoiceSettings() {
    try { localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(state.voiceSettings)); } catch (_) {}
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      // Migrate from v1 (items stored at top level by lessonId)
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return { lessons: parsed || {}, lastPosition: null };
      }
    } catch (_) { /* fall through */ }
    return { lessons: {}, lastPosition: null };
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch (_) { /* storage full or blocked */ }
  }

  function lessonProgressFor(lessonId) {
    if (!state.progress.lessons[lessonId]) state.progress.lessons[lessonId] = {};
    return state.progress.lessons[lessonId];
  }

  // ---------- Elements ----------
  const el = {
    views: {
      list: document.getElementById("lesson-list"),
      lesson: document.getElementById("lesson-view"),
    },
    lessonsContainer: document.getElementById("lessons-container"),
    resetBtn: document.getElementById("reset-progress"),
    resumeBanner: document.getElementById("resume-banner"),
    resumeBtn: document.getElementById("resume-btn"),
    resumeLessonTitle: document.getElementById("resume-lesson-title"),
    resumeItemInfo: document.getElementById("resume-item-info"),
    backBtn: document.getElementById("back-btn"),
    title: document.getElementById("lesson-title"),
    counter: document.getElementById("lesson-counter"),
    lessonProgress: document.getElementById("lesson-progress-fill"),
    uk: document.getElementById("uk-text"),
    translit: document.getElementById("translit-text"),
    en: document.getElementById("en-text"),
    reviewBadge: document.getElementById("review-badge"),
    reviewSource: document.getElementById("review-source"),
    listenBtn: document.getElementById("listen-btn"),
    slowBtn: document.getElementById("slow-btn"),
    showBtn: document.getElementById("show-btn"),
    micBtn: document.getElementById("mic-btn"),
    micLabel: document.getElementById("mic-label"),
    heard: document.getElementById("heard"),
    feedback: document.getElementById("feedback"),
    prev: document.getElementById("prev-btn"),
    skip: document.getElementById("skip-btn"),
    next: document.getElementById("next-btn"),
    voiceWarning: document.getElementById("voice-warning"),
    recogWarning: document.getElementById("recog-warning"),
    overallBar: document.getElementById("overall-progress"),
    overallText: document.getElementById("overall-progress-text"),
    helpBtn: document.getElementById("help-btn"),
    welcomeOverlay: document.getElementById("welcome-overlay"),
    welcomeStart: document.getElementById("welcome-start"),
    welcomeClose: document.getElementById("welcome-close"),
    settingsBtn: document.getElementById("settings-btn"),
    settingsOverlay: document.getElementById("settings-overlay"),
    settingsClose: document.getElementById("settings-close"),
    settingsSave: document.getElementById("settings-save"),
    azureSettings: document.getElementById("azure-settings"),
    azureKey: document.getElementById("azure-key"),
    azureRegion: document.getElementById("azure-region"),
    azureVoice: document.getElementById("azure-voice"),
    azureTest: document.getElementById("azure-test"),
    azureStatus: document.getElementById("azure-status"),
    voiceStatus: document.getElementById("voice-status"),
  };

  // ---------- Lesson list view ----------
  function renderLessonList() {
    el.lessonsContainer.innerHTML = "";

    // Group lessons by level, preserving order.
    const groups = {};
    const groupOrder = [];
    LESSONS.forEach(function (lesson, index) {
      if (!groups[lesson.level]) {
        groups[lesson.level] = [];
        groupOrder.push(lesson.level);
      }
      groups[lesson.level].push({ lesson: lesson, index: index });
    });

    groupOrder.forEach(function (level) {
      const wrapper = document.createElement("div");
      wrapper.className = "lesson-group";

      const heading = document.createElement("h2");
      heading.className = "group-title";
      heading.textContent = (LEVEL_META[level] && LEVEL_META[level].title) || level;
      wrapper.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "lessons-grid";

      groups[level].forEach(function (entry) {
        grid.appendChild(buildLessonCard(entry.lesson, entry.index));
      });

      wrapper.appendChild(grid);
      el.lessonsContainer.appendChild(wrapper);
    });

    updateOverallProgress();
    renderResumeBanner();
  }

  function buildLessonCard(lesson, index) {
    const btn = document.createElement("button");
    btn.className = "lesson-card";
    btn.setAttribute("type", "button");

    const completed = countCompleted(lesson);
    const pct = Math.round((completed / lesson.items.length) * 100);
    const status = getLessonStatus(index);

    if (status.locked) btn.classList.add("locked");
    if (status.done) btn.classList.add("done");

    const icon = status.locked ? "🔒" : (LESSON_ICONS[lesson.id] || "📘");
    const ctaText = status.locked ? "Locked"
                  : status.done ? "✓ Done · review"
                  : completed > 0 ? "Continue →"
                  : "Start →";

    const metaBits = [];
    metaBits.push(lesson.items.length + " " + (lesson.items.length === 1 ? "item" : "items"));
    if (status.locked && index > 0) {
      metaBits.push("Finish " + LESSONS[index - 1].title + " to unlock");
    } else {
      metaBits.push(lesson.description);
    }

    btn.innerHTML =
      '<span class="lesson-icon" aria-hidden="true">' + icon + '</span>' +
      '<div class="lesson-body">' +
        '<h3>' + escapeHtml(lesson.title) + '</h3>' +
        '<div class="lesson-meta">' +
          metaBits.map(function (b, i) {
            return (i > 0 ? '<span class="meta-dot">•</span>' : '') + escapeHtml(b);
          }).join('') +
        '</div>' +
        '<div class="lesson-progress-line">' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="progress-count">' + completed + '/' + lesson.items.length + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="lesson-cta">' + ctaText + '</span>';

    btn.disabled = status.locked;
    btn.addEventListener("click", function () {
      if (status.locked) return;
      openLesson(lesson.id);
    });
    return btn;
  }

  function countCompleted(lesson) {
    const lp = state.progress.lessons[lesson.id] || {};
    let count = 0;
    for (let i = 0; i < lesson.items.length; i++) {
      if (lp[i] && lp[i].completed) count++;
    }
    return count;
  }

  function getLessonStatus(index) {
    const lesson = LESSONS[index];
    const completed = countCompleted(lesson);
    const pct = completed / lesson.items.length;
    const done = pct >= 1;
    // First lesson is always unlocked. Later lessons require the previous one to reach threshold.
    let locked = false;
    if (index > 0) {
      const prev = LESSONS[index - 1];
      const prevPct = countCompleted(prev) / prev.items.length;
      locked = prevPct < UNLOCK_THRESHOLD;
    }
    return { locked: locked, done: done, pct: pct };
  }

  function renderResumeBanner() {
    const last = state.progress.lastPosition;
    if (!last) {
      el.resumeBanner.classList.add("hidden");
      return;
    }
    const lessonIdx = LESSONS.findIndex(function (l) { return l.id === last.lessonId; });
    if (lessonIdx === -1) {
      el.resumeBanner.classList.add("hidden");
      return;
    }
    const status = getLessonStatus(lessonIdx);
    if (status.locked) {
      el.resumeBanner.classList.add("hidden");
      return;
    }
    const lesson = LESSONS[lessonIdx];
    const resumeIdx = firstUncompletedIndex(lesson);
    el.resumeLessonTitle.textContent = lesson.title;
    el.resumeItemInfo.textContent =
      "Item " + (resumeIdx + 1) + " of " + lesson.items.length;
    el.resumeBanner.classList.remove("hidden");
  }

  function firstUncompletedIndex(lesson) {
    const lp = state.progress.lessons[lesson.id] || {};
    for (let i = 0; i < lesson.items.length; i++) {
      if (!lp[i] || !lp[i].completed) return i;
    }
    return 0; // fully done — start from the beginning for review
  }

  function updateOverallProgress() {
    let total = 0, done = 0;
    LESSONS.forEach(function (l) {
      total += l.items.length;
      done += countCompleted(l);
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    el.overallBar.style.width = pct + "%";
    el.overallText.textContent = pct + "%";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- Lesson detail view ----------
  function openLesson(lessonId) {
    state.lessonId = lessonId;
    const lesson = getLesson();
    const lessonIndex = LESSONS.findIndex(function (l) { return l.id === lessonId; });

    // Build runtime items: 2–3 spiral-review items from earlier lessons + the actual lesson items.
    const reviews = pickReviewItems(lessonIndex, REVIEW_ITEM_COUNT);
    state.reviewCount = reviews.length;
    const actual = lesson.items.map(function (item, idx) {
      return {
        uk: item.uk,
        translit: item.translit,
        en: item.en,
        accept: item.accept,
        review: false,
        sourceLessonId: lesson.id,
        sourceIndex: idx,
        sourceTitle: lesson.title,
      };
    });
    state.runtimeItems = reviews.concat(actual);

    // Smart resume: if the user hasn't completed any items in this lesson yet, start at the top
    // (so they see the review warm-up). Otherwise skip past review and jump to the first
    // uncompleted real item.
    const alreadyDone = countCompleted(lesson);
    if (alreadyDone === 0) {
      state.itemIndex = 0;
    } else {
      state.itemIndex = state.reviewCount + firstUncompletedIndex(lesson);
      if (state.itemIndex > state.runtimeItems.length - 1) state.itemIndex = state.runtimeItems.length - 1;
    }

    el.title.textContent = lesson.title;
    rememberPosition();
    switchView("lesson");
    renderItem();
  }

  function pickReviewItems(currentLessonIndex, count) {
    if (currentLessonIndex <= 0 || count <= 0) return [];
    const pool = [];
    // Prefer items the user has completed in earlier lessons (true reinforcement).
    for (let i = 0; i < currentLessonIndex; i++) {
      const prev = LESSONS[i];
      const lp = state.progress.lessons[prev.id] || {};
      for (let j = 0; j < prev.items.length; j++) {
        if (lp[j] && lp[j].completed) {
          pool.push(buildReviewEntry(prev, j));
        }
      }
    }
    // Fallback: if nothing completed yet, draw from any earlier-lesson items.
    if (pool.length === 0) {
      for (let i = 0; i < currentLessonIndex; i++) {
        const prev = LESSONS[i];
        for (let j = 0; j < prev.items.length; j++) {
          pool.push(buildReviewEntry(prev, j));
        }
      }
    }
    shuffle(pool);
    return pool.slice(0, Math.min(count, pool.length));
  }

  function buildReviewEntry(sourceLesson, index) {
    const item = sourceLesson.items[index];
    return {
      uk: item.uk,
      translit: item.translit,
      en: item.en,
      accept: item.accept,
      review: true,
      sourceLessonId: sourceLesson.id,
      sourceIndex: index,
      sourceTitle: sourceLesson.title,
    };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function rememberPosition() {
    state.progress.lastPosition = {
      lessonId: state.lessonId,
      itemIndex: state.itemIndex,
    };
    saveProgress();
  }

  function getLesson() {
    return LESSONS.find(function (l) { return l.id === state.lessonId; });
  }

  function switchView(name) {
    el.views.list.classList.toggle("active", name === "list");
    el.views.lesson.classList.toggle("active", name === "lesson");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderItem() {
    const lesson = getLesson();
    const item = state.runtimeItems[state.itemIndex];
    el.uk.textContent = item.uk;
    el.translit.textContent = item.translit;
    el.en.textContent = item.en;
    el.en.classList.add("hidden");
    el.showBtn.classList.remove("on");
    el.showBtn.querySelector("span:last-child").textContent = "Show English translation";
    el.heard.innerHTML = "";
    el.feedback.textContent = "";
    el.feedback.className = "feedback";

    if (item.review) {
      el.reviewBadge.classList.remove("hidden");
      el.reviewSource.textContent = "Warm-up from \u201C" + item.sourceTitle + "\u201D";
      const pos = state.itemIndex + 1;
      el.counter.textContent = "Review " + pos + " of " + state.reviewCount;
    } else {
      el.reviewBadge.classList.add("hidden");
      el.reviewSource.textContent = "";
      const realIndex = state.itemIndex - state.reviewCount + 1;
      el.counter.textContent = "Item " + realIndex + " of " + lesson.items.length;
    }

    const completed = countCompleted(lesson);
    const pct = Math.round((completed / lesson.items.length) * 100);
    el.lessonProgress.style.width = pct + "%";

    el.prev.disabled = state.itemIndex === 0;
    el.next.disabled = false;
    setVoiceStatus();
  }

  // ---------- Text-to-speech (provider-aware) ----------
  // Entry point: route to Azure if configured, otherwise system TTS.
  function speak(text, opts) {
    const vs = state.voiceSettings;
    if (vs.provider === "azure" && vs.azure.key) {
      azureSpeak(text, opts).catch(function (err) {
        console.warn("Azure TTS failed, falling back to system voice:", err);
        setVoiceStatus("error", "Azure voice unavailable — using system voice");
        systemSpeak(text, opts);
      });
    } else {
      systemSpeak(text, opts);
    }
  }

  // ----- System (browser) TTS -----
  function pickUkrainianVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices || voices.length === 0) return null;
    return (
      voices.find(function (v) { return /^uk(-|_)/i.test(v.lang); }) ||
      voices.find(function (v) { return /ukrain/i.test(v.name); }) ||
      null
    );
  }

  function systemSpeak(text, opts) {
    if (!window.speechSynthesis) return;
    stopAzureAudio();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "uk-UA";
    u.rate = (opts && opts.slow) ? 0.6 : 0.95;
    u.pitch = 1;
    const voice = pickUkrainianVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  // ----- Azure Speech TTS via REST -----
  const azureTokenCache = { token: null, region: null, expires: 0 };
  let azureCurrentAudio = null;

  function stopAzureAudio() {
    if (azureCurrentAudio) {
      try { azureCurrentAudio.pause(); } catch (_) {}
      azureCurrentAudio = null;
    }
  }

  async function getAzureToken() {
    const region = state.voiceSettings.azure.region;
    const key = state.voiceSettings.azure.key;
    const now = Date.now();
    if (azureTokenCache.token && azureTokenCache.region === region && azureTokenCache.expires > now) {
      return azureTokenCache.token;
    }
    const resp = await fetch(
      "https://" + region + ".api.cognitive.microsoft.com/sts/v1.0/issueToken",
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key } }
    );
    if (!resp.ok) {
      throw new Error("Azure auth failed (" + resp.status + "). Check your key and region.");
    }
    const token = await resp.text();
    azureTokenCache.token = token;
    azureTokenCache.region = region;
    azureTokenCache.expires = now + 9 * 60 * 1000; // tokens live ~10 min
    return token;
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, function (c) {
      return ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[c];
    });
  }

  async function azureSpeak(text, opts) {
    // Cancel any in-flight audio
    stopAzureAudio();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const { region, voice } = state.voiceSettings.azure;
    const token = await getAzureToken();
    const rate = (opts && opts.slow) ? "-30%" : "0%";
    const ssml =
      "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='uk-UA'>" +
        "<voice name='" + voice + "'>" +
          "<prosody rate='" + rate + "'>" + escapeXml(text) + "</prosody>" +
        "</voice>" +
      "</speak>";

    const resp = await fetch(
      "https://" + region + ".tts.speech.microsoft.com/cognitiveservices/v1",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: ssml,
      }
    );
    if (!resp.ok) {
      const body = await resp.text().catch(function () { return ""; });
      throw new Error("Azure TTS failed (" + resp.status + "): " + body.slice(0, 200));
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    azureCurrentAudio = audio;
    const cleanup = function () {
      URL.revokeObjectURL(url);
      if (azureCurrentAudio === audio) azureCurrentAudio = null;
    };
    audio.addEventListener("ended", cleanup);
    audio.addEventListener("error", cleanup);
    await audio.play();
    setVoiceStatus("azure", null);
  }

  function ensureVoiceWarning() {
    // Hide the system-voice warning if Azure is configured (they don't need a local voice).
    const vs = state.voiceSettings;
    if (vs.provider === "azure" && vs.azure.key) {
      el.voiceWarning.classList.add("hidden");
      return;
    }
    if (!window.speechSynthesis) {
      el.voiceWarning.classList.remove("hidden");
      el.voiceWarning.innerHTML = "<strong>⚠ No text-to-speech available.</strong> <span>Your browser doesn't support speech output. You can still read and practice pronunciation by ear using the transliteration.</span>";
      return;
    }
    const voice = pickUkrainianVoice();
    el.voiceWarning.classList.toggle("hidden", !!voice);
  }

  // Voice-status indicator under the Hear-it buttons
  function setVoiceStatus(kind, overrideText) {
    if (!el.voiceStatus) return;
    const vs = state.voiceSettings;
    let dotClass = "";
    let label = "";
    if (overrideText) {
      dotClass = kind === "error" ? "error" : (kind === "azure" ? "azure" : "");
      label = overrideText;
    } else if (vs.provider === "azure" && vs.azure.key) {
      dotClass = "azure";
      const name = vs.azure.voice === "uk-UA-OstapNeural" ? "Ostap" : "Polina";
      label = "Using " + name + " (Azure Speech)";
    } else {
      const v = pickUkrainianVoice();
      label = v ? "Using " + v.name + " (system)" : "Using default voice (no Ukrainian installed)";
    }
    el.voiceStatus.innerHTML =
      '<span class="voice-provider">' +
        '<span class="voice-provider-dot ' + dotClass + '"></span>' +
        escapeHtml(label) +
      '</span>';
  }

  // Voices in Chrome often load asynchronously
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function () {
      ensureVoiceWarning();
      setVoiceStatus();
    };
  }

  // ---------- Speech recognition ----------
  const SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;

  function setupRecognizer() {
    if (!SpeechRecog) {
      el.recogWarning.classList.remove("hidden");
      el.micBtn.disabled = true;
      return;
    }
    recognizer = new SpeechRecog();
    recognizer.lang = "uk-UA";
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 3;
    recognizer.continuous = false;

    recognizer.onstart = function () {
      state.recognizing = true;
      el.micBtn.classList.add("recording");
      el.micLabel.textContent = "Listening… speak now";
      el.heard.innerHTML = "";
      el.feedback.textContent = "";
      el.feedback.className = "feedback";
    };
    recognizer.onend = function () {
      state.recognizing = false;
      el.micBtn.classList.remove("recording");
      el.micLabel.textContent = "Press & say the word";
    };
    recognizer.onerror = function (e) {
      state.recognizing = false;
      el.micBtn.classList.remove("recording");
      el.micLabel.textContent = "Press & say the word";
      let msg = "Couldn't hear you. Try again.";
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        msg = "Microphone access was blocked. Enable it in your browser settings.";
      } else if (e.error === "no-speech") {
        msg = "I didn't hear anything. Try again.";
      } else if (e.error === "language-not-supported") {
        msg = "This browser doesn't support Ukrainian recognition. Try Chrome or Edge.";
      }
      el.feedback.textContent = msg;
      el.feedback.className = "feedback bad";
    };
    recognizer.onresult = function (event) {
      const results = event.results[0];
      const candidates = [];
      for (let i = 0; i < results.length; i++) {
        candidates.push(results[i].transcript);
      }
      handleSpokenResult(candidates);
    };
  }

  function startListening() {
    if (!recognizer || state.recognizing) return;
    try {
      recognizer.start();
    } catch (_) {
      // start() can throw if called while already starting
    }
  }

  function stopListening() {
    if (!recognizer || !state.recognizing) return;
    try { recognizer.stop(); } catch (_) {}
  }

  // ---------- Answer checking ----------
  function normalize(text) {
    if (!text) return "";
    // Normalize apostrophe variants used in Ukrainian
    return text
      .toLowerCase()
      .replace(/[\u2018\u2019\u02BC\u02BB'`ʼ]/g, "")
      .replace(/[.,!?;:—–\-"()«»"„"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = new Array(b.length + 1);
    const curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
  }

  function similarity(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na && !nb) return 1;
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 1;
    const dist = levenshtein(na, nb);
    return 1 - dist / maxLen;
  }

  function bestMatch(candidates, targets) {
    let best = { score: 0, heard: candidates[0] || "", matched: targets[0] };
    for (let i = 0; i < candidates.length; i++) {
      for (let j = 0; j < targets.length; j++) {
        const score = similarity(candidates[i], targets[j]);
        if (score > best.score) {
          best = { score: score, heard: candidates[i], matched: targets[j] };
        }
      }
    }
    return best;
  }

  function handleSpokenResult(candidates) {
    const lesson = getLesson();
    const item = state.runtimeItems[state.itemIndex];
    const targets = [item.uk].concat(item.accept || []);

    const result = bestMatch(candidates, targets);
    const scorePct = Math.round(result.score * 100);

    el.heard.innerHTML =
      '<span class="label">You said:</span> <span class="spoken">' +
      escapeHtml(result.heard) + '</span> <span class="label">(' + scorePct + '% match)</span>';

    if (result.score >= 0.85) {
      el.feedback.textContent = item.review
        ? "Nice — you still remember it. ✓"
        : "Excellent! That sounds right. ✓";
      el.feedback.className = "feedback good";
      // Mark progress against the SOURCE lesson (for review items, this reinforces earlier lessons;
      // for real items, this completes the current lesson).
      markItemCompleted(item.sourceLessonId, item.sourceIndex);
      updateOverallProgress();
      const pct = Math.round((countCompleted(lesson) / lesson.items.length) * 100);
      el.lessonProgress.style.width = pct + "%";
    } else if (result.score >= 0.6) {
      el.feedback.textContent = "Close! Listen again and try once more.";
      el.feedback.className = "feedback ok";
    } else {
      el.feedback.textContent = "Not quite. Press 'Hear it' and try again.";
      el.feedback.className = "feedback bad";
    }
  }

  function markItemCompleted(lessonId, index) {
    const lp = lessonProgressFor(lessonId);
    lp[index] = { completed: true, at: Date.now() };
    saveProgress();
  }

  // ---------- Navigation ----------
  function goPrev() {
    if (state.itemIndex > 0) {
      state.itemIndex--;
      rememberPosition();
      renderItem();
    }
  }
  function goNext() {
    if (state.itemIndex < state.runtimeItems.length - 1) {
      state.itemIndex++;
      rememberPosition();
      renderItem();
    } else {
      // End of lesson (including any review warm-ups) — return to list
      switchView("list");
      renderLessonList();
    }
  }

  // ---------- Wiring ----------
  function wireEvents() {
    el.backBtn.addEventListener("click", function () {
      stopListening();
      switchView("list");
      renderLessonList();
    });
    el.resetBtn.addEventListener("click", function () {
      if (confirm("Reset all progress? This cannot be undone.")) {
        state.progress = { lessons: {}, lastPosition: null };
        saveProgress();
        renderLessonList();
      }
    });
    el.resumeBtn.addEventListener("click", function () {
      const last = state.progress.lastPosition;
      if (!last) return;
      const lessonIdx = LESSONS.findIndex(function (l) { return l.id === last.lessonId; });
      if (lessonIdx === -1) return;
      if (getLessonStatus(lessonIdx).locked) return;
      openLesson(last.lessonId);
    });
    el.listenBtn.addEventListener("click", function () {
      const item = state.runtimeItems[state.itemIndex];
      if (item) speak(item.uk);
    });
    el.slowBtn.addEventListener("click", function () {
      const item = state.runtimeItems[state.itemIndex];
      if (item) speak(item.uk, { slow: true });
    });
    el.showBtn.addEventListener("click", function () {
      const shown = el.en.classList.toggle("hidden") === false;
      el.showBtn.classList.toggle("on", shown);
      el.showBtn.querySelector("span:last-child").textContent =
        shown ? "Hide English translation" : "Show English translation";
    });

    el.helpBtn.addEventListener("click", function () { showWelcome(); });
    el.welcomeStart.addEventListener("click", function () { dismissWelcome(); });
    el.welcomeClose.addEventListener("click", function () { dismissWelcome(); });
    el.welcomeOverlay.addEventListener("click", function (e) {
      if (e.target === el.welcomeOverlay) dismissWelcome();
    });

    // Settings overlay
    el.settingsBtn.addEventListener("click", function () { showSettings(); });
    el.settingsClose.addEventListener("click", function () { dismissSettings(); });
    el.settingsOverlay.addEventListener("click", function (e) {
      if (e.target === el.settingsOverlay) dismissSettings();
    });
    el.settingsSave.addEventListener("click", function () { saveSettingsFromForm(); });

    document.querySelectorAll('input[name="voice-provider"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        el.azureSettings.classList.toggle("hidden", radio.value !== "azure" || !radio.checked);
      });
    });

    el.azureTest.addEventListener("click", function () { testAzureVoice(); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!el.welcomeOverlay.classList.contains("hidden")) dismissWelcome();
        else if (!el.settingsOverlay.classList.contains("hidden")) dismissSettings();
      }
    });
    el.micBtn.addEventListener("click", function () {
      if (state.recognizing) {
        stopListening();
      } else {
        startListening();
      }
    });
    el.prev.addEventListener("click", goPrev);
    el.next.addEventListener("click", goNext);
    el.skip.addEventListener("click", goNext);

    document.addEventListener("keydown", function (e) {
      if (!el.views.lesson.classList.contains("active")) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        const item = state.runtimeItems[state.itemIndex];
        if (item) speak(item.uk);
      } else if (e.key === "m" || e.key === "M") {
        if (state.recognizing) stopListening(); else startListening();
      }
    });
  }

  // ---------- Welcome overlay ----------
  function showWelcome() {
    el.welcomeOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function dismissWelcome() {
    el.welcomeOverlay.classList.add("hidden");
    document.body.style.overflow = "";
    try { localStorage.setItem(WELCOME_SEEN_KEY, "1"); } catch (_) { /* ignore */ }
  }
  function maybeShowWelcomeOnFirstRun() {
    let seen = false;
    try { seen = localStorage.getItem(WELCOME_SEEN_KEY) === "1"; } catch (_) {}
    if (!seen) showWelcome();
  }

  // ---------- Settings overlay ----------
  function showSettings() {
    const vs = state.voiceSettings;
    // Populate form from saved settings
    const radios = document.querySelectorAll('input[name="voice-provider"]');
    radios.forEach(function (r) { r.checked = r.value === vs.provider; });
    el.azureSettings.classList.toggle("hidden", vs.provider !== "azure");
    el.azureKey.value = vs.azure.key || "";
    el.azureRegion.value = vs.azure.region || "eastus";
    el.azureVoice.value = vs.azure.voice || "uk-UA-PolinaNeural";
    el.azureStatus.textContent = "";
    el.azureStatus.className = "azure-status";

    el.settingsOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function dismissSettings() {
    el.settingsOverlay.classList.add("hidden");
    document.body.style.overflow = "";
  }
  function saveSettingsFromForm() {
    const provider = document.querySelector('input[name="voice-provider"]:checked');
    state.voiceSettings.provider = provider ? provider.value : "system";
    state.voiceSettings.azure.key = el.azureKey.value.trim();
    state.voiceSettings.azure.region = el.azureRegion.value;
    state.voiceSettings.azure.voice = el.azureVoice.value;
    // Invalidate cached token since key/region may have changed
    azureTokenCache.token = null;
    saveVoiceSettings();
    ensureVoiceWarning();
    setVoiceStatus();
    dismissSettings();
  }
  async function testAzureVoice() {
    const key = el.azureKey.value.trim();
    const region = el.azureRegion.value;
    const voice = el.azureVoice.value;
    if (!key) {
      el.azureStatus.textContent = "Enter a subscription key first.";
      el.azureStatus.className = "azure-status bad";
      return;
    }
    // Temporarily apply form values for the test call
    const saved = state.voiceSettings.azure;
    state.voiceSettings.azure = { key: key, region: region, voice: voice };
    azureTokenCache.token = null;
    el.azureStatus.textContent = "Testing…";
    el.azureStatus.className = "azure-status";
    el.azureTest.disabled = true;
    try {
      await azureSpeak("Привіт! Давай вивчати українську.", { slow: false });
      el.azureStatus.textContent = "✓ Voice is working.";
      el.azureStatus.className = "azure-status good";
    } catch (err) {
      el.azureStatus.textContent = "✗ " + (err.message || "Test failed.");
      el.azureStatus.className = "azure-status bad";
      // Restore previous settings on failure so a bad test doesn't silently take over.
      state.voiceSettings.azure = saved;
      azureTokenCache.token = null;
    } finally {
      el.azureTest.disabled = false;
    }
  }

  // ---------- Init ----------
  function init() {
    renderLessonList();
    wireEvents();
    setupRecognizer();
    ensureVoiceWarning();
    maybeShowWelcomeOnFirstRun();
    // Trigger voices load
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
