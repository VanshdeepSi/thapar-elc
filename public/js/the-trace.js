/**
 * EXPERIENTIAL LEARNING CENTRE (ELC) · THAPAR INSTITUTE
 * "THE TRACE" RELIABILITY RUNTIME & INTERACTIVE SIGNATURE SCENE
 * Fix Pass 3: Performance.now()-based motion, 56px/s continuous car,
 * gravity-turn rocket with tower, 56px gutter spine, whole-cycle studio waveforms.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // 1. HERO SIGNATURE SCENE: "THE TRACE" (PERFORMANCE.NOW TIMED MOTION)
  // ---------------------------------------------------------------------------
  function initHeroSignatureScene() {
    const canvas = document.getElementById('heroWaveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let animId = null;
    let isHeroVisible = true;

    // Harmonic wave parameters (fundamental ~1100px)
    const baseWavelength = 1100;
    const amplitudes = [38, 19, 12]; // n=1, n=2, n=3
    const speeds = [0.12, -0.17, 0.22]; // rad/s
    let phases = [0, 0, 0];

    // Pointer frequency shift (max 12%, lerp 0.05)
    let targetFreqMod = 1.0;
    let currentFreqMod = 1.0;
    let scrollFade = 1.0;

    // CAR:
    // At t=0: car ALREADY visible at ~14% of hero width, driving left to right at ~56px/s.
    // Never start off-screen. Re-enters from left edge on exit.
    const carWidth = 180;
    const carSpeed = 56.0; // px/s
    const wheelRadius = 14;
    let carX = 0;
    let carInitialSet = false;
    let carPitch = 0;
    let wheelAngle = 0;

    // ROCKET & LAUNCH TOWER:
    // Stands on raised launch tower at ~84% container width, visible at t=0.
    // Tower is ~220px tall hairline legs; car passes in front of the tower.
    let towerX = 0;
    let floorY = 0;
    let towerTopY = 0;
    let platformY = 0;

    // Timeline variables
    const cycleDuration = 24.0; // Relaunch every 24s (+/- 3s jitter)
    let elapsedSceneTime = 0.0;
    let isMidFlight = false;

    // Interactive button & hit elements
    const rocketLaunchBtn = document.getElementById('rocketLaunchBtn');
    const heroCarInteractive = document.getElementById('heroCarInteractive');

    // Accelerating ease: cubic-bezier(.4, 0, .9, .5)
    function solveCubicBezier(t, p1x, p1y, p2x, p2y) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      let u = t;
      for (let i = 0; i < 8; i++) {
        const oneMinusU = 1 - u;
        const x = 3 * oneMinusU * oneMinusU * u * p1x + 3 * oneMinusU * u * u * p2x + u * u * u;
        const dx = 3 * oneMinusU * oneMinusU * p1x + 6 * oneMinusU * u * (p2x - p1x) + 3 * u * u * (1 - p2x);
        if (Math.abs(x - t) < 1e-5 || Math.abs(dx) < 1e-6) break;
        u -= (x - t) / dx;
        u = Math.max(0, Math.min(1, u));
      }
      const oneMinusU = 1 - u;
      return 3 * oneMinusU * oneMinusU * u * p1y + 3 * oneMinusU * u * u * p2y + u * u * u;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.offsetWidth;
      height = canvas.parentElement.offsetHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Initialize car at 14% on first layout
      if (!carInitialSet && width > 0) {
        carX = width * 0.14;
        carInitialSet = true;
      }

      // Tower geometry: ~84% of width
      towerX = Math.round(width * 0.84);
      floorY = height * 0.90;
      towerTopY = Math.max(25, floorY - 180);
      platformY = towerTopY + 28;

      if (rocketLaunchBtn) {
        rocketLaunchBtn.style.left = `${towerX - 35}px`;
        rocketLaunchBtn.style.right = 'auto';
        rocketLaunchBtn.style.top = `${towerTopY - 15}px`;
        rocketLaunchBtn.style.height = `${floorY - towerTopY + 30}px`;
      }
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

    // Evaluate sum wave at horizontal coordinate x
    function getWaveY(x, midY, k0) {
      const y1 = amplitudes[0] * scrollFade * Math.sin(1 * k0 * x + phases[0]);
      const y2 = amplitudes[1] * scrollFade * Math.sin(2 * k0 * x + phases[1]);
      const y3 = amplitudes[2] * scrollFade * Math.sin(3 * k0 * x + phases[2]);
      return midY + (y1 + y2 + y3);
    }

    // Rocket Gravity-Turn Arc Position for progress p in [0, 1]
    function getRocketPosition(p) {
      const x = towerX + 320 * Math.pow(p, 1.4);
      const y = (platformY - 24) - 560 * p - 12 * Math.sin(Math.PI * p);
      return { x, y };
    }

    function getRocketTangent(p) {
      const step = 0.01;
      const p1 = getRocketPosition(Math.max(0, p - step));
      const p2 = getRocketPosition(Math.min(1, p + step));
      return Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
    }

    // Draw Tower (~220px tall hairline legs ending on base plate sitting ON wave baseline)
    function drawTower(beaconBlink) {
      ctx.save();

      const legSpread = 28;

      // Small base plate sitting ON the wave's local baseline
      ctx.beginPath();
      ctx.moveTo(towerX - legSpread - 8, floorY);
      ctx.lineTo(towerX + legSpread + 8, floorY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(15, 39, 86, 0.85)';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(15, 39, 86, 0.45)';
      ctx.lineWidth = 1.25;

      // 4 Main Hairline Legs with Cross-bracing
      ctx.beginPath();
      // Outer legs
      ctx.moveTo(towerX - legSpread, floorY);
      ctx.lineTo(towerX - 10, towerTopY);
      ctx.moveTo(towerX + legSpread, floorY);
      ctx.lineTo(towerX + 10, towerTopY);
      // Inner depth legs
      ctx.moveTo(towerX - legSpread * 0.6, floorY);
      ctx.lineTo(towerX - 5, towerTopY);
      ctx.moveTo(towerX + legSpread * 0.6, floorY);
      ctx.lineTo(towerX + 5, towerTopY);

      // Horizontal cross beams
      const levels = [0.25, 0.5, 0.75, 1.0];
      levels.forEach((lvl) => {
        const y = floorY - (floorY - towerTopY) * lvl;
        const w = legSpread * (1 - lvl * 0.65);
        ctx.moveTo(towerX - w, y);
        ctx.lineTo(towerX + w, y);
      });

      // Diagonal cross-bracing (X-bracing)
      for (let i = 0; i < levels.length - 1; i++) {
        const yBot = floorY - (floorY - towerTopY) * levels[i];
        const yTop = floorY - (floorY - towerTopY) * levels[i + 1];
        const wBot = legSpread * (1 - levels[i] * 0.65);
        const wTop = legSpread * (1 - levels[i + 1] * 0.65);
        ctx.moveTo(towerX - wBot, yBot);
        ctx.lineTo(towerX + wTop, yTop);
        ctx.moveTo(towerX + wBot, yBot);
        ctx.lineTo(towerX - wTop, yTop);
      }

      // Launch platform deck
      ctx.moveTo(towerX - 22, platformY);
      ctx.lineTo(towerX + 22, platformY);

      // Umbilical service arm
      ctx.moveTo(towerX + 10, platformY - 26);
      ctx.lineTo(towerX + 2, platformY - 26);
      ctx.stroke();

      // Mast
      ctx.beginPath();
      ctx.moveTo(towerX, towerTopY);
      ctx.lineTo(towerX, towerTopY - 14);
      ctx.stroke();

      // Tower beacon light (blinks 3x before launch)
      ctx.beginPath();
      ctx.arc(towerX, towerTopY - 14, 2.5, 0, Math.PI * 2);
      if (beaconBlink) {
        ctx.fillStyle = '#BE1E2D';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(towerX, towerTopY - 14, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(190, 30, 45, 0.25)';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(15, 39, 86, 0.3)';
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw Hairline 4x4 Car Profile (passes in FRONT of tower legs)
    function drawCar(x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const navy = 'rgba(15, 39, 86, 0.95)';
      const red = '#BE1E2D';
      const bg = '#FAF8F4';

      ctx.strokeStyle = navy;
      ctx.lineWidth = 1.25;
      ctx.fillStyle = bg;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Rear mounted spare tire
      ctx.beginPath();
      ctx.arc(-82, -32, 13, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-82, -32, 7, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Main 4x4 body silhouette
      ctx.beginPath();
      ctx.moveTo(-78, -15);
      ctx.lineTo(-78, -54); // Tailgate
      ctx.lineTo(-72, -56); // Roof rear curve
      ctx.lineTo(8, -56);   // Main roofline
      ctx.lineTo(28, -37);  // Windshield
      ctx.lineTo(76, -35);  // Hood line (above arches)
      ctx.lineTo(78, -34);  // Hood nose curve
      ctx.lineTo(78, -20);  // Grille front
      ctx.lineTo(82, -20);  // Front bumper top
      ctx.lineTo(82, -14);  // Front bumper face
      ctx.lineTo(72, -14);  // Front bumper lower skid

      // Front wheel arch
      ctx.lineTo(68, -15);
      ctx.arc(46, -14, 20, 0, Math.PI, true);
      ctx.lineTo(24, -15);

      // Rocker panel between wheels
      ctx.lineTo(-24, -15);

      // Rear wheel arch
      ctx.arc(-46, -14, 20, 0, Math.PI, true);
      ctx.lineTo(-68, -15);

      // Rear bumper step
      ctx.lineTo(-80, -15);
      ctx.lineTo(-80, -19);
      ctx.lineTo(-78, -19);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();

      // 3. Expedition roof rack
      ctx.beginPath();
      ctx.moveTo(-66, -60);
      ctx.lineTo(4, -60);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      [-58, -27, 0].forEach((rx) => {
        ctx.beginPath();
        ctx.moveTo(rx, -56);
        ctx.lineTo(rx, -60);
        ctx.stroke();
      });

      // 4. Windows (proportional glasshouse)
      ctx.lineWidth = 1.1;
      // Rear cargo window
      ctx.beginPath();
      ctx.moveTo(-68, -52);
      ctx.lineTo(-42, -52);
      ctx.lineTo(-42, -39);
      ctx.lineTo(-68, -39);
      ctx.closePath();
      ctx.stroke();

      // Rear passenger window
      ctx.beginPath();
      ctx.moveTo(-38, -52);
      ctx.lineTo(-8, -52);
      ctx.lineTo(-8, -39);
      ctx.lineTo(-38, -39);
      ctx.closePath();
      ctx.stroke();

      // Front driver window
      ctx.beginPath();
      ctx.moveTo(-4, -52);
      ctx.lineTo(6, -52);
      ctx.lineTo(24, -39);
      ctx.lineTo(-4, -39);
      ctx.closePath();
      ctx.stroke();

      // 5. Body character lines & seams
      // Shoulder crease
      ctx.beginPath();
      ctx.moveTo(-74, -36);
      ctx.lineTo(74, -36);
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = 'rgba(15, 39, 86, 0.45)';
      ctx.stroke();

      // Door seams
      ctx.beginPath();
      ctx.moveTo(-6, -56); ctx.lineTo(-6, -15);   // B-pillar
      ctx.moveTo(-40, -56); ctx.lineTo(-40, -15); // C-pillar
      ctx.moveTo(26, -37); ctx.lineTo(21, -15);   // A-pillar lower seam
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = navy;
      ctx.stroke();

      // Flush door handles
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(-30, -33); ctx.lineTo(-24, -33);
      ctx.moveTo(4, -33); ctx.lineTo(10, -33);
      ctx.stroke();

      // Side mirror
      ctx.beginPath();
      ctx.moveTo(25, -40);
      ctx.lineTo(29, -43);
      ctx.lineTo(29, -38);
      ctx.closePath();
      ctx.stroke();

      // 6. Wheels (rotating with speed)
      [-46, 46].forEach((wx) => {
        ctx.save();
        ctx.translate(wx, -14);
        ctx.rotate(wheelAngle);

        // Outer tire
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = navy;
        ctx.stroke();

        // Rim bead
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // Center hub
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = navy;
        ctx.fill();

        // 5 Alloy spokes
        ctx.lineWidth = 1;
        for (let s = 0; s < 5; s++) {
          const a = (s * 2 * Math.PI) / 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
          ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
          ctx.stroke();
        }

        ctx.restore();
      });

      // 7. Headlight & Beam
      // Circular bezel
      ctx.beginPath();
      ctx.arc(77, -26, 3, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Red headlight dot (#BE1E2D)
      ctx.beginPath();
      ctx.arc(77, -26, 2, 0, Math.PI * 2);
      ctx.fillStyle = red;
      ctx.fill();

      // Subtle forward headlight beam
      ctx.beginPath();
      ctx.moveTo(80, -26);
      ctx.lineTo(138, -36);
      ctx.lineTo(138, -16);
      ctx.closePath();
      ctx.fillStyle = 'rgba(190, 30, 45, 0.08)';
      ctx.fill();

      ctx.restore();
    }

    // Draw Hairline Rocket
    function drawRocket(rx, ry, angle, opacity, isLaunching) {
      if (opacity <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = Math.min(Math.max(opacity, 0), 1);
      ctx.translate(rx, ry);
      ctx.rotate(angle);

      ctx.strokeStyle = 'rgba(15, 39, 86, 0.92)';
      ctx.lineWidth = 1.25;
      ctx.fillStyle = '#FAF8F4';

      // Rocket fuselage (~90px tall, 18px wide)
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(9, -28);
      ctx.lineTo(9, 24);
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

      // Stage line
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();

      // Engine plume during active launch
      if (isLaunching) {
        ctx.beginPath();
        ctx.moveTo(-5, 34);
        ctx.lineTo(0, 52 + Math.random() * 8);
        ctx.lineTo(5, 34);
        ctx.fillStyle = 'rgba(190, 30, 45, 0.5)';
        ctx.fill();
      }

      ctx.restore();
    }

    // Manual Launch Trigger (button click/tap/enter)
    function triggerManualLaunch() {
      if (isMidFlight || prefersReducedMotion) return;
      // Start countdown: set current cycle time to 1.2s (blinks 3x, ignites at 2.0s)
      const currentCycleBase = Math.floor(elapsedSceneTime / cycleDuration) * cycleDuration;
      elapsedSceneTime = currentCycleBase + 1.2;
    }

    if (rocketLaunchBtn) {
      rocketLaunchBtn.addEventListener('click', triggerManualLaunch);
      rocketLaunchBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerManualLaunch();
        }
      });
    }

    let lastTime = performance.now();

    function render(currentTime) {
      // Clamp dt to 50ms so returning to tab causes no jump
      const rawDt = (currentTime - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      lastTime = currentTime;

      if (!prefersReducedMotion && isHeroVisible) {
        elapsedSceneTime += dt;
        phases[0] += speeds[0] * dt;
        phases[1] += speeds[1] * dt;
        phases[2] += speeds[2] * dt;
      }

      currentFreqMod += (targetFreqMod - currentFreqMod) * 0.05;
      ctx.clearRect(0, 0, width, height);

      const midY = height * 0.58;
      const k0 = (2 * Math.PI) / (baseWavelength * currentFreqMod);

      // 1. Draw Harmonics at 28% Opacity (clearly visible)
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

      // Rocket Timeline State Evaluation
      const tCycle = prefersReducedMotion ? 0 : (elapsedSceneTime % cycleDuration);
      let towerBeaconOn = false;
      let rocketOpacity = 0;
      let rocketInFlight = false;
      let flightProgress = 0;
      let trailAlpha = 0;

      if (prefersReducedMotion) {
        rocketOpacity = 1;
        rocketInFlight = false;
      } else {
        if (tCycle < 1.2) {
          // Standing on pad
          rocketOpacity = 1;
          towerBeaconOn = false;
          isMidFlight = false;
        } else if (tCycle < 2.0) {
          // t=1.2s: Tower light blinks 3x
          rocketOpacity = 1;
          const blinkPhase = (tCycle - 1.2) / 0.8; // 0 to 1 over 0.8s
          towerBeaconOn = Math.sin(blinkPhase * Math.PI * 6) > 0;
          isMidFlight = false;
        } else if (tCycle < 8.0) {
          // t=2.0s: Ignition; 6s flight to t=8s
          isMidFlight = true;
          rocketInFlight = true;
          rocketOpacity = 1;
          const flightTau = (tCycle - 2.0) / 6.0;
          flightProgress = solveCubicBezier(flightTau, 0.4, 0, 0.9, 0.5);
          trailAlpha = 0.5;
        } else if (tCycle < 13.0) {
          // t=8s: Exited top-right; trail fading over 5s into permanent 12% dashed arc
          isMidFlight = false;
          rocketOpacity = 0;
          const fadeProgress = (tCycle - 8.0) / 5.0;
          trailAlpha = Math.max(0.12, 0.5 * (1 - fadeProgress));
        } else if (tCycle < 16.0) {
          // Pad empty, waiting
          isMidFlight = false;
          rocketOpacity = 0;
          trailAlpha = 0.12;
        } else if (tCycle < 17.2) {
          // t=16s: New rocket fades onto pad (1.2s)
          isMidFlight = false;
          rocketOpacity = (tCycle - 16.0) / 1.2;
          trailAlpha = 0.12;
        } else {
          // Rocket docked and waiting for relaunch at ~24s
          isMidFlight = false;
          rocketOpacity = 1;
          trailAlpha = 0.12;
        }
      }

      // 3. Update Tower geometry to sit ON wave's local baseline
      floorY = getWaveY(towerX, midY, k0);
      towerTopY = Math.max(20, floorY - 170);
      platformY = towerTopY + 28;
      if (rocketLaunchBtn) {
        rocketLaunchBtn.style.top = `${towerTopY - 15}px`;
        rocketLaunchBtn.style.height = `${floorY - towerTopY + 15}px`;
      }
      drawTower(towerBeaconOn);

      // 4. Update and Draw 4x4 Car Profile
      if (!prefersReducedMotion) {
        carX += carSpeed * dt;
        wheelAngle += (carSpeed * dt) / wheelRadius;
        if (carX > width + carWidth) {
          carX = -carWidth;
        }
      }

      // Lerp car pitch to wave tangent
      const curY = getWaveY(carX, midY, k0);
      const aheadY = getWaveY(carX + 14, midY, k0);
      const behindY = getWaveY(carX - 14, midY, k0);
      const targetSlope = Math.atan2(aheadY - behindY, 28);
      carPitch += (targetSlope - carPitch) * Math.min(1.0, 10.0 * dt);

      // Car passes in FRONT of tower legs
      drawCar(carX, curY, carPitch);

      // Sync interactive car hit box
      if (heroCarInteractive) {
        heroCarInteractive.style.transform = `translate(${carX}px, ${curY}px) rotate(${carPitch}rad)`;
        heroCarInteractive.style.display = (carX >= -carWidth && carX <= width + carWidth) ? 'block' : 'none';
      }

      // 5. Draw Permanent 12% Dashed Gravity-Turn Arc
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(15, 39, 86, 0.12)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 4]);
      for (let u = 0; u <= 1.0; u += 0.02) {
        const p = getRocketPosition(u);
        if (u === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();

      // 6. Draw Rocket Active Exhaust Trail during/after flight
      if (trailAlpha > 0.01 && (rocketInFlight || tCycle >= 8.0)) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(190, 30, 45, ${trailAlpha})`;
        ctx.lineWidth = 1.5;
        const maxP = rocketInFlight ? flightProgress : 1.0;
        for (let u = 0; u <= maxP; u += 0.02) {
          const p = getRocketPosition(u);
          if (u === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 7. Draw Rocket (on pad or mid-flight)
      if (rocketInFlight) {
        const pos = getRocketPosition(flightProgress);
        const tangent = getRocketTangent(flightProgress);
        drawRocket(pos.x, pos.y, tangent, rocketOpacity, true);
      } else if (rocketOpacity > 0.01) {
        drawRocket(towerX, platformY - 24, 0, rocketOpacity, false);
      }

      if (isHeroVisible) {
        animId = requestAnimationFrame(render);
      }
    }

    // Pointer X frequency shift (<= 12%)
    window.addEventListener('mousemove', (e) => {
      const xNorm = Math.min(Math.max(e.clientX / window.innerWidth, 0), 1);
      targetFreqMod = 1.0 + (xNorm - 0.5) * 0.24;
    }, { passive: true });

    // Pause when hero is less than 50% visible; resume with rocket on pad
    const heroSection = document.getElementById('hero');
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wasVisible = isHeroVisible;
        isHeroVisible = entry.intersectionRatio >= 0.5;
        if (isHeroVisible) {
          if (!wasVisible) {
            lastTime = performance.now();
            const cyclePos = elapsedSceneTime % cycleDuration;
            if (cyclePos >= 8.0 && cyclePos < 16.0) {
              const base = Math.floor(elapsedSceneTime / cycleDuration) * cycleDuration;
              elapsedSceneTime = base + 17.5; // Resume with rocket on pad
            }
          }
          if (!animId) {
            animId = requestAnimationFrame(render);
          }
        } else {
          if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        }
      });
    }, { threshold: [0, 0.5, 1.0] });

    if (heroSection) {
      heroObserver.observe(heroSection);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', updateScrollFade, { passive: true });

    resize();
    updateScrollFade();
    animId = requestAnimationFrame(render);
  }

  // ---------------------------------------------------------------------------
  // 2. THE SPINE (CONTAINER-LEFT - 56PX, >= 1280PX ONLY)
  // ---------------------------------------------------------------------------
  function initSpine() {
    const spine = document.getElementById('traceSpine');
    const marker = document.getElementById('spineMarker');
    const indexSpan = document.getElementById('spineIndex');
    const nameSpan = document.getElementById('spineName');
    const mobileBar = document.getElementById('traceMobileBar');
    const container = document.querySelector('.site-container');

    const sections = [
      { id: 'hero', index: '01', name: 'Overview' },
      { id: 'curriculum', index: '02', name: 'Curriculum' },
      { id: 'studios', index: '03', name: 'Studios' },
      { id: 'projects', index: '04', name: 'Projects' },
      { id: 'news', index: '05', name: 'News' },
      { id: 'people', index: '06', name: 'People' }
    ];

    function update() {
      // Reposition spine to (containerLeft - 56px)
      if (spine && container && window.innerWidth >= 1280) {
        const cRect = container.getBoundingClientRect();
        const leftPos = Math.max(12, Math.round(cRect.left - 56));
        spine.style.left = `${leftPos}px`;
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
        marker.style.top = `${currentY}px`;

        let activeSec = sections[0];
        if (window.innerHeight + scrollY >= document.documentElement.scrollHeight - 40) {
          activeSec = sections[sections.length - 1];
        } else {
          for (let i = sections.length - 1; i >= 0; i--) {
            const sec = document.getElementById(sections[i].id);
            if (sec) {
              const rect = sec.getBoundingClientRect();
              if (rect.top <= window.innerHeight * 0.45) {
                activeSec = sections[i];
                break;
              }
            }
          }
        }

        if (indexSpan) indexSpan.textContent = activeSec.index;
        if (nameSpan) nameSpan.textContent = activeSec.name;
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
        for (let i = 0; i < numCycles; i++) {
          const startX = i * exactCycleW;
          const peakX = startX + exactCycleW * 0.75;
          const endX = (i + 1) * exactCycleW;
          d += `L ${peakX} 2 L ${peakX} 18 L ${endX} ${midY} `;
        }
      } else if (type === 'sine') {
        for (let i = 0; i < numCycles; i++) {
          const startX = i * exactCycleW;
          const cp1X = startX + exactCycleW * 0.25;
          const cp2X = startX + exactCycleW * 0.75;
          const midX = startX + exactCycleW * 0.5;
          const endX = (i + 1) * exactCycleW;
          d += `C ${cp1X} 1, ${cp1X} 1, ${midX} ${midY} C ${cp2X} 19, ${cp2X} 19, ${endX} ${midY} `;
        }
      } else if (type === 'pwm') {
        for (let i = 0; i < numCycles; i++) {
          const startX = i * exactCycleW;
          const highX = startX + exactCycleW * 0.45;
          const endX = (i + 1) * exactCycleW;
          d += `L ${startX} 2 L ${highX} 2 L ${highX} 18 L ${endX} 18 L ${endX} ${midY} `;
        }
      }

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      path.setAttribute('d', d);
      path.removeAttribute('pathLength');
      const len = Math.ceil(path.getTotalLength()) || 1800;
      svg.style.setProperty('--wave-len', `${len}px`);
      path.style.setProperty('--wave-len', `${len}px`);
      path.style.strokeDasharray = `${len}px`;
      path.style.strokeDashoffset = '0px';
    }

    function triggerWaveRedraw(wrap) {
      if (prefersReducedMotion || !wrap) return;
      const path = wrap.querySelector('.studio-wave-path');
      if (!path) return;

      path.style.animation = 'none';
      void path.offsetWidth; // Force reflow to immediately restart redraw animation
      path.style.animation = 'waveDividerRedraw 700ms cubic-bezier(0.2, 0.7, 0.2, 1)';
      path.addEventListener('animationend', () => {
        path.style.animation = '';
      }, { once: true });
    }

    dividers.forEach((svg) => drawWave(svg));
    window.addEventListener('resize', () => dividers.forEach((svg) => drawWave(svg)), { passive: true });

    // 1. Direct hover on ANY waveform divider
    const dividerWraps = document.querySelectorAll('.studio-divider-wrap');
    dividerWraps.forEach((wrap) => {
      wrap.addEventListener('mouseenter', () => {
        triggerWaveRedraw(wrap);
      });
    });

    // 2. Hover on a studio row triggers its respective divider directly below it
    studioRows.forEach((row) => {
      row.addEventListener('mouseenter', () => {
        if (prefersReducedMotion) return;
        let next = row.nextElementSibling;
        while (next && !next.classList.contains('studio-divider-wrap')) {
          next = next.nextElementSibling;
        }
        if (next) {
          triggerWaveRedraw(next);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 4. FULL-WIDTH SEMESTER ASCENT TRAJECTORY (NO DASHBOARD BOX)
  // ---------------------------------------------------------------------------
  function initAscentCurve() {
    const svg = document.getElementById('ascentCurveSvg');
    const path = document.getElementById('ascentPath');
    const trail = document.getElementById('ascentTrail');
    const rocket = document.getElementById('ascentRocketGlyph');
    const stageItems = document.querySelectorAll('.ascent-stage-item');
    const stageTicks = document.querySelectorAll('.ascent-stage-tick, .ascent-tick');

    if (!svg || !path || !rocket) return;

    if (trail) {
      trail.setAttribute('pathLength', '1');
    }

    const pathLength = path.getTotalLength ? path.getTotalLength() : 1000;
    const flashed = [false, false, false, false, false];
    const tickThresholds = [0.08, 0.28, 0.48, 0.68, 0.88];

    function checkAscent() {
      if (prefersReducedMotion) {
        const ptFinal = path.getPointAtLength(pathLength);
        rocket.setAttribute('transform', `translate(${ptFinal.x}, ${ptFinal.y}) rotate(90)`);
        if (trail) {
          trail.setAttribute('pathLength', '1');
          trail.style.strokeDasharray = '1';
          trail.style.strokeDashoffset = '0';
        }
        stageItems.forEach((item) => item.classList.add('reached'));
        return;
      }

      const curveWrap = document.querySelector('.ascent-curve-svg-wrap') || svg;
      const rect = curveWrap.getBoundingClientRect();
      const winH = window.innerHeight;

      // Start climb as curve enters view in lower viewport,
      // finish while curve is still fully visible below fixed header (~72px)
      const startTrigger = winH * 0.80;
      const endTrigger = Math.max(winH * 0.25, 140);
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
        if (progress >= th) {
          if (!flashed[idx] && stageTicks[idx]) {
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
        const callouts = row.querySelector('.project-callouts');
        if (!callouts) return;

        const rect = row.getBoundingClientRect();
        const winH = window.innerHeight;

        const totalDistance = winH + rect.height;
        const currentDistance = winH - rect.top;
        const progress = Math.min(Math.max(currentDistance / totalDistance, 0), 1);

        if (progress >= 0.52 || prefersReducedMotion) {
          callouts.classList.add('visible');
        } else {
          callouts.classList.remove('visible');
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
    const toggle = document.getElementById('mobileNavToggle');
    const drawer = document.getElementById('mobileNavDrawer');
    if (!toggle || !drawer) return;

    toggle.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        drawer.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });

    const mobileLinks = drawer.querySelectorAll('.nav-link');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
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

    // Dev check: document.fonts.check('500 16px "IBM Plex Sans"')
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        const isLoaded = document.fonts.check('500 16px "IBM Plex Sans"');
        console.log('[Dev Check] document.fonts.check(\'500 16px "IBM Plex Sans"\'):', isLoaded);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
