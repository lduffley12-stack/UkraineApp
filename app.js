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
    "small-talk": "💬", compliments: "💐", survival: "🆘", "at-the-cafe": "☕",
    "about-me": "🪪", "getting-around": "🗺", conversation: "🗣",
    dating: "💕",
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
    mode: "practice",         // "practice" | "flashcards" | "match"
    flashcards: null,         // { queue: int[], current: int, flipped: bool, gotIt: int, again: int }
    match: null,              // { pairs, leftOrder, rightOrder, selected, matched:Set, mistakes }
    a11y: loadA11ySettings(),
  };

  function loadA11ySettings() {
    const defaults = { font: "default", size: "normal", syllables: false, motion: false };
    try {
      const raw = localStorage.getItem("ukraine-a11y-v1");
      return raw ? Object.assign({}, defaults, JSON.parse(raw)) : defaults;
    } catch (_) { return defaults; }
  }

  function saveA11ySettings() {
    try { localStorage.setItem("ukraine-a11y-v1", JSON.stringify(state.a11y)); } catch (_) {}
  }

  function applyA11ySettings() {
    document.body.classList.toggle("font-dyslexic", state.a11y.font === "dyslexic");
    document.body.classList.toggle("text-lg", state.a11y.size === "lg");
    document.body.classList.toggle("text-xl", state.a11y.size === "xl");
    document.body.classList.toggle("color-syllables", !!state.a11y.syllables);
    document.body.classList.toggle("reduce-motion", !!state.a11y.motion);
  }

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
    pronCard: document.getElementById("pron-card"),
    pronSyllables: document.getElementById("pron-syllables"),
    pronHint: document.getElementById("pron-hint"),
    assessResult: document.getElementById("assess-result"),
    assessScoreNum: document.getElementById("assess-score-num"),
    assessScore: null, // will resolve below
    assessVerdict: document.getElementById("assess-verdict"),
    subAccuracy: document.getElementById("sub-accuracy"),
    subFluency: document.getElementById("sub-fluency"),
    subCompleteness: document.getElementById("sub-completeness"),
    subProsody: document.getElementById("sub-prosody"),
    assessWords: document.getElementById("assess-words"),
    assessTips: document.getElementById("assess-tips"),
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

    // Mode tabs
    modeTabs: document.querySelectorAll(".mode-tab"),
    modePractice: document.getElementById("mode-practice"),
    modeFlashcards: document.getElementById("mode-flashcards"),
    modeMatch: document.getElementById("mode-match"),

    // Flashcards
    flashcard: document.getElementById("flashcard"),
    fcFront: document.querySelector(".flashcard-front"),
    fcBack: document.querySelector(".flashcard-back"),
    fcEmoji: document.getElementById("fc-emoji"),
    fcEmojiBack: document.getElementById("fc-emoji-back"),
    fcUk: document.getElementById("fc-uk"),
    fcTranslit: document.getElementById("fc-translit"),
    fcEn: document.getElementById("fc-en"),
    fcBreakdown: document.getElementById("fc-breakdown"),
    fcHint: document.getElementById("fc-hint"),
    fcListen: document.getElementById("fc-listen"),
    fcAgain: document.getElementById("fc-again"),
    fcFlip: document.getElementById("fc-flip"),
    fcGotIt: document.getElementById("fc-got-it"),
    fcProgressFill: document.getElementById("fc-progress-fill"),
    fcProgressText: document.getElementById("fc-progress-text"),
    fcDone: document.getElementById("fc-done"),
    fcDoneStats: document.getElementById("fc-done-stats"),
    fcRestart: document.getElementById("fc-restart"),
    fcBackBtn: document.getElementById("fc-back"),

    // Match
    matchColUk: document.getElementById("match-col-uk"),
    matchColEn: document.getElementById("match-col-en"),
    matchProgressText: document.getElementById("match-progress-text"),
    matchMistakes: document.getElementById("match-mistakes"),
    matchDone: document.getElementById("match-done"),
    matchDoneStats: document.getElementById("match-done-stats"),
    matchAgain: document.getElementById("match-again"),
    matchBack: document.getElementById("match-back"),

    // A11y settings inputs
    a11yFont: document.getElementById("a11y-font"),
    a11ySize: document.getElementById("a11y-size"),
    a11ySyllables: document.getElementById("a11y-syllables"),
    a11yMotion: document.getElementById("a11y-motion"),
  };
  // Resolve the outer .assess-score ring (containing the number) for coloring
  el.assessScore = el.assessScoreNum ? el.assessScoreNum.parentElement : null;

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
    // Always open a lesson in Practice mode — mode choice is not persisted.
    state.mode = "practice";
    el.modeTabs.forEach(function (t) {
      const active = t.getAttribute("data-mode") === "practice";
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    el.modePractice.classList.add("active");
    el.modeFlashcards.classList.remove("active");
    el.modeMatch.classList.remove("active");
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
    renderBreakdown(item);
    hideAssessResult();
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

  function startWebSpeechRecognition() {
    if (!recognizer || state.recognizing) return;
    try {
      recognizer.start();
    } catch (_) {
      // start() can throw if called while already starting
    }
  }

  function startListening() {
    if (state.recognizing) return;
    const item = state.runtimeItems[state.itemIndex];
    if (!item) return;
    const vs = state.voiceSettings;
    if (vs.provider === "azure" && vs.azure.key) {
      // Phoneme-level assessment via Azure
      startAzureAssessment(item.uk);
    } else {
      // Legacy: browser's speech-to-text + Levenshtein text matching
      startWebSpeechRecognition();
    }
  }

  function stopListening() {
    if (azureRecognizer) {
      stopAzureRecognition();
      return;
    }
    if (!recognizer || !state.recognizing) return;
    try { recognizer.stop(); } catch (_) {}
  }

  // ---------- Pronunciation breakdown (static, pre-attempt) ----------
  function renderBreakdown(item) {
    if (!el.pronCard) return;
    if (!item.breakdown) {
      el.pronCard.classList.add("hidden");
      return;
    }
    // Split on hyphens AND spaces, keeping spaces as a visible separator.
    // Tokens containing uppercase letters are treated as stressed syllables.
    const parts = item.breakdown.split(/(\s+)/);
    const html = parts.map(function (chunk) {
      if (/^\s+$/.test(chunk)) return '<span class="pron-sep">&nbsp;</span>';
      return chunk.split("-").map(function (syl, i, arr) {
        const isStress = /[A-ZÀ-Ý]/.test(syl) && syl === syl.toUpperCase();
        const cls = isStress ? "pron-syl stress" : "pron-syl";
        const text = isStress ? syl.toLowerCase() : syl;
        const sep = i < arr.length - 1 ? '<span class="pron-sep">·</span>' : "";
        return '<span class="' + cls + '">' + escapeHtml(text) + '</span>' + sep;
      }).join("");
    }).join("");
    el.pronSyllables.innerHTML = html;
    el.pronHint.textContent = item.hint || "";
    el.pronCard.classList.remove("hidden");
  }

  function hideAssessResult() {
    if (el.assessResult) el.assessResult.classList.add("hidden");
  }

  // ---------- Azure Speech SDK loader (lazy) ----------
  let sdkPromise = null;
  function loadSpeechSDK() {
    if (typeof window.SpeechSDK !== "undefined") {
      return Promise.resolve(window.SpeechSDK);
    }
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      // The preload tag may still be loading — poll briefly first.
      let waited = 0;
      const poll = setInterval(function () {
        if (typeof window.SpeechSDK !== "undefined") {
          clearInterval(poll);
          resolve(window.SpeechSDK);
        } else if (waited > 4000) {
          clearInterval(poll);
          // Fall back: inject the script ourselves.
          const s = document.createElement("script");
          s.src = "https://aka.ms/csspeech/jsbrowserpackageraw";
          s.onload = function () { resolve(window.SpeechSDK); };
          s.onerror = function () { reject(new Error("Failed to load Azure Speech SDK")); };
          document.head.appendChild(s);
        }
        waited += 100;
      }, 100);
    });
    return sdkPromise;
  }

  // ---------- Azure Pronunciation Assessment ----------
  let azureRecognizer = null;

  function startAzureAssessment(referenceText) {
    const vs = state.voiceSettings;
    el.micBtn.classList.add("recording");
    el.micLabel.textContent = "Listening… speak now";
    el.heard.innerHTML = "";
    el.feedback.textContent = "";
    el.feedback.className = "feedback";
    hideAssessResult();

    state.recognizing = true;

    loadSpeechSDK().then(function (SDK) {
      const speechConfig = SDK.SpeechConfig.fromSubscription(vs.azure.key, vs.azure.region);
      speechConfig.speechRecognitionLanguage = "uk-UA";
      const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();

      const paConfig = new SDK.PronunciationAssessmentConfig(
        referenceText,
        SDK.PronunciationAssessmentGradingSystem.HundredMark,
        SDK.PronunciationAssessmentGranularity.Phoneme,
        true // enableMiscue — flags omitted/inserted words
      );
      // Request prosody scoring if available (newer SDK)
      try { paConfig.enableProsodyAssessment = true; } catch (_) {}

      const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);
      paConfig.applyTo(recognizer);
      azureRecognizer = recognizer;

      recognizer.recognizeOnceAsync(
        function (result) {
          endRecording();
          try {
            if (result.reason === SDK.ResultReason.RecognizedSpeech) {
              const paResult = SDK.PronunciationAssessmentResult.fromResult(result);
              renderAssessmentResult(result.text, paResult);
              maybeMarkCompleted(paResult);
            } else if (result.reason === SDK.ResultReason.NoMatch) {
              showAssessError("I didn't catch anything. Try again, a bit louder.");
            } else {
              showAssessError("Recognition failed. Check your mic and try again.");
            }
          } finally {
            try { recognizer.close(); } catch (_) {}
            if (azureRecognizer === recognizer) azureRecognizer = null;
          }
        },
        function (err) {
          endRecording();
          try { recognizer.close(); } catch (_) {}
          if (azureRecognizer === recognizer) azureRecognizer = null;
          const msg = typeof err === "string" ? err : (err && err.message) || "Unknown error";
          showAssessError("Azure error: " + msg + ". Falling back to system speech recognition.");
          // Fall back to the legacy recognizer for this attempt
          startWebSpeechRecognition();
        }
      );
    }).catch(function (err) {
      endRecording();
      showAssessError("Couldn't load the Azure Speech SDK. Falling back to system recognition.");
      startWebSpeechRecognition();
    });
  }

  function stopAzureRecognition() {
    if (azureRecognizer) {
      try { azureRecognizer.stopContinuousRecognitionAsync(function () {}); } catch (_) {}
      try { azureRecognizer.close(); } catch (_) {}
      azureRecognizer = null;
    }
    endRecording();
  }

  function endRecording() {
    state.recognizing = false;
    el.micBtn.classList.remove("recording");
    el.micLabel.textContent = "Press & say the word";
  }

  function showAssessError(msg) {
    el.feedback.textContent = msg;
    el.feedback.className = "feedback bad";
    hideAssessResult();
  }

  // ---------- Assessment result rendering ----------
  function scoreClass(n) {
    if (n >= 80) return "good";
    if (n >= 60) return "ok";
    return "bad";
  }

  function verdictFor(score) {
    if (score >= 90) return { main: "Outstanding. Native-like.", sub: "Nothing to fix — move on or try the next one." };
    if (score >= 80) return { main: "Excellent! ✓", sub: "You're easily understood. Small polish left." };
    if (score >= 65) return { main: "Good start.", sub: "Understandable, but a few sounds need work." };
    if (score >= 45) return { main: "Getting there.", sub: "Listen again carefully and match the stress." };
    return { main: "Not quite.", sub: "Hit the 'Hear it' button and mimic the rhythm." };
  }

  function renderAssessmentResult(recognizedText, pa) {
    const overall = Math.round(pa.pronunciationScore || 0);
    el.assessScoreNum.textContent = overall;
    if (el.assessScore) {
      el.assessScore.classList.remove("good", "ok", "bad");
      el.assessScore.classList.add(scoreClass(overall));
    }

    const v = verdictFor(overall);
    el.assessVerdict.innerHTML =
      escapeHtml(v.main) + '<span class="verdict-sub">' + escapeHtml(v.sub) + "</span>";

    // Sub-scores
    setSubscore(el.subAccuracy, pa.accuracyScore);
    setSubscore(el.subFluency, pa.fluencyScore);
    setSubscore(el.subCompleteness, pa.completenessScore);
    setSubscore(el.subProsody, pa.prosodyScore);

    // Word-by-word coloring
    const detail = pa.detailResult || {};
    const words = (detail.Words || []);
    if (words.length) {
      el.assessWords.innerHTML = words.map(function (w) {
        const score = Math.round(w.PronunciationAssessment && w.PronunciationAssessment.AccuracyScore || w.AccuracyScore || 0);
        const errType = (w.PronunciationAssessment && w.PronunciationAssessment.ErrorType) || w.ErrorType || "None";
        const cls = errType === "Omission" ? "bad" : errType === "Insertion" ? "bad" : scoreClass(score);
        const title = errType !== "None" ? errType : (score + "% accuracy");
        return '<span class="assess-word ' + cls + '" title="' + escapeHtml(title) + '">' +
                 escapeHtml(w.Word) + '<span class="wordscore">' + score + '</span>' +
               '</span>';
      }).join("");
    } else {
      el.assessWords.innerHTML = '<span class="pron-sep">—</span>';
    }

    // Tips: pick up to 2 concrete things to improve
    const tips = buildTips(pa);
    if (tips.length) {
      el.assessTips.innerHTML = tips.map(function (t) {
        return '<span class="tip-bullet">' + escapeHtml(t) + '</span>';
      }).join("");
    } else {
      el.assessTips.innerHTML = "";
    }

    // Show what Azure heard (mirrors the legacy "heard" line)
    if (recognizedText) {
      el.heard.innerHTML =
        '<span class="label">Azure heard:</span> <span class="spoken">' +
        escapeHtml(recognizedText) + "</span>";
    }

    el.assessResult.classList.remove("hidden");
  }

  function setSubscore(node, n) {
    if (!node) return;
    if (n == null || isNaN(n)) {
      node.textContent = "—";
      node.className = "subscore-val";
      return;
    }
    const rounded = Math.round(n);
    node.textContent = rounded;
    node.className = "subscore-val " + scoreClass(rounded);
  }

  function buildTips(pa) {
    const tips = [];
    const detail = pa.detailResult || {};
    const words = detail.Words || [];

    // 1) Omitted or inserted words
    words.forEach(function (w) {
      const err = (w.PronunciationAssessment && w.PronunciationAssessment.ErrorType) || w.ErrorType;
      if (err === "Omission") tips.push('You skipped "' + w.Word + '". Say the whole phrase in one breath.');
      if (err === "Insertion") tips.push('You added an extra word ("' + w.Word + '"). Stick to the line exactly.');
    });

    // 2) Weakest phoneme across all words
    let weakest = null;
    words.forEach(function (w) {
      const phonemes = w.Phonemes || (w.PronunciationAssessment && w.PronunciationAssessment.Phonemes) || [];
      phonemes.forEach(function (p) {
        const score = p.PronunciationAssessment ? p.PronunciationAssessment.AccuracyScore : p.AccuracyScore;
        if (typeof score === "number" && (weakest === null || score < weakest.score)) {
          weakest = { phoneme: p.Phoneme, score: score, word: w.Word };
        }
      });
    });
    if (weakest && weakest.score < 60 && tips.length < 2) {
      tips.push('The "' + weakest.phoneme + '" sound in "' + weakest.word + '" was off (' + Math.round(weakest.score) + '%). Listen to the Hear-it audio and copy that exact sound.');
    }

    // 3) Fluency-specific nudge
    if (pa.fluencyScore != null && pa.fluencyScore < 60 && tips.length < 2) {
      tips.push("Try to say it in one smooth flow — pauses between syllables hurt fluency.");
    }
    // 4) Prosody (stress) nudge
    if (pa.prosodyScore != null && pa.prosodyScore < 60 && tips.length < 2) {
      tips.push("Watch the stress — the highlighted syllable above should be clearly louder/longer.");
    }

    return tips.slice(0, 2);
  }

  function maybeMarkCompleted(pa) {
    const item = state.runtimeItems[state.itemIndex];
    const overall = pa.pronunciationScore || 0;
    if (overall >= 75) {
      markItemCompleted(item.sourceLessonId, item.sourceIndex);
      updateOverallProgress();
      const lesson = getLesson();
      const pct = Math.round((countCompleted(lesson) / lesson.items.length) * 100);
      el.lessonProgress.style.width = pct + "%";
    }
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
      stopListening();
      state.itemIndex--;
      rememberPosition();
      renderItem();
    }
  }
  function goNext() {
    stopListening();
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

    // Mode tabs
    el.modeTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        switchMode(tab.getAttribute("data-mode"));
      });
    });

    // Flashcards
    el.flashcard.addEventListener("click", function () { fcFlipCard(); });
    el.flashcard.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fcFlipCard(); }
    });
    el.fcFlip.addEventListener("click", function (e) { e.stopPropagation(); fcFlipCard(); });
    el.fcListen.addEventListener("click", function (e) {
      e.stopPropagation();
      const fc = state.flashcards;
      if (!fc) return;
      const item = getLesson().items[fc.queue[fc.current]];
      if (item) speak(item.uk);
    });
    el.fcAgain.addEventListener("click", function (e) { e.stopPropagation(); fcMarkAgain(); });
    el.fcGotIt.addEventListener("click", function (e) { e.stopPropagation(); fcMarkGotIt(); });
    el.fcRestart.addEventListener("click", function () { initFlashcards(); });
    el.fcBackBtn.addEventListener("click", function () {
      switchView("list"); renderLessonList();
    });

    // Match
    el.matchAgain.addEventListener("click", function () { initMatch(); });
    el.matchBack.addEventListener("click", function () {
      switchView("list"); renderLessonList();
    });

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

    // Accessibility section
    if (el.a11yFont) el.a11yFont.checked = state.a11y.font === "dyslexic";
    if (el.a11ySize) el.a11ySize.value = state.a11y.size || "normal";
    if (el.a11ySyllables) el.a11ySyllables.checked = !!state.a11y.syllables;
    if (el.a11yMotion) el.a11yMotion.checked = !!state.a11y.motion;

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

    // Save accessibility toggles
    state.a11y.font = el.a11yFont && el.a11yFont.checked ? "dyslexic" : "default";
    state.a11y.size = el.a11ySize ? el.a11ySize.value : "normal";
    state.a11y.syllables = !!(el.a11ySyllables && el.a11ySyllables.checked);
    state.a11y.motion = !!(el.a11yMotion && el.a11yMotion.checked);
    saveA11ySettings();
    applyA11ySettings();

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

  // ---------- Mode switching ----------
  function switchMode(mode) {
    if (mode === state.mode) return;
    stopListening();
    state.mode = mode;
    el.modeTabs.forEach(function (t) {
      const active = t.getAttribute("data-mode") === mode;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    el.modePractice.classList.toggle("active", mode === "practice");
    el.modeFlashcards.classList.toggle("active", mode === "flashcards");
    el.modeMatch.classList.toggle("active", mode === "match");
    if (mode === "flashcards") initFlashcards();
    if (mode === "match") initMatch();
    if (mode === "practice") renderItem();
  }

  // ---------- Flashcards ----------
  function initFlashcards() {
    const lesson = getLesson();
    const queue = lesson.items.map(function (_, i) { return i; });
    shuffle(queue);
    state.flashcards = { queue: queue, current: 0, flipped: false, gotIt: 0, again: 0, totalShown: 0 };
    el.fcDone.classList.add("hidden");
    el.flashcard.style.display = "";
    el.fcAgain.parentElement.style.display = "";
    renderFlashcard();
  }

  function renderFlashcard() {
    const fc = state.flashcards;
    if (!fc) return;
    const lesson = getLesson();
    const itemIndex = fc.queue[fc.current];
    if (typeof itemIndex === "undefined") return finishFlashcards();
    const item = lesson.items[itemIndex];

    const emoji = item.emoji || "";
    el.fcEmoji.textContent = emoji;
    el.fcEmojiBack.textContent = emoji;
    el.fcUk.textContent = item.uk;
    el.fcTranslit.textContent = item.translit || "";
    el.fcEn.textContent = item.en;
    el.fcHint.textContent = item.hint || "";
    el.fcBreakdown.innerHTML = renderBreakdownHtml(item.breakdown || "");

    // Always start on the front (Ukrainian side)
    fc.flipped = false;
    el.fcFront.classList.remove("hidden");
    el.fcBack.classList.add("hidden");

    // Progress bar: reflects GotIt-so-far / deck size
    const total = fc.queue.length + fc.totalShown; // queue shrinks as we progress
    const done = fc.gotIt;
    const totalDeck = lesson.items.length;
    el.fcProgressFill.style.width = Math.round((done / totalDeck) * 100) + "%";
    el.fcProgressText.textContent = done + " of " + totalDeck + " got it";
  }

  // Small helper to render a breakdown HTML snippet for flashcards
  function renderBreakdownHtml(breakdown) {
    if (!breakdown) return "";
    const parts = breakdown.split(/(\s+)/);
    return parts.map(function (chunk) {
      if (/^\s+$/.test(chunk)) return '<span class="pron-sep">&nbsp;</span>';
      return chunk.split("-").map(function (syl, i, arr) {
        const isStress = /[A-ZÀ-Ý]/.test(syl) && syl === syl.toUpperCase();
        const cls = isStress ? "pron-syl stress" : "pron-syl";
        const text = isStress ? syl.toLowerCase() : syl;
        const sep = i < arr.length - 1 ? '<span class="pron-sep">·</span>' : "";
        return '<span class="' + cls + '">' + escapeHtml(text) + '</span>' + sep;
      }).join("");
    }).join("");
  }

  function fcFlipCard() {
    const fc = state.flashcards;
    if (!fc) return;
    fc.flipped = !fc.flipped;
    el.fcFront.classList.toggle("hidden", fc.flipped);
    el.fcBack.classList.toggle("hidden", !fc.flipped);
    if (fc.flipped) {
      // Auto-play the audio when revealing the answer
      const item = getLesson().items[fc.queue[fc.current]];
      if (item) speak(item.uk);
    }
  }

  function fcMarkGotIt() {
    const fc = state.flashcards;
    if (!fc) return;
    const lesson = getLesson();
    const itemIndex = fc.queue[fc.current];
    const item = lesson.items[itemIndex];
    // Mark as completed in the main progress store (so lesson progress counts)
    markItemCompleted(lesson.id, itemIndex);
    updateOverallProgress();
    fc.gotIt += 1;
    fc.totalShown += 1;
    fc.queue.splice(fc.current, 1);  // remove from deck
    if (fc.current >= fc.queue.length) fc.current = 0;
    if (fc.queue.length === 0) return finishFlashcards();
    renderFlashcard();
  }

  function fcMarkAgain() {
    const fc = state.flashcards;
    if (!fc) return;
    fc.again += 1;
    fc.totalShown += 1;
    // Move current card to the BACK of the queue so it comes around again
    const idx = fc.queue.splice(fc.current, 1)[0];
    fc.queue.push(idx);
    if (fc.current >= fc.queue.length) fc.current = 0;
    renderFlashcard();
  }

  function finishFlashcards() {
    const fc = state.flashcards;
    el.flashcard.style.display = "none";
    el.fcAgain.parentElement.style.display = "none";
    el.fcDoneStats.textContent =
      "You got " + fc.gotIt + " card" + (fc.gotIt === 1 ? "" : "s") +
      " with " + fc.again + " retr" + (fc.again === 1 ? "y" : "ies") + ".";
    el.fcDone.classList.remove("hidden");
  }

  // ---------- Matching game ----------
  const MATCH_ROUND_SIZE = 5;

  function initMatch() {
    const lesson = getLesson();
    // Prefer items the learner hasn't yet mastered; fall back to the full set.
    const lp = state.progress.lessons[lesson.id] || {};
    const unmastered = lesson.items
      .map(function (item, i) { return { item: item, i: i, done: !!(lp[i] && lp[i].completed) }; })
      .filter(function (x) { return !x.done; });
    const pool = (unmastered.length >= 4 ? unmastered : lesson.items.map(function (item, i) { return { item: item, i: i }; }));
    shuffle(pool);
    const pairs = pool.slice(0, Math.min(MATCH_ROUND_SIZE, pool.length));
    const leftOrder = pairs.map(function (_, i) { return i; });
    const rightOrder = pairs.map(function (_, i) { return i; });
    shuffle(leftOrder); shuffle(rightOrder);
    state.match = {
      pairs: pairs, leftOrder: leftOrder, rightOrder: rightOrder,
      selected: null, matched: new Set(), mistakes: 0,
    };
    el.matchDone.classList.add("hidden");
    el.matchColUk.style.display = "";
    el.matchColEn.style.display = "";
    renderMatch();
  }

  function renderMatch() {
    const m = state.match;
    if (!m) return;
    el.matchColUk.innerHTML = "";
    el.matchColEn.innerHTML = "";
    m.leftOrder.forEach(function (pairIdx) {
      el.matchColUk.appendChild(buildMatchCard("uk", pairIdx, m.pairs[pairIdx].item));
    });
    m.rightOrder.forEach(function (pairIdx) {
      el.matchColEn.appendChild(buildMatchCard("en", pairIdx, m.pairs[pairIdx].item));
    });
    updateMatchProgress();
  }

  function buildMatchCard(side, pairIdx, item) {
    const card = document.createElement("button");
    card.className = "match-card " + side;
    card.setAttribute("type", "button");
    card.setAttribute("data-pair", String(pairIdx));
    card.setAttribute("data-side", side);
    const emoji = side === "en" && item.emoji ? '<span class="match-emoji">' + item.emoji + "</span>" : "";
    const text = side === "uk" ? item.uk : item.en;
    card.innerHTML = emoji + "<span>" + escapeHtml(text) + "</span>";
    card.addEventListener("click", function () { handleMatchClick(card); });
    return card;
  }

  function handleMatchClick(card) {
    const m = state.match;
    if (!m) return;
    const pairIdx = Number(card.getAttribute("data-pair"));
    const side = card.getAttribute("data-side");
    if (m.matched.has(pairIdx)) return;
    if (card.classList.contains("wrong")) return;

    // Tapping UK side also reads it out loud — multi-sensory cue
    if (side === "uk") {
      const item = m.pairs[pairIdx].item;
      if (item) speak(item.uk);
    }

    if (!m.selected) {
      // First selection
      m.selected = { pairIdx: pairIdx, side: side, el: card };
      card.classList.add("selected");
      return;
    }

    // Second selection — same card? deselect.
    if (m.selected.el === card) {
      card.classList.remove("selected");
      m.selected = null;
      return;
    }
    // Must be opposite side; if same side, switch selection
    if (m.selected.side === side) {
      m.selected.el.classList.remove("selected");
      m.selected = { pairIdx: pairIdx, side: side, el: card };
      card.classList.add("selected");
      return;
    }

    // Opposite side chosen — evaluate pairing
    if (m.selected.pairIdx === pairIdx) {
      // Correct!
      card.classList.add("matched");
      m.selected.el.classList.remove("selected");
      m.selected.el.classList.add("matched");
      m.matched.add(pairIdx);
      m.selected = null;
      // Mark this item as reviewed in main progress
      const pair = m.pairs[pairIdx];
      markItemCompleted(getLesson().id, pair.i);
      updateMatchProgress();
      if (m.matched.size === m.pairs.length) setTimeout(finishMatch, 400);
    } else {
      // Wrong pairing — flash, reset both
      const wrongA = m.selected.el;
      const wrongB = card;
      m.mistakes += 1;
      wrongA.classList.remove("selected");
      wrongA.classList.add("wrong");
      wrongB.classList.add("wrong");
      m.selected = null;
      setTimeout(function () {
        wrongA.classList.remove("wrong");
        wrongB.classList.remove("wrong");
      }, 600);
      updateMatchProgress();
    }
  }

  function updateMatchProgress() {
    const m = state.match;
    el.matchProgressText.textContent = m.matched.size + " of " + m.pairs.length + " matched";
    el.matchMistakes.textContent = m.mistakes ? "Wrong tries: " + m.mistakes : "";
  }

  function finishMatch() {
    const m = state.match;
    el.matchColUk.style.display = "none";
    el.matchColEn.style.display = "none";
    el.matchDoneStats.textContent =
      "All " + m.pairs.length + " pairs matched" +
      (m.mistakes === 0 ? " with no wrong tries. Perfect!" :
       m.mistakes === 1 ? " with just 1 slip." :
       " with " + m.mistakes + " wrong tries.");
    updateOverallProgress();
    renderLessonListQuietly();
    el.matchDone.classList.remove("hidden");
  }

  function renderLessonListQuietly() {
    // So that the home-screen progress pill updates next time it's shown;
    // no need to re-render if the lesson list isn't visible right now.
    // This is a no-op placeholder kept for future hooks.
  }

  // ---------- Init ----------
  function init() {
    applyA11ySettings();
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
