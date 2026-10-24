/**
 * HUISWEEPER - Core Game Logic & Audio & Animations
 * Spider-Man Web Theme + Desi Sweet Shop Meme Edition
 */

(()=>{
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Game Configurations & State
  // -------------------------------------------------------------------------
  const levels = {
    beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
    intermediate: { rows: 12, cols: 12, mines: 22, label: 'Medium' },
    expert: { rows: 14, cols: 18, mines: 45, label: 'Expert' }
  };

  const quotes = [
    "With great ghewar comes great responsibility.",
    "Friendly Neighborhood Halwai: 100% pure desi ghee web-fluid.",
    "Peter Parkour's Rule: That same Soan Papdi box was regifted 14 times since Diwali 2017.",
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
  let isMuted = localStorage.getItem('huisweeper_muted') === 'true';

  // DOM Elements
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

  // Modals
  const victoryModal = document.getElementById('victory-modal');
  const defeatModal = document.getElementById('defeat-modal');
  const loreModal = document.getElementById('lore-modal');
  const domainModal = document.getElementById('domain-modal');
  const domainBtn = document.getElementById('domain-btn');
  const closeDomainBtn = document.getElementById('close-domain-btn');

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
        // High crisp "thwip" pop
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
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
        // Web shooter zip sound
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

        // Sub bass thump
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

        // Noise crumble burst
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
          [261.63, 329.63, 392.00], // C4
          [293.66, 349.23, 440.00], // Dm
          [329.63, 392.00, 493.88], // Em
          [523.25, 659.25, 783.99, 1046.50] // C5 triumph
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

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // 3. Count-to-Layout Mapping for Ghewar Pips (Dice Patterns)
  // Maximized sweet sizes: Count 1 fills 95% of the square tile cell,
  // and multi-sweet counts fit the square grid to the absolute maximum.
  // -------------------------------------------------------------------------
  const GHEWAR_LAYOUTS = {
    // 1: Maximum size single Ghewar filling 95% of the square grid perfectly
    1: {
      size: 95,
      pips: [
        [50, 50]
      ]
    },
    // 2: Two large sweets (50% each) spanning edge-to-edge along diagonal
    2: {
      size: 50,
      pips: [
        [27, 27],
        [73, 73]
      ]
    },
    // 3: Three large sweets (36% each) spanning the entire diagonal
    3: {
      size: 36,
      pips: [
        [20, 20],
        [50, 50],
        [80, 80]
      ]
    },
    // 4: Four large sweets (46% each) filling the 2x2 square grid edge-to-edge
    4: {
      size: 46,
      pips: [
        [26, 26], [74, 26],
        [26, 74], [74, 74]
      ]
    },
    // 5: Five large sweets (36% each) filling the square grid with center sweet
    5: {
      size: 36,
      pips: [
        [23, 23], [77, 23],
        [50, 50],
        [23, 77], [77, 77]
      ]
    },
    // 6: Six large sweets (31% each) in 2 columns filling the grid height
    6: {
      size: 31,
      pips: [
        [31, 18], [69, 18],
        [31, 50], [69, 50],
        [31, 82], [69, 82]
      ]
    },
    // 7: Seven sweets (29% each) spanning edge-to-edge
    7: {
      size: 29,
      pips: [
        [20, 20], [80, 20],
        [20, 50], [50, 50], [80, 50],
        [20, 80], [80, 80]
      ]
    },
    // 8: Eight sweets (29% each) in a full 3x3 perimeter frame
    8: {
      size: 29,
      pips: [
        [18, 18], [50, 18], [82, 18],
        [18, 50],          [82, 50],
        [18, 82], [50, 82], [82, 82]
      ]
    }
  };

  /**
   * Deterministic slight rotation for natural appearance (-8° to +8°)
   */
  function getDeterministicRotation(cellIndex, pipIndex) {
    return (((cellIndex * 13 + pipIndex * 29) % 17) - 8);
  }

  /**
   * Generates multiple photorealistic Ghewar images arranged in fixed dice-pip patterns.
   * Removes all numerals so the player counts the sweets to read the adjacent hazard count.
   */
  function createGhewarElement(count, cellIndex = 0) {
    const layout = GHEWAR_LAYOUTS[count];
    if (!layout || !layout.pips || layout.pips.length === 0) return '';

    const { size, pips } = layout;
    const pipsHtml = pips.map(([x, y], idx) => {
      const rot = getDeterministicRotation(cellIndex, idx);
      const delay = idx * 14; // Quick stagger under 110ms total
      return `<img class="ghewar-pip" src="./assets/ghewar.png" alt="" loading="eager" draggable="false" style="left: ${x}%; top: ${y}%; width: ${size}%; height: ${size}%; --pip-rot: ${rot}deg; animation-delay: ${delay}ms;">`;
    }).join('');

    return `<div class="ghewar-pips-container" role="presentation">${pipsHtml}</div>`;
  }

  /**
   * Generates a photorealistic flaky strata Soan Papdi cube hazard with
   * delicate fibrous layers, pistachio garnish, and clean hazard feedback.
   */
  function createSoanPapdiElement(isDetonated = false) {
    return `
      <div class="soan-container ${isDetonated ? 'detonated' : ''}">
        <img class="soan-art-img" src="./assets/soan_papdi.jpg" alt="Soan Papdi Sweet" loading="eager" draggable="false">
        ${isDetonated ? '<span class="hazard-indicator" aria-hidden="true"><svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></span>' : ''}
      </div>
    `;
  }

  /**
   * Generates a clean, modern Spider-Tracer Flag marker with subtle drop shadow.
   */
  function createSpiderFlagSVG() {
    return `
      <svg class="spider-flag-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Sleek Tether Pole -->
        <line x1="44" y1="88" x2="44" y2="24" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="44" cy="20" r="4.5" fill="#e2e8f0" stroke="#dc2626" stroke-width="1.5"/>
        <!-- Crimson Spider Flag Banner -->
        <path d="M 44,22 L 84,38 L 44,54 Z" fill="#dc2626"/>
        <!-- Spider Silhouette Accent -->
        <ellipse cx="58" cy="38" rx="3.5" ry="4.5" fill="#ffffff"/>
        <circle cx="63" cy="38" r="2.2" fill="#ffffff"/>
      </svg>
    `;
  }

  /**
   * Generates sleek Spider-Man Mask SVG for reset button with state: 'normal', 'scared', 'won', 'lost'.
   */
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
          <radialGradient id="faceGrad" cx="44%" cy="38%" r="58%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="70%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </radialGradient>
        </defs>
        <!-- Spidey Mask -->
        <circle cx="50" cy="50" r="44" fill="url(#faceGrad)"/>
        
        <!-- Elegant thin web lines on mask -->
        <path d="M 50,6 L 50,94 M 6,50 L 94,50" stroke="#0b1324" stroke-width="1.2" opacity="0.75"/>
        <path d="M 19,19 L 81,81 M 19,81 L 81,19" stroke="#0b1324" stroke-width="1.2" opacity="0.75"/>
        <path d="M 32,36 Q 50,31 68,36 Q 74,50 68,64 Q 50,69 32,64 Q 26,50 32,36 Z" fill="none" stroke="#0b1324" stroke-width="1.1" opacity="0.75"/>

        <!-- Eyes -->
        ${isXEyes ? `
          <path d="${eyePathLeft}" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
          <path d="${eyePathRight}" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        ` : `
          <!-- Black Rim -->
          <path d="${eyePathLeft}" fill="#0b1324" stroke="#0b1324" stroke-width="3"/>
          <path d="${eyePathRight}" fill="#0b1324" stroke="#0b1324" stroke-width="3"/>
          <!-- Inner Lens -->
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

    // Dynamic grid columns
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

      // Right-Click Handler for Desktop Flagging
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(c.i);
      });

      // Mobile Long-Press to Flag
      let pressTimer = null;
      el.addEventListener('touchstart', (e) => {
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

      // Spidey Face reacts to mouse down
      el.addEventListener('mousedown', () => {
        if (!ended && !c.open) updateSpideyFace('scared');
      });

      boardEl.append(el);
      c.el = el;
    }

    // Reset board & shell
    boardShell.className = 'board-shell';
    mineCounterEl.textContent = fmt(mines);
    timerCounterEl.textContent = fmt(0);
    updateSpideyFace('normal');
    statusMessageEl.innerHTML = `<strong>Spidey-Sense Ready!</strong> Click any tile to swing into action.`;
    dimensionsEl.textContent = `${rows} × ${cols}`;
  }

  // Safe first click placement
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

    // Chording feature: clicking an already open numbered cell
    if (c.open) {
      if (c.near > 0) chord(c.i);
      return;
    }

    if (!started) start(i);

    // Hit a Soan Papdi hazard!
    if (c.mine) {
      c.open = true;
      c.el.classList.add('open', 'mine-hit', 'sweet-mine');
      c.el.innerHTML = createSoanPapdiElement(true);
      c.el.setAttribute('aria-label', 'Soan papdi hazard');
      sound.explosion();
      finish(false, c.i);
      return;
    }

    // Safe reveal
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
      // 0 hazards nearby: smooth blank safe cell
      c.el.classList.add('blank-safe');
      c.el.innerHTML = '';
      c.el.setAttribute('aria-label', '0 adjacent soan papdi');
      if (isRoot) sound.cascade();

      // Flood fill neighbors
      for (const n of neighbors(c.i)) {
        openSafe(cells[n], false);
      }
    }
  }

  // Chording: If adjacent flags equal clue count, reveal remaining neighbors
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

      // Automatically flag all remaining mines
      for (const c of cells) {
        if (c.mine && !c.flag) {
          c.flag = true;
          c.el.classList.add('flag');
          c.el.innerHTML = createSpiderFlagSVG();
        }
      }
      mineCounterEl.textContent = fmt(0);

      // Open victory celebration modal after slight delay
      setTimeout(() => {
        showVictoryModal();
      }, 600);
    } else {
      // Reveal all other soan papdi sweets on loss
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

      // Open defeat modal after slight delay
      setTimeout(() => {
        showDefeatModal(roast);
      }, 750);
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
  }

  function showDefeatModal(roastMessage) {
    document.getElementById('defeat-roast-text').textContent = roastMessage;
    document.getElementById('defeat-time').textContent = `${seconds}s`;
    document.getElementById('defeat-cleared').textContent = `${levels[currentLevel].rows * levels[currentLevel].cols - levels[currentLevel].mines - safeLeft}`;
    defeatModal.classList.add('open');
  }

  function closeAllModals() {
    victoryModal?.classList.remove('open');
    defeatModal?.classList.remove('open');
    loreModal?.classList.remove('open');
    domainModal?.classList.remove('open');
  }

  // -------------------------------------------------------------------------
  // 6. Background Particles & Skyline Ambience
  // -------------------------------------------------------------------------
  function initParticles() {
    const canvas = document.getElementById('web-particles');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1,
      isRed: Math.random() > 0.65
    }));

    function loop() {
      ctx.clearRect(0, 0, width, height);

      // Draw faint spiderweb connecting threads
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 210, 255, ${(1 - dist / 110) * 0.14})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw particles (blue and red motes)
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isRed ? 'rgba(230, 36, 41, 0.45)' : 'rgba(0, 210, 255, 0.45)';
        ctx.fill();
      }

      requestAnimationFrame(loop);
    }
    loop();
  }

  // -------------------------------------------------------------------------
  // 7. Humor Ticker Quotes
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
  // 8. Event Listeners & Controls
  // -------------------------------------------------------------------------
  // Reset Button ("Uncle Ben's Second Chance")
  resetFaceBtn.addEventListener('click', () => {
    sound.reveal(0.9);
    newGame();
  });

  resetFaceBtn.addEventListener('mouseup', () => {
    if (!ended) updateSpideyFace('normal');
  });

  // Global mouseup to reset Spidey face when letting go of click
  window.addEventListener('mouseup', () => {
    if (!ended && resetFaceBtn) {
      updateSpideyFace('normal');
    }
  });

  // Difficulty Selector
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLevel = btn.dataset.level;
      newGame();
    });
  });

  // Sound Toggle
  if (soundToggleBtn) {
    function updateSoundBtn() {
      const label = document.getElementById('sound-label');
      const iconWrap = document.getElementById('sound-icon-wrap');
      if (label) label.textContent = isMuted ? 'Muted' : 'Sound ON';
      if (iconWrap) {
        iconWrap.innerHTML = isMuted
          ? `<svg class="btn-svg-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>`
          : `<svg class="btn-svg-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"/>
            </svg>`;
      }
      soundToggleBtn.classList.toggle('active', !isMuted);
    }
    updateSoundBtn();
    soundToggleBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      localStorage.setItem('huisweeper_muted', isMuted);
      updateSoundBtn();
      if (!isMuted) sound.reveal(1.2);
    });
  }

  // Flag Mode Toggle (Touch / Mobile Friendly)
  if (flagModeBtn) {
    function updateFlagModeBtn() {
      flagModeBtn.classList.toggle('flag-active', isFlagMode);
      const iconSpan = document.getElementById('flag-mode-icon');
      const labelSpan = document.getElementById('flag-mode-label');
      if (labelSpan) labelSpan.textContent = isFlagMode ? 'Flag Mode' : 'Reveal Mode';
      if (iconSpan) {
        iconSpan.innerHTML = isFlagMode
          ? `<svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"/>
            </svg>`
          : `<svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
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

  // Modal Buttons
  document.getElementById('vict-restart-btn')?.addEventListener('click', newGame);
  document.getElementById('defeat-restart-btn')?.addEventListener('click', newGame);
  document.getElementById('lore-btn')?.addEventListener('click', () => loreModal?.classList.add('open'));
  document.getElementById('close-lore-btn')?.addEventListener('click', () => loreModal?.classList.remove('open'));
  domainBtn?.addEventListener('click', () => domainModal?.classList.add('open'));
  closeDomainBtn?.addEventListener('click', () => domainModal?.classList.remove('open'));

  // Close modals on backdrop click
  [victoryModal, defeatModal, loreModal, domainModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Responsive Board Adjustments
  window.addEventListener('resize', () => {
    if (cells.length > 0) {
      boardEl.style.gridTemplateColumns = `repeat(${levels[currentLevel].cols}, var(--cell-size))`;
    }
  });

  // -------------------------------------------------------------------------
  // 9. Startup Initialization
  // -------------------------------------------------------------------------
  initParticles();
  cycleQuotes();
  newGame();

})();
