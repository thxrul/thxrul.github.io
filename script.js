const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.getElementById('motion-toggle');
let motionEnabled = !reducedMotion.matches;
function updateMotion() {
    document.body.classList.toggle('motion-reduced', !motionEnabled);
    document.documentElement.classList.toggle('motion-reduced', !motionEnabled);
    motionToggle.textContent = motionEnabled ? 'Animations on' : 'Animations off';
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
motionToggle.hidden = false;

const portrait = document.getElementById('pfp');
portrait.addEventListener('error', () => { portrait.hidden = true; });
if (portrait.complete && portrait.naturalWidth === 0) portrait.hidden = true;

// One compositor reveal per line, rather than a filter/layer for every letter.
const greeting = document.querySelector('.greeting');
const greetingLines = [...greeting.querySelectorAll('.greeting-line')];
let greetingDelay = 300;
greetingLines.forEach(line => {
    const length = line.textContent.trim().length;
    line.style.setProperty('--type-duration', `${length * 115}ms`);
    line.style.setProperty('--type-steps', String(length));
    line.style.setProperty('--type-delay', `${greetingDelay}ms`);
    greetingDelay += length * 115;
});
if (motionEnabled) document.body.classList.add('intro-animating');
const finishIntro = () => document.body.classList.remove('intro-animating');
greeting.addEventListener('animationend', event => {
    if (event.target === greetingLines[greetingLines.length - 1]) finishIntro();
});
window.addEventListener('motionchange', () => { if (!motionEnabled) finishIntro(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) finishIntro(); });

if ('IntersectionObserver' in window) {
    document.body.classList.add('motion-enabled');
    const revealTargets = [...document.querySelectorAll('.social-content, .reveal-item')];
    function showContent(target) {
        target.classList.remove('reveal-pending');
        target.classList.add('is-visible');
        target.addEventListener('animationend', event => {
            if (event.target === target && event.animationName === 'morph-in') target.classList.remove('is-visible');
        });
    }
    const reveal = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                showContent(entry.target);
                reveal.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    revealTargets.forEach(target => {
        // Content in view stays readable; offscreen items morph in on approach.
        if (motionEnabled && target.getBoundingClientRect().top >= window.innerHeight - 32) {
            target.classList.add('reveal-pending');
        }
        reveal.observe(target);
    });
    document.addEventListener('focusin', event => {
        const target = event.target.closest('.reveal-pending');
        if (target) { showContent(target); reveal.unobserve(target); }
    });
    window.addEventListener('motionchange', () => {
        if (!motionEnabled) {
            revealTargets.forEach(showContent);
            reveal.disconnect();
        }
    });
}


// Type each section heading once when it reaches the viewport.
const typedHeadings = [...document.querySelectorAll('h2')];
typedHeadings.forEach(heading => {
    const length = heading.textContent.trim().length;
    heading.classList.add('type-heading');
    heading.style.setProperty('--type-duration', `${length * 115}ms`);
    heading.style.setProperty('--type-steps', String(length));
    const reveal = document.createElement('span'); reveal.className = 'heading-reveal';
    reveal.append(...heading.childNodes); heading.append(reveal);
    heading.addEventListener('animationend', event => {
        if (event.target === reveal) heading.classList.remove('is-typing');
    });
});
function completeHeading(heading) {
    heading.classList.add('is-typed');
    heading.classList.remove('is-typing');
}
if ('IntersectionObserver' in window && motionEnabled) {
    const headingObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-typed', 'is-typing');
            headingObserver.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });
    typedHeadings.forEach(heading => headingObserver.observe(heading));
    window.addEventListener('motionchange', () => {
        if (!motionEnabled) { typedHeadings.forEach(completeHeading); headingObserver.disconnect(); }
    });
    document.addEventListener('focusin', event => {
        const heading = event.target.closest('.type-heading');
        if (heading) { completeHeading(heading); headingObserver.unobserve(heading); }
    });
} else typedHeadings.forEach(completeHeading);

// Read progress directly from scroll position, batching updates to one per frame.
const progressTrack = document.getElementById('scroll-progress');
let progressFrame = null;
function updateScrollProgress() {
    progressFrame = null;
    const range = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    progressTrack.style.setProperty('--scroll-progress', String(progress));
}
function requestProgressUpdate() {
    if (progressFrame === null) progressFrame = requestAnimationFrame(updateScrollProgress);
}
progressTrack.hidden = false;
window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate, { passive: true });
window.addEventListener('load', requestProgressUpdate);
if ('ResizeObserver' in window) new ResizeObserver(requestProgressUpdate).observe(document.body);
updateScrollProgress();

const projectsLayoutToggle = document.getElementById('projects-layout-toggle');
const projectList = document.getElementById('project-list');
function setProjectLayout(grid) {
    projectList.classList.toggle('is-grid', grid);
    projectsLayoutToggle.setAttribute('aria-pressed', String(grid));
    projectsLayoutToggle.setAttribute('aria-label', grid ? 'Use list layout' : 'Use grid layout');
    projectsLayoutToggle.title = grid ? 'Use list layout' : 'Use grid layout';
    try { localStorage.setItem('project-layout', grid ? 'grid' : 'list'); } catch {}
}
try { setProjectLayout(localStorage.getItem('project-layout') === 'grid'); } catch {}
projectsLayoutToggle.hidden = false;
projectsLayoutToggle.addEventListener('click', () => setProjectLayout(!projectList.classList.contains('is-grid')));

// The generated directory index supplies file tags, embedded artwork, and track order.
const audio = document.getElementById('site-audio');
const audioToggle = document.getElementById('audio-toggle');
const audioStatus = document.getElementById('audio-status');
const audioArt = document.getElementById('audio-art');
const audioTitle = document.getElementById('audio-title');
let audioContext;
let analyser;
let waveformData;
let mediaSource;
let autoplayBlocked = false;
let userPaused = false;
let audioEnergy = 0;
let audioBusy = false;
let audioTracks = [];
let trackIndex = 0;
function syncAudioButton() {
    const playing = !audio.paused && !audio.ended;
    audioToggle.classList.toggle('is-playing', playing);
    audioToggle.setAttribute('aria-pressed', String(playing));
    audioToggle.setAttribute('aria-label', playing ? 'Pause audio' : 'Play audio');
    audioToggle.title = playing ? 'Pause audio' : 'Play audio';
    window.dispatchEvent(new Event('matrixchange'));
}
async function ensureAudioAnalyser() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    if (!audioContext) audioContext = new AudioEngine();
    if (audioContext.state === 'suspended') await audioContext.resume();
    // Keep native playback audible while waiting for browser audio permission.
    if (!analyser && audioContext.state === 'running') {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        waveformData = new Float32Array(analyser.fftSize);
        mediaSource = audioContext.createMediaElementSource(audio);
        mediaSource.connect(analyser);
        analyser.connect(audioContext.destination);
    }
}
async function startPlayback(manual = false) {
    if (audioBusy) return;
    audioBusy = true;
    try {
        if (manual) void ensureAudioAnalyser().catch(() => {});
        if (audio.error) audio.load();
        await audio.play();
        if (!manual) void ensureAudioAnalyser().catch(() => {});
        autoplayBlocked = false;
        audioStatus.textContent = '';
    } catch (error) {
        autoplayBlocked = error.name === 'NotAllowedError';
        audioStatus.textContent = error.name === 'NotAllowedError'
            ? 'Your browser blocked playback. Press play to listen.'
            : 'Playback could not start. Press play to retry.';
    } finally { audioBusy = false; syncAudioButton(); }
}
audio.addEventListener('play', () => {
    autoplayBlocked = false;
    syncAudioButton();
    void ensureAudioAnalyser().catch(() => {});
});
audio.addEventListener('pause', syncAudioButton);
audio.addEventListener('ended', () => {
    syncAudioButton();
    if (audioTracks.length > 1) {
        setTrack((trackIndex + 1) % audioTracks.length);
        void startPlayback();
    }
});
audio.addEventListener('error', () => {
    audioStatus.textContent = 'Audio could not load. Press play to retry.';
    syncAudioButton();
});
audioArt.addEventListener('error', () => {
    if (!audioArt.src.endsWith('/audio/default-cover.svg')) audioArt.src = 'audio/default-cover.svg';
});
audioToggle.addEventListener('click', () => {
    if (!audio.paused) { userPaused = true; audio.pause(); return; }
    userPaused = false;
    void startPlayback(true);
});
// Resume sound and its analyser on the first gesture when autoplay was blocked.
function unlockAudio(event) {
    if (event.target.closest('#audio-toggle')) return;
    if (audioContext?.state === 'suspended') void ensureAudioAnalyser().catch(() => {});
    if (autoplayBlocked && !userPaused) void startPlayback(true);
}
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);
function setTrack(index) {
    trackIndex = index;
    const track = audioTracks[index];
    if (!track) return;
    const title = track.artist ? `${track.title} — ${track.artist}` : track.title;
    audioTitle.textContent = title;
    audioTitle.title = title;
    audioArt.src = track.artwork || 'audio/default-cover.svg';
    if (audio.src !== new URL(track.src, document.baseURI).href) {
        audio.src = track.src;
        audio.load();
    }
    audioEnergy = 0;
    window.dispatchEvent(new Event('matrixchange'));
}
async function loadAudioLibrary() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch('audio/library.json', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Audio library unavailable');
        const library = await response.json();
        audioTracks = Array.isArray(library.tracks) ? library.tracks.filter(track =>
            typeof track.src === 'string' && track.src.startsWith('audio/') && typeof track.title === 'string') : [];
        if (audioTracks.length) setTrack(0);
    } catch (error) {
        // The current audio file remains usable if the index cannot be fetched.
    } finally {
        clearTimeout(timeout);
        if (audio.paused && !userPaused) void startPlayback();
    }
}

// A spring only advances while a visible effect is changing.
function spring(dot, x, y, animate) {
    if (!animate) { dot.dx = x; dot.dy = y; dot.vx = dot.vy = 0; return; }
    dot.vx = (dot.vx + (x - dot.dx) * 0.075) * 0.76;
    dot.vy = (dot.vy + (y - dot.dy) * 0.075) * 0.76;
    dot.dx += dot.vx;
    dot.dy += dot.vy;
}
const halo = document.getElementById('audio-halo');
const haloContext = halo.getContext('2d');
const haloSensitivities = [0.45, 1.15, 0.7, 1.65, 0.9, 1.4, 0.55, 1.9];
const haloDots = Array.from({ length: 32 }, (_, i) => ({
    cos: Math.cos(i * Math.PI * 2 / 32), sin: Math.sin(i * Math.PI * 2 / 32),
    sensitivity: haloSensitivities[Math.min(i % 16, 15 - i % 16)],
    dx: 0, dy: 0, vx: 0, vy: 0
}));
function readAudio() {
    if (analyser && !audio.paused && !audio.ended) {
        analyser.getFloatTimeDomainData(waveformData);
        let sum = 0;
        for (let i = 0; i < waveformData.length; i++) sum += waveformData[i] * waveformData[i];
        audioEnergy += (Math.sqrt(sum / waveformData.length) - audioEnergy) * 0.45;
    } else audioEnergy *= 0.65;
}
const haloGroups = haloSensitivities.map(sensitivity => haloDots.filter(dot => dot.sensitivity === sensitivity));
function drawHalo(animate = motionEnabled) {
    if (!haloContext) return;
    haloContext.clearRect(0, 0, 96, 96);
    haloContext.lineWidth = 1.6; haloContext.lineCap = 'round';
    haloGroups.forEach(group => {
        const first = group[0];
        const energy = animate ? 1 - Math.exp(-audioEnergy * first.sensitivity * 4) : 0;
        spring(first, energy * 10, 0, animate);
        if (animate) spring(first, energy * 10, 0, true);
        haloContext.strokeStyle = `rgba(235, 235, 230, ${0.45 + energy * 0.5})`;
        haloContext.beginPath();
        group.forEach(dot => {
            dot.dx = first.dx;
            haloContext.moveTo(48 + dot.cos * 31, 48 + dot.sin * 31);
            haloContext.lineTo(48 + dot.cos * (33 + dot.dx), 48 + dot.sin * (33 + dot.dx));
        });
        haloContext.stroke();
    });
}
let haloVisible = false;
let haloFrame = null, haloTimer = null;
let haloLastDraw = 0;
function stopHalo() {
    if (haloTimer !== null) clearTimeout(haloTimer);
    haloTimer = null;
    if (haloFrame !== null) cancelAnimationFrame(haloFrame);
    haloFrame = null;
}
function haloAllowed() {
    return haloVisible && !document.hidden && motionEnabled && !document.body.classList.contains('project-dialog-open');
}
function animateHalo(time) {
    haloFrame = null;
    if (!haloAllowed()) return;
    if (time - haloLastDraw >= 1000 / 30 - 1) {
        haloLastDraw = time;
        readAudio(); drawHalo();
    }
    const settling = audioEnergy > 0.001 || haloDots.some(dot => Math.abs(dot.dx) > 0.02);
    if (!audio.paused && !audio.ended || settling) {
        haloTimer = setTimeout(() => { haloTimer = null; haloFrame = requestAnimationFrame(animateHalo); }, Math.max(0, haloLastDraw + 1000 / 30 - performance.now() - 5));
    }
    else drawHalo(false);
}
function updateHalo() {
    stopHalo();
    if (haloAllowed() && !audio.paused && !audio.ended) haloFrame = requestAnimationFrame(animateHalo);
    else {
        audioEnergy = 0;
        if (haloVisible && !document.hidden) drawHalo(false);
    }
}
function resizeHalo() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const size = Math.round(96 * scale);
    if (halo.width !== size) {
        halo.width = halo.height = size;
        haloContext?.setTransform(scale, 0, 0, scale, 0, 0);
    }
    updateHalo();
}
if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
        haloVisible = entries[0].isIntersecting;
        updateHalo();
    }).observe(halo.parentElement);
} else haloVisible = true;
window.addEventListener('matrixchange', updateHalo);
window.addEventListener('motionchange', updateHalo);
window.addEventListener('dialogchange', updateHalo);
document.addEventListener('visibilitychange', updateHalo);
window.addEventListener('resize', resizeHalo, { passive: true });
resizeHalo();

const canvas = document.getElementById('dot-matrix');
const context = canvas.getContext('2d');
const cursor = document.getElementById('cursor');
if (context) {
    const spacing = 24, pointerRadius = 190;
    const pointer = { x: 0, y: 0, active: false, pressed: false, pressedAt: 0, touch: false };
    const position = { x: 0, y: 0 };
    // Only this small opaque patch changes; the full-screen dot field is cached.
    const patch = document.createElement('canvas');
    patch.id = 'dot-interaction'; patch.setAttribute('aria-hidden', 'true');
    canvas.after(patch);
    const patchContext = patch.getContext('2d', { alpha: false });
    const activeDots = new Map();
    const buckets = Array.from({ length: 8 }, () => []);
    let width = 0, height = 0, columns = 0, rows = 0;
    let frame = null, matrixTimer = null, resizeFrame = null, lastScroll = -Infinity, lastDraw = 0;
    let patchWidth = 0, patchHeight = 0, pixelScale = 1, background = '#111113';
    function addCircle(ctx, x, y, radius) {
        ctx.moveTo(x + radius, y); ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    function paintStatic() {
        context.clearRect(0, 0, width, height);
        context.fillStyle = 'rgba(235,235,230,.48)'; context.beginPath();
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) addCircle(context, 12 + col * spacing, 12 + row * spacing, 0.85);
        }
        context.fill();
    }
    function paintPatch() {
        const left = Math.max(0, Math.min(width - patchWidth, Math.floor((position.x - patchWidth / 2) / spacing) * spacing));
        const top = Math.max(0, Math.min(height - patchHeight, Math.floor((position.y - patchHeight / 2) / spacing) * spacing));
        patchContext.setTransform(pixelScale, 0, 0, pixelScale, -left * pixelScale, -top * pixelScale);
        patchContext.fillStyle = background; patchContext.fillRect(left, top, patchWidth, patchHeight);
        // Drop old points outside the interaction patch; the static field is intact below it.
        activeDots.forEach((dot, key) => {
            if (dot.x < left + 2 || dot.x > left + patchWidth - 2 || dot.y < top + 2 || dot.y > top + patchHeight - 2) activeDots.delete(key);
        });
        patchContext.fillStyle = 'rgba(235,235,230,.264)'; patchContext.beginPath();
        const minCol = Math.max(0, Math.floor((left - 12) / spacing));
        const maxCol = Math.min(columns - 1, Math.ceil((left + patchWidth - 12) / spacing));
        const minRow = Math.max(0, Math.floor((top - 12) / spacing));
        const maxRow = Math.min(rows - 1, Math.ceil((top + patchHeight - 12) / spacing));
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                if (!activeDots.has(row * columns + col)) addCircle(patchContext, 12 + col * spacing, 12 + row * spacing, 0.85);
            }
        }
        patchContext.fill();
        buckets.forEach((bucket, level) => {
            if (!bucket.length) return;
            const influence = level / 7;
            patchContext.fillStyle = `rgba(235,235,230,${(0.48 + influence * 0.38) * 0.55})`;
            patchContext.beginPath();
            bucket.forEach(dot => { if (activeDots.has(dot.key)) addCircle(patchContext, dot.x + dot.dx, dot.y + dot.dy, 0.85 + influence * 0.7); });
            patchContext.fill();
        });
        patch.style.transform = `translate3d(${left}px, ${top}px, 0)`; patch.hidden = false;
    }
    function reset() {
        if (matrixTimer !== null) clearTimeout(matrixTimer);
        matrixTimer = null;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        pointer.active = pointer.pressed = false; pointer.pressedAt = 0;
        document.body.classList.remove('matrix-holding');
        cursor.style.opacity = '0';
        activeDots.clear();
        patch.hidden = true;
    }
    function resize() {
        resizeFrame = null;
        const nextWidth = window.innerWidth, nextHeight = window.innerHeight;
        const scale = Math.min(window.devicePixelRatio || 1, 1.5);
        if (nextWidth === width && nextHeight === height && canvas.width === Math.round(width * scale)) return;
        reset(); width = nextWidth; height = nextHeight;
        canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        columns = Math.ceil((width - 12) / spacing); rows = Math.ceil((height - 12) / spacing);
        pixelScale = scale;
        patchWidth = Math.min(480, width); patchHeight = Math.min(480, height);
        patch.width = Math.round(patchWidth * scale); patch.height = Math.round(patchHeight * scale);
        patch.style.width = `${patchWidth}px`; patch.style.height = `${patchHeight}px`;
        background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
        paintStatic();
    }
    function requestDraw() {
        if (frame === null && matrixTimer === null && motionEnabled && !document.hidden && !document.body.classList.contains('project-dialog-open')) frame = requestAnimationFrame(draw);
    }
    function draw(time) {
        frame = null; lastDraw = time;
        const active = motionEnabled && pointer.active;
        position.x += (pointer.x - position.x) * 0.3276;
        position.y += (pointer.y - position.y) * 0.3276;
        cursor.style.transform = `translate3d(${position.x - 18}px, ${position.y - 18}px, 0)`;
        cursor.style.opacity = active && !pointer.touch ? '1' : '0';
        if (active) {
            const minCol = Math.max(0, Math.floor((position.x - pointerRadius - 12) / spacing));
            const maxCol = Math.min(columns - 1, Math.ceil((position.x + pointerRadius - 12) / spacing));
            const minRow = Math.max(0, Math.floor((position.y - pointerRadius - 12) / spacing));
            const maxRow = Math.min(rows - 1, Math.ceil((position.y + pointerRadius - 12) / spacing));
            for (let row = minRow; row <= maxRow; row++) {
                for (let col = minCol; col <= maxCol; col++) {
                    const key = row * columns + col;
                    if (!activeDots.has(key)) activeDots.set(key, { key, x: 12 + col * spacing, y: 12 + row * spacing, dx: 0, dy: 0, vx: 0, vy: 0 });
                }
            }
        }
        const heldFor = pointer.pressed ? Math.max(0, time - pointer.pressedAt - 250) : 0;
        const concentration = 1 - Math.exp(-heldFor / 2500);
        let unsettled = active && (Math.abs(pointer.x - position.x) + Math.abs(pointer.y - position.y) > 0.05);
        buckets.forEach(bucket => { bucket.length = 0; });
        activeDots.forEach((dot, key) => {
            const px = position.x - dot.x, py = position.y - dot.y;
            const distance = Math.sqrt(px * px + py * py);
            const influence = active ? Math.max(0, 1 - distance / pointerRadius) : 0;
            const gentle = influence * influence * (pointer.pressed ? 0.55 : 0.3);
            const pull = gentle + ((1 - Math.exp(-influence * 3)) * 0.88 - gentle) * concentration;
            const tx = px * pull, ty = py * pull;
            spring(dot, tx, ty, true); spring(dot, tx, ty, true);
            const moving = Math.abs(dot.dx - tx) + Math.abs(dot.dy - ty) + Math.abs(dot.vx) + Math.abs(dot.vy) > 0.025;
            if (!moving) { dot.dx = tx; dot.dy = ty; dot.vx = dot.vy = 0; }
            unsettled ||= moving;
            if (!influence && !moving) { activeDots.delete(key); return; }
            const level = Math.round(influence * 7);
            buckets[level].push(dot);
        });
        if (activeDots.size) paintPatch();
        else patch.hidden = true;
        if (unsettled || pointer.pressed && concentration < 0.995) {
            matrixTimer = setTimeout(() => { matrixTimer = null; requestDraw(); }, Math.max(0, lastDraw + 1000 / 30 - performance.now() - 5));
        }
    }
    window.addEventListener('pointermove', event => {
        if (!motionEnabled || performance.now() - lastScroll < 100 || document.body.classList.contains('project-dialog-open')) return;
        pointer.touch = event.pointerType === 'touch';
        if (pointer.touch && !pointer.pressed) return;
        if (!pointer.active) { position.x = event.clientX; position.y = event.clientY; }
        pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointerdown', event => {
        if (!motionEnabled || event.button !== 0 || document.body.classList.contains('project-dialog-open')) return;
        pointer.touch = event.pointerType === 'touch';
        pointer.x = event.clientX; pointer.y = event.clientY;
        if (!pointer.active) { position.x = pointer.x; position.y = pointer.y; }
        pointer.active = true;
        pointer.pressed = !event.target.closest('a, button, input, textarea, select');
        pointer.pressedAt = pointer.pressed ? performance.now() : 0;
        document.body.classList.toggle('matrix-holding', pointer.pressed);
        requestDraw();
    }, { passive: true });
    function release() {
        pointer.pressed = false; pointer.pressedAt = 0;
        document.body.classList.remove('matrix-holding');
        if (pointer.touch) pointer.active = false;
        requestDraw();
    }
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', reset, { passive: true });
    window.addEventListener('contextmenu', event => { if (pointer.pressed) event.preventDefault(); });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', () => { lastScroll = performance.now(); if (activeDots.size || frame !== null) reset(); }, { passive: true });
    window.addEventListener('resize', () => { if (resizeFrame === null) resizeFrame = requestAnimationFrame(resize); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    window.addEventListener('motionchange', () => { if (!motionEnabled) reset(); });
    window.addEventListener('dialogchange', () => { if (document.body.classList.contains('project-dialog-open')) reset(); });
    resize();
}

loadAudioLibrary();
void startPlayback();

// All pointer decoration shares one frame. Geometry is cached until scrolling,
// resizing or changing dialogs, and every measurement precedes every style write.
const spotlightSelector = '.project-card, .roadmap-block, .project-warning, .avatar, #audio-toggle, #motion-toggle, #projects-layout-toggle, .contact-button, .project-dialog-panel';
let pointerEffectFrame = null, pointerEffectEvent = null, geometryVersion = 0;
let previousSpot = null;
const geometryCache = new WeakMap();
function cachedRect(element) {
    const cached = geometryCache.get(element);
    if (cached?.version === geometryVersion) return cached.rect;
    const rect = element.getBoundingClientRect();
    geometryCache.set(element, { version: geometryVersion, rect });
    return rect;
}
function paintPointerEffects() {
    pointerEffectFrame = null;
    if (!pointerEffectEvent) return;
    const { spot, link, clientX, clientY } = pointerEffectEvent;
    const spotRect = spot ? cachedRect(spot) : null;
    const linkRect = link ? cachedRect(link) : null;
    if (previousSpot && previousSpot !== spot) {
        previousSpot.style.removeProperty('--spot-x'); previousSpot.style.removeProperty('--spot-y');
    }
    if (spotRect) {
        spot.style.setProperty('--spot-x', `${clientX - spotRect.left}px`);
        spot.style.setProperty('--spot-y', `${clientY - spotRect.top}px`);
    }
    if (linkRect) link.style.setProperty('--link-x', `${Math.max(0, Math.min(linkRect.width - 2, clientX - linkRect.left))}px`);
    previousSpot = spot;
}
function queuePointerEffects(event) {
    if (event.pointerType === 'touch') return;
    const spot = motionEnabled ? event.target.closest(spotlightSelector) : null;
    const link = event.target.closest('a:not(.skip-link):not(.contact-button)');
    if (!spot && !link && !previousSpot) return;
    pointerEffectEvent = { spot, link, clientX: event.clientX, clientY: event.clientY };
    if (pointerEffectFrame === null) pointerEffectFrame = requestAnimationFrame(paintPointerEffects);
}
document.addEventListener('pointermove', queuePointerEffects, { passive: true });
document.addEventListener('pointerover', queuePointerEffects, { passive: true });
window.addEventListener('scroll', () => { geometryVersion++; }, { passive: true });
window.addEventListener('resize', () => { geometryVersion++; }, { passive: true });
window.addEventListener('dialogchange', () => {
    geometryVersion++;
    pointerEffectEvent = null;
    if (pointerEffectFrame !== null) cancelAnimationFrame(pointerEffectFrame);
    pointerEffectFrame = null; previousSpot = null;
});
document.addEventListener('animationend', () => { geometryVersion++; });
document.addEventListener('focusin', event => {
    const link = event.target.closest('a:not(.skip-link):not(.contact-button)');
    if (link?.matches(':focus-visible')) link.style.setProperty('--link-x', `${cachedRect(link).width / 2}px`);
});

// Fetch and parse the dialog library only as the project section approaches.
let projectModulePromise;
function loadProjectDialogs() {
    if (!projectModulePromise) projectModulePromise = import('./assets/projects.js?v=20261015-3').then(module => module.projectsReady).catch(error => {
        projectModulePromise = null;
        throw error;
    });
    return projectModulePromise;
}
if ('IntersectionObserver' in window) {
    const projectLoader = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            projectLoader.disconnect();
            void loadProjectDialogs().catch(() => {});
        }
    }, { rootMargin: '400px' });
    projectLoader.observe(document.getElementById('projects'));
} else void loadProjectDialogs().catch(() => {});
projectList.addEventListener('click', async event => {
    const fallback = event.target.closest('a[data-project-id]');
    if (!fallback || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const id = fallback.dataset.projectId, url = fallback.href;
    try {
        await loadProjectDialogs();
        projectList.querySelector(`button[data-project-id="${CSS.escape(id)}"]`)?.click();
    } catch { window.location.assign(url); }
});
