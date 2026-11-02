/**
 * Kinematic Linkage & Engineering Field Canvas
 * 100% Original, Bespoke Interactive Engineering Mechanism Canvas
 * 
 * Concept:
 * Simulates real-time multi-joint mechanical linkages (similar to 4-bar mechanisms
 * and robotic arm kinematics) combined with coordinate crosshairs and harmonic
 * trajectory traces. Interacts with mouse cursor via damped inverse kinematics.
 */

(function initKinematicCanvas() {
  const canvas = document.getElementById('kinematicCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animId = null;

  let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };
  let time = 0;

  // Mechanical kinematic arm joint parameters with smooth harmonic angular velocities
  const joints = [
    { ratio: 0.43, angle: 0, speed: 0.007, color: 'rgba(15, 39, 86, 0.45)' },
    { ratio: 0.33, angle: 0, speed: -0.012, color: 'rgba(190, 30, 45, 0.42)' },
    { ratio: 0.24, angle: 0, speed: 0.018, color: 'rgba(217, 119, 6, 0.50)' }
  ];

  // Particle trajectory trail for kinematic end-effector
  const trajectoryPoints = [];
  const MAX_TRAIL = 120;

  // Calibration coordinate crosshairs on a 70px grid
  const GRID_SIZE = 70;

  // Dynamically compute the exact center and maximum appropriate reach of the empty space
  function getEmptySpaceLayout() {
    const section = document.getElementById('hero-section');
    const container = document.getElementById('hero-container');
    const content = document.getElementById('hero-content');
    const metrics = document.getElementById('hero-metrics');

    if (!section || !container || !content) {
      return {
        x: width >= 1024 ? width * 0.75 : width * 0.5,
        y: height * 0.44,
        reach: width >= 1024 ? 205 : 130
      };
    }

    const sRect = section.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const tRect = content.getBoundingClientRect();
    const mRect = metrics ? metrics.getBoundingClientRect() : null;

    // Check if desktop view where text is on left and right side is empty space
    const isDesktop = window.innerWidth >= 1024 && (cRect.right - tRect.right > 240);

    if (isDesktop) {
      // Empty space boundaries relative to canvas
      const leftBound = tRect.right - sRect.left;
      const rightBound = cRect.right - sRect.left;
      const topBound = Math.max(20, tRect.top - sRect.top);
      const bottomBound = mRect ? (mRect.top - sRect.top) : (sRect.height * 0.82);

      const availableWidth = Math.max(200, rightBound - leftBound);
      const availableHeight = Math.max(200, bottomBound - topBound);

      // Pixel-perfect center of the empty space made for animation
      const centerX = leftBound + availableWidth * 0.50;
      const centerY = topBound + availableHeight * 0.48;

      // Appropriately enlarged reach that boldly fills the empty space without colliding
      const maxReach = Math.min(availableWidth * 0.45, availableHeight * 0.48);
      const reach = Math.max(175, Math.min(225, maxReach));

      return { x: centerX, y: centerY, reach };
    } else {
      // Centered on smaller screens
      return {
        x: width * 0.5,
        y: height * 0.42,
        reach: Math.min(width * 0.35, 140)
      };
    }
  }

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

  // Draw delicate engineering crosshairs at grid intersections
  function drawEngineeringGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.04)';
    ctx.lineWidth = 0.75;

    // Faint grid lines
    for (let x = 0; x < width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Small coordinate tick marks
    ctx.strokeStyle = 'rgba(15, 39, 86, 0.12)';
    ctx.lineWidth = 1;
    const tick = 3;
    for (let x = GRID_SIZE; x < width; x += GRID_SIZE * 2) {
      for (let y = GRID_SIZE; y < height; y += GRID_SIZE * 2) {
        ctx.beginPath();
        ctx.moveTo(x - tick, y);
        ctx.lineTo(x + tick, y);
        ctx.moveTo(x, y - tick);
        ctx.lineTo(x, y + tick);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Draw the kinetic mechanism linkage
  function drawKinematics(layout) {
    if (!layout) layout = getEmptySpaceLayout();

    // Smooth mouse position damping
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Center in the empty space made for animation with enlarged appropriate reach
    const baseX = layout.x;
    const baseY = layout.y;
    const reach = layout.reach;

    let currentX = baseX;
    let currentY = baseY;

    // Concentric calibration polar guide rings around the center of the empty space
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 39, 86, 0.07)';
    ctx.lineWidth = 0.85;
    ctx.setLineDash([4, 4]);
    [reach * 0.35, reach * 0.70, reach * 1.0].forEach(r => {
      ctx.beginPath();
      ctx.arc(baseX, baseY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Polar axis lines across the mechanism zone
    ctx.strokeStyle = 'rgba(15, 39, 86, 0.06)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(baseX - reach * 1.08, baseY);
    ctx.lineTo(baseX + reach * 1.08, baseY);
    ctx.moveTo(baseX, baseY - reach * 1.08);
    ctx.lineTo(baseX, baseY + reach * 1.08);
    ctx.stroke();
    ctx.restore();

    // Central datum pivot mark
    ctx.beginPath();
    ctx.arc(baseX, baseY, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 39, 86, 0.75)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(baseX, baseY, 15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15, 39, 86, 0.25)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX - 22, baseY);
    ctx.lineTo(baseX + 22, baseY);
    ctx.moveTo(baseX, baseY - 22);
    ctx.lineTo(baseX, baseY + 22);
    ctx.strokeStyle = 'rgba(15, 39, 86, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Iterate through kinematic joints
    for (let i = 0; i < joints.length; i++) {
      const j = joints[i];
      j.angle += j.speed;
      const armLength = reach * j.ratio;

      // Inverse kinematic attraction to cursor when active
      let effectiveAngle = j.angle;
      if (mouse.active) {
        const dx = mouse.x - baseX;
        const dy = mouse.y - baseY;
        const targetAngle = Math.atan2(dy, dx);
        effectiveAngle += (targetAngle - j.angle) * (0.06 / (i + 1));
      }

      const nextX = currentX + Math.cos(effectiveAngle) * armLength;
      const nextY = currentY + Math.sin(effectiveAngle) * armLength;

      // Link arm bar with crisp line weights
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(nextX, nextY);
      ctx.strokeStyle = j.color;
      ctx.lineWidth = i === 0 ? 2.2 : (i === 1 ? 1.75 : 1.4);
      ctx.stroke();

      // Joint pivot node
      ctx.beginPath();
      ctx.arc(nextX, nextY, i === joints.length - 1 ? 4.5 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === joints.length - 1 ? 'rgba(190, 30, 45, 0.9)' : 'rgba(15, 39, 86, 0.75)';
      ctx.fill();

      // Outer ring on joint node
      ctx.beginPath();
      ctx.arc(nextX, nextY, i === joints.length - 1 ? 8 : 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = i === joints.length - 1 ? 'rgba(190, 30, 45, 0.3)' : 'rgba(15, 39, 86, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      currentX = nextX;
      currentY = nextY;
    }

    // Record end-effector trajectory
    trajectoryPoints.push({ x: currentX, y: currentY });
    if (trajectoryPoints.length > MAX_TRAIL) {
      trajectoryPoints.shift();
    }

    // Draw fading trajectory path
    if (trajectoryPoints.length > 2) {
      ctx.beginPath();
      for (let i = 0; i < trajectoryPoints.length; i++) {
        const pt = trajectoryPoints[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(190, 30, 45, 0.22)';
      ctx.lineWidth = 1.35;
      ctx.stroke();
    }

    // End-effector sensor aura
    ctx.beginPath();
    ctx.arc(currentX, currentY, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(190, 30, 45, 0.08)';
    ctx.fill();
  }

  let frameCount = 0;
  let currentLayout = null;

  function render() {
    frameCount++;
    time += 0.01;
    ctx.clearRect(0, 0, width, height);

    if (frameCount % 30 === 1 || !currentLayout) {
      currentLayout = getEmptySpaceLayout();
    }

    drawEngineeringGrid();
    drawKinematics(currentLayout);

    animId = requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom) {
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    } else {
      mouse.active = false;
    }
  });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animId) cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(render);
    }
  });

  resize();
  render();
})();
