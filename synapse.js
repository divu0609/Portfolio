/**
 * synapse.js — Sketch-Style Neural Synapse Animation v2
 * Dark/Light adaptive theme, organic hand-drawn network,
 * glowing pulses, text illumination proximity, mouse distortion.
 */
(function () {
    'use strict';

    // ─── Theme Palettes ────────────────────────────────────────────────────────
    const THEMES = {
        dark: {
            bg: [2, 6, 23],            // #020617
            bgFill: 'rgba(2,6,23,0.055)',
            lineColor: [190, 210, 240],   // soft blue-white, pencil-glow
            pulseColor: [140, 200, 255],  // cyan-blue pulse
            sparkColor: [180, 230, 255],
            nodeColor: [160, 210, 255],
            glowColor: 'rgba(100,170,255,',
            grainOpacity: 0.028,
            lineAlphaBase: 0.14,
            lineWidth: 0.65,
        },
        light: {
            bg: [248, 248, 248],         // #f8f8f8
            bgFill: 'rgba(248,248,248,0.07)',
            lineColor: [34, 34, 34],     // #222, pencil dark
            pulseColor: [40, 40, 80],    // ink dots
            sparkColor: [60, 60, 100],
            nodeColor: [30, 30, 70],
            glowColor: 'rgba(40,40,80,',
            grainOpacity: 0.04,          // stronger grain for paper feel
            lineAlphaBase: 0.18,
            lineWidth: 0.7,
        }
    };

    // ─── Config ────────────────────────────────────────────────────────────────
    const CFG = {
        nodeCount: 58,
        maxEdgeDist: 235,
        jitterAmp: 1.9,
        jitterSegs: 9,
        pulseSpeed: 0.0038,
        basePulseRate: 0.055,
        trailLen: 22,
        sparkCount: 7,
        drawInSpeed: 0.0038,
        mouseDistortRadius: 155,
        mouseDistortAmp: 14,
        textProximityRadius: 200,    // pulses within this px will illuminate text
        textGlowStrength: 0.0,       // current strength, animated
    };

    let canvas, ctx, W, H;
    let nodes = [], edges = [], pulses = [], sparks = [];
    let grainCanvas, grainCtx;
    let mouse = { x: -9999, y: -9999, active: false };
    let scrollRatio = 0;
    let time = 0;
    let raf;
    let theme = THEMES.dark;
    let isDark = true;

    // Text element bounding rects cache (updated periodically)
    let textRects = [];
    let textGlowMap = new WeakMap(); // el -> {glow, el}
    let lastRectUpdate = 0;

    // ─── Value Noise (seeded jitter) ───────────────────────────────────────────
    function hash(x, y) {
        let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }
    function vnoise(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const a = hash(ix, iy), b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
        return a + (b - a) * ux + (c - a) * uy + (d - a + a - b - c + b) * ux * uy;
    }

    // ─── Network ───────────────────────────────────────────────────────────────
    function buildNetwork() {
        nodes = Array.from({ length: CFG.nodeCount }, () => ({
            x: rand(W * 0.05, W * 0.95),
            y: rand(H * 0.05, H * 0.95),
            r: rand(1.1, 2.6),
            phase: rand(0, Math.PI * 2),
            glow: 0,
            burst: 0,
        }));
        rebuildEdges();
    }

    function rebuildEdges() {
        edges = [];
        const md2 = CFG.maxEdgeDist * CFG.maxEdgeDist;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                if (dx * dx + dy * dy < md2) {
                    edges.push({ a: i, b: j, activity: 0, drawProgress: 0 });
                }
            }
        }
    }

    // ─── Sketch Line ───────────────────────────────────────────────────────────
    function sketchLine(x1, y1, x2, y2, alpha, width, t, mouseDistort) {
        const segs = CFG.jitterSegs;
        const amp = CFG.jitterAmp * (0.8 + alpha * 1.2);
        const [r, g, b] = theme.lineColor;

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let i = 1; i <= segs; i++) {
            const tSeg = i / segs;
            let bx = x1 + (x2 - x1) * tSeg;
            let by = y1 + (y2 - y1) * tSeg;

            // Perpendicular jitter
            const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
            const nx = -(y2 - y1) / len;
            const ny = (x2 - x1) / len;
            const jit = (vnoise(bx * 0.013 + t * 0.28, by * 0.013) - 0.5) * 2 * amp;

            // Mouse distortion: pull lines near cursor
            if (mouseDistort && mouse.active) {
                const mdx = bx - mouse.x, mdy = by - mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < CFG.mouseDistortRadius) {
                    const force = (1 - mdist / CFG.mouseDistortRadius);
                    const angle = Math.atan2(mdy, mdx) + Math.PI * 0.5 * Math.sin(time * 2.5 + tSeg * 3);
                    bx += Math.cos(angle) * force * CFG.mouseDistortAmp * (vnoise(bx * 0.02 + t, by * 0.02) - 0.3);
                    by += Math.sin(angle) * force * CFG.mouseDistortAmp * (vnoise(bx * 0.02, by * 0.02 + t) - 0.3);
                }
            }

            ctx.lineTo(bx + nx * jit, by + ny * jit);
        }

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // ─── Film Grain ────────────────────────────────────────────────────────────
    function buildGrain() {
        grainCanvas = document.createElement('canvas');
        grainCanvas.width = 256;
        grainCanvas.height = 256;
        grainCtx = grainCanvas.getContext('2d');
        refreshGrain();
    }

    function refreshGrain() {
        const id = grainCtx.createImageData(256, 256);
        for (let i = 0; i < id.data.length; i += 4) {
            const v = Math.random() * 255;
            id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
            id.data[i + 3] = Math.random() * (isDark ? 30 : 45);
        }
        grainCtx.putImageData(id, 0, 0);
    }

    function drawGrain() {
        if (!grainCanvas) return;
        ctx.globalAlpha = theme.grainOpacity;
        ctx.globalCompositeOperation = isDark ? 'overlay' : 'multiply';
        const pat = ctx.createPattern(grainCanvas, 'repeat');
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── Paper Texture (light mode) ────────────────────────────────────────────
    // Subtle warm radial vignette to simulate paper material
    function drawPaperTexture() {
        if (isDark) return;
        const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
        grad.addColorStop(0, 'rgba(255,250,240,0)');
        grad.addColorStop(1, 'rgba(220,210,195,0.06)');
        ctx.global = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // ─── Pulses ────────────────────────────────────────────────────────────────
    function spawnPulse() {
        if (!edges.length) return;
        const edge = edges[Math.floor(Math.random() * edges.length)];
        const fwd = Math.random() > 0.5;
        const hovered = mouse.active;
        pulses.push({
            edge, t: 0, forward: fwd,
            speed: CFG.pulseSpeed * rand(0.8, 1.5) * (1 + scrollRatio * 2.2) * (hovered ? 1.5 : 1),
            bright: rand(0.55, 1.0),
            trail: [],
        });
    }

    function spawnSpark(x, y) {
        for (let i = 0; i < CFG.sparkCount; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(0.4, 1.6);
            sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, decay: rand(0.025, 0.055) });
        }
    }

    // ─── Text Rect Cache ───────────────────────────────────────────────────────
    function updateTextRects() {
        const now = performance.now();
        if (now - lastRectUpdate < 2000) return; // refresh every 2s
        lastRectUpdate = now;

        // Collect all meaningful text elements in the main content
        const selectors = ['h1', 'h2', 'h3', 'h4', '.hero-title', '.section-title', '.subtitle p', 'p'];
        textRects = [];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.closest('#synapse-canvas, script, style, .contact-modal')) return;
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < H) {
                    textRects.push({ el, rect, glow: 0 });
                    if (!textGlowMap.has(el)) {
                        textGlowMap.set(el, { glow: 0 });
                    }
                }
            });
        });
    }

    // ─── Apply synapse-illumination to DOM text elements ──────────────────────
    function applyTextGlow(el, glowAmount) {
        const data = textGlowMap.get(el);
        if (!data) return;
        // Smoothly increase, then let it decay slowly
        data.glow = Math.max(data.glow, glowAmount);
        data.glow *= 0.93; // decay per frame
        
        // Text glow effect has been removed per user request
        el.style.textShadow = '';
        el.style.transition = '';
    }

    function illuminateNearbyText(px, py) {
        textRects.forEach(entry => {
            const { el, rect } = entry;
            // Check proximity of pulse to element rect (expanded by radius)
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = px - cx, dy = py - cy;
            // Also check boundary proximity
            const nx = Math.max(rect.left, Math.min(px, rect.right));
            const ny = Math.max(rect.top, Math.min(py, rect.bottom));
            const dist = Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
            if (dist < CFG.textProximityRadius) {
                const strength = Math.pow(1 - dist / CFG.textProximityRadius, 1.6);
                applyTextGlow(el, strength * 0.95);
            }
        });
        // Decay all the rest
        textRects.forEach(({ el }) => {
            const data = textGlowMap.get(el);
            if (data && data.glow < 0.04) {
                el.style.textShadow = '';
            }
        });
    }

    // ─── Main Draw Loop ────────────────────────────────────────────────────────
    function draw() {
        time += 0.008;
        const activityMult = 1 + scrollRatio * 2.8 + (mouse.active ? 0.9 : 0);

        // Ghost trail BG fill
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = theme.bgFill;
        ctx.fillRect(0, 0, W, H);

        // Spawn pulses
        if (Math.random() < CFG.basePulseRate * activityMult) spawnPulse();

        // ── Edges ──────────────────────────────────────────────────────────────
        edges.forEach(e => {
            const na = nodes[e.a], nb = nodes[e.b];
            e.drawProgress = Math.min(1, e.drawProgress + CFG.drawInSpeed);

            const dx = nb.x - na.x, dy = nb.y - na.y;
            const fullAlpha = theme.lineAlphaBase + e.activity * 0.28;
            const alpha = fullAlpha * e.drawProgress;
            if (alpha < 0.005) return;

            const ex = na.x + dx * e.drawProgress;
            const ey = na.y + dy * e.drawProgress;

            sketchLine(na.x, na.y, ex, ey, alpha, theme.lineWidth, time + e.a * 0.4, true);

            // Mouse hover glow pass
            if (mouse.active) {
                const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
                const mdx = mx - mouse.x, mdy = my - mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 170) {
                    const boost = (1 - mdist / 170) * (isDark ? 0.22 : 0.15);
                    sketchLine(na.x, na.y, nb.x, nb.y, boost, isDark ? 1.5 : 1.2, time + 0.5, false);
                }
            }

            e.activity *= 0.935;
        });

        // ── Nodes ──────────────────────────────────────────────────────────────
        const [nr, ng, nb_c] = theme.nodeColor;
        nodes.forEach(n => {
            const wobble = Math.sin(time * 1.1 + n.phase) * 0.45;

            if (mouse.active) {
                const mdx = n.x - mouse.x, mdy = n.y - mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 145) n.glow = Math.max(n.glow, 1 - mdist / 145);
            }
            n.glow *= 0.9;
            n.burst = Math.max(0, n.burst - 0.038);

            const r = n.r + n.glow * 2.8 + n.burst * 5.5;
            const alpha = 0.32 + n.glow * 0.52 + n.burst * 0.42;

            if (n.burst > 0.08 && isDark) {
                // Burst ring (dark mode only — more visible)
                ctx.beginPath();
                ctx.arc(n.x + wobble, n.y, r + 8, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${nr},${ng},${nb_c},${n.burst * 0.22})`;
                ctx.lineWidth = 1.0;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(n.x + wobble, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${nr},${ng},${nb_c},${alpha})`;
            ctx.fill();
        });

        // ── Pulses ─────────────────────────────────────────────────────────────
        updateTextRects();
        let activePulsePositions = [];

        const [pr, pg, pb_c] = theme.pulseColor;
        pulses = pulses.filter(p => {
            p.t += p.speed * (mouse.active ? 1.35 : 1);
            if (p.t >= 1) {
                const nd = nodes[p.forward ? p.edge.b : p.edge.a];
                nd.burst = Math.min(1, nd.burst + 0.88);
                spawnSpark(nd.x, nd.y);
                p.edge.activity = Math.min(1, p.edge.activity + 0.58);
                return false;
            }

            const na = nodes[p.edge.a], nb = nodes[p.edge.b];
            const t = p.forward ? p.t : 1 - p.t;

            const dx = nb.x - na.x, dy = nb.y - na.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const bx = na.x + dx * t, by = na.y + dy * t;
            const jit = (vnoise(bx * 0.013 + time * 0.28, by * 0.013) - 0.5) * 2 * CFG.jitterAmp;
            const px = bx + nx * jit, py = by + ny * jit;

            p.trail.push({ x: px, y: py });
            if (p.trail.length > CFG.trailLen) p.trail.shift();

            // Draw trail
            p.trail.forEach((pt, i) => {
                const ta = (i / CFG.trailLen) * p.bright * (isDark ? 0.62 : 0.45);
                const tr = (i / CFG.trailLen) * (isDark ? 1.3 : 1.0);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${pr},${pg},${pb_c},${ta})`;
                ctx.fill();
            });

            // Pulse head
            if (isDark) {
                ctx.shadowColor = `rgba(${pr},${pg},${pb_c},0.55)`;
                ctx.shadowBlur = 8;
            }
            ctx.beginPath();
            ctx.arc(px, py, isDark ? 2.1 : 1.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${pr},${pg},${pb_c},${p.bright * 0.96})`;
            ctx.fill();
            ctx.shadowBlur = 0;

            activePulsePositions.push({ x: px, y: py });
            return true;
        });

        // Illuminate nearby text from active pulses
        activePulsePositions.forEach(pos => illuminateNearbyText(pos.x, pos.y));

        // ── Sparks ─────────────────────────────────────────────────────────────
        const [sr, sg, sb_c] = theme.sparkColor;
        sparks = sparks.filter(s => {
            s.x += s.vx; s.y += s.vy;
            s.vx *= 0.87; s.vy *= 0.87;
            s.life -= s.decay;
            if (s.life <= 0) return false;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.life * (isDark ? 1.6 : 1.2), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${sr},${sg},${sb_c},${s.life * (isDark ? 0.72 : 0.5)})`;
            ctx.fill();
            return true;
        });

        // ── Paper texture + Film Grain ─────────────────────────────────────────
        drawPaperTexture();
        if (Math.floor(time * 125) % 3 === 0) refreshGrain();
        drawGrain();
    }

    function loop() { draw(); raf = requestAnimationFrame(loop); }

    // ─── Theme Switch ──────────────────────────────────────────────────────────
    function applyTheme(dark) {
        isDark = dark;
        theme = dark ? THEMES.dark : THEMES.light;

        // Clear and repaint BG immediately on theme change
        const [br, bg_c, bb] = theme.bg;
        ctx.fillStyle = `rgb(${br},${bg_c},${bb})`;
        ctx.fillRect(0, 0, W, H);

        // Reset all text glow styles on theme switch
        textRects.forEach(({ el }) => { el.style.textShadow = ''; });
        textGlowMap = new WeakMap();
        lastRectUpdate = 0;
    }

    // ─── Resize ────────────────────────────────────────────────────────────────
    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        const [br, bg_c, bb] = theme.bg;
        ctx.fillStyle = `rgb(${br},${bg_c},${bb})`;
        ctx.fillRect(0, 0, W, H);
        buildNetwork();
        lastRectUpdate = 0; // force rect re-cache
    }

    // ─── Events ────────────────────────────────────────────────────────────────
    function bindEvents() {
        window.addEventListener('mousemove', e => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
        });
        window.addEventListener('mouseleave', () => {
            mouse.x = -9999; mouse.y = -9999; mouse.active = false;
        });
        window.addEventListener('scroll', () => {
            const ms = document.body.scrollHeight - window.innerHeight;
            scrollRatio = ms > 0 ? Math.min(1, window.scrollY / ms) : 0;
        }, { passive: true });
        window.addEventListener('resize', () => {
            cancelAnimationFrame(raf);
            resize();
            loop();
        });

        // Hook into existing theme toggle
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            // MutationObserver watches body class changes to stay in sync
            const bodyObserver = new MutationObserver(() => {
                const nowDark = document.body.classList.contains('dark-mode');
                if (nowDark !== isDark) applyTheme(nowDark);
            });
            bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────
    function rand(a, b) { return a + Math.random() * (b - a); }

    // ─── Init ──────────────────────────────────────────────────────────────────
    function init() {
        canvas = document.getElementById('synapse-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        // Detect initial theme from <body> class
        isDark = !document.body.classList.contains('light-mode');
        theme = isDark ? THEMES.dark : THEMES.light;

        buildGrain();
        resize();
        bindEvents();

        // Initial background fill
        const [br, bg_c, bb] = theme.bg;
        ctx.fillStyle = `rgb(${br},${bg_c},${bb})`;
        ctx.fillRect(0, 0, W, H);

        loop();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
