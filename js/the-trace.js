/**
 * THE TRACE · Experiential Learning Centre (ELC), TIET Patiala
 * Restrained editorial animation suite:
 * 1. Hero Harmonic Wave with Phase Drift & Interactive Pointer Lerp
 * 2. Vertical Spine / Mobile Progress Tracker
 * 3. Studio Waveform Glyphs (Sawtooth, Sine, PWM Square)
 * 4. Technical Blueprint Scrubbing with Engineering Callouts
 * 5. Semester Ascent Trajectory Curve with Tangent Rotation
 */

(function () {
  'use strict';

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // 1. HERO HARMONIC WAVE CANVAS
  // ---------------------------------------------------------------------------
  function initHeroWave() {
    const canvas = document.getElementById('heroWaveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let animId = null;
    let isVisible = true;

    // Harmonic parameters (fundamental ~1100px)
    const baseWavelength = 1100;
    const amplitudes = [48, 24, 16]; // n=1, n=2, n=3
    const speeds = [0.12, -0.18, 0.24]; // rad/s
    let phases = [0, 0, 0];

    // Frequency shift via pointer X (max 12%, lerped)
    let pointerXRatio = 0.5;
    let currentFreqMod = 1.0;
    let targetFreqMod = 1.0;

    // Scroll fade (harmonics fade 3 -> 2 -> 1, then amplitude goes to 0)
    let scrollFade = 1.0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.offsetWidth;
      height = canvas.parentElement.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    }

    function updateScrollFade() {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const heroHeight = rect.height;
      if (rect.bottom < 0) {
        scrollFade = 0;
      } else if (rect.top > 0) {
        scrollFade = 1;
      } else {
        // Scrolled partway
        const scrolled = -rect.top;
        const progress = Math.min(Math.max(scrolled / (heroHeight * 0.75), 0), 1);
        scrollFade = 1 - progress;
      }
    }

    let lastTime = performance.now();

    function render(currentTime) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Update phases
      if (!prefersReducedMotion) {
        phases[0] += speeds[0] * dt;
        phases[1] += speeds[1] * dt;
        phases[2] += speeds[2] * dt;
      }

      // Lerp frequency modulation
      currentFreqMod += (targetFreqMod - currentFreqMod) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const midY = height * 0.55;
      const k0 = (2 * Math.PI) / (baseWavelength * currentFreqMod);

      // Scroll fading per harmonic:
      // n=3 fades when scrollFade < 0.8
      // n=2 fades when scrollFade < 0.5
      // n=1 fades down to 0
      const amp3 = amplitudes[2] * Math.max(0, Math.min(1, (scrollFade - 0.4) / 0.4));
      const amp2 = amplitudes[1] * Math.max(0, Math.min(1, (scrollFade - 0.2) / 0.4));
      const amp1 = amplitudes[0] * Math.max(0, Math.min(1, scrollFade / 0.3));

      // Draw individual harmonics (1px navy lines at ~18% opacity)
      const step = 4;
      const nHarmonics = [
        { amp: amp1, n: 1, phase: phases[0] },
        { amp: amp2, n: 2, phase: phases[1] },
        { amp: amp3, n: 3, phase: phases[2] }
      ];

      nHarmonics.forEach((h) => {
        if (h.amp > 0.5) {
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(15, 39, 86, 0.16)';
          for (let x = 0; x <= width; x += step) {
            const y = midY + h.amp * Math.sin(h.n * k0 * x + h.phase);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });

      // Draw Sum Waveform (1.5px navy line)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(15, 39, 86, ${Math.max(0.2, 0.82 * scrollFade)})`;

      let dotX = width * 0.62;
      let dotY = midY;

      for (let x = 0; x <= width; x += step) {
        const y1 = amp1 * Math.sin(1 * k0 * x + phases[0]);
        const y2 = amp2 * Math.sin(2 * k0 * x + phases[1]);
        const y3 = amp3 * Math.sin(3 * k0 * x + phases[2]);
        const ySum = midY + (y1 + y2 + y3);

        if (x === 0) ctx.moveTo(x, ySum);
        else ctx.lineTo(x, ySum);

        // Track point for red marker dot (drifts harmonically between 45% and 75% width)
        const targetDotX = width * (0.6 + 0.15 * Math.sin(phases[0] * 0.8));
        if (Math.abs(x - targetDotX) <= step) {
          dotX = x;
          dotY = ySum;
        }
      }
      ctx.stroke();

      // Small red dot (#BE1E2D, radius 3.5px) riding the sum curve
      if (scrollFade > 0.1) {
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#BE1E2D';
        ctx.fill();

        // Delicate outer pulse ring
        ctx.beginPath();
        ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(190, 30, 45, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (isVisible) {
        animId = requestAnimationFrame(render);
      }
    }

    // Pointer frequency shift (max 12%)
    window.addEventListener('mousemove', (e) => {
      const xNorm = Math.min(Math.max(e.clientX / window.innerWidth, 0), 1);
      targetFreqMod = 1.0 + (xNorm - 0.5) * 0.24; // ±12%
    }, { passive: true });

    // Pause off-screen
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animId) {
          lastTime = performance.now();
          animId = requestAnimationFrame(render);
        } else if (!isVisible && animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });
    }, { threshold: 0.05 });

    observer.observe(canvas);

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', updateScrollFade, { passive: true });

    resize();
    updateScrollFade();
    animId = requestAnimationFrame(render);
  }

  // ---------------------------------------------------------------------------
  // 2. THE SPINE & MOBILE PROGRESS TRACKER
  // ---------------------------------------------------------------------------
  function initSpine() {
    const spine = document.getElementById('traceSpine');
    const marker = document.getElementById('spineMarker');
    const label = document.getElementById('spineLabel');
    const mobileBar = document.getElementById('traceMobileBar');

    const sections = [
      { id: 'hero', name: '01 Overview' },
      { id: 'studios', name: '02 Studios' },
      { id: 'projects', name: '03 Projects' },
      { id: 'curriculum', name: '04 Curriculum' },
      { id: 'news', name: '05 News' },
      { id: 'people', name: '06 People' }
    ];

    function update() {
      const scrollY = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;

      // Mobile 2px top bar
      if (mobileBar) {
        mobileBar.style.width = (scrollProgress * 100).toFixed(2) + '%';
      }

      // Desktop vertical spine
      if (marker && spine) {
        const spineTop = 90; // below header
        const spineBottom = window.innerHeight - 80;
        const spineRange = spineBottom - spineTop;
        const currentY = spineTop + spineRange * scrollProgress;
        marker.style.top = currentY + 'px';

        // Detect active section
        let activeName = '';
        for (let i = sections.length - 1; i >= 0; i--) {
          const sec = document.getElementById(sections[i].id);
          if (sec) {
            const rect = sec.getBoundingClientRect();
            if (rect.top <= window.innerHeight * 0.45) {
              activeName = sections[i].name;
              break;
            }
          }
        }

        if (label) {
          if (activeName) {
            label.textContent = activeName;
            label.classList.add('visible');
          } else {
            label.classList.remove('visible');
          }
        }
      }
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ---------------------------------------------------------------------------
  // 3. STUDIO WAVEFORM GLYPHS (Sawtooth, Sine, PWM Square)
  // ---------------------------------------------------------------------------
  function initStudioGlyphs() {
    const rows = document.querySelectorAll('.studio-row');
    rows.forEach((row) => {
      const svg = row.querySelector('.studio-glyph-svg');
      if (!svg) return;
      const path = svg.querySelector('path');
      if (!path) return;

      // Ensure pathLength=1 setup
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '0';
      path.style.transition = 'stroke-dashoffset 700ms cubic-bezier(0.2, 0.7, 0.2, 1)';

      row.addEventListener('mouseenter', () => {
        if (prefersReducedMotion) return;
        path.style.transition = 'none';
        path.style.strokeDashoffset = '1';
        // Trigger reflow
        void path.getBoundingClientRect();
        path.style.transition = 'stroke-dashoffset 700ms cubic-bezier(0.2, 0.7, 0.2, 1)';
        path.style.strokeDashoffset = '0';
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 4. PROJECT DRAWINGS & ENGINEERING CALLOUT SCRUB
  // ---------------------------------------------------------------------------
  function initProjectDrawings() {
    const projectRows = document.querySelectorAll('.project-row');

    function checkDrawings() {
      projectRows.forEach((row) => {
        const svg = row.querySelector('.project-blueprint-svg');
        const callouts = row.querySelector('.project-callouts');
        if (!svg) return;

        const rect = row.getBoundingClientRect();
        const winH = window.innerHeight;

        // Progress of row crossing the viewport (0 when top enters bottom, 1 when bottom leaves top)
        const totalDistance = winH + rect.height;
        const currentDistance = winH - rect.top;
        const progress = Math.min(Math.max(currentDistance / totalDistance, 0), 1);

        const paths = svg.querySelectorAll('path');
        paths.forEach((p) => {
          p.setAttribute('pathLength', '1');
          p.style.strokeDasharray = '1';
          if (prefersReducedMotion) {
            p.style.strokeDashoffset = '0';
          } else {
            // Draw from 0 to 1 between progress 0.15 and 0.55
            const drawP = Math.min(Math.max((progress - 0.15) / 0.40, 0), 1);
            p.style.strokeDashoffset = (1 - drawP).toString();
          }
        });

        // Callouts fade in at ~55%
        if (callouts) {
          if (progress >= 0.50 || prefersReducedMotion) {
            callouts.classList.add('visible');
          } else {
            callouts.classList.remove('visible');
          }
        }

        // Blueprint fades to 15% opacity over the photo slot as design becomes machine
        if (progress > 0.65) {
          const fadeP = Math.min((progress - 0.65) / 0.25, 1);
          svg.style.opacity = (1 - fadeP * 0.85).toString(); // from 1.0 down to 0.15
        } else {
          svg.style.opacity = '1';
        }
      });
    }

    window.addEventListener('scroll', checkDrawings, { passive: true });
    window.addEventListener('resize', checkDrawings, { passive: true });
    checkDrawings();
  }

  // ---------------------------------------------------------------------------
  // 5. SEMESTER ASCENT TRAJECTORY CURVE
  // ---------------------------------------------------------------------------
  function initAscentCurve() {
    const svg = document.getElementById('ascentCurveSvg');
    const path = document.getElementById('ascentPath');
    const marker = document.getElementById('ascentMarker');
    const trail = document.getElementById('ascentTrail');
    const stageItems = document.querySelectorAll('.ascent-stage-item');

    if (!svg || !path || !marker) return;

    let pathLength = 0;
    try {
      pathLength = path.getTotalLength();
    } catch (e) {
      pathLength = 500;
    }

    function checkAscent() {
      const container = document.getElementById('ascentCurveCard');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const winH = window.innerHeight;

      // Progress through section (0 to 1)
      const startTrigger = winH * 0.85;
      const endTrigger = winH * 0.25;
      const progress = Math.min(Math.max((startTrigger - rect.top) / (startTrigger - endTrigger), 0), 1);

      // Current distance along curve
      const currentDist = progress * pathLength;
      const pt = path.getPointAtLength(currentDist);

      // Tangent angle calculation
      const step = 2;
      const ptAhead = path.getPointAtLength(Math.min(currentDist + step, pathLength));
      const ptBehind = path.getPointAtLength(Math.max(currentDist - step, 0));
      const angleRad = Math.atan2(ptAhead.y - ptBehind.y, ptAhead.x - ptBehind.x);
      const angleDeg = (angleRad * 180) / Math.PI;

      // Position red marker and rotate along tangent
      marker.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angleDeg})`);

      // Fading trailing path
      if (trail) {
        trail.setAttribute('pathLength', '1');
        trail.style.strokeDasharray = '1';
        trail.style.strokeDashoffset = (1 - progress).toString();
      }

      // Stage items rise 8px and fade in as tick is reached (5 stages at 0.1, 0.3, 0.5, 0.7, 0.9)
      const tickThresholds = [0.08, 0.28, 0.48, 0.68, 0.88];
      stageItems.forEach((item, idx) => {
        if (progress >= tickThresholds[idx] || prefersReducedMotion) {
          item.classList.add('reached');
        } else {
          item.classList.remove('reached');
        }
      });
    }

    window.addEventListener('scroll', checkAscent, { passive: true });
    window.addEventListener('resize', checkAscent, { passive: true });
    checkAscent();
  }

  // ---------------------------------------------------------------------------
  // 6. ACCESSIBLE MOBILE DRAWER NAVIGATION
  // ---------------------------------------------------------------------------
  function initMobileNav() {
    const toggleBtn = document.getElementById('mobileNavToggle');
    const drawer = document.getElementById('mobileNavDrawer');
    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      } else {
        drawer.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Close when clicking mobile link
    const mobileLinks = drawer.querySelectorAll('.nav-link');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION ON DOM READY
  // ---------------------------------------------------------------------------
  function init() {
    initHeroWave();
    initSpine();
    initStudioGlyphs();
    initProjectDrawings();
    initAscentCurve();
    initMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
