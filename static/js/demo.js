(() => {
  const demo = document.getElementById('demo');
  if (!demo) return;

  const runBtn   = document.getElementById('demo-run');
  const applyBtn = document.getElementById('demo-apply');
  const resetBtn = document.getElementById('demo-reset');

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
  const reinject  = document.getElementById('demo-reinject');

  const setStatus = (el, text, state) => {
    el.textContent = text;
    if (state) el.setAttribute('data-state', state); else el.removeAttribute('data-state');
  };

  const hide = el => el.classList.add('is-hidden');
  const show = el => el.classList.remove('is-hidden');

  const playSafely = v => { v.currentTime = 0; v.play().catch(() => {}); };

  const setStageActive = (stage, active) => {
    stage.classList.toggle('is-active', active);
  };

  const resetAll = () => {
    [videoStep2, videoBase, videoOurs].forEach(v => { v.pause(); v.currentTime = 0; });
    [overlayStep2, overlayBase, overlayOurs].forEach(show);
    overlayStep2Text.textContent = 'Running 2-step inference…';

    deltaCard.classList.remove('is-ready');
    reinject.classList.remove('is-ready');

    setStageActive(stageInput, true);
    setStageActive(stageStep2, false);
    setStageActive(stageFinal, false);
    stageStep2.classList.remove('is-done');
    stageFinal.classList.remove('is-done');

    setStatus(statusStep2, 'waiting', null);
    setStatus(statusFinal, 'waiting', null);

    runBtn.disabled = false;
    applyBtn.disabled = true;
  };

  const runStep2 = () => {
    runBtn.disabled = true;
    setStageActive(stageStep2, true);
    setStatus(statusStep2, 'running', 'running');

    // fake "progress" text
    const phases = ['Encoding input…', 'Denoising step 1/2…', 'Denoising step 2/2…', 'Extracting Δphys…'];
    let idx = 0;
    overlayStep2Text.textContent = phases[idx];
    const tick = setInterval(() => {
      idx = Math.min(idx + 1, phases.length - 1);
      overlayStep2Text.textContent = phases[idx];
    }, 450);

    setTimeout(() => {
      clearInterval(tick);
      hide(overlayStep2);
      playSafely(videoStep2);
      deltaCard.classList.add('is-ready');
      setStatus(statusStep2, 'step 2 ✓', 'done');
      stageStep2.classList.add('is-done');
      applyBtn.disabled = false;

      // scroll hint
      stageStep2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 2000);
  };

  const runFinal = () => {
    applyBtn.disabled = true;
    setStageActive(stageFinal, true);
    setStatus(statusFinal, 'running', 'running');
    reinject.classList.add('is-ready');

    setTimeout(() => {
      hide(overlayBase);
      hide(overlayOurs);
      playSafely(videoBase);
      playSafely(videoOurs);
      setStatus(statusFinal, '50 steps ✓', 'done');
      stageFinal.classList.add('is-done');
      stageFinal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 2600);
  };

  runBtn.addEventListener('click', runStep2);
  applyBtn.addEventListener('click', runFinal);
  resetBtn.addEventListener('click', resetAll);

  // initialize
  resetAll();
})();
