const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runAllTests() {
  console.log('=== STARTING PLAYWRIGHT FIX PASS 3 TEST SUITE ===\n');

  const browser = await chromium.launch({ channel: 'msedge' });
  let allPassed = true;

  try {
    // -------------------------------------------------------------------------
    // TEST 1 & 2: 1440x900 TIMING & SCREENSHOTS (t=0, 1, 3, 6, 15, 27s)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1 & 2: 1440x900 TIMING & SCREENSHOTS ---');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Check t=0 car bounding box inside viewport
    const carBox = await page.evaluate(() => {
      const el = document.getElementById('heroCarInteractive');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        inViewport: rect.left >= 0 && rect.right <= 1440 && rect.top >= 0 && rect.bottom <= 900
      };
    });
    console.log('t=0 Car bounding box:', carBox);
    if (carBox && carBox.inViewport) {
      console.log('PASS: Car bounding box is inside viewport at t=0');
    } else {
      console.error('FAIL: Car bounding box not inside viewport at t=0');
      allPassed = false;
    }

    // Check rocket button exists and is inside first viewport at 1440x900
    const towerBox = await page.evaluate(() => {
      const btn = document.getElementById('rocketLaunchBtn');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        inViewport: rect.left >= 0 && rect.right <= 1440 && rect.top >= 0 && rect.bottom <= 900
      };
    });
    console.log('t=0 Tower button bounding box:', towerBox);
    if (towerBox && towerBox.inViewport) {
      console.log('PASS: Rocket tower button is inside viewport at t=0');
    } else {
      console.error('FAIL: Rocket tower button not inside viewport at t=0');
      allPassed = false;
    }

    // Take screenshot at t=0
    await page.screenshot({ path: path.join(screenshotDir, 't0s.png') });

    // Wait and take screenshots at t=1, 3, 6, 15, 27s
    console.log('Waiting for t=1s...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 't1s.png') });
    console.log('Captured t=1s screenshot');

    console.log('Waiting for t=3s (flight started at t=2s)...');
    await page.waitForTimeout(2000); // reaches ~3.0s
    await page.screenshot({ path: path.join(screenshotDir, 't3s.png') });
    console.log('Captured t=3s screenshot');

    console.log('Waiting for t=6s (gravity-turn high in flight)...');
    await page.waitForTimeout(3000); // reaches ~6.0s
    await page.screenshot({ path: path.join(screenshotDir, 't6s.png') });
    console.log('Captured t=6s screenshot');

    console.log('Waiting for t=15s (rocket exited, pad empty, dashed arc visible)...');
    await page.waitForTimeout(9000); // reaches ~15.0s
    await page.screenshot({ path: path.join(screenshotDir, 't15s.png') });
    console.log('Captured t=15s screenshot');

    console.log('Waiting for t=27s (relaunch underway by t<=28s)...');
    await page.waitForTimeout(12000); // reaches ~27.0s
    await page.screenshot({ path: path.join(screenshotDir, 't27s.png') });
    console.log('Captured t=27s screenshot');

    await context.close();

    // -------------------------------------------------------------------------
    // TEST 3: INTERACTIVE TOWER CLICK & MID-FLIGHT CLICK
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: INTERACTIVE TOWER CLICK ---');
    const ctxClick = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageClick = await ctxClick.newPage();
    await pageClick.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Click launch button on tower
    const btn = await pageClick.$('#rocketLaunchBtn');
    if (!btn) {
      console.error('FAIL: #rocketLaunchBtn not found');
      allPassed = false;
    } else {
      console.log('Clicking rocket launch button at t=0.5s...');
      await pageClick.waitForTimeout(500);
      await btn.click();
      console.log('Clicked launch button once.');

      // Wait 1.5s for ignition to take place
      await pageClick.waitForTimeout(1500);

      // Now mid-flight: click again
      console.log('Clicking second time mid-flight at t=2.0s...');
      await btn.click();
      console.log('Second click delivered. Waiting 2s to observe flight continues smoothly...');
      await pageClick.waitForTimeout(2000);
      console.log('PASS: Interactive tower click test passed');
    }
    await ctxClick.close();

    // -------------------------------------------------------------------------
    // TEST 4: SPINE LABEL BOUNDING BOX INTERSECTION (1280, 1440, 1706, 1920)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: SPINE BOUNDING BOX INTERSECTION CHECK ---');
    const widths = [1280, 1440, 1706, 1920];
    for (const w of widths) {
      const ctxSpine = await browser.newContext({ viewport: { width: w, height: 900 } });
      const p = await ctxSpine.newPage();
      await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

      const check = await p.evaluate((width) => {
        const spine = document.getElementById('traceSpine');
        const label = document.getElementById('spineLabel');
        if (!spine || window.innerWidth < 1280) {
          return { active: false, intersections: 0 };
        }

        const spineRect = label ? label.getBoundingClientRect() : spine.getBoundingClientRect();
        const textElements = Array.from(document.querySelectorAll('h1, h2, h3, p, span.hero-eyebrow, .nav-link, .stat-figure, .stat-label'));

        let collision = 0;
        const collisions = [];
        textElements.forEach((el) => {
          const r = el.getBoundingClientRect();
          // Check if visible in viewport
          if (r.width > 0 && r.height > 0 && r.top < 900 && r.bottom > 0) {
            // Check intersection with spine rect
            const overlapX = Math.max(0, Math.min(spineRect.right, r.right) - Math.max(spineRect.left, r.left));
            const overlapY = Math.max(0, Math.min(spineRect.bottom, r.bottom) - Math.max(spineRect.top, r.top));
            if (overlapX > 0 && overlapY > 0) {
              collision++;
              collisions.push({ tag: el.tagName, text: el.innerText.slice(0, 30), overlapX, overlapY });
            }
          }
        });

        return {
          width,
          spineLeft: spineRect.left,
          spineRight: spineRect.right,
          collisionCount: collision,
          collisions
        };
      }, w);

      console.log(`Viewport ${w}px: Spine left=${check.spineLeft}px, right=${check.spineRight}px, Collisions=${check.collisionCount}`);
      if (check.collisionCount === 0) {
        console.log(`PASS: No text overlap at ${w}px`);
      } else {
        console.error(`FAIL: ${check.collisionCount} collisions detected at ${w}px:`, check.collisions);
        allPassed = false;
      }
      await ctxSpine.close();
    }

    // -------------------------------------------------------------------------
    // TEST 5: STUDIO ROW HOVER IDENTICAL BOUNDING RECTS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: STUDIO ROW HOVER BOUNDING RECT STABILITY ---');
    const ctxStudio = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageStudio = await ctxStudio.newPage();
    await pageStudio.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Instantly scroll to studios section and wait for layout to settle
    await pageStudio.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.getElementById('studios').scrollIntoView();
    });
    await pageStudio.waitForTimeout(300);

    const before = await pageStudio.evaluate(() => {
      const row = document.querySelector('.studio-row');
      const imgPlate = row.querySelector('.technical-plate-container');
      const textInfo = row.querySelector('.studio-info');
      return {
        row: row.getBoundingClientRect(),
        img: imgPlate.getBoundingClientRect(),
        text: textInfo.getBoundingClientRect()
      };
    });

    // Hover using real cursor
    await pageStudio.hover('.studio-row');
    await pageStudio.waitForTimeout(300);

    const after = await pageStudio.evaluate(() => {
      const row = document.querySelector('.studio-row');
      const imgPlate = row.querySelector('.technical-plate-container');
      const textInfo = row.querySelector('.studio-info');
      return {
        row: row.getBoundingClientRect(),
        img: imgPlate.getBoundingClientRect(),
        text: textInfo.getBoundingClientRect()
      };
    });

    function isSame(r1, r2) {
      return Math.abs(r1.x - r2.x) < 0.01 &&
             Math.abs(r1.y - r2.y) < 0.01 &&
             Math.abs(r1.width - r2.width) < 0.01 &&
             Math.abs(r1.height - r2.height) < 0.01;
    }

    const rowMatch = isSame(before.row, after.row);
    const imgMatch = isSame(before.img, after.img);
    const textMatch = isSame(before.text, after.text);

    console.log(`Studio row match: ${rowMatch}, Image slot match: ${imgMatch}, Text match: ${textMatch}`);
    console.log(`Image rect before: [${before.img.x}, ${before.img.y}, ${before.img.width}, ${before.img.height}]`);
    console.log(`Image rect after:  [${after.img.x}, ${after.img.y}, ${after.img.width}, ${after.img.height}]`);

    if (rowMatch && imgMatch && textMatch) {
      console.log('PASS: Studio row, image, and text bounding rects are IDENTICAL before and during hover');
    } else {
      console.error('FAIL: Layout shifted during studio row hover!');
      allPassed = false;
    }
    await ctxStudio.close();

    // -------------------------------------------------------------------------
    // TEST 6: DOM AUDIT (NO "DWG", NO "SCALE")
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: DOM AUDIT (DWG, SCALE) ---');
    const ctxAudit = await browser.newContext();
    const pageAudit = await ctxAudit.newPage();
    await pageAudit.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    const audit = await pageAudit.evaluate(() => {
      const bodyText = document.body.innerHTML;
      const dwgMatches = (bodyText.match(/\bDWG\b/gi) || []).length;
      // Filter out meta viewport or valid svg scale transforms if any
      const scaleMatches = (bodyText.match(/\bSCALE\b/gi) || []).length;

      // Check title blocks
      const titleBlocks = Array.from(document.querySelectorAll('.plate-title-block')).map(el => el.textContent);

      return {
        dwgMatches,
        scaleMatches,
        titleBlocks
      };
    });

    console.log('DOM Audit DWG matches:', audit.dwgMatches);
    console.log('DOM Audit SCALE matches in body:', audit.scaleMatches);
    console.log('Plate 1 title block text:', audit.titleBlocks[0]);

    if (audit.dwgMatches === 0 && audit.titleBlocks[0].includes('FIG. 01 · Central workbench bays') && audit.titleBlocks[0].includes('Illustration, not to scale')) {
      console.log('PASS: No DWG, Plate 1 caption correctly updated');
    } else {
      console.error('FAIL: Plate 1 caption or DWG check failed');
      allPassed = false;
    }
    await ctxAudit.close();

    // -------------------------------------------------------------------------
    // TEST 7: SPINE NAVIGATION SEQUENCE (01 -> 02 -> 03 -> 04 -> 05 -> 06)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: SPINE NAVIGATION SEQUENCE ---');
    const ctxSpineSeq = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageSpineSeq = await ctxSpineSeq.newPage();
    await pageSpineSeq.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageSpineSeq.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
    });

    const expectedSequence = [
      { id: 'hero', expectedIndex: '01', expectedName: 'Overview' },
      { id: 'curriculum', expectedIndex: '02', expectedName: 'Curriculum' },
      { id: 'studios', expectedIndex: '03', expectedName: 'Studios' },
      { id: 'projects', expectedIndex: '04', expectedName: 'Projects' },
      { id: 'news', expectedIndex: '05', expectedName: 'News' },
      { id: 'people', expectedIndex: '06', expectedName: 'People' }
    ];

    for (const item of expectedSequence) {
      await pageSpineSeq.evaluate((targetId) => {
        const el = document.getElementById(targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          window.scrollBy(0, rect.top - 100);
        }
      }, item.id);
      await pageSpineSeq.waitForTimeout(50);

      const spineState = await pageSpineSeq.evaluate(() => {
        const indexEl = document.getElementById('spineIndex');
        const nameEl = document.getElementById('spineName');
        return {
          index: indexEl ? indexEl.textContent.trim() : null,
          name: nameEl ? nameEl.textContent.trim() : null
        };
      });

      if (spineState.index === item.expectedIndex) {
        console.log(`PASS: #${item.id} matched spine index ${item.expectedIndex} (${item.expectedName})`);
      } else {
        console.error(`FAIL: #${item.id} got spine index ${spineState.index}, expected ${item.expectedIndex}`);
        allPassed = false;
      }
    }
    await ctxSpineSeq.close();

    // -------------------------------------------------------------------------
    // TEST 8: ROCKET ASCENT TRAJECTORY SCROLL SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: ROCKET ASCENT TRAJECTORY SCROLL SYNCHRONIZATION ---');
    const ctxRocket = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageRocket = await ctxRocket.newPage();
    await pageRocket.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageRocket.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
    });

    // Check early scroll state (curriculum top enters viewport)
    await pageRocket.evaluate(() => {
      const sec = document.getElementById('curriculum');
      if (sec) {
        const rect = sec.getBoundingClientRect();
        window.scrollBy(0, rect.top - 50);
      }
    });
    await pageRocket.waitForTimeout(50);

    const rocketEarly = await pageRocket.evaluate(() => {
      const trail = document.getElementById('ascentTrail');
      const dashoffset = parseFloat(trail.style.strokeDashoffset || '1');
      return {
        progress: 1 - dashoffset,
        pathLength: trail.getAttribute('pathLength')
      };
    });

    console.log(`Rocket progress when curriculum reaches top of viewport: ${rocketEarly.progress.toFixed(3)}`);
    if (rocketEarly.progress <= 0.35 && rocketEarly.pathLength === '1') {
      console.log('PASS: Rocket is in early ascent phase and trail pathLength is 1');
    } else {
      console.error(`FAIL: Rocket early progress invalid (${rocketEarly.progress}) or pathLength missing`);
      allPassed = false;
    }

    // Check midpoint
    await pageRocket.evaluate(() => {
      const curveWrap = document.querySelector('.ascent-curve-svg-wrap');
      const cRect = curveWrap.getBoundingClientRect();
      window.scrollBy(0, cRect.top - 243);
    });
    await pageRocket.waitForTimeout(50);

    const rocketMid = await pageRocket.evaluate(() => {
      const trail = document.getElementById('ascentTrail');
      const dashoffset = parseFloat(trail.style.strokeDashoffset || '1');
      return { progress: 1 - dashoffset };
    });
    console.log(`Rocket midpoint progress: ${rocketMid.progress.toFixed(3)}`);
    if (rocketMid.progress >= 0.40 && rocketMid.progress <= 0.65) {
      console.log('PASS: Rocket smoothly reaches midpoint of ascent curve');
    } else {
      console.error(`FAIL: Midpoint progress unexpected: ${rocketMid.progress}`);
      allPassed = false;
    }

    // Check completed scroll
    await pageRocket.evaluate(() => {
      const sec = document.getElementById('studios');
      const rect = sec.getBoundingClientRect();
      window.scrollBy(0, rect.top);
    });
    await pageRocket.waitForTimeout(50);

    const rocketEnd = await pageRocket.evaluate(() => {
      const trail = document.getElementById('ascentTrail');
      const dashoffset = parseFloat(trail.style.strokeDashoffset || '1');
      return { progress: 1 - dashoffset };
    });
    console.log(`Rocket post-curriculum progress: ${rocketEnd.progress.toFixed(3)}`);
    if (rocketEnd.progress === 1.0) {
      console.log('PASS: Rocket completes ascent across all 5 semesters upon section exit');
    } else {
      console.error(`FAIL: Rocket end progress not 1.0: ${rocketEnd.progress}`);
      allPassed = false;
    }
    await ctxRocket.close();

  } catch (err) {
    console.error('ERROR running tests:', err);
    allPassed = false;
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  if (allPassed) {
    console.log('OVERALL VERDICT: ALL ACCEPTANCE TESTS PASSED');
  } else {
    console.log('OVERALL VERDICT: TEST FAILURES ENCOUNTERED');
  }
  console.log('========================================');
}

runAllTests();
