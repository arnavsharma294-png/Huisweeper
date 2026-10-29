/**
 * HUISWEEPER - Core Game Logic & Audio & Animations
 * Spider-Man Web Theme + Desi Sweet Shop Meme Edition
 * (Preserves core engine: adjacency, safe start, reveal, flood-fill, flagging, timer)
 */

(()=>{
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Game Configurations & State
  // -------------------------------------------------------------------------
  const levels = {
    beginner: { rows: 9, cols: 9, mines: 10, label: 'Easy' },
    intermediate: { rows: 12, cols: 12, mines: 22, label: 'Medium' },
    expert: { rows: 14, cols: 18, mines: 45, label: 'Hard' }
  };

  const quotes = [
    "With great ghewar comes great responsibility.",
    "Friendly Neighborhood Halwai: 100% pure desi ghee web-fluid.",
    "Peter Parkour's Rule: That Soan Papdi was regifted 14 times since Diwali 2017.",
    "Uncle Ben's Second Chance: Every sweet tooth deserves redemption.",
    "Spidey-Sense tingling... smells like green cardamom, silver vark, and impending doom!",
    "Green Goblin's secret weapon: Dry, flaky, unswallowable Diwali sweets.",
    "Miles Morales says: Real heroes finish their Ghewar without spilling rabri.",
    "Diwali gifting paradox: The box of Soan Papdi you gift always finds its way back to you.",
    "Careful swinging! One misstep and you're buried under a mountain of flaky besan.",
    "Aunt May's secret recipe: Double saffron, zero explosive additives.",
    "Spidey spotted on a Queens fire escape savoring a golden Rajasthani Ghewar.",
    "Rooftop patrol intermission: Even Spider-Man can't resist crispy honeycomb Ghewar!"
  ];

  const defeatRoasts = [
    "SOAN PAPDI TRAP DETONATED! Your sweet tooth betrayed you. That box was manufactured during the first Spider-Man trilogy.",
    "CRUNCH! You bit right into the Diwali regifting cycle. Uncle Ben warned you about dry sweets!",
    "SPIDEY-SENSE OVERLOAD! Cardamom dust in your eyes. 100% pure besan and pure regret.",
    "DETONATION COMPLETE! That same box of soan papdi was regifted through 8 multiverse dimensions.",
    "SWEET TOOTH DISASTER! You survived Venom and Green Goblin only to be taken down by festive packaging."
  ];

  let currentLevel = 'beginner';
  let cells = [];
  let started = false;
  let ended = false;
  let seconds = 0;
  let timerInterval = null;
  let flagsCount = 0;
  let safeLeft = 0;
  let isFlagMode = false;

  // Audio is OFF by default per prompt specification
  let isMuted = localStorage.getItem('huisweeper_muted') === null 
    ? true 
    : (localStorage.getItem('huisweeper_muted') === 'true');

  // DOM Elements - Start Screen
  const startScreenEl = document.getElementById('start-screen');
  const startGameBtn = document.getElementById('start-game-btn');
  const startHowToBtn = document.getElementById('start-howto-btn');
  const startSoundToggleBtn = document.getElementById('start-sound-toggle');
  const startSoundIcon = document.getElementById('start-sound-icon');
  const startSoundLabel = document.getElementById('start-sound-label');
  const startDiffBtns = document.querySelectorAll('.start-diff-btn');

  // DOM Elements - Game Screen
  const boardEl = document.getElementById('board');
  const mineCounterEl = document.getElementById('mines');
  const timerCounterEl = document.getElementById('time');
  const resetFaceBtn = document.getElementById('reset');
  const statusMessageEl = document.getElementById('message');
  const dimensionsEl = document.getElementById('dimensions');
  const boardShell = document.querySelector('.board-shell');
  const quoteTextEl = document.getElementById('quote-text');
  const soundToggleBtn = document.getElementById('sound-toggle');
  const flagModeBtn = document.getElementById('flag-mode-toggle');
  const menuBtn = document.getElementById('menu-btn');

  // DOM Elements - Modals
  const victoryModal = document.getElementById('victory-modal');
  const defeatModal = document.getElementById('defeat-modal');
  const loreModal = document.getElementById('lore-modal');
  const domainModal = document.getElementById('domain-modal');
  const domainBtn = document.getElementById('domain-btn');
  const closeDomainBtn = document.getElementById('close-domain-btn');
  const closeLoreBtn = document.getElementById('close-lore-btn');
  const closeLoreCta = document.getElementById('close-lore-cta');
  const victMenuBtn = document.getElementById('vict-menu-btn');
  const defeatMenuBtn = document.getElementById('defeat-menu-btn');

  const fmt = n => String(Math.max(0, n)).padStart(3, '0');

  // -------------------------------------------------------------------------
  // 2. Web Audio API Synthesizer (Zero Dependencies)
  // -------------------------------------------------------------------------
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const sound = {
    reveal(pitchMod = 1) {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320 * pitchMod, now);
        osc.frequency.exponentialRampToValueAtTime(740 * pitchMod, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } catch (e) {}
    },

    cascade() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.04);
          gain.gain.setValueAtTime(0.12, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.15);
        });
      } catch (e) {}
    },

    flag(isAdding) {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const startFreq = isAdding ? 600 : 900;
        const endFreq = isAdding ? 1100 : 450;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.07);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) {}
    },

    explosion() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const boom = ctx.createOscillator();
        const boomGain = ctx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(130, now);
        boom.frequency.exponentialRampToValueAtTime(32, now + 0.45);
        boomGain.gain.setValueAtTime(0.65, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        boom.connect(boomGain);
        boomGain.connect(ctx.destination);
        boom.start(now);
        boom.stop(now + 0.5);

        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 0.38);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.42);
      } catch (e) {}
    },

    victory() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const chords = [
          [261.63, 329.63, 392.00],
          [293.66, 349.23, 440.00],
          [329.63, 392.00, 493.88],
          [523.25, 659.25, 783.99, 1046.50]
        ];
        chords.forEach((chord, step) => {
          const stepTime = now + step * 0.16;
          const dur = step === 3 ? 0.6 : 0.14;
          chord.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, stepTime);
            gain.gain.setValueAtTime(0.12, stepTime);
            gain.gain.exponentialRampToValueAtTime(0.001, stepTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(stepTime);
            osc.stop(stepTime + dur);
          });
        });
      } catch (e) {}
    }
  };

  // Sync sound button UI across Start Screen and HUD
  function syncAudioControls() {
    // Start Screen Sound Toggle
    if (startSoundToggleBtn) {
      startSoundToggleBtn.classList.toggle('sound-on', !isMuted);
      if (startSoundLabel) {
        startSoundLabel.textContent = isMuted ? 'Audio: OFF' : 'Audio: ON';
      }
      if (startSoundIcon) {
        startSoundIcon.innerHTML = isMuted
          ? `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>`
          : `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"/>
            </svg>`;
      }
    }

    // In-game HUD Sound Toggle
    if (soundToggleBtn) {
      soundToggleBtn.classList.toggle('active', !isMuted);
      const hudLabel = document.getElementById('sound-label');
      const hudIconWrap = document.getElementById('sound-icon-wrap');
      if (hudLabel) hudLabel.textContent = isMuted ? 'Muted' : 'Sound';
      if (hudIconWrap) {
        hudIconWrap.innerHTML = isMuted
          ? `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>`
          : `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"/>
            </svg>`;
      }
    }
  }

  function toggleAudio() {
    isMuted = !isMuted;
    localStorage.setItem('huisweeper_muted', isMuted);
    syncAudioControls();
    if (!isMuted) {
      getAudioContext();
      sound.reveal(1.2);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Count-to-Layout Mapping for Ghewar Pips (Dice Patterns)
  // -------------------------------------------------------------------------
  const GHEWAR_LAYOUTS = {
    1: { size: 95, pips: [[50, 50]] },
    2: { size: 50, pips: [[27, 27], [73, 73]] },
    3: { size: 36, pips: [[20, 20], [50, 50], [80, 80]] },
    4: { size: 46, pips: [[26, 26], [74, 26], [26, 74], [74, 74]] },
    5: { size: 36, pips: [[23, 23], [77, 23], [50, 50], [23, 77], [77, 77]] },
    6: { size: 31, pips: [[31, 18], [69, 18], [31, 50], [69, 50], [31, 82], [69, 82]] },
    7: { size: 29, pips: [[20, 20], [80, 20], [20, 50], [50, 50], [80, 50], [20, 80], [80, 80]] },
    8: { size: 29, pips: [[18, 18], [50, 18], [82, 18], [18, 50], [82, 50], [18, 82], [50, 82], [82, 82]] }
  };

  function getDeterministicRotation(cellIndex, pipIndex) {
    return (((cellIndex * 13 + pipIndex * 29) % 17) - 8);
  }

  function createGhewarElement(count, cellIndex = 0) {
    const layout = GHEWAR_LAYOUTS[count];
    if (!layout || !layout.pips || layout.pips.length === 0) return '';

    const { size, pips } = layout;
    const pipsHtml = pips.map(([x, y], idx) => {
      const rot = getDeterministicRotation(cellIndex, idx);
      const delay = idx * 14;
      return `<img class="ghewar-pip" src="./assets/ghewar.png" alt="" loading="eager" draggable="false" style="left: ${x}%; top: ${y}%; width: ${size}%; height: ${size}%; --pip-rot: ${rot}deg; animation-delay: ${delay}ms;">`;
    }).join('');

    return `<div class="ghewar-pips-container" role="presentation">${pipsHtml}</div>`;
  }

  function createSoanPapdiElement(isDetonated = false) {
    return `
      <div class="soan-container ${isDetonated ? 'detonated' : ''}">
        <img class="soan-art-img" src="./assets/soan_papdi.jpg" alt="Soan Papdi Sweet" loading="eager" draggable="false">
        ${isDetonated ? '<span class="hazard-indicator" aria-hidden="true"><svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></span>' : ''}
      </div>
    `;
  }

  function createSpiderFlagSVG() {
    return `
      <svg class="spider-flag-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <line x1="44" y1="88" x2="44" y2="24" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="44" cy="20" r="4.5" fill="#e2e8f0" stroke="#e11d48" stroke-width="1.8"/>
        <path d="M 44,22 L 86,38 L 44,54 Z" fill="#e11d48"/>
        <ellipse cx="58" cy="38" rx="3.5" ry="4.5" fill="#ffffff"/>
        <circle cx="63" cy="38" r="2.2" fill="#ffffff"/>
      </svg>
    `;
  }

  function updateSpideyFace(state = 'normal') {
    let eyePathLeft = 'M 24,42 Q 36,36 44,48 Q 36,58 24,42 Z';
    let eyePathRight = 'M 76,42 Q 64,36 56,48 Q 64,58 76,42 Z';
    let eyeFill = '#ffffff';

    if (state === 'scared') {
      eyePathLeft = 'M 26,45 Q 36,41 43,47 Q 36,52 26,45 Z';
      eyePathRight = 'M 74,45 Q 64,41 57,47 Q 64,52 74,45 Z';
    } else if (state === 'won') {
      eyeFill = '#facc15';
      eyePathLeft = 'M 24,46 Q 34,32 44,44 Q 34,40 24,46 Z';
      eyePathRight = 'M 76,46 Q 66,32 56,44 Q 66,40 76,46 Z';
    } else if (state === 'lost') {
      eyeFill = '#f87171';
      eyePathLeft = 'M 28,40 L 40,52 M 40,40 L 28,52';
      eyePathRight = 'M 60,40 L 72,52 M 72,40 L 60,52';
    }

    const isXEyes = state === 'lost';

    resetFaceBtn.innerHTML = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="44" fill="url(#faceGrad)"/>
        <path d="M 50,6 L 50,94 M 6,50 L 94,50" stroke="#050811" stroke-width="1.3" opacity="0.8"/>
        <path d="M 19,19 L 81,81 M 19,81 L 81,19" stroke="#050811" stroke-width="1.3" opacity="0.8"/>
        <path d="M 32,36 Q 50,31 68,36 Q 74,50 68,64 Q 50,69 32,64 Q 26,50 32,36 Z" fill="none" stroke="#050811" stroke-width="1.2" opacity="0.8"/>

        ${isXEyes ? `
          <path d="${eyePathLeft}" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
          <path d="${eyePathRight}" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        ` : `
          <path d="${eyePathLeft}" fill="#050811" stroke="#050811" stroke-width="3"/>
          <path d="${eyePathRight}" fill="#050811" stroke="#050811" stroke-width="3"/>
          <path d="${eyePathLeft}" fill="${eyeFill}"/>
          <path d="${eyePathRight}" fill="${eyeFill}"/>
        `}
      </svg>
    `;
  }

  // -------------------------------------------------------------------------
  // 4. Core Minesweeper Engine
  // -------------------------------------------------------------------------
  function neighbors(i) {
    const { rows, cols } = levels[currentLevel];
    const r = Math.floor(i / cols);
    const c = i % cols;
    const out = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          out.push(nr * cols + nc);
        }
      }
    }
    return out;
  }

  function newGame() {
    clearInterval(timerInterval);
    timerInterval = null;
    seconds = 0;
    started = false;
    ended = false;
    flagsCount = 0;

    closeAllModals();

    const { rows, cols, mines } = levels[currentLevel];
    safeLeft = rows * cols - mines;

    cells = Array.from({ length: rows * cols }, (_, i) => ({
      i,
      mine: false,
      near: 0,
      open: false,
      flag: false,
      el: null
    }));

    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    boardEl.replaceChildren();

    for (const c of cells) {
      const el = document.createElement('button');
      el.className = 'cell';
      el.setAttribute('role', 'gridcell');
      el.setAttribute('aria-label', `Covered tile ${c.i + 1}`);
      el.dataset.i = c.i;

      // Click / Tap Handler
      el.addEventListener('click', (e) => {
        if (isFlagMode) {
          toggleFlag(c.i);
        } else {
          reveal(c.i);
        }
      });

      // Right-Click for desktop flagging
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(c.i);
      });

      // Touch Long-Press for mobile flagging
      let pressTimer = null;
      el.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
          toggleFlag(c.i);
          if (navigator.vibrate) navigator.vibrate(40);
        }, 360);
      }, { passive: true });

      el.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
      });

      el.addEventListener('touchmove', () => {
        clearTimeout(pressTimer);
      });

      // Face reacts on mousedown
      el.addEventListener('mousedown', () => {
        if (!ended && !c.open) updateSpideyFace('scared');
      });

      boardEl.append(el);
      c.el = el;
    }

    boardShell.className = 'board-shell';
    mineCounterEl.textContent = fmt(mines);
    timerCounterEl.textContent = fmt(0);
    updateSpideyFace('normal');
    statusMessageEl.innerHTML = `<strong>Spidey-Sense Ready!</strong> Pick any tile to begin.`;
    dimensionsEl.textContent = `${rows} × ${cols}`;
  }

  function start(firstIndex) {
    const total = levels[currentLevel].mines;
    const forbidden = new Set([firstIndex, ...neighbors(firstIndex)]);

    let pool = cells.map(c => c.i).filter(i => !forbidden.has(i));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (const i of pool.slice(0, total)) {
      cells[i].mine = true;
    }

    for (const c of cells) {
      if (!c.mine) {
        c.near = neighbors(c.i).filter(idx => cells[idx].mine).length;
      }
    }

    started = true;
    timerInterval = setInterval(() => {
      if (seconds < 999) {
        seconds++;
        timerCounterEl.textContent = fmt(seconds);
      }
    }, 1000);
  }

  function reveal(i) {
    const c = cells[i];
    if (ended || c.flag) return;

    if (c.open) {
      if (c.near > 0) chord(c.i);
      return;
    }

    if (!started) start(i);

    // Hit a Soan Papdi hazard
    if (c.mine) {
      c.open = true;
      c.el.classList.add('open', 'mine-hit', 'sweet-mine');
      c.el.innerHTML = createSoanPapdiElement(true);
      c.el.setAttribute('aria-label', 'Soan papdi hazard exploded');
      sound.explosion();
      finish(false, c.i);
      return;
    }

    openSafe(c, true);

    if (safeLeft === 0) {
      finish(true);
    }
  }

  function openSafe(c, isRoot = false) {
    if (c.open || c.flag || c.mine) return;

    c.open = true;
    safeLeft--;
    c.el.classList.add('open');

    if (c.near > 0) {
      c.el.classList.add('ghewar-clue', `n${c.near}`);
      c.el.dataset.count = c.near;
      c.el.innerHTML = createGhewarElement(c.near, c.i);
      c.el.setAttribute('aria-label', `${c.near} adjacent soan papdi`);
      if (isRoot) sound.reveal(1 + (c.near * 0.08));
    } else {
      c.el.classList.add('blank-safe');
      c.el.innerHTML = '';
      c.el.setAttribute('aria-label', '0 adjacent soan papdi');
      if (isRoot) sound.cascade();

      for (const n of neighbors(c.i)) {
        openSafe(cells[n], false);
      }
    }
  }

  function chord(i) {
    const c = cells[i];
    if (!c.open || c.near === 0) return;

    const nList = neighbors(c.i);
    const flagCount = nList.filter(idx => cells[idx].flag).length;

    if (flagCount === c.near) {
      let triggeredHazard = false;
      for (const idx of nList) {
        const neighborCell = cells[idx];
        if (!neighborCell.flag && !neighborCell.open) {
          if (neighborCell.mine) {
            neighborCell.open = true;
            neighborCell.el.classList.add('open', 'mine-hit', 'sweet-mine');
            neighborCell.el.innerHTML = createSoanPapdiElement(true);
            sound.explosion();
            finish(false, neighborCell.i);
            triggeredHazard = true;
            break;
          } else {
            openSafe(neighborCell, false);
          }
        }
      }
      if (!triggeredHazard) {
        sound.reveal(1.2);
        if (safeLeft === 0) finish(true);
      }
    }
  }

  function toggleFlag(i) {
    const c = cells[i];
    if (ended || c.open) return;

    const cap = levels[currentLevel].mines;

    if (!c.flag && flagsCount >= cap) {
      statusMessageEl.innerHTML = `<strong>Flag limit reached!</strong> You can't mark more than ${cap} hazards.`;
      return;
    }

    c.flag = !c.flag;
    flagsCount += c.flag ? 1 : -1;

    c.el.classList.toggle('flag', c.flag);
    c.el.innerHTML = c.flag ? createSpiderFlagSVG() : '';
    c.el.setAttribute('aria-label', c.flag ? 'Flagged hazard' : `Covered tile ${c.i + 1}`);

    sound.flag(c.flag);
    mineCounterEl.textContent = fmt(cap - flagsCount);
  }

  function finish(won, detonatedIndex = -1) {
    ended = true;
    clearInterval(timerInterval);
    timerInterval = null;

    boardShell.classList.add(won ? 'win' : 'lose');
    updateSpideyFace(won ? 'won' : 'lost');

    if (won) {
      sound.victory();
      statusMessageEl.innerHTML = `<strong>VICTORY!</strong> With great ghewar comes great responsibility!`;

      for (const c of cells) {
        if (c.mine && !c.flag) {
          c.flag = true;
          c.el.classList.add('flag');
          c.el.innerHTML = createSpiderFlagSVG();
        }
      }
      mineCounterEl.textContent = fmt(0);

      setTimeout(() => {
        showVictoryModal();
      }, 550);
    } else {
      for (const c of cells) {
        if (c.mine && !c.open) {
          c.open = true;
          c.el.classList.add('open', 'sweet-mine');
          c.el.innerHTML = createSoanPapdiElement(c.i === detonatedIndex);
          c.el.setAttribute('aria-label', 'Soan papdi hazard');
        }
      }

      const roast = defeatRoasts[Math.floor(Math.random() * defeatRoasts.length)];
      statusMessageEl.innerHTML = `<strong>SOAN PAPDI TRAP!</strong> Your sweet tooth betrayed you.`;

      setTimeout(() => {
        showDefeatModal(roast);
      }, 700);
    }
  }

  // -------------------------------------------------------------------------
  // 5. Modals Management
  // -------------------------------------------------------------------------
  function showVictoryModal() {
    document.getElementById('vict-time').textContent = `${seconds}s`;
    document.getElementById('vict-level').textContent = levels[currentLevel].label;
    document.getElementById('vict-sweets').textContent = `${levels[currentLevel].mines}`;
    victoryModal.classList.add('open');
    document.getElementById('vict-restart-btn')?.focus();
  }

  function showDefeatModal(roastMessage) {
    document.getElementById('defeat-roast-text').textContent = roastMessage;
    document.getElementById('defeat-time').textContent = `${seconds}s`;
    document.getElementById('defeat-cleared').textContent = `${levels[currentLevel].rows * levels[currentLevel].cols - levels[currentLevel].mines - safeLeft}`;
    defeatModal.classList.add('open');
    document.getElementById('defeat-restart-btn')?.focus();
  }

  function closeAllModals() {
    victoryModal?.classList.remove('open');
    defeatModal?.classList.remove('open');
    loreModal?.classList.remove('open');
    domainModal?.classList.remove('open');
  }

  // -------------------------------------------------------------------------
  // 6. Humor Ticker Quotes
  // -------------------------------------------------------------------------
  let quoteIndex = 0;
  function cycleQuotes() {
    setInterval(() => {
      if (!quoteTextEl) return;
      quoteTextEl.style.opacity = '0';
      setTimeout(() => {
        quoteIndex = (quoteIndex + 1) % quotes.length;
        quoteTextEl.textContent = quotes[quoteIndex];
        quoteTextEl.style.opacity = '1';
      }, 300);
    }, 6500);
  }

  // -------------------------------------------------------------------------
  // 7. Start Screen Entrance & Skip Logic
  // -------------------------------------------------------------------------
  function skipEntrance() {
    if (startScreenEl) {
      startScreenEl.classList.add('anim-skip');
    }
  }

  startScreenEl?.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      skipEntrance();
    }
  });

  window.addEventListener('keydown', (e) => {
    // If Escape key pressed, close any open modal
    if (e.key === 'Escape') {
      closeAllModals();
      return;
    }
    // Any other key skips start screen animation if currently on start screen
    if (startScreenEl && !startScreenEl.classList.contains('hidden')) {
      skipEntrance();
    }
  });

  // Automatically mark entrance done after duration
  setTimeout(skipEntrance, 900);

  // -------------------------------------------------------------------------
  // 8. Event Listeners & Controls
  // -------------------------------------------------------------------------
  // Start Screen: Difficulty Selector
  startDiffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      startDiffBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      currentLevel = btn.dataset.level;
    });
  });

  // Start Screen: Primary "Start Game" Button
  startGameBtn?.addEventListener('click', () => {
    startScreenEl?.classList.add('hidden');
    newGame();
    if (!isMuted) {
      getAudioContext();
      sound.reveal(1);
    }
  });

  // Start Screen: Secondary "How to Play" Button
  startHowToBtn?.addEventListener('click', () => {
    loreModal?.classList.add('open');
    closeLoreBtn?.focus();
  });

  // Start Screen: Sound Toggle Button
  startSoundToggleBtn?.addEventListener('click', () => {
    toggleAudio();
  });

  // HUD: Menu Button (Returns to Start Screen)
  menuBtn?.addEventListener('click', () => {
    // Sync current level back to start screen buttons
    startDiffBtns.forEach(b => {
      const isMatch = b.dataset.level === currentLevel;
      b.classList.toggle('active', isMatch);
      b.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });
    startScreenEl?.classList.remove('hidden');
  });

  // Reset Button ("Uncle Ben's Second Chance")
  resetFaceBtn?.addEventListener('click', () => {
    sound.reveal(0.9);
    newGame();
  });

  resetFaceBtn?.addEventListener('mouseup', () => {
    if (!ended) updateSpideyFace('normal');
  });

  window.addEventListener('mouseup', () => {
    if (!ended && resetFaceBtn) {
      updateSpideyFace('normal');
    }
  });

  // HUD: Sound Toggle Button
  soundToggleBtn?.addEventListener('click', () => {
    toggleAudio();
  });

  // Flag Mode Toggle for Mobile
  if (flagModeBtn) {
    function updateFlagModeBtn() {
      flagModeBtn.classList.toggle('flag-active', isFlagMode);
      const iconSpan = document.getElementById('flag-mode-icon');
      const labelSpan = document.getElementById('flag-mode-label');
      if (labelSpan) labelSpan.textContent = isFlagMode ? 'Flag' : 'Reveal';
      if (iconSpan) {
        iconSpan.innerHTML = isFlagMode
          ? `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"/>
            </svg>`
          : `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a4.004 4.004 0 00-2.316 2.316l-.966-.259a1 1 0 00-.518 1.932l.966.259a4.004 4.004 0 002.316 2.316l-.259.966a1 1 0 101.932.518l.259-.966a4.004 4.004 0 002.316-2.316l.966.259a1 1 0 00.518-1.932l-.966-.259a4.004 4.004 0 00-2.316-2.316l.259-.966z" clip-rule="evenodd"/>
            </svg>`;
      }
    }
    flagModeBtn.addEventListener('click', () => {
      isFlagMode = !isFlagMode;
      updateFlagModeBtn();
      sound.reveal(isFlagMode ? 1.3 : 0.9);
    });
  }

  // Modals & Navigation
  document.getElementById('vict-restart-btn')?.addEventListener('click', newGame);
  document.getElementById('defeat-restart-btn')?.addEventListener('click', newGame);

  victMenuBtn?.addEventListener('click', () => {
    closeAllModals();
    startScreenEl?.classList.remove('hidden');
  });

  defeatMenuBtn?.addEventListener('click', () => {
    closeAllModals();
    startScreenEl?.classList.remove('hidden');
  });

  document.getElementById('lore-btn')?.addEventListener('click', () => {
    loreModal?.classList.add('open');
    closeLoreBtn?.focus();
  });

  closeLoreBtn?.addEventListener('click', () => loreModal?.classList.remove('open'));
  closeLoreCta?.addEventListener('click', () => loreModal?.classList.remove('open'));

  domainBtn?.addEventListener('click', () => domainModal?.classList.add('open'));
  closeDomainBtn?.addEventListener('click', () => domainModal?.classList.remove('open'));

  // Close modals on backdrop click
  [victoryModal, defeatModal, loreModal, domainModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Window resize grid columns recalculation
  window.addEventListener('resize', () => {
    if (cells.length > 0) {
      boardEl.style.gridTemplateColumns = `repeat(${levels[currentLevel].cols}, var(--cell-size))`;
    }
  });

  // -------------------------------------------------------------------------
  // 9. Startup Initialization
  // -------------------------------------------------------------------------
  syncAudioControls();
  cycleQuotes();
  newGame(); // Builds board underneath while start screen is active

})();
