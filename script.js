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

// Keep a local monogram visible when the remote portrait is unavailable.
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

const canvas = document.getElementById('dot-matrix');
const context = canvas.getContext('2d');
const cursor = document.getElementById('cursor');

if (context) {
    const spacing = 28;
    const radius = 190;
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
        dots = [];
        for (let y = spacing / 2; y < height; y += spacing) {
            for (let x = spacing / 2; x < width; x += spacing) {
                dots.push({ x, y, dx: 0, dy: 0, vx: 0, vy: 0 });
            }
        }
        requestDraw();
    }

    function requestDraw() {
        if (frame === null && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function draw(time) {
        frame = null;
        const interactive = motionEnabled;
        const active = interactive && pointer.active;
        position.x += (pointer.x - position.x) * 0.18;
        position.y += (pointer.y - position.y) * 0.18;
        cursor.style.transform = `translate(${position.x - 18}px, ${position.y - 18}px)`;
        cursor.style.opacity = active && !pointer.touch ? '1' : '0';
        context.clearRect(0, 0, width, height);
        let moving = false;
        dots.forEach(dot => {
            const offsetX = position.x - dot.x;
            const offsetY = position.y - dot.y;
            const distance = Math.hypot(offsetX, offsetY);
            const influence = active ? Math.max(0, 1 - distance / radius) : 0;
            // A weighted pointer pulls nearby dots inward; springs restore the grid.
            const pull = influence * influence * (pointer.pressed ? 0.55 : 0.3);
            const drift = interactive ? Math.sin(time / 1300 + dot.x / 140 + dot.y / 180) * 1.8 : 0;
            const targetX = offsetX * pull + drift;
            const targetY = offsetY * pull + drift * 0.5;
            if (interactive) {
                dot.vx = (dot.vx + (targetX - dot.dx) * 0.075) * 0.76;
                dot.vy = (dot.vy + (targetY - dot.dy) * 0.075) * 0.76;
                dot.dx += dot.vx;
                dot.dy += dot.vy;
            } else {
                dot.dx = dot.dy = dot.vx = dot.vy = 0;
            }
            if (Math.abs(dot.dx) + Math.abs(dot.dy) + Math.abs(dot.vx) + Math.abs(dot.vy) > 0.05) moving = true;
            context.fillStyle = `rgba(235, 235, 230, ${0.48 + influence * 0.38})`;
            context.beginPath();
            context.arc(dot.x + dot.dx, dot.y + dot.dy, 0.9 + influence * 0.8, 0, Math.PI * 2);
            context.fill();
        });
        if (interactive || moving) requestDraw();
    }

    window.addEventListener('pointermove', event => {
        pointer.touch = event.pointerType === 'touch';
        if (!pointer.active) { position.x = event.clientX; position.y = event.clientY; }
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointerdown', event => {
        pointer.touch = event.pointerType === 'touch';
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (!pointer.active) { position.x = pointer.x; position.y = pointer.y; }
        pointer.active = pointer.pressed = true;
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointerup', () => {
        pointer.pressed = false;
        if (pointer.touch) pointer.active = false;
        requestDraw();
    }, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });
    function release() { pointer.active = pointer.pressed = false; requestDraw(); }
    document.documentElement.addEventListener('pointerleave', release);
    window.addEventListener('blur', release);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
            pointer.active = pointer.pressed = false;
        } else requestDraw();
    });
    window.addEventListener('motionchange', requestDraw);
    resize();
}
