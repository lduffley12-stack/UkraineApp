(function () {
  "use strict";

  const STORAGE_KEY = "ukraine-app-progress-v2";
  const LEGACY_STORAGE_KEY = "ukraine-app-progress-v1";
  const UNLOCK_THRESHOLD = 0.8; // 80% of previous lesson required to unlock the next

  // ---------- State ----------
  // Progress shape:
  // {
  //   lessons: { [lessonId]: { [itemIndex]: { completed: true, at: timestamp } } },
  //   lastPosition: { lessonId, itemIndex }
  // }
  const state = {
    lessonId: null,
    itemIndex: 0,
    progress: loadProgress(),
    availableVoice: null,
    recognizing: false,
  };

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
  };

  // ---------- Lesson list view ----------
  function renderLessonList() {
    el.lessonsContainer.innerHTML = "";
    LESSONS.forEach(function (lesson, index) {
      const btn = document.createElement("button");
      btn.className = "lesson-card";
      btn.setAttribute("type", "button");

      const levelLabel =
        lesson.level === "words" ? "Words" :
        lesson.level === "phrases" ? "Short phrases" : "Sentences";
      const levelClass = lesson.level === "phrases" ? "phrases" :
                         lesson.level === "sentences" ? "sentences" : "";

      const completed = countCompleted(lesson);
      const pct = Math.round((completed / lesson.items.length) * 100);
      const status = getLessonStatus(index);

      if (status.locked) btn.classList.add("locked");
      if (status.done) btn.classList.add("done");

      const statusLine = status.locked
        ? '<span class="status locked-note">🔒 Finish "' + escapeHtml(LESSONS[index - 1].title) + '" to unlock</span>'
        : status.done
          ? '<span class="status unlocked">✓ Complete</span>'
          : completed > 0
            ? '<span class="status unlocked">In progress</span>'
            : '<span class="status unlocked">Ready</span>';

      btn.innerHTML = `
        <span class="level-badge ${levelClass}">${levelLabel}</span>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p class="desc">${escapeHtml(lesson.description)}</p>
        <div class="card-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span>${completed}/${lesson.items.length}</span>
        </div>
        ${statusLine}
      `;
      btn.disabled = status.locked;
      btn.addEventListener("click", function () {
        if (status.locked) return;
        openLesson(lesson.id);
      });
      el.lessonsContainer.appendChild(btn);
    });
    updateOverallProgress();
    renderResumeBanner();
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
  function openLesson(lessonId, startIndex) {
    state.lessonId = lessonId;
    const lesson = getLesson();
    if (typeof startIndex === "number") {
      state.itemIndex = Math.max(0, Math.min(startIndex, lesson.items.length - 1));
    } else {
      // Smart resume: jump to the first item you haven't completed yet.
      state.itemIndex = firstUncompletedIndex(lesson);
    }
    el.title.textContent = lesson.title;
    rememberPosition();
    switchView("lesson");
    renderItem();
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
    const item = lesson.items[state.itemIndex];
    el.uk.textContent = item.uk;
    el.translit.textContent = item.translit;
    el.en.textContent = item.en;
    el.en.classList.add("hidden");
    el.heard.innerHTML = "";
    el.feedback.textContent = "";
    el.feedback.className = "feedback";
    el.counter.textContent = (state.itemIndex + 1) + " / " + lesson.items.length;

    const completed = countCompleted(lesson);
    const pct = Math.round((completed / lesson.items.length) * 100);
    el.lessonProgress.style.width = pct + "%";

    el.prev.disabled = state.itemIndex === 0;
    el.next.disabled = false;
  }

  // ---------- Text-to-speech ----------
  function pickUkrainianVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices || voices.length === 0) return null;
    let voice =
      voices.find(function (v) { return /^uk(-|_)/i.test(v.lang); }) ||
      voices.find(function (v) { return /ukrain/i.test(v.name); }) ||
      null;
    return voice;
  }

  function speak(text, opts) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "uk-UA";
    u.rate = (opts && opts.slow) ? 0.6 : 0.95;
    u.pitch = 1;
    const voice = pickUkrainianVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  function ensureVoiceWarning() {
    if (!window.speechSynthesis) {
      el.voiceWarning.classList.remove("hidden");
      el.voiceWarning.innerHTML = "<strong>Heads up:</strong> Your browser doesn't support text-to-speech. You can still read and practice by ear with the transliteration.";
      return;
    }
    const voice = pickUkrainianVoice();
    if (!voice) {
      el.voiceWarning.classList.remove("hidden");
    } else {
      el.voiceWarning.classList.add("hidden");
    }
  }

  // Voices in Chrome often load asynchronously
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = ensureVoiceWarning;
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
      el.micLabel.textContent = "Listening... speak now";
      el.heard.innerHTML = "";
      el.feedback.textContent = "";
      el.feedback.className = "feedback";
    };
    recognizer.onend = function () {
      state.recognizing = false;
      el.micBtn.classList.remove("recording");
      el.micLabel.textContent = "Press and say it";
    };
    recognizer.onerror = function (e) {
      state.recognizing = false;
      el.micBtn.classList.remove("recording");
      el.micLabel.textContent = "Press and say it";
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
    const item = lesson.items[state.itemIndex];
    const targets = [item.uk].concat(item.accept || []);

    const result = bestMatch(candidates, targets);
    const scorePct = Math.round(result.score * 100);

    el.heard.innerHTML =
      '<span class="label">You said:</span> <span class="spoken">' +
      escapeHtml(result.heard) + '</span> <span class="label">(' + scorePct + '% match)</span>';

    if (result.score >= 0.85) {
      el.feedback.textContent = "Excellent! That sounds right. ✓";
      el.feedback.className = "feedback good";
      markItemCompleted(lesson.id, state.itemIndex);
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
    const lesson = getLesson();
    if (state.itemIndex < lesson.items.length - 1) {
      state.itemIndex++;
      rememberPosition();
      renderItem();
    } else {
      // End of lesson — return to list
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
      const item = getLesson().items[state.itemIndex];
      speak(item.uk);
    });
    el.slowBtn.addEventListener("click", function () {
      const item = getLesson().items[state.itemIndex];
      speak(item.uk, { slow: true });
    });
    el.showBtn.addEventListener("click", function () {
      el.en.classList.toggle("hidden");
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
        const item = getLesson().items[state.itemIndex];
        speak(item.uk);
      } else if (e.key === "m" || e.key === "M") {
        if (state.recognizing) stopListening(); else startListening();
      }
    });
  }

  // ---------- Init ----------
  function init() {
    renderLessonList();
    wireEvents();
    setupRecognizer();
    ensureVoiceWarning();
    // Trigger voices load
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
