(() => {
  const demo = document.getElementById('demo');
  if (!demo) return;

  const cardInput = demo.querySelector('[data-stage="input"]');
  const cardBase  = demo.querySelector('[data-stage="baseline"]');
  const cardStep2 = demo.querySelector('[data-stage="step2"]');
  const cardOurs  = demo.querySelector('[data-stage="ours"]');

  const videoStep2 = document.getElementById('video-step2');
  const videoBase  = document.getElementById('video-base');
  const videoOurs  = document.getElementById('video-ours');

  const overlayStep2 = document.getElementById('overlay-step2');
  const overlayStep2Text = document.getElementById('overlay-step2-text');
  const overlayBase  = document.getElementById('overlay-base');
  const overlayOurs  = document.getElementById('overlay-ours');

  const statusBase  = document.getElementById('status-base');
  const statusStep2 = document.getElementById('status-step2');
  const statusFinal = document.getElementById('status-final');

  const deltaCard = document.getElementById('delta-card');
  const injectArrow = document.getElementById('inject-connector');
  const compareHint = document.getElementById('compare-hint');
  const resetBtn  = document.getElementById('demo-reset');

  const STEP2_RATE = 2.5;

  const setStatus = (el, text, state) => {
    el.textContent = text;
    if (state) el.setAttribute('data-state', state);
    else el.removeAttribute('data-state');
  };
  const hide = el => el.classList.add('is-hidden');
  const show = el => el.classList.remove('is-hidden');
  const on  = (el, cls) => el.classList.add(cls);
  const off = (el, cls) => el.classList.remove(cls);

  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; };

  const reset = () => {
    clearAll();
    [videoStep2, videoBase, videoOurs].forEach(v => {
      try { v.pause(); v.currentTime = 0; } catch (_) {}
    });
    [overlayStep2, overlayBase, overlayOurs].forEach(show);
    overlayStep2Text.textContent = 'Encoding…';

    off(deltaCard, 'is-ready');
    off(injectArrow, 'is-flowing');
    off(compareHint, 'is-ready');

    on(cardInput, 'is-active');
    [cardBase, cardStep2, cardOurs].forEach(el => {
      off(el, 'is-active');
      off(el, 'is-done');
      off(el, 'is-compare-ref');
      off(el, 'is-compare-ours');
    });

    setStatus(statusBase, 'waiting', null);
    setStatus(statusStep2, 'waiting', null);
    setStatus(statusFinal, 'waiting', null);
  };

  const play = () => {
    // ── ② Baseline first ──────────────────────────────────────
    at(500, () => {
      on(cardBase, 'is-active');
      setStatus(statusBase, 'running', 'running');
    });
    at(2400, () => {
      hide(overlayBase);
      videoBase.play().catch(() => {});
      setStatus(statusBase, '50 steps ✓', 'done');
      on(cardBase, 'is-done');
    });

    // ── ③ Step 2 reveal (same model, dramatic) ────────────────
    at(3400, () => {
      on(cardStep2, 'is-active');
      setStatus(statusStep2, 'running', 'running');
    });

    const phases = ['Encoding…', 'Step 1/2…', 'Step 2/2…', 'Extracting Δphys…'];
    phases.forEach((t, i) => {
      at(3400 + i * 260, () => { overlayStep2Text.textContent = t; });
    });

    at(4700, () => {
      hide(overlayStep2);
      videoStep2.playbackRate = STEP2_RATE;
      videoStep2.play().catch(() => {});
      setStatus(statusStep2, '2 steps ✓', 'done');
      on(cardStep2, 'is-done');
    });

    // Δphys extracted — visible inside card ③
    at(5300, () => { on(deltaCard, 'is-ready'); });

    // ── inject arrow between ③ and ④ flows ───────────────────
    at(5900, () => { on(injectArrow, 'is-flowing'); });

    // ── ④ PhaseLock: Δphys applied to our model ──────────────
    at(6300, () => {
      on(cardOurs, 'is-active');
      setStatus(statusFinal, 'running', 'running');
    });
    at(8200, () => {
      hide(overlayOurs);
      videoOurs.play().catch(() => {});
      setStatus(statusFinal, '50 + Δphys ✓', 'done');
      on(cardOurs, 'is-done');
    });

    // ── Comparison highlight between ② and ④ ─────────────────
    at(9000, () => {
      on(cardBase, 'is-compare-ref');
      on(cardOurs, 'is-compare-ours');
      on(compareHint, 'is-ready');
    });
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', () => { reset(); play(); });
  }

  reset();
  let started = false;
  const startOnce = () => {
    if (started) return;
    started = true;
    at(400, play);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { startOnce(); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(demo);
  } else {
    startOnce();
  }
})();
