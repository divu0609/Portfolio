// Initialize Noise
const simplex = new SimplexNoise();

// Wait for DOM to load strictly for GSAP
document.addEventListener("DOMContentLoaded", () => {

    // --- SETUP LENIS SMOOTH SCROLL ---
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- SETUP SCROLLTRIGGER & TEXTPLUGIN ---
    gsap.registerPlugin(ScrollTrigger, TextPlugin);

    // Sync GSAP with Lenis
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Bidirectional Smooth reveal animations masking
    // Texts fade out naturally when exiting viewport
    gsap.utils.toArray('.reveal-text, .reveal-item').forEach(elem => {
        gsap.fromTo(elem,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: elem,
                    start: "top 90%",
                    end: "top 10%", // Triggers explicitly when the top of the element nears the top of the screen
                    toggleActions: "play reverse play reverse"
                }
            }
        );
    });

    // Custom Scroll Mechanics for Hero Exit & Sidebar Entry
    // 1. Blur and fade the Hero text
    gsap.to('.hero-title, .subtitle', {
        filter: "blur(12px)",
        opacity: 0,
        y: -30,
        scrollTrigger: {
            trigger: 'body',
            start: "top top",
            end: "15% top",
            scrub: true
        }
    });

    // 2. Fade out scroll-down indicator explicitly
    const scrollDownEl = document.querySelector('.scroll-down');
    if (scrollDownEl) {
        gsap.to(scrollDownEl, {
            opacity: 0,
            y: -20,
            scrollTrigger: {
                trigger: 'body',
                start: "top top",
                end: "10% top",
                scrub: true
            }
        });
    }

    // 3. Ruler and "Let's Talk" button slide into visibility once the 3D object clears (at About section)
    gsap.fromTo('.left-sidebar',
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, scrollTrigger: { trigger: '#about', start: "top 80%", end: "top 50%", scrub: true } }
    );
    gsap.fromTo('.fixed-action',
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, scrollTrigger: { trigger: '#about', start: "top 80%", end: "top 50%", scrub: true } }
    );
    gsap.fromTo('.trace-line',
        { width: "0vw" },
        { width: "40vw", scrollTrigger: { trigger: '#about', start: "top 80%", end: "top 50%", scrub: true } }
    );

    // 4. Sequential Typewriter Effect for About Section
    const aboutTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: '#about',
            start: "top 60%", // Triggers when section is 60% down the screen
            toggleActions: "restart reset restart reset" // Play dynamically every time the user visits!
        }
    });

    document.querySelectorAll('.typewriter-container p').forEach((p) => {
        const fullText = p.innerText;
        p.innerText = ''; // Blank out HTML on load
        aboutTimeline.to(p, {
            text: fullText,
            duration: fullText.length * 0.025, // typing speed modifier
            ease: "none"
        });
    });

    // Parallax background numbers
    gsap.utils.toArray('.bg-number').forEach(num => {
        gsap.to(num, {
            yPercent: 40,
            ease: "none",
            scrollTrigger: {
                trigger: num.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    });

    // 2. Dynamic Scroll Physics for Sidebar Pointer & Labels
    const sections = ['about', 'stack', 'work', 'philosophy', 'experience', 'contact'];

    let sectionMetrics = [];

    function calculateMetrics() {
        sectionMetrics = sections.map((sec) => {
            const el = document.getElementById(sec);
            const label = document.querySelector(`.label-${sec}`);
            if (!el || !label) return null;

            // Get the static physical center of the label on the screen
            const rect = label.getBoundingClientRect();
            const labelY = rect.top + rect.height / 2;

            // Get true absolute placement of the section block in the document
            const elTop = el.getBoundingClientRect().top + window.scrollY;

            // Bind native click-to-scroll functionality
            label.onclick = () => {
                window.scrollTo({
                    top: elTop,
                    behavior: 'smooth'
                });
            };

            return { el, label, labelY, elTop };
        }).filter(Boolean); // Clean any nulls
    }

    // Give DOM time to layout
    setTimeout(calculateMetrics, 150);
    window.addEventListener('resize', calculateMetrics);

    const pt = document.getElementById('sidebar-pointer');
    const tl = document.getElementById('trace-line');
    const la = document.querySelector('.fixed-action'); // Let's Talk button

    function updatePointer() {
        if (sectionMetrics.length === 0) return;

        // Define 'reading point' as slightly above dead-center of screen
        const scrollCenterY = window.scrollY + (window.innerHeight * 0.4);

        let activeIdx = 0;
        for (let i = 0; i < sectionMetrics.length; i++) {
            if (scrollCenterY >= sectionMetrics[i].elTop) {
                activeIdx = i;
            }
        }

        // Manage CSS visual highlighting classes
        sectionMetrics.forEach((m, i) => {
            if (i === activeIdx) m.label.classList.add('active');
            else m.label.classList.remove('active');
        });

        // Natively calculate exact fractional progress between the two structural blocks
        let targetY = sectionMetrics[activeIdx].labelY;

        if (activeIdx < sectionMetrics.length - 1) {
            const current = sectionMetrics[activeIdx];
            const next = sectionMetrics[activeIdx + 1];

            // Interpolar mathematical progression ratio
            const progress = (scrollCenterY - current.elTop) / (next.elTop - current.elTop);
            const clamped = Math.min(1.0, Math.max(0, progress));

            targetY = current.labelY + (next.labelY - current.labelY) * clamped;
        }

        // Apply native visual rendering transformation synchronously to ALL 3 parts!
        if (pt) pt.style.transform = `translateY(calc(${targetY}px - 50%))`;
        if (tl) tl.style.transform = `translateY(${targetY}px)`;
        if (la) la.style.transform = `translateY(calc(${targetY}px - 50%))`;
    }

    // Bind sub-pixel tracking natively to purely follow page scroll depth
    window.addEventListener('scroll', updatePointer, { passive: true });
    setTimeout(updatePointer, 200);
    // Synapse Counter Ticker
    let synapseCount = 260.485;
    const counterEl = document.getElementById('counter-val');
    setInterval(() => {
        synapseCount += 0.001 * (Math.random() * 5);
        if (counterEl) counterEl.innerText = synapseCount.toFixed(3);
    }, 50);

    // --- MECHANICAL RULER LOGIC ---
    const track = document.getElementById('ruler-track');
    const pointer = document.getElementById('sidebar-pointer');

    // Generate enough ticks to span a very long webpage natively
    const numTicks = 400;
    for (let i = 0; i < numTicks; i++) {
        const tick = document.createElement('div');
        tick.className = i % 10 === 0 ? 'tick long' : 'tick';
        track.appendChild(tick);
    }

    const ticksList = Array.from(document.querySelectorAll('.tick'));

    // --- THREE JS SCENE ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    const canvas = document.getElementById('webgl-canvas');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const radius = 6;
    const detail = 12;
    const geometry = new THREE.IcosahedronGeometry(radius, detail);

    const positions = geometry.attributes.position;
    const basePositions = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
        basePositions[i * 3] = positions.getX(i);
        basePositions[i * 3 + 1] = positions.getY(i);
        basePositions[i * 3 + 2] = positions.getZ(i);
    }
    geometry.setAttribute('basePosition', new THREE.BufferAttribute(basePositions, 3));

    // Theme Data for WebGL Materials
    const themeColors = {
        dark: {
            sphere1: 0x3b4a6b,
            sphere2: 0x5a6a8b,
            path: 0x2266aa,
            particle: 0x44eeff // Cyan electric
        },
        light: {
            sphere1: 0xb5b5b5,
            sphere2: 0xd0d0d0,
            path: 0xdd66aa,
            particle: 0xff33aa // Magenta in light mode
        }
    };
    let currentTheme = themeColors.dark;

    const matSphere1 = new THREE.MeshBasicMaterial({ color: currentTheme.sphere1, wireframe: true, transparent: true, opacity: 0.15 });
    const matSphere2 = new THREE.MeshBasicMaterial({ color: currentTheme.sphere2, wireframe: true, transparent: true, opacity: 0.1 });

    const sphere1 = new THREE.Mesh(geometry, matSphere1);
    const sphere2 = new THREE.Mesh(geometry, matSphere2);
    sphere2.scale.set(0.98, 0.98, 0.98);
    scene.add(sphere1);
    scene.add(sphere2);

    // Network / Flow Paths
    const linesGroup = new THREE.Group();
    const numLines = 60;
    const pointsPerLine = 150;

    const bgLineMats = [
        new THREE.LineBasicMaterial({ color: 0x243b55, transparent: true, opacity: 0.2 }),
        new THREE.LineBasicMaterial({ color: 0x142b45, transparent: true, opacity: 0.15 }),
        new THREE.LineBasicMaterial({ color: 0x3d5a80, transparent: true, opacity: 0.25 })
    ];
    const signalLineMat = new THREE.LineBasicMaterial({ color: currentTheme.path, transparent: true, opacity: 0.4 });
    const activePaths = [];

    for (let i = 0; i < numLines; i++) {
        const lineGeo = new THREE.BufferGeometry();
        const linePos = new Float32Array(pointsPerLine * 3);
        const isSignalPath = i < 4;
        let zOffset = (Math.random() - 0.5) * 40;
        let yOffset = (Math.random() - 0.5) * 20;

        if (isSignalPath) {
            yOffset = (Math.random() - 0.5) * 6;
            zOffset = (Math.random() - 0.5) * 4;
        }

        for (let j = 0; j < pointsPerLine; j++) {
            const x = (j / pointsPerLine) * 80 - 40;
            linePos[j * 3] = x;
            linePos[j * 3 + 1] = yOffset;
            linePos[j * 3 + 2] = zOffset;
        }
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
        lineGeo.setAttribute('basePosition', new THREE.BufferAttribute(new Float32Array(linePos), 3));

        let lineMat = isSignalPath ? signalLineMat : bgLineMats[Math.floor(Math.random() * bgLineMats.length)];
        const lineElem = new THREE.Line(lineGeo, lineMat);
        linesGroup.add(lineElem);

        if (isSignalPath) activePaths.push({ index: i, yOffset, zOffset });
    }
    scene.add(linesGroup);

    // Signal Particles (Electric Sparks)
    const signalParticles = [];
    const maxTrailLength = 8;
    const particleHeadGeo = new THREE.CircleGeometry(0.06, 8);
    const particleHeadMat = new THREE.MeshBasicMaterial({ color: currentTheme.particle });
    const particleTailMat = new THREE.LineBasicMaterial({ color: currentTheme.particle, transparent: true, opacity: 0.6 });

    function spawnSignalParticle() {
        if (activePaths.length === 0) return;
        const path = activePaths[Math.floor(Math.random() * activePaths.length)];

        const group = new THREE.Group();
        const head = new THREE.Mesh(particleHeadGeo, particleHeadMat);
        group.add(head);

        const tailPositions = new Float32Array(maxTrailLength * 3);
        const tailGeo = new THREE.BufferGeometry();
        tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
        const tail = new THREE.Line(tailGeo, particleTailMat);
        group.add(tail);

        head.position.set(-40, path.yOffset, path.zOffset);
        scene.add(group);

        signalParticles.push({
            group: group,
            head: head,
            tail: tail,
            path: path,
            x: -40,
            speed: 0.15 + Math.random() * 0.1,
            history: [] // stores previous pos for the tail
        });
    }

    // Interactive Loop Params
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999);
    let hoverPoint = null;
    let scrollYOffset = window.scrollY; // Connect canvas visually to the page scroll

    window.addEventListener('scroll', () => { scrollYOffset = window.scrollY; });
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; hoverPoint = null; });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Theme Toggle Mechanics
    let isDarkMode = true;
    document.getElementById('theme-toggle').addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';

        // Dynamically update ThreeJS materials based on theme
        currentTheme = isDarkMode ? themeColors.dark : themeColors.light;

        gsap.to(matSphere1.color, { r: new THREE.Color(currentTheme.sphere1).r, g: new THREE.Color(currentTheme.sphere1).g, b: new THREE.Color(currentTheme.sphere1).b, duration: 0.5 });
        gsap.to(matSphere2.color, { r: new THREE.Color(currentTheme.sphere2).r, g: new THREE.Color(currentTheme.sphere2).g, b: new THREE.Color(currentTheme.sphere2).b, duration: 0.5 });
        gsap.to(signalLineMat.color, { r: new THREE.Color(currentTheme.path).r, g: new THREE.Color(currentTheme.path).g, b: new THREE.Color(currentTheme.path).b, duration: 0.5 });
        gsap.to(particleHeadMat.color, { r: new THREE.Color(currentTheme.particle).r, g: new THREE.Color(currentTheme.particle).g, b: new THREE.Color(currentTheme.particle).b, duration: 0.5 });
        gsap.to(particleTailMat.color, { r: new THREE.Color(currentTheme.particle).r, g: new THREE.Color(currentTheme.particle).g, b: new THREE.Color(currentTheme.particle).b, duration: 0.5 });
    });

    // Animation Render Loop
    const clock = new THREE.Clock();
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        time += delta * 0.5;

        // Animate Canvas offset AND Scale perfectly based on Scroll depth
        scene.position.y = (scrollYOffset * 0.003); // parallax vertical

        // Scale down the sphere slightly as you scroll
        const pullScale = Math.max(0.65, 1 - (scrollYOffset * 0.00025));
        sphere1.scale.set(pullScale, pullScale, pullScale);
        sphere2.scale.set(pullScale * 0.98, pullScale * 0.98, pullScale * 0.98);

        // Slowly rotate sphere
        sphere1.rotation.y += delta * 0.05;
        sphere2.rotation.y += delta * 0.03;
        sphere1.rotation.z += delta * 0.02;

        // --- RULER ANIMATION LOGIC ---
        // 1. Move ruler upwards as we scroll down
        const scrollRatio = scrollYOffset * 0.25; // Speed multiplier for tactile feel
        track.style.transform = `translateY(${-scrollRatio}px)`;

        // 2. Collision Logic: Light up tick when passing pointer
        if (pointer) {
            const ptRect = pointer.getBoundingClientRect();
            // Center Y of the fixed pointer
            const matchY = ptRect.top + ptRect.height / 2;

            ticksList.forEach(tick => {
                const tr = tick.getBoundingClientRect();
                const tickCurrentY = tr.top + (tr.height / 2);

                // If the tick's current absolute position is within ~10px of the pointer 
                if (Math.abs(tickCurrentY - matchY) < 10) {
                    if (!tick.classList.contains('active')) tick.classList.add('active');
                } else {
                    if (tick.classList.contains('active')) tick.classList.remove('active');
                }
            });
        }

        // Raycasting for interactive vertex repel
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(sphere1);

        if (intersects.length > 0) {
            if (!hoverPoint) hoverPoint = intersects[0].point.clone();
            else hoverPoint.lerp(intersects[0].point, 0.1);
        } else {
            if (hoverPoint) {
                hoverPoint.lerp(new THREE.Vector3(0, 0, 0), 0.05);
                if (hoverPoint.length() < 0.1) hoverPoint = null;
            }
        }

        const deformGeometry = (mesh, noiseScale, noiseIntensity) => {
            const pos = mesh.geometry.attributes.position;
            const basePos = mesh.geometry.attributes.basePosition;

            // Amount to separate the hemispheres horizontally based on scroll
            const hemisphereSplit = scrollYOffset * 0.004;

            for (let i = 0; i < pos.count; i++) {
                const vx = basePos.getX(i);
                const vy = basePos.getY(i);
                const vz = basePos.getZ(i);

                let noiseVal = simplex.noise3D(
                    vx * noiseScale + time,
                    vy * noiseScale + time,
                    vz * noiseScale
                );

                let currentRadius = radius + noiseVal * noiseIntensity;
                const vec = new THREE.Vector3(vx, vy, vz).normalize().multiplyScalar(currentRadius);

                // Pull top and bottom hemispheres apart vertically
                if (vy > 0.2) {
                    vec.y += hemisphereSplit;
                } else if (vy < -0.2) {
                    vec.y -= hemisphereSplit;
                }

                // Repel
                if (hoverPoint) {
                    const worldVec = vec.clone().applyMatrix4(mesh.matrixWorld);
                    const dist = worldVec.distanceTo(hoverPoint);

                    const maxDist = 3.5;
                    if (dist < maxDist) {
                        const force = Math.pow((maxDist - dist) / maxDist, 2) * 1.5;
                        const direction = worldVec.clone().sub(hoverPoint).normalize();
                        worldVec.add(direction.multiplyScalar(force));
                        vec.copy(mesh.worldToLocal(worldVec));
                    }
                }

                pos.setXYZ(i, vec.x, vec.y, vec.z);
            }
            pos.needsUpdate = true;
        };

        deformGeometry(sphere1, 0.15, 1.2);
        deformGeometry(sphere2, 0.2, 0.8);

        sphere1.updateMatrixWorld();

        function getNominalWave(bx, by, lineIndex) {
            const waveY = simplex.noise3D(bx * 0.05 - time * 0.5, by * 0.1, lineIndex) * 2.5;
            const waveZ = Math.sin(bx * 0.1 - time * 2 + lineIndex) * 1.5;
            return { waveY, waveZ };
        }

        // Animate Wave lines
        linesGroup.children.forEach((line, index) => {
            const lpos = line.geometry.attributes.position;
            const lbase = line.geometry.attributes.basePosition;

            for (let j = 0; j < lpos.count; j++) {
                const bx = lbase.getX(j);
                const by = lbase.getY(j);
                const waves = getNominalWave(bx, by, index);
                lpos.setY(j, by + waves.waveY);
                lpos.setZ(j, lbase.getZ(j) + waves.waveZ);
            }
            lpos.needsUpdate = true;
        });

        // Spawn & Logic for electric signal dots
        if (Math.random() < 0.06) spawnSignalParticle();

        for (let i = signalParticles.length - 1; i >= 0; i--) {
            let p = signalParticles[i];
            p.x += p.speed;

            if (p.x > 40) {
                scene.remove(p.group);
                p.tail.geometry.dispose();
                signalParticles.splice(i, 1);
                continue;
            }

            const waves = getNominalWave(p.x, p.path.yOffset, p.path.index);
            const nominalY = p.path.yOffset + waves.waveY;
            const nominalZ = p.path.zOffset + waves.waveZ;
            const nominalPos = new THREE.Vector3(p.x, nominalY, nominalZ);

            let targetPos = new THREE.Vector3();

            if (nominalPos.length() < radius * 1.4) {
                const localNominal = nominalPos.clone();
                sphere1.worldToLocal(localNominal);

                const posAttr = sphere1.geometry.attributes.position;
                let minDistSq = Infinity;

                for (let v = 0; v < posAttr.count; v++) {
                    const vx = posAttr.getX(v);
                    const vy = posAttr.getY(v);
                    const vz = posAttr.getZ(v);

                    const dSq = (vx - localNominal.x) ** 2 + (vy - localNominal.y) ** 2 + (vz - localNominal.z) ** 2;
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        targetPos.set(vx, vy, vz);
                    }
                }

                sphere1.localToWorld(targetPos);
            } else {
                targetPos.copy(nominalPos);
            }

            p.head.position.copy(targetPos);
            p.head.lookAt(camera.position);

            // Record trail
            p.history.unshift(targetPos.clone());
            if (p.history.length > maxTrailLength) {
                p.history.pop();
            }

            const tailPosAttr = p.tail.geometry.attributes.position;
            for (let j = 0; j < maxTrailLength; j++) {
                const pt = p.history[j] || p.history[p.history.length - 1] || targetPos;
                tailPosAttr.setXYZ(j, pt.x, pt.y, pt.z);
            }
            tailPosAttr.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }

    animate();

    // --- SKILL CARD DECK INTERACTION ---
    const deck = document.getElementById('skill-deck');
    if (deck) {
        const deckCards = Array.from(deck.querySelectorAll('.deck-card'));

        // Initial stacking layout
        deckCards.forEach((card, i) => {
            card.style.zIndex = deckCards.length - i;
            card.style.transform = `translateY(${i * 4}px) rotate(${i * 2 - 2}deg)`;
        });

        deckCards.forEach(card => {
            card.addEventListener('click', function () {
                if (this.classList.contains('flipped') || this.classList.contains('shuffling')) return;

                // Only allow clicking the top card
                const topZ = Math.max(...deckCards.map(c => parseInt(c.style.zIndex) || 0));
                if (parseInt(this.style.zIndex) !== topZ) return;

                // Flip to reveal text
                this.classList.add('flipped');

                // After reading time, flip back and shuffle to bottom
                setTimeout(() => {
                    if (this.dataset.hoverFlipped === 'true') return; // Cancel shuffle if hover interrupted
                    this.classList.remove('flipped');
                    this.classList.add('shuffling');

                    setTimeout(() => {
                        this.classList.remove('shuffling');

                        // Shift z-indexes to simulate putting the card at the bottom
                        deckCards.forEach(c => {
                            let z = parseInt(c.style.zIndex) || 0;
                            c.style.zIndex = z + 1;
                        });
                        this.style.zIndex = 1; // Put this card physically at the bottom of the pile

                        // Re-apply physical transforms based on new structural z-index stack
                        deckCards.forEach((c) => {
                            const z = parseInt(c.style.zIndex);
                            const pos = deckCards.length - z; // 0 is top
                            c.style.transform = `translateY(${pos * 4}px) rotate(${pos * 2 - 2}deg)`;
                        });

                    }, 800); // Wait for shuffle animation CSS to entirely finish
                }, 2200); // 2.2 seconds allowing user to read the flipped back
            });
        });

        // --- SKILL HOVER DATA BINDING ---
        const keywords = document.querySelectorAll('.stack-cloud .keyword');
        let hoverTimeout;

        keywords.forEach(kw => {
            kw.addEventListener('mouseenter', () => {
                const topZ = Math.max(...deckCards.map(c => parseInt(c.style.zIndex) || 0));
                const topCard = deckCards.find(c => parseInt(c.style.zIndex) === topZ);

                if (topCard && !topCard.classList.contains('shuffling')) {
                    clearTimeout(hoverTimeout);
                    const h4 = topCard.querySelector('.deck-card-back h4');
                    const p = topCard.querySelector('.deck-card-back p');
                    const img = topCard.querySelector('.deck-card-back img');

                    if (!topCard.dataset.origTitle) {
                        topCard.dataset.origTitle = h4.innerText;
                        topCard.dataset.origDesc = p.innerText;
                        if (img) topCard.dataset.origImg = img.src || '';
                    }

                    h4.innerText = kw.dataset.hoverTitle || kw.innerText;
                    p.innerText = kw.dataset.hoverDesc || '';
                    if (img) {
                        const hoverImg = kw.dataset.hoverImg;
                        if (hoverImg) {
                            img.src = hoverImg;
                            img.style.display = 'block';
                        } else {
                            img.src = '';
                            img.style.display = 'none';
                        }
                    }

                    topCard.dataset.hoverFlipped = 'true';
                    topCard.classList.add('flipped');
                }
            });

            kw.addEventListener('mouseleave', () => {
                const topZ = Math.max(...deckCards.map(c => parseInt(c.style.zIndex) || 0));
                const topCard = deckCards.find(c => parseInt(c.style.zIndex) === topZ);

                if (topCard && topCard.dataset.hoverFlipped === 'true') {
                    topCard.classList.remove('flipped');
                    topCard.dataset.hoverFlipped = 'false';

                    hoverTimeout = setTimeout(() => {
                        if (!topCard.classList.contains('flipped') && topCard.dataset.origTitle) {
                            const h4 = topCard.querySelector('.deck-card-back h4');
                            const p = topCard.querySelector('.deck-card-back p');
                            const img = topCard.querySelector('.deck-card-back img');
                            h4.innerText = topCard.dataset.origTitle;
                            p.innerText = topCard.dataset.origDesc;
                            if (img) {
                                img.src = topCard.dataset.origImg || '';
                                img.style.display = img.src && !img.src.endsWith(window.location.pathname) ? 'block' : 'none';
                            }
                        }
                    }, 400); // Wait for physical flip backwards to hide the text swap visually
                }
            });
        });
    }

});

// ==========================================
// INDEPENDENT ELECTRON WATER DROP SIMULATION
// ==========================================
function initElectronSim() {
    const container = document.getElementById('electron-container');
    if (!container) return;

    const eScene = new THREE.Scene();
    const eCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    eCamera.position.z = 8;

    const eRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    eRenderer.setSize(container.clientWidth, container.clientHeight);
    eRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(eRenderer.domElement);

    // Ambient light for base visibility
    eScene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Dynamic Pointlight to catch the "water" ripples
    const pointLight = new THREE.PointLight(0x00ffff, 2.5, 50);
    pointLight.position.set(2, 4, 5);
    eScene.add(pointLight);

    // Main "Water" Electron Geometry (Lowered resolution for sketchy, chaotic polygon look)
    const eGeom = new THREE.IcosahedronGeometry(2, 24);
    eGeom.attributes.basePosition = eGeom.attributes.position.clone(); // store base vertices

    // Fluid/Glassy Pencil Sketch Material
    const eMat = new THREE.MeshBasicMaterial({
        color: 0x999999, // Muted graphite chalk color
        transparent: true,
        opacity: 0.12, // Faint overlapping lines
        wireframe: true
    });

    const electron = new THREE.Mesh(eGeom, eMat);
    eScene.add(electron);

    // Duplicate overlapping "scribble" layers to create hand-drawn cross-hatching illusion
    const sketchLayer1 = new THREE.Mesh(eGeom, eMat);
    sketchLayer1.scale.set(1.02, 0.98, 1.01);
    sketchLayer1.rotation.set(0.1, -0.2, 0.1);
    eScene.add(sketchLayer1);

    const sketchLayer2 = new THREE.Mesh(eGeom, eMat);
    sketchLayer2.scale.set(0.99, 1.01, 0.98);
    sketchLayer2.rotation.set(-0.15, 0.1, -0.05);
    eScene.add(sketchLayer2);

    // Raycasting logic for interaction
    const eRaycaster = new THREE.Raycaster();
    const eMouse = new THREE.Vector2(-999, -999);

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        eMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        eMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    container.addEventListener('mouseleave', () => {
        eMouse.x = -999;
        eMouse.y = -999;
    });

    const eClock = new THREE.Clock();
    let eTime = 0;

    // Wave Physics Trackers
    let hasImpact = false;
    let impactPoint = new THREE.Vector3();
    let impactTime = 0;
    let isHovering = false;

    const miniSimplex = new SimplexNoise(); // Create dedicated noise generator

    function animate() {
        requestAnimationFrame(animate);
        const delta = eClock.getDelta();
        eTime += delta * 1.5;

        // Raycast
        eRaycaster.setFromCamera(eMouse, eCamera);
        const intersects = eRaycaster.intersectObject(electron);

        if (intersects.length > 0) {
            document.body.style.cursor = 'crosshair';
            if (!isHovering) {
                // The exact moment the mouse strikes the surface ("throwing the stone")
                isHovering = true;
                hasImpact = true;
                impactPoint.copy(intersects[0].point);
                impactTime = eTime;
            }
        } else {
            isHovering = false;
            document.body.style.cursor = 'default';
        }

        const pos = electron.geometry.attributes.position;
        const basePos = electron.geometry.attributes.basePosition;

        // Transform vertices for water & ripple effect
        for (let i = 0; i < pos.count; i++) {
            const vx = basePos.getX(i);
            const vy = basePos.getY(i);
            const vz = basePos.getZ(i);
            const baseVec = new THREE.Vector3(vx, vy, vz);

            // 1. Base Liquid Undulation (Simplex Noise)
            // Organic water wavy base using 3D Simplex Math
            const noiseVal = miniSimplex.noise3D(
                baseVec.x * 0.8,
                baseVec.y * 0.8,
                baseVec.z * 0.8 + eTime * 0.5
            );
            // Amplify the wave significantly so the wireframe looks like churning surface fluid
            let targetRadius = 2.5 + (noiseVal * 0.25);

            // 2. Expanding "Stone in Lake" Concentric Ripple physics
            if (hasImpact) {
                const timeSinceImpact = eTime - impactTime;

                // Ripple dies completely after 2.5 seconds
                if (timeSinceImpact < 2.5) {
                    const worldPos = baseVec.clone().applyMatrix4(electron.matrixWorld);
                    const dist = worldPos.distanceTo(impactPoint);

                    // True wave propagation equation
                    const waveSpeed = 12.0; // How fast the rings travel outward
                    const waveFreq = 10.0;  // How tightly packed the concentric rings are

                    // The wave loses energy as it travels further away and as time passes
                    const timeDamping = Math.max(0, 1 - (timeSinceImpact / 2.5));
                    const distDamping = Math.max(0, 1 - (dist / 4.0)); // Travels max 4 units across the sphere

                    // Calculate the propagating sine wave
                    const dropWave = Math.sin(dist * waveFreq - timeSinceImpact * waveSpeed);

                    targetRadius += dropWave * 0.7 * timeDamping * distDamping;
                } else {
                    hasImpact = false; // Reset calculation when wave is dead
                }
            }

            const returnVec = baseVec.normalize().multiplyScalar(targetRadius);
            pos.setXYZ(i, returnVec.x, returnVec.y, returnVec.z);
        }

        pos.needsUpdate = true;
        electron.geometry.computeVertexNormals();

        // Slow structural rotation
        electron.rotation.y += delta * 0.05;
        electron.rotation.z += delta * 0.02;

        eRenderer.render(eScene, eCamera);
    }
    animate();


    window.addEventListener('resize', () => {
        if (container) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            eRenderer.setSize(width, height);
            eCamera.aspect = width / height;
            eCamera.updateProjectionMatrix();
        }
    });
}

// Instantiate upon load
window.addEventListener('load', () => {
    initElectronSim();
    initPhilCanvas();
});

// ==========================================
// PHILOSOPHY CANVAS INTERACTIVE SECTION
// ==========================================
function initPhilCanvas() {
    const canvas = document.getElementById('phil-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let activeIdx = 0;
    let points = [];
    try {
        const savedData = JSON.parse(localStorage.getItem('portfolioContent'));
        if (savedData && savedData['certificates'] && savedData['certificates'].length > 0) {
            points = savedData['certificates'];
        }
    } catch(e) {}

    if (points.length === 0) {
        points = [
            {
                label: '01',
                title: '• Privacy and Security in Online social media by NPTEL',
                desc: 'Gained knowledge of privacy risks, data protection, and security practices in online social media platforms.',
                url: '#',
                previewSrc: '01.png'
            },
            {
                label: '02',
                title: '• DSA Summer Bootcamp From Basics To Brillance',
                desc: 'Trained in data structures and algorithms with a focus on problem solving and coding efficiency.',
                url: '#',
                previewSrc: '02.png'
            },
            {
                label: '03',
                title: '• Interpersonal Communication for Engineering Leaders',
                desc: 'Developed effective communication, teamwork, and leadership skills for professional engineering environments.',
                url: '#',
                previewSrc: '03.pdf'
            }
        ];
    }

    // --- Certificate Preview Overlay Logic ---
    const certOverlay = document.getElementById('cert-preview-overlay');
    const certFrame = document.getElementById('cert-preview-frame');
    const certImg = document.getElementById('cert-preview-img');

    function openCertPreview(src) {
        if (!src || src === '#') return;
        const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(src) || src.startsWith('data:image/');
        if (isImage) {
            certFrame.style.display = 'none';
            certFrame.src = '';
            certImg.src = src;
            certImg.style.display = 'block';
        } else {
            certImg.style.display = 'none';
            certImg.src = '';
            certFrame.src = src;
            certFrame.style.display = 'block';
        }
        certOverlay.classList.add('active');
    }

    function closeCertPreview() {
        certOverlay.classList.remove('active');
        // Clear both after transition
        setTimeout(() => {
            certFrame.src = '';
            certImg.src = '';
            certImg.style.display = 'none';
            certFrame.style.display = 'block';
        }, 450);
    }

    // Close overlay on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && certOverlay.classList.contains('active')) {
            closeCertPreview();
        }
    });

    // Make the heading clickable to open preview
    const philTitle = document.getElementById('phil-title');
    philTitle.style.cursor = 'pointer';
    philTitle.addEventListener('click', (e) => {
        e.preventDefault();
        openCertPreview(points[activeIdx].previewSrc);
    });

    // Also open on hover (mouseenter on heading)
    philTitle.addEventListener('mouseenter', () => {
        openCertPreview(points[activeIdx].previewSrc);
    });

    // Close overlay when cursor leaves the preview container (2nd dismiss method)
    const certContainer = document.querySelector('.cert-preview-container');
    certContainer.addEventListener('mouseleave', () => {
        if (certOverlay.classList.contains('active')) {
            closeCertPreview();
        }
    });

    function getNodePositions(W, H, count) {
        if (count === 1) return [{ x: W / 2, y: H / 2 }];
        const padding = W * 0.12;
        const widthRange = W - (padding * 2);
        const nodes = [];
        for (let i = 0; i < count; i++) {
            const x = padding + (widthRange / (count - 1)) * i;
            const yOffset = (i % 2 === 0) ? -H * 0.1 : H * 0.1;
            const y = H * 0.45 + yOffset;
            nodes.push({ x, y });
        }
        return nodes;
    }

    function draw() {
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const isDark = document.body.classList.contains('dark-mode');
        const lineColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
        const dotColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff4400';
        const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

        const nodes = getNodePositions(W, H, points.length);

        if (nodes.length > 0) {
            ctx.beginPath();
            ctx.moveTo(nodes[0].x, nodes[0].y);
            for (let i = 0; i < nodes.length - 1; i++) {
                const current = nodes[i];
                const next = nodes[i+1];
                const midX = (current.x + next.x) / 2;
                const midY = Math.min(current.y, next.y) - H * 0.25;
                ctx.quadraticCurveTo(midX, midY, next.x, next.y);
            }
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Draw nodes
        nodes.forEach((n, i) => {
            const isActive = i === activeIdx;
            const r = isActive ? 10 : 7;

            if (isActive) {
                // Outer ring glow
                ctx.beginPath();
                ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2);
                ctx.strokeStyle = accentColor + '40';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Node dot
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? accentColor : dotColor;
            ctx.fill();

            // Label
            ctx.font = `500 11px monospace`;
            ctx.fillStyle = isActive ? accentColor : labelColor;
            ctx.textAlign = 'center';
            ctx.fillText(points[i].label, n.x, n.y - r - 10);
        });
    }

    function resize() {
        const wrap = canvas.parentElement;
        canvas.width = wrap.clientWidth;
        canvas.height = 140;
        draw();
    }

    window.addEventListener('resize', resize);
    resize();

    // Shared function to switch to a given index with fade
    function switchTo(i) {
        if (i === activeIdx) return;
        const display = document.getElementById('phil-display');
        display.classList.add('fade-out');
        setTimeout(() => {
            activeIdx = i;
            document.getElementById('phil-title').innerHTML = `<a href="${points[i].url}" target="_blank">${points[i].title}</a>`;
            document.getElementById('phil-desc').innerText = points[i].desc;
            display.classList.remove('fade-out');
            draw();
        }, 350);
        draw();
    }

    // Auto-cycle: 01 → 02 → 03 → 01 every 3.5s
    let autoTimer = null;
    function startAutoPlay() {
        autoTimer = setInterval(() => {
            switchTo((activeIdx + 1) % points.length);
        }, 3500);
    }
    function resetAutoPlay() {
        clearInterval(autoTimer);
        startAutoPlay();
    }
    startAutoPlay();

    // Click to switch philosophy point (resets auto timer)
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        const nodes = getNodePositions(canvas.width, canvas.height, points.length);
        const hitRadius = 22;

        nodes.forEach((n, i) => {
            const dx = mx - n.x;
            const dy = my - n.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                switchTo(i);
                resetAutoPlay(); // reset timer so it doesn't fire immediately after manual click
            }
        });
    });

    // Redraw on theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        setTimeout(draw, 50);
    });
}