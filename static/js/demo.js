(() => {
  const demo = document.getElementById('demo');
  if (!demo) return;

  const stageInput = demo.querySelector('[data-stage="input"]');
  const stageStep2 = demo.querySelector('[data-stage="step2"]');
  const stageFinal = demo.querySelector('[data-stage="final"]');

  const videoStep2 = document.getElementById('video-step2');
  const videoBase  = document.getElementById('video-base');
  const videoOurs  = document.getElementById('video-ours');

  const overlayStep2 = document.getElementById('overlay-step2');
  const overlayStep2Text = document.getElementById('overlay-step2-text');
  const overlayBase  = document.getElementById('overlay-base');
  const overlayOurs  = document.getElementById('overlay-ours');

  const statusStep2 = document.getElementById('status-step2');
  const statusFinal = document.getElementById('status-final');

  const deltaCard = document.getElementById('delta-card');
  const resetBtn  = document.getElementById('demo-reset');

  const STEP2_RATE = 2.5;

  const setStatus = (el, text, state) => {
    el.textContent = text;
    if (state) el.setAttribute('data-state', state);
    else el.removeAttribute('data-state');
  };
  const hide = el => el.classList.add('is-hidden');
  const show = el => el.classList.remove('is-hidden');
  const setActive = (stage, on) => stage.classList.toggle('is-active', on);
  const setDone   = (stage, on) => stage.classList.toggle('is-done', on);

  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; };

  const reset = () => {
    clearAll();
    [videoStep2, videoBase, videoOurs].forEach(v => {
      try { v.pause(); v.currentTime = 0; } catch (_) {}
    });
    [overlayStep2, overlayBase, overlayOurs].forEach(show);
    overlayStep2Text.textContent = 'Encoding input…';
    deltaCard.classList.remove('is-ready');

    setActive(stageInput, true);
    setActive(stageStep2, false);
    setActive(stageFinal, false);
    setDone(stageStep2, false);
    setDone(stageFinal, false);
    setStatus(statusStep2, 'waiting', null);
    setStatus(statusFinal, 'waiting', null);
  };

  const play = () => {
    // t=600ms: step 2 begins loading
    at(600, () => {
      setActive(stageStep2, true);
      setStatus(statusStep2, 'running', 'running');
    });

    // rolling overlay text
    const phases = ['Encoding input…', 'Denoising 1/2…', 'Denoising 2/2…', 'Extracting Δphys…'];
    phases.forEach((t, i) => {
      at(600 + i * 350, () => { overlayStep2Text.textContent = t; });
    });

    // t=2000ms: step2 video plays fast
    at(2000, () => {
      hide(overlayStep2);
      videoStep2.playbackRate = STEP2_RATE;
      videoStep2.play().catch(() => {});
    });

    // t=2600ms: Δphys appears
    at(2600, () => {
      deltaCard.classList.add('is-ready');
      setStatus(statusStep2, 'step 2 ✓', 'done');
      setDone(stageStep2, true);
    });

    // t=3600ms: final stage starts loading
    at(3600, () => {
      setActive(stageFinal, true);
      setStatus(statusFinal, 'running', 'running');
    });

    // t=5000ms: baseline + ours play (natural speed)
    at(5000, () => {
      hide(overlayBase);
      hide(overlayOurs);
      videoBase.play().catch(() => {});
      videoOurs.play().catch(() => {});
      setStatus(statusFinal, '50 steps ✓', 'done');
      setDone(stageFinal, true);
    });
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', () => { reset(); play(); });
  }

  // Start when the demo enters the viewport (or immediately if already visible)
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
