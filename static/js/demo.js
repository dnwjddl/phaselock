(() => {
  const demo = document.getElementById('demo');
  if (!demo) return;

  const inputCard = demo.querySelector('[data-stage="input"]');
  const laneBase  = demo.querySelector('[data-stage="baseline"]');
  const laneOurs  = demo.querySelector('.demo-lane-ours');
  const step2Card = demo.querySelector('[data-stage="step2"]');

  const videoStep2 = document.getElementById('video-step2');
  const videoBase  = document.getElementById('video-base');
  const videoOurs  = document.getElementById('video-ours');

  const overlayStep2 = document.getElementById('overlay-step2');
  const overlayStep2Text = document.getElementById('overlay-step2-text');
  const overlayBase  = document.getElementById('overlay-base');
  const overlayOurs  = document.getElementById('overlay-ours');

  const statusBase  = document.getElementById('status-base');
  const statusFinal = document.getElementById('status-final');

  const deltaCard = document.getElementById('delta-card');
  const injectConnector = document.getElementById('inject-connector');
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
    off(injectConnector, 'is-flowing');

    on(inputCard, 'is-active');
    [laneBase, laneOurs].forEach(el => {
      off(el, 'is-active');
      off(el, 'is-done');
    });

    setStatus(statusBase, 'waiting', null);
    setStatus(statusFinal, 'waiting', null);
  };

  const play = () => {
    // t=500ms: BOTH lanes activate in parallel (same input feeds both)
    at(500, () => {
      on(laneBase, 'is-active');
      on(laneOurs, 'is-active');
      setStatus(statusBase, 'running', 'running');
      setStatus(statusFinal, 'running', 'running');
    });

    // Step 2 overlay phases (bottom lane only)
    const phases = ['Encoding…', 'Step 1/2…', 'Step 2/2…', 'Extracting Δphys…'];
    phases.forEach((t, i) => {
      at(500 + i * 320, () => { overlayStep2Text.textContent = t; });
    });

    // t=1800ms: Step 2 finishes — its video plays fast
    at(1800, () => {
      hide(overlayStep2);
      videoStep2.playbackRate = STEP2_RATE;
      videoStep2.play().catch(() => {});
    });

    // t=2400ms: Δphys chip emerges
    at(2400, () => { on(deltaCard, 'is-ready'); });

    // t=3000ms: Δphys flows into the PhaseLock 50-step path
    at(3000, () => { on(injectConnector, 'is-flowing'); });

    // t=5200ms: baseline output becomes ready (unguided 50-step)
    at(5200, () => {
      hide(overlayBase);
      videoBase.play().catch(() => {});
      setStatus(statusBase, '50 steps ✓', 'done');
      on(laneBase, 'is-done');
    });

    // t=5600ms: PhaseLock output becomes ready (guided 50-step)
    at(5600, () => {
      hide(overlayOurs);
      videoOurs.play().catch(() => {});
      setStatus(statusFinal, '50 + Δphys ✓', 'done');
      on(laneOurs, 'is-done');
    });
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', () => { reset(); play(); });
  }

  // Start when the demo enters the viewport
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
