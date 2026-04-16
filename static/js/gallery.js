(() => {
  const state = {
    data: null,
    active: 'phygenbench',
    loadedRemote: { phygenbench: false, 'physics-iq': false },
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const url = (p) => /^https?:/.test(p) ? p : p;

  // Encode only the filename segment so `[BASE]`/`[OURS]` remain valid URIs
  const safeSrc = (path) => {
    if (!path) return '';
    if (/^https?:/.test(path)) {
      const u = new URL(path);
      u.pathname = u.pathname.split('/').map(encodeURIComponent).join('/');
      return u.toString();
    }
    return path.split('/').map(encodeURIComponent).join('/');
  };

  const prompt = (text, max = 140) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  };

  const renderPair = (pair) => {
    const card = document.createElement('article');
    card.className = 'pair-card';
    const catTag = pair.category
      ? `<span class="pair-id">${pair.category}</span>`
      : '';
    card.innerHTML = `
      <div class="pair-videos">
        <div class="pair-video-wrap">
          <span class="label label-base">Base</span>
          <video src="${safeSrc(pair.base)}" muted loop playsinline preload="metadata"
                 onmouseenter="this.play()" onmouseleave="this.pause()"></video>
        </div>
        <div class="pair-video-wrap">
          <span class="label label-ours">Ours</span>
          <video src="${safeSrc(pair.ours)}" muted loop playsinline preload="metadata"
                 onmouseenter="this.play()" onmouseleave="this.pause()"></video>
        </div>
      </div>
      <div class="pair-meta">
        <span class="pair-id">${pair.model} · #${pair.id}</span>
        ${catTag}
        ${prompt(pair.prompt)}
      </div>
    `;
    return card;
  };

  const renderTab = (tabId) => {
    const bench = state.data[tabId];
    const host = $('#gallery-content');
    host.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    bench.highlights.forEach(p => grid.appendChild(renderPair(p)));

    if (state.loadedRemote[tabId]) {
      bench.remote.forEach(p => grid.appendChild(renderPair(p)));
    }
    host.appendChild(grid);

    // Update load-more button visibility & label
    const btn = $('#load-all');
    const remaining = bench.remote.length;
    if (state.loadedRemote[tabId] || remaining === 0) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
      btn.textContent = `Load remaining ${remaining} pair${remaining === 1 ? '' : 's'} from media gallery`;
    }
  };

  const setTab = (tabId) => {
    state.active = tabId;
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    renderTab(tabId);
  };

  const init = async () => {
    try {
      const res = await fetch('data/videos.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
    } catch (e) {
      $('#gallery-content').innerHTML =
        '<p class="placeholder">Unable to load gallery data. ' +
        'If viewing locally, run a simple HTTP server (e.g. <code>python3 -m http.server</code>) ' +
        'instead of opening the file directly.</p>';
      return;
    }

    $$('.tab').forEach(t => {
      t.addEventListener('click', () => setTab(t.dataset.tab));
    });

    $('#load-all').addEventListener('click', () => {
      state.loadedRemote[state.active] = true;
      renderTab(state.active);
    });

    const copyBtn = $('#copy-bib');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const text = $('.bibtex code').innerText;
        try {
          await navigator.clipboard.writeText(text);
          const orig = copyBtn.textContent;
          copyBtn.textContent = 'Copied ✓';
          setTimeout(() => { copyBtn.textContent = orig; }, 1600);
        } catch {
          copyBtn.textContent = 'Copy failed — select manually';
        }
      });
    }

    setTab('phygenbench');
  };

  document.addEventListener('DOMContentLoaded', init);
})();
