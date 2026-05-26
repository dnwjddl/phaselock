(() => {
  const root = document.getElementById('sim');
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const els = {
    phaseTag:     $('sim-phase-tag'),
    stepText:     $('slow-step-text'),
    slowProgress: $('slow-progress'),
    outputLabel:  $('output-label'),
    fastStep1:    $('fast-step-1'),
    fastStep2:    $('fast-step-2'),
    motionPrior:  $('motion-prior'),
    injectArrow:  $('inject-arrow'),
    injectLabel:  $('inject-label'),
    phaseBaseBar: $('phase-base-bar'),
    phaseBaseVal: $('phase-base-val'),
    phaseOursBar: $('phase-ours-bar'),
    phaseOursVal: $('phase-ours-val'),
    progress:     $('sim-progress'),
    progressFill: $('sim-progress-fill'),
    replay:       $('sim-replay'),
  };

  const MAX = 50;
  const SLOW_BAR_W = 418;  // matches SVG rect width

  // ──────────────── Timeline (step 1 & 2 get held; 3→50 sweep smoothly)
  // Keyframes: [elapsedMs, step]
  const TIMELINE = [
    [0,    0],
    [500,  1],       // glide to step 1 (0.5 s)
    [900,  1],       // brief emphasis on step 1 (0.4 s)
    [1500, 2],       // glide to step 2 (0.6 s)
    [2100, 2],       // brief emphasis on step 2 (0.6 s) — Δ_phys extracted
    [5200, 50],      // smooth sweep 2 → 50 (3.1 s)
    [6400, 50],      // hold finished state (1.2 s)
  ];
  const LOOP_GAP = 500;  // ms pause before looping
  const TOTAL = TIMELINE[TIMELINE.length - 1][0];

  const easeInOut = (x) => x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2) / 2;

  const stepAt = (t) => {
    if (t <= 0) return 0;
    if (t >= TOTAL) return TIMELINE[TIMELINE.length - 1][1];
    for (let i = 1; i < TIMELINE.length; i++) {
      const [t0, s0] = TIMELINE[i - 1];
      const [t1, s1] = TIMELINE[i];
      if (t <= t1) {
        if (s0 === s1) return s0;
        const local = (t - t0) / (t1 - t0);
        return s0 + (s1 - s0) * easeInOut(local);
      }
    }
    return 0;
  };

  // Phase curves (illustrative; matches ~18% baseline drop from paper)
  const baselinePhase = (s) => 100 - 18 * (s / MAX);
  const oursPhase = (s) => s < 2 ? 100 - 0.5 * s : 96 - 2 * ((s - 2) / 48);

  const setPhaseTag = (text, cls) => {
    els.phaseTag.textContent = text;
    els.phaseTag.className = 'sim-phase-tag' + (cls ? ' ' + cls : '');
  };

  const render = (s) => {
    const sInt = Math.round(s);

    // Fast path activation
    els.fastStep1.classList.toggle('active', s >= 0.6);
    els.fastStep2.classList.toggle('active', s >= 1.6);

    // Focus pulse when holding on step 1 or 2
    const holdingOn1 = s >= 0.95 && s <= 1.05;
    const holdingOn2 = s >= 1.95 && s <= 2.05;
    els.fastStep1.classList.toggle('focus', holdingOn1);
    els.fastStep2.classList.toggle('focus', holdingOn2);

    // Motion prior state
    if (s < 1.6) {
      els.motionPrior.classList.add('dim');
      els.motionPrior.classList.remove('ready');
    } else {
      els.motionPrior.classList.remove('dim');
      els.motionPrior.classList.toggle('ready', s >= 2);
    }

    // Injection arrow
    const injecting = s >= 2;
    els.injectArrow.style.opacity = injecting ? '1' : '0';
    els.injectArrow.classList.toggle('flowing', injecting && s < MAX);
    els.injectLabel.style.opacity = injecting ? '1' : '0';

    // 50-step bar
    const frac = s / MAX;
    els.slowProgress.setAttribute('width', (SLOW_BAR_W * frac).toFixed(1));
    els.stepText.textContent = `t = ${sInt} / 50`;

    // Output label
    if (s === 0) {
      els.outputLabel.textContent = 'waiting…';
      els.outputLabel.setAttribute('fill', '#94a3b8');
    } else if (s < MAX - 0.1) {
      els.outputLabel.textContent = 'generating…';
      els.outputLabel.setAttribute('fill', '#475569');
    } else {
      els.outputLabel.textContent = 'physics-consistent output ✓';
      els.outputLabel.setAttribute('fill', '#059669');
    }

    // Phase tag (pedagogical label — what the model is doing now)
    if (s < 0.5)             setPhaseTag('Input', '');
    else if (s < 1.6)        setPhaseTag('① Extract · few-step inference', 'extract');
    else if (s < 2.5)        setPhaseTag('② Lock · motion prior Δₚₕᵧₛ', 'lock');
    else if (s < MAX - 0.5)  setPhaseTag('③ Guide · Latent Δ Guidance', 'guide');
    else                     setPhaseTag('✓ Done · high-fidelity + physical', 'done');

    // Phase metrics
    const bp = baselinePhase(s);
    const op = oursPhase(s);
    els.phaseBaseBar.style.width = bp.toFixed(1) + '%';
    els.phaseBaseVal.textContent = bp.toFixed(0) + '%';
    els.phaseOursBar.style.width = op.toFixed(1) + '%';
    els.phaseOursVal.textContent = op.toFixed(0) + '%';
    els.phaseBaseVal.style.color = bp < 85 ? '#dc2626' : '';

    // Minimal progress line
    els.progressFill.style.width = (frac * 100).toFixed(2) + '%';
    els.progress.setAttribute('aria-valuenow', sInt);
  };

  // ──────────────── Playback
  let elapsed = 0;
  let playing = false;
  let lastTs = null;
  let rafId = null;
  let userScrubbing = false;

  const tick = (ts) => {
    if (!playing) return;
    if (lastTs === null) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;
    if (!userScrubbing) {
      elapsed += dt;
      if (elapsed >= TOTAL + LOOP_GAP) elapsed = 0;  // loop
      render(stepAt(elapsed > TOTAL ? TOTAL : elapsed));
    }
    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (playing) return;
    playing = true;
    lastTs = null;
    rafId = requestAnimationFrame(tick);
  };
  const stop = () => {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
  };

  // ──────────────── Always auto-playing. Never stops.
  start();

  // Initial state
  render(0);
})();
