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
let frequencyData;
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
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.65;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        waveformData = new Uint8Array(analyser.fftSize);
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
    if (frequencyData) frequencyData.fill(0);
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
        analyser.getByteTimeDomainData(waveformData);
        const rms = Math.sqrt(waveformData.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / waveformData.length);
        const energy = Math.min(1, rms * 3);
        audioEnergy += (energy - audioEnergy) * 0.3;
    } else {
        if (frequencyData) frequencyData.fill(0);
        audioEnergy *= 0.8;
    }
}
function drawHalo() {
    if (!haloContext) return;
    haloContext.clearRect(0, 0, 96, 96);
    // Repeat eight spectrum bands across four quadrants for a balanced circular equalizer.
    haloDots.forEach((dot, i) => {
        const bandIndex = Math.min(i % 16, 15 - i % 16);
        const start = Math.round(2 ** (bandIndex * 0.8));
        const end = Math.min(frequencyData?.length || 0, Math.max(start + 1, Math.round(2 ** ((bandIndex + 1) * 0.8))));
        let band = 0;
        if (frequencyData && !audio.paused) {
            for (let bin = start; bin < end; bin++) band += frequencyData[bin] / 255;
            band /= end - start;
        }
        const energy = motionEnabled ? Math.min(1, band * 0.65 + audioEnergy * 0.6) : 0;
        spring(dot, energy * 10, 0, motionEnabled);
        const radius = 31;
        haloContext.strokeStyle = `rgba(235, 235, 230, ${0.45 + energy * 0.5})`;
        haloContext.lineWidth = 1.6;
        haloContext.lineCap = 'round';
        haloContext.beginPath();
        haloContext.moveTo(48 + Math.cos(dot.angle) * radius, 48 + Math.sin(dot.angle) * radius);
        haloContext.lineTo(48 + Math.cos(dot.angle) * (radius + 2 + dot.dx), 48 + Math.sin(dot.angle) * (radius + 2 + dot.dx));
        haloContext.stroke();
    });
}

const canvas = document.getElementById('dot-matrix');
const context = canvas.getContext('2d');
const cursor = document.getElementById('cursor');
if (context) {
    const spacing = 24;
    const pointerRadius = 190;
    const pointer = { x: 0, y: 0, active: false, pressed: false, pressedAt: 0, touch: false };
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
    function draw(time) {
        frame = null;
        readAudio();
        drawHalo();
        const active = motionEnabled && pointer.active;
        position.x += (pointer.x - position.x) * 0.18;
        position.y += (pointer.y - position.y) * 0.18;
        cursor.style.transform = `translate(${position.x - 18}px, ${position.y - 18}px)`;
        cursor.style.opacity = active && !pointer.touch ? '1' : '0';
        const heldFor = pointer.pressed ? Math.max(0, time - pointer.pressedAt - 250) : 0;
        const concentration = 1 - Math.exp(-heldFor / 2500);
        context.clearRect(0, 0, width, height);
        dots.forEach(dot => {
            const px = position.x - dot.x;
            const py = position.y - dot.y;
            const distance = Math.hypot(px, py);
            const influence = active ? Math.max(0, 1 - distance / pointerRadius) : 0;
            // Restore the original gentle response; a sustained hold deepens the well.
            const gentlePull = influence * influence * (pointer.pressed ? 0.55 : 0.3);
            const gatheredPull = (1 - Math.exp(-influence * 3)) * 0.88;
            const pull = gentlePull + (gatheredPull - gentlePull) * concentration;
            spring(dot, px * pull, py * pull, motionEnabled);
            context.fillStyle = `rgba(235, 235, 230, ${0.48 + influence * 0.38})`;
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
        if (event.button !== 0) return;
        pointer.active = true;
        pointer.pressed = !event.target.closest('a, button, input, textarea, select');
        pointer.pressedAt = pointer.pressed ? performance.now() : 0;
        document.body.classList.toggle('matrix-holding', pointer.pressed);
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointerup', () => {
        pointer.pressed = false;
        pointer.pressedAt = 0;
        document.body.classList.remove('matrix-holding');
        if (pointer.touch) pointer.active = false;
        requestDraw();
    }, { passive: true });
    function release() { pointer.active = pointer.pressed = false; pointer.pressedAt = 0; document.body.classList.remove('matrix-holding'); requestDraw(); }
    window.addEventListener('pointercancel', release, { passive: true });
    window.addEventListener('contextmenu', event => {
        if (pointer.pressed) event.preventDefault();
    });
    document.documentElement.addEventListener('pointerleave', release);
    window.addEventListener('blur', release);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', requestDraw, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null; release();
        } else requestDraw();
    });
    window.addEventListener('motionchange', () => {
        if (!motionEnabled) release();
        else requestDraw();
    });
    window.addEventListener('matrixchange', requestDraw);
    resize();
}

// Use GitHub's current public metadata; keep the last retrieved snapshot if
// the API is offline or rate-limited. Descriptions are text, never HTML.
async function refreshProjectDescriptions() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch('https://api.github.com/users/thxrul/repos?per_page=100', {
            signal: controller.signal,
            headers: { Accept: 'application/vnd.github+json' }
        });
        if (!response.ok) throw new Error('GitHub metadata unavailable');
        const repositories = await response.json();
        if (!Array.isArray(repositories)) throw new Error('Invalid repository metadata');
        document.querySelectorAll('[data-repository]').forEach(card => {
            const repository = repositories.find(repo => repo.name === card.dataset.repository);
            if (!repository) return;
            const description = card.querySelector('.project-description');
            description.textContent = typeof repository.description === 'string' && repository.description.trim()
                ? repository.description : 'No description provided.';
            description.dataset.descriptionSource = 'github';
        });
        window.dispatchEvent(new Event('matrixchange'));
    } catch (error) {
        // Static snapshots keep the projects useful without API access or JavaScript.
    } finally { clearTimeout(timeout); }
}
refreshProjectDescriptions();

loadAudioLibrary();
void startPlayback();
