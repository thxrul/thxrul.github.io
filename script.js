const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.getElementById('motion-toggle');
let motionEnabled = !reducedMotion.matches;
function updateMotion() {
    document.body.classList.toggle('motion-reduced', !motionEnabled);
    document.documentElement.classList.toggle('motion-reduced', !motionEnabled);
    motionToggle.textContent = motionEnabled ? 'Animations on' : 'Enable animations';
    motionToggle.setAttribute('aria-pressed', String(motionEnabled));
}
motionToggle.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    updateMotion();
    window.dispatchEvent(new Event('motionchange'));
});
function listenToPreference(query, callback) {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
}
listenToPreference(reducedMotion, () => {
    motionEnabled = !reducedMotion.matches;
    updateMotion();
    window.dispatchEvent(new Event('motionchange'));
});
updateMotion();

const portrait = document.getElementById('pfp');
portrait.addEventListener('error', () => { portrait.hidden = true; });
if (portrait.complete && portrait.naturalWidth === 0) portrait.hidden = true;

if ('IntersectionObserver' in window) {
    document.body.classList.add('motion-enabled');
    const reveal = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target.closest('.social-section');
                (section || entry.target).classList.add('is-visible');
                reveal.unobserve(entry.target);
            }
        });
    }, { threshold: 0.01 });
    document.querySelectorAll('.social-content, .reveal-item').forEach(content => reveal.observe(content));
}

// Audio is local and starts only after a deliberate button press.
const audio = document.getElementById('site-audio');
const audioToggle = document.getElementById('audio-toggle');
const audioStatus = document.getElementById('audio-status');
let audioContext;
let analyser;
let frequencyData;
let audioEnergy = 0;
let audioBusy = false;
function syncAudioButton() {
    const playing = !audio.paused && !audio.ended;
    audioToggle.classList.toggle('is-playing', playing);
    audioToggle.setAttribute('aria-pressed', String(playing));
    audioToggle.setAttribute('aria-label', playing ? 'Pause audio' : 'Play audio');
    audioToggle.title = playing ? 'Pause audio' : 'Play audio';
    window.dispatchEvent(new Event('matrixchange'));
}
['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, syncAudioButton));
audio.addEventListener('error', () => {
    audioStatus.textContent = 'Audio could not load. Press play to retry.';
    syncAudioButton();
});
audioToggle.addEventListener('click', async () => {
    if (audioBusy) return;
    if (!audio.paused) { audio.pause(); return; }
    audioBusy = true;
    try {
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        if (!audioContext && AudioEngine) {
            audioContext = new AudioEngine();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.75;
            frequencyData = new Uint8Array(analyser.frequencyBinCount);
            audioContext.createMediaElementSource(audio).connect(analyser);
            analyser.connect(audioContext.destination);
        }
        if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
        if (audio.error) audio.load();
        await audio.play();
        audioStatus.textContent = '';
    } catch (error) {
        audioStatus.textContent = 'Playback could not start. Press play to retry.';
        syncAudioButton();
    } finally { audioBusy = false; }
});

// The same damped spring is used for the grid and the audio's dot halo.
function spring(dot, x, y, animate) {
    if (!animate) { dot.dx = x; dot.dy = y; dot.vx = dot.vy = 0; return; }
    dot.vx = (dot.vx + (x - dot.dx) * 0.075) * 0.76;
    dot.vy = (dot.vy + (y - dot.dy) * 0.075) * 0.76;
    dot.dx += dot.vx;
    dot.dy += dot.vy;
}
const halo = document.getElementById('audio-halo');
const haloContext = halo.getContext('2d');
const haloDots = Array.from({ length: 32 }, (_, i) => ({ angle: i * Math.PI * 2 / 32, dx: 0, dy: 0, vx: 0, vy: 0 }));
function readAudio() {
    if (analyser && !audio.paused && !audio.ended) {
        analyser.getByteFrequencyData(frequencyData);
        const energy = frequencyData.slice(0, 48).reduce((sum, value) => sum + value, 0) / (48 * 255);
        audioEnergy += (energy - audioEnergy) * 0.25;
    } else {
        if (frequencyData) frequencyData.fill(0);
        audioEnergy *= 0.8;
    }
}
function drawHalo() {
    if (!haloContext) return;
    haloContext.clearRect(0, 0, 96, 96);
    haloDots.forEach((dot, i) => {
        const band = frequencyData && !audio.paused ? frequencyData[2 + i * 2] / 255 : 0;
        const pulse = motionEnabled ? band * 9 + audioEnergy * 3 : 0;
        spring(dot, Math.cos(dot.angle) * pulse, Math.sin(dot.angle) * pulse, motionEnabled);
        haloContext.fillStyle = `rgba(235, 235, 230, ${0.42 + band * 0.5})`;
        haloContext.beginPath();
        haloContext.arc(48 + Math.cos(dot.angle) * 31 + dot.dx, 48 + Math.sin(dot.angle) * 31 + dot.dy, 0.8 + band * 0.6, 0, Math.PI * 2);
        haloContext.fill();
    });
}

const canvas = document.getElementById('dot-matrix');
const context = canvas.getContext('2d');
const cursor = document.getElementById('cursor');
const weightedElements = [...document.querySelectorAll('[data-weight], .project-card, .social-content h2, .roadmap-block h3, .qualifications-heading h2, .projects-heading h2')];

// Signed distance to a circle or rounded rectangle gives each shape its own edge field.
function edgeField(x, y, shape) {
    const dx = x - shape.cx;
    const dy = y - shape.cy;
    if (shape.circle) {
        const length = Math.hypot(dx, dy) || 1;
        return { distance: length - shape.w / 2, x: dx / length, y: dy / length };
    }
    const corner = Math.min(shape.corner, shape.w / 2, shape.h / 2);
    const qx = Math.abs(dx) - (shape.w / 2 - corner);
    const qy = Math.abs(dy) - (shape.h / 2 - corner);
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const length = Math.hypot(ox, oy);
    const distance = length + Math.min(Math.max(qx, qy), 0) - corner;
    if (length) return { distance, x: Math.sign(dx) * ox / length, y: Math.sign(dy) * oy / length };
    return qx > qy ? { distance, x: Math.sign(dx) || 1, y: 0 } : { distance, x: 0, y: Math.sign(dy) || 1 };
}

if (context) {
    const spacing = 24;
    const pointerRadius = 190;
    const pointer = { x: 0, y: 0, active: false, pressed: false, touch: false };
    const position = { x: 0, y: 0 };
    let dots = [];
    let width = 0;
    let height = 0;
    let frame = null;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        halo.width = halo.height = Math.round(96 * scale);
        if (haloContext) haloContext.setTransform(scale, 0, 0, scale, 0, 0);
        dots = [];
        for (let y = spacing / 2; y < height; y += spacing) {
            for (let x = spacing / 2; x < width; x += spacing) dots.push({ x, y, dx: 0, dy: 0, vx: 0, vy: 0 });
        }
        requestDraw();
    }
    function requestDraw() {
        if (frame === null && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function collectShapes() {
        return weightedElements.flatMap(element => {
            const rect = element.getBoundingClientRect();
            if (rect.bottom < -100 || rect.top > height + 100 || rect.right < -100 || rect.left > width + 100 || !rect.width || !rect.height) return [];
            const style = getComputedStyle(element);
            // Small text never gets an independent field, including headings on narrow screens.
            if (!element.matches('[data-weight], .project-card') && parseFloat(style.fontSize) < 28) return [];
            if (style.visibility === 'hidden' || Number(style.opacity) < 0.02) return [];
            const reveal = element.closest('.reveal-item, .social-content');
            const opacity = reveal ? Number(getComputedStyle(reveal).opacity) : 1;
            if (opacity < 0.02) return [];
            // Ignore roadmap labels outside their horizontally clipped container.
            const scroll = element.closest('.roadmap-scroll');
            if (scroll) {
                const clip = scroll.getBoundingClientRect();
                if (rect.right < clip.left || rect.left > clip.right) return [];
            }
            return [{ cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height,
                circle: element.dataset.weight === 'circle', corner: parseFloat(style.borderRadius) || 4,
                mass: Math.min(32, 5 + Math.sqrt(rect.width * rect.height) / 12) * opacity,
                audio: element === audioToggle }];
        });
    }
    function draw(time) {
        frame = null;
        readAudio();
        drawHalo();
        const shapes = collectShapes();
        const active = motionEnabled && pointer.active;
        position.x += (pointer.x - position.x) * 0.18;
        position.y += (pointer.y - position.y) * 0.18;
        cursor.style.transform = `translate(${position.x - 18}px, ${position.y - 18}px)`;
        cursor.style.opacity = active && !pointer.touch ? '1' : '0';
        context.clearRect(0, 0, width, height);
        dots.forEach(dot => {
            const px = position.x - dot.x;
            const py = position.y - dot.y;
            const influence = active ? Math.max(0, 1 - Math.hypot(px, py) / pointerRadius) : 0;
            const pull = influence * influence * (pointer.pressed ? 0.55 : 0.3);
            const drift = motionEnabled ? Math.sin(time / 1300 + dot.x / 140 + dot.y / 180) * 1.4 : 0;
            let targetX = px * pull + drift;
            let targetY = py * pull + drift * 0.5;
            let edgeGlow = 0;
            shapes.forEach(shape => {
                if (Math.abs(dot.x - shape.cx) > shape.w / 2 + 100 || Math.abs(dot.y - shape.cy) > shape.h / 2 + 100) return;
                const field = edgeField(dot.x, dot.y, shape);
                const influence = Math.exp(-Math.abs(field.distance) / 38);
                const audioPulse = shape.audio && motionEnabled ? audioEnergy * 28 : 0;
                const force = influence * (shape.mass + audioPulse);
                targetX += field.x * force;
                targetY += field.y * force;
                edgeGlow = Math.max(edgeGlow, influence * (shape.audio ? audioEnergy : 0.15));
            });
            spring(dot, Math.max(-65, Math.min(65, targetX)), Math.max(-65, Math.min(65, targetY)), motionEnabled);
            context.fillStyle = `rgba(235, 235, 230, ${Math.min(0.95, 0.48 + influence * 0.38 + edgeGlow)})`;
            context.beginPath();
            context.arc(dot.x + dot.dx, dot.y + dot.dy, 0.85 + influence * 0.7, 0, Math.PI * 2);
            context.fill();
        });
        if (motionEnabled || !audio.paused) requestDraw();
    }
    window.addEventListener('pointermove', event => {
        pointer.touch = event.pointerType === 'touch';
        if (!pointer.active) { position.x = event.clientX; position.y = event.clientY; }
        pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointerdown', event => {
        pointer.touch = event.pointerType === 'touch';
        pointer.x = event.clientX; pointer.y = event.clientY;
        if (!pointer.active) { position.x = pointer.x; position.y = pointer.y; }
        pointer.active = pointer.pressed = true;
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointerup', () => {
        pointer.pressed = false;
        if (pointer.touch) pointer.active = false;
        requestDraw();
    }, { passive: true });
    function release() { pointer.active = pointer.pressed = false; requestDraw(); }
    window.addEventListener('pointercancel', release, { passive: true });
    document.documentElement.addEventListener('pointerleave', release);
    window.addEventListener('blur', release);
    window.addEventListener('resize', resize, { passive: true });
    // Static weight fields still follow the page when reduced motion is enabled.
    window.addEventListener('scroll', requestDraw, { passive: true });
    document.querySelectorAll('.roadmap-scroll').forEach(element => element.addEventListener('scroll', requestDraw, { passive: true }));
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null; pointer.active = pointer.pressed = false;
        } else requestDraw();
    });
    window.addEventListener('motionchange', requestDraw);
    window.addEventListener('matrixchange', requestDraw);
    resize();
}
