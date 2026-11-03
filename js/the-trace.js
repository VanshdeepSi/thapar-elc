/**
 * THE TRACE · Experiential Learning Centre (ELC), TIET Patiala
 * Restrained editorial animation suite:
 * 1. Hero Signature Scene: Harmonics Wave (n=1,2,3 @ 28% + sum line) + 4x4 Car + Rocket Launch Arc
 * 2. Dynamic Studio Waveform Row Dividers (Sawtooth, Sine, PWM Square with whole cycles)
 * 3. Semester Ascent Trajectory Curve with Red Rocket Glyph & Stage Separation Flash
 * 4. Technical Blueprint Scrubbing with Engineering Callouts
 * 5. Left Spine Navigation positioned at (containerLeft - 40px)
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // 1. HERO SIGNATURE SCENE: WAVE + CAR + ROCKET
  // ---------------------------------------------------------------------------
  function initHeroSignatureScene() {
    const canvas = document.getElementById('heroWaveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let animId = null;
    let isVisible = true;

    // Harmonic wave parameters (fundamental ~1100px)
    const baseWavelength = 1100;
    const amplitudes = [40, 20, 13]; // n=1, n=2, n=3
    const speeds = [0.12, -0.17, 0.22]; // rad/s
    let phases = [0, 0, 0];

    // Pointer frequency shift (max 12%, lerp 0.05)
    let targetFreqMod = 1.0;
    let currentFreqMod = 1.0;

    // Scroll fade
    let scrollFade = 1.0;

    // Vehicle state ("Only one vehicle moves at a time")
    // 0: Initial wait before rocket (900ms)
    // 1: Rocket launching & climbing gravity turn (~2.8s)
    // 2: Rocket exited; Car now active and traversing wave
    let vehicleState = prefersReducedMotion ? 2 : 0;
    let stateTime = 0;

    // Rocket parameters (Pad at far right)
    let rocketLaunchTime = 0.9; // 900ms
    let rocketFlightDuration = 2.8; // seconds
    let rocketPadX = 0;
    let rocketPadY = 0;
    let rocketArcFinished = prefersReducedMotion;

    // Car parameters (4x4 off-road profile ~180px)
    const carWidth = 180;
    const carHeight = 56;
    let carX = prefersReducedMotion ? 120 : -240;
    const carSpeed = 40; // px/s (~45s loop across screen)
    let wheelAngle = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.offsetWidth;
      height = canvas.parentElement.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);

      rocketPadX = width - 110;
      rocketPadY = height * 0.55;
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
        const scrolled = -rect.top;
        const progress = Math.min(Math.max(scrolled / (heroHeight * 0.75), 0), 1);
        scrollFade = 1 - progress;
      }
    }

    // Helper to evaluate sum wave at x
    function getWaveY(x, midY, k0) {
      const y1 = amplitudes[0] * scrollFade * Math.sin(1 * k0 * x + phases[0]);
      const y2 = amplitudes[1] * scrollFade * Math.sin(2 * k0 * x + phases[1]);
      const y3 = amplitudes[2] * scrollFade * Math.sin(3 * k0 * x + phases[2]);
      return midY + (y1 + y2 + y3);
    }

    // Draw Hairline 4x4 Car Profile
    function drawCar(x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Navy hairline chassis stroke
      ctx.strokeStyle = 'rgba(15, 39, 86, 0.9)';
      ctx.lineWidth = 1.25;
      ctx.fillStyle = '#FAF8F4';

      // 4x4 Silhouette
      ctx.beginPath();
      // Start rear bumper
      ctx.moveTo(-85, -12);
      ctx.lineTo(-85, -34);
      // Rear roof pillar
      ctx.lineTo(-58, -50);
      // Roofline
      ctx.lineTo(8, -50);
      // Windshield slope
      ctx.lineTo(34, -26);
      // Hood
      ctx.lineTo(76, -26);
      // Grille / front bumper
      ctx.lineTo(84, -12);
      // Underside
      ctx.lineTo(60, -12);
      // Front wheel arch
      ctx.arc(42, -12, 20, 0, Math.PI, true);
      // Mid chassis
      ctx.lineTo(-24, -12);
      // Rear wheel arch
      ctx.arc(-42, -12, 20, 0, Math.PI, true);
      ctx.lineTo(-85, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Window panes
      ctx.beginPath();
      ctx.moveTo(-54, -46);
      ctx.lineTo(-2, -46);
      ctx.lineTo(-2, -28);
      ctx.lineTo(-54, -28);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(3, -46);
      ctx.lineTo(26, -28);
      ctx.lineTo(3, -28);
      ctx.closePath();
      ctx.stroke();

      // Door seam
      ctx.beginPath();
      ctx.moveTo(-4, -50);
      ctx.lineTo(-4, -12);
      ctx.stroke();

      // Front & Rear Wheels (radius 14px, rotating)
      const wheelRadius = 14;
      [-42, 42].forEach((wx) => {
        ctx.save();
        ctx.translate(wx, -12);
        ctx.rotate(wheelAngle);

        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FAF8F4';
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 39, 86, 0.9)';
        ctx.lineWidth = 1.35;
        ctx.stroke();

        // Inner rim
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Spokes
        ctx.beginPath();
        ctx.moveTo(-wheelRadius, 0); ctx.lineTo(wheelRadius, 0);
        ctx.moveTo(0, -wheelRadius); ctx.lineTo(0, wheelRadius);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });

      // Red headlight dot (#BE1E2D)
      ctx.beginPath();
      ctx.arc(84, -20, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#BE1E2D';
      ctx.fill();

      // Subtle forward headlight beam
      ctx.beginPath();
      ctx.moveTo(86, -20);
      ctx.lineTo(140, -28);
      ctx.lineTo(140, -12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(190, 30, 45, 0.06)';
      ctx.fill();

      ctx.restore();
    }

    // Draw Hairline Rocket
    function drawRocket(rx, ry, angle, isLaunching) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(angle);

      ctx.strokeStyle = 'rgba(15, 39, 86, 0.9)';
      ctx.lineWidth = 1.25;
      ctx.fillStyle = '#FAF8F4';

      // Rocket fuselage (~90px tall, 18px wide)
      ctx.beginPath();
      // Nose cone
      ctx.moveTo(0, -50);
      ctx.lineTo(9, -28);
      ctx.lineTo(9, 24);
      // Engine nozzle
      ctx.lineTo(5, 34);
      ctx.lineTo(-5, 34);
      ctx.lineTo(-9, 24);
      ctx.lineTo(-9, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red nose cone tip dot
      ctx.beginPath();
      ctx.arc(0, -48, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#BE1E2D';
      ctx.fill();

      // Left & right fins
      ctx.beginPath();
      ctx.moveTo(-9, 10);
      ctx.lineTo(-20, 32);
      ctx.lineTo(-9, 26);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(9, 10);
      ctx.lineTo(20, 32);
      ctx.lineTo(9, 26);
      ctx.fill();
      ctx.stroke();

      // Stage separation ring
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();

      // Engine plume during flight
      if (isLaunching) {
        ctx.beginPath();
        ctx.moveTo(-5, 34);
        ctx.lineTo(0, 52 + Math.random() * 8);
        ctx.lineTo(5, 34);
        ctx.fillStyle = 'rgba(190, 30, 45, 0.4)';
        ctx.fill();
      }

      ctx.restore();
    }

    // Gravity turn arc path evaluation
    function getRocketPosition(u) {
      // u from 0 to 1
      const x = rocketPadX + 280 * Math.pow(u, 1.45);
      const y = (rocketPadY - 24) - 560 * u;
      return { x, y };
    }

    let lastTime = performance.now();

    function render(currentTime) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      stateTime += dt;

      if (!prefersReducedMotion) {
        phases[0] += speeds[0] * dt;
        phases[1] += speeds[1] * dt;
        phases[2] += speeds[2] * dt;
      }

      currentFreqMod += (targetFreqMod - currentFreqMod) * 0.05;
      ctx.clearRect(0, 0, width, height);

      const midY = height * 0.58;
      const k0 = (2 * Math.PI) / (baseWavelength * currentFreqMod);

      // 1. Draw Individual Harmonics at 28% Opacity (clearly visible)
      const step = 4;
      const harmonicColors = [
        'rgba(15, 39, 86, 0.28)',
        'rgba(15, 39, 86, 0.28)',
        'rgba(15, 39, 86, 0.28)'
      ];

      for (let n = 0; n < 3; n++) {
        const amp = amplitudes[n] * scrollFade;
        if (amp > 0.5) {
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.strokeStyle = harmonicColors[n];
          for (let x = 0; x <= width; x += step) {
            const y = midY + amp * Math.sin((n + 1) * k0 * x + phases[n]);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // 2. Draw Sum Waveform (1.5px navy line)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(15, 39, 86, ${Math.max(0.2, 0.92 * scrollFade)})`;
      for (let x = 0; x <= width; x += step) {
        const y = getWaveY(x, midY, k0);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 3. Rocket Launch Pad & Gravity Turn Arc
      // Pad structure at right
      const padY = getWaveY(rocketPadX, midY, k0);
      ctx.strokeStyle = 'rgba(15, 39, 86, 0.45)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(rocketPadX - 24, padY);
      ctx.lineTo(rocketPadX + 24, padY);
      // Gantry mast
      ctx.moveTo(rocketPadX + 22, padY);
      ctx.lineTo(rocketPadX + 22, padY - 75);
      ctx.lineTo(rocketPadX + 6, padY - 60);
      ctx.stroke();

      // Dashed gravity-turn trajectory arc
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(15, 39, 86, 0.12)'; // 12% opacity persistent arc
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 4]);
      for (let u = 0; u <= 1.0; u += 0.02) {
        const p = getRocketPosition(u);
        if (u === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();

      // State Machine for Vehicles ("Only one moves at a time")
      if (vehicleState === 0) {
        // Rocket waiting on pad before launch
        drawRocket(rocketPadX, padY - 24, 0, false);

        if (stateTime >= rocketLaunchTime && !prefersReducedMotion) {
          vehicleState = 1;
          stateTime = 0;
        }
      } else if (vehicleState === 1) {
        // Rocket launching and climbing arc
        const progress = Math.min(stateTime / rocketFlightDuration, 1.0);
        const p = getRocketPosition(progress);
        const pNext = getRocketPosition(Math.min(progress + 0.02, 1.0));
        const tangentAngle = Math.atan2(pNext.y - p.y, pNext.x - p.x) + Math.PI / 2;

        drawRocket(p.x, p.y, tangentAngle, true);

        // Rocket exhaust trail along arc
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(190, 30, 45, 0.4)';
        ctx.lineWidth = 1.5;
        for (let u = 0; u <= progress; u += 0.02) {
          const tp = getRocketPosition(u);
          if (u === 0) ctx.moveTo(tp.x, tp.y);
          else ctx.lineTo(tp.x, tp.y);
        }
        ctx.stroke();
        ctx.restore();

        if (progress >= 1.0) {
          vehicleState = 2; // Rocket exited; Car can now move!
          stateTime = 0;
          rocketArcFinished = true;
        }
      } else if (vehicleState === 2) {
        // Rocket has departed; car rides the wave
        if (!prefersReducedMotion) {
          carX += carSpeed * dt;
          wheelAngle += 2.5 * dt;

          if (carX > width + carWidth) {
            carX = -carWidth;
          }
        }

        // Sample slope tangent for car
        const curY = getWaveY(carX, midY, k0);
        const aheadY = getWaveY(carX + 12, midY, k0);
        const behindY = getWaveY(carX - 12, midY, k0);
        const slopeAngle = Math.atan2(aheadY - behindY, 24);

        drawCar(carX, curY, slopeAngle);
      }

      if (isVisible) {
        animId = requestAnimationFrame(render);
      }
    }

    // Pointer X frequency shift (<= 12%)
    window.addEventListener('mousemove', (e) => {
      const xNorm = Math.min(Math.max(e.clientX / window.innerWidth, 0), 1);
      targetFreqMod = 1.0 + (xNorm - 0.5) * 0.24;
    }, { passive: true });

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
  // 2. THE SPINE (CONTAINER-LEFT - 40PX, >= 1280PX ONLY)
  // ---------------------------------------------------------------------------
  function initSpine() {
    const spine = document.getElementById('traceSpine');
    const marker = document.getElementById('spineMarker');
    const label = document.getElementById('spineLabel');
    const mobileBar = document.getElementById('traceMobileBar');
    const container = document.querySelector('.site-container');

    const sections = [
      { id: 'hero', name: '01 Overview' },
      { id: 'studios', name: '02 Studios' },
      { id: 'projects', name: '03 Projects' },
      { id: 'curriculum', name: '04 Curriculum' },
      { id: 'news', name: '05 News' },
      { id: 'people', name: '06 People' }
    ];

    function update() {
      // Reposition spine to (containerLeft - 40px)
      if (spine && container && window.innerWidth >= 1280) {
        const cRect = container.getBoundingClientRect();
        const leftPos = Math.max(16, cRect.left - 40);
        spine.style.left = leftPos + 'px';
      }

      const scrollY = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;

      if (mobileBar) {
        mobileBar.style.width = (scrollProgress * 100).toFixed(2) + '%';
      }

      if (marker && spine) {
        const spineTop = 85;
        const spineBottom = window.innerHeight - 80;
        const currentY = spineTop + (spineBottom - spineTop) * scrollProgress;
        marker.style.top = currentY + 'px';

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
  // 3. FULL-ROW-WIDTH STUDIO WAVEFORM DIVIDERS (WHOLE NUMBER OF CYCLES)
  // ---------------------------------------------------------------------------
  function initStudioWaveDividers() {
    const dividers = document.querySelectorAll('.studio-wave-divider');
    const studioRows = document.querySelectorAll('.studio-row');

    function drawWave(svg) {
      const type = svg.getAttribute('data-wave');
      const path = svg.querySelector('path');
      if (!path) return;

      const w = svg.parentElement.offsetWidth || 1200;
      const h = 20;
      const midY = 10;
      const cycleW = type === 'pwm' ? 48 : 36;
      const numCycles = Math.max(6, Math.round(w / cycleW));
      const exactCycleW = w / numCycles;

      let d = `M 0 ${midY} `;

      if (type === 'sawtooth') {
        // Sawtooth torque wave (rises sharply, falls back)
        for (let i = 0; i < numCycles; i++) {
          const startX = i * exactCycleW;
          const peakX = startX + exactCycleW * 0.75;
          const endX = (i + 1) * exactCycleW;
          d += `L ${peakX} 2 L ${peakX} 18 L ${endX} ${midY} `;
        }
      } else if (type === 'sine') {
        // Sine wave
        for (let i = 0; i < numCycles; i++) {
          const startX = i * exactCycleW;
          const cp1X = startX + exactCycleW * 0.25;
          const cp2X = startX + exactCycleW * 0.75;
          const midX = startX + exactCycleW * 0.5;
          const endX = (i + 1) * exactCycleW;
          d += `C ${cp1X} 1, ${cp1X} 1, ${midX} ${midY} C ${cp2X} 19, ${cp2X} 19, ${endX} ${midY} `;
        }
      } else if (type === 'pwm') {
        // PWM square pulse
        for (let i = 0; i < numCycles; i++) {
          const startX = i * exactCycleW;
          const highX = startX + exactCycleW * 0.45;
          const endX = (i + 1) * exactCycleW;
          d += `L ${startX} 2 L ${highX} 2 L ${highX} 18 L ${endX} 18 L ${endX} ${midY} `;
        }
      }

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      path.setAttribute('d', d);
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '0';
    }

    dividers.forEach((svg) => drawWave(svg));
    window.addEventListener('resize', () => dividers.forEach((svg) => drawWave(svg)), { passive: true });

    // Redraw on hover (700ms)
    studioRows.forEach((row) => {
      row.addEventListener('mouseenter', () => {
        if (prefersReducedMotion) return;
        const divider = row.nextElementSibling && row.nextElementSibling.classList.contains('studio-wave-divider')
          ? row.nextElementSibling
          : row.previousElementSibling && row.previousElementSibling.classList.contains('studio-wave-divider')
            ? row.previousElementSibling
            : null;
        if (!divider) return;
        const path = divider.querySelector('path');
        if (!path) return;

        path.style.transition = 'none';
        path.style.strokeDashoffset = '1';
        void path.getBoundingClientRect();
        path.style.transition = 'stroke-dashoffset 700ms cubic-bezier(0.2, 0.7, 0.2, 1)';
        path.style.strokeDashoffset = '0';
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 4. SEMESTER ASCENT CURVE (RED ROCKET GLYPH & STAGE SEPARATION FLASH)
  // ---------------------------------------------------------------------------
  function initAscentCurve() {
    const svg = document.getElementById('ascentCurveSvg');
    const path = document.getElementById('ascentPath');
    const rocket = document.getElementById('ascentRocketGlyph');
    const trail = document.getElementById('ascentTrail');
    const stageItems = document.querySelectorAll('.ascent-stage-item');
    const stageTicks = document.querySelectorAll('.ascent-stage-tick');

    if (!svg || !path || !rocket) return;

    let pathLength = 500;
    try {
      pathLength = path.getTotalLength();
    } catch (e) {
      pathLength = 500;
    }

    const tickThresholds = [0.10, 0.30, 0.50, 0.70, 0.90];
    const flashed = [false, false, false, false, false];

    function checkAscent() {
      const section = document.getElementById('curriculum');
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const winH = window.innerHeight;

      // Progress through section (0 to 1)
      const startTrigger = winH * 0.85;
      const endTrigger = winH * 0.20;
      const progress = Math.min(Math.max((startTrigger - rect.top) / (startTrigger - endTrigger), 0), 1);

      const currentDist = progress * pathLength;
      const pt = path.getPointAtLength(currentDist);

      // Tangent rotation
      const step = 2;
      const ptAhead = path.getPointAtLength(Math.min(currentDist + step, pathLength));
      const ptBehind = path.getPointAtLength(Math.max(currentDist - step, 0));
      const angleRad = Math.atan2(ptAhead.y - ptBehind.y, ptAhead.x - ptBehind.x);
      const angleDeg = (angleRad * 180) / Math.PI;

      // Position rocket glyph and rotate along tangent
      rocket.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angleDeg + 90})`);

      // Fading trailing path
      if (trail) {
        trail.setAttribute('pathLength', '1');
        trail.style.strokeDasharray = '1';
        trail.style.strokeDashoffset = (1 - progress).toString();
      }

      // Check stage milestones
      tickThresholds.forEach((th, idx) => {
        if (progress >= th || prefersReducedMotion) {
          if (!flashed[idx] && !prefersReducedMotion && stageTicks[idx]) {
            stageTicks[idx].classList.add('stage-flash');
            setTimeout(() => {
              if (stageTicks[idx]) stageTicks[idx].classList.remove('stage-flash');
            }, 200);
            flashed[idx] = true;
          }
          if (stageItems[idx]) stageItems[idx].classList.add('reached');
        } else {
          flashed[idx] = false;
          if (stageItems[idx]) stageItems[idx].classList.remove('reached');
        }
      });
    }

    window.addEventListener('scroll', checkAscent, { passive: true });
    window.addEventListener('resize', checkAscent, { passive: true });
    checkAscent();
  }

  // ---------------------------------------------------------------------------
  // 5. PROJECT BLUEPRINT SCRUBBING
  // ---------------------------------------------------------------------------
  function initProjectDrawings() {
    const projectRows = document.querySelectorAll('.project-row');

    function checkDrawings() {
      projectRows.forEach((row) => {
        const svg = row.querySelector('.plate-svg-art');
        const callouts = row.querySelector('.project-callouts');
        if (!svg) return;

        const rect = row.getBoundingClientRect();
        const winH = window.innerHeight;

        const totalDistance = winH + rect.height;
        const currentDistance = winH - rect.top;
        const progress = Math.min(Math.max(currentDistance / totalDistance, 0), 1);

        // Callouts fade in at ~55%
        if (callouts) {
          if (progress >= 0.52 || prefersReducedMotion) {
            callouts.classList.add('visible');
          } else {
            callouts.classList.remove('visible');
          }
        }
      });
    }

    window.addEventListener('scroll', checkDrawings, { passive: true });
    window.addEventListener('resize', checkDrawings, { passive: true });
    checkDrawings();
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

    const mobileLinks = drawer.querySelectorAll('.nav-link');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // INITIALIZE ALL SUITES
  // ---------------------------------------------------------------------------
  function init() {
    initHeroSignatureScene();
    initSpine();
    initStudioWaveDividers();
    initAscentCurve();
    initProjectDrawings();
    initMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
