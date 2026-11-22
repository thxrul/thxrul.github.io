// Liquid repository field: blobs drift on their own and swell into details under the pointer.
const REST_RADIUS = 44;
const OPEN_MAX_WIDTH = 420;
const OPEN_MAX_HEIGHT = 232;

export function mountCarousel(projects, container, openProject) {
    const toggle = document.getElementById('projects-layout-toggle');
    const controls = document.createElement('div'); controls.className = 'project-view-controls';
    toggle.before(controls); controls.append(toggle);
    const stage = document.createElement('div'); stage.className = 'repository-carousel'; stage.id = 'repository-carousel';
    toggle.setAttribute('aria-controls', 'project-list repository-carousel');
    stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', 'GitHub repositories');
    const field = document.createElement('div'); field.className = 'repository-field';
    const states = [];
    projects.forEach((project, index) => {
        const source = container.querySelector(`[data-project-id="${CSS.escape(project.id)}"]`);
        if (!source) return;
        const blob = source.cloneNode(true);
        blob.classList.add('repository-tile');
        blob.removeAttribute('aria-expanded');
        const number = document.createElement('span');
        number.className = 'repository-number';
        number.textContent = String(index + 1).padStart(2, '0');
        number.setAttribute('aria-hidden', 'true');
        const summary = document.createElement('span');
        summary.className = 'repository-summary';
        summary.textContent = Array.isArray(project.description) ? project.description.join('\n\n') : String(project.description ?? '');
        blob.append(number, summary);
        field.append(blob);
        const state = {
            el: blob, x: 0, y: 0, vx: 0, vy: 0,
            phase: index * 1.73 + .6,
            wander: .18 + ((index * 29) % 8) / 100,
            open: false,
        };
        states.push(state);
        blob.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') openBlob(state); });
        blob.addEventListener('pointerleave', () => { if (state.open) closeBlob(state); });
        blob.style.setProperty('--blob-morph', `${(9.5 + (index % 4) * 1.6).toFixed(1)}s`);
        blob.style.animationDelay = `${(-index * 2.3).toFixed(1)}s`;
    });
    stage.append(field);
    container.before(stage);
    const hint = document.createElement('p'); hint.className = 'carousel-hint';
    hint.textContent = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Drifting shapes · hover to expand · click for details' : 'Tap a repository to open it';
    stage.after(hint);

    let view = 'icons', selected = null, W = 0, H = 0, openWidth = 380, openHeight = 220;
    let running = false, frame = 0, lastTime = 0, inView = false;
    const reduced = () => document.documentElement.classList.contains('motion-reduced');
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
    const hoverCapable = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
    const columnsFor = width => Math.max(2, Math.min(states.length || 2, 5, Math.floor(width / 190)));

    function measure() {
        const width = field.clientWidth || stage.clientWidth || 0;
        const height = field.clientHeight || stage.clientHeight || 0;
        if (!width || !height) return;
        W = width; H = height;
        openWidth = clamp(Math.round(W - 24), 240, OPEN_MAX_WIDTH);
        openHeight = clamp(Math.round(H - 200), 168, OPEN_MAX_HEIGHT);
        field.style.setProperty('--blob-open-w', `${openWidth}px`);
        field.style.setProperty('--blob-open-h', `${openHeight}px`);
    }
    function place(state) {
        state.el.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    }
    function layout() {
        const width = stage.clientWidth;
        if (!width) return;
        const columns = columnsFor(width);
        const rows = Math.ceil(Math.max(1, states.length) / columns);
        stage.style.height = `${clamp(rows * 132 + 132, 400, 1100)}px`;
        measure();
    }
    function seed() {
        measure();
        if (!W || !H) return;
        const columns = columnsFor(W);
        const rows = Math.ceil(Math.max(1, states.length) / columns);
        const insetX = 66, insetY = 62;
        const innerW = Math.max(1, W - insetX * 2), innerH = Math.max(1, H - insetY * 2);
        states.forEach((state, index) => {
            const column = index % columns, row = Math.floor(index / columns);
            const jitterX = (((index * 37) % 11) / 10 - .5) * (W / (columns + 1)) * .4;
            const jitterY = (((index * 53) % 7) / 6 - .5) * (H / (rows + 1)) * .5;
            state.x = insetX + (column + .5) * innerW / columns + jitterX;
            state.y = insetY + (row + .5) * innerH / rows + jitterY;
            state.vx = Math.cos(index * 2.1) * 7;
            state.vy = Math.sin(index * 1.37) * 7;
            constrain(state);
            place(state);
        });
    }
    function constrain(state) {
        const minX = Math.min(W / 2, REST_RADIUS + 12), maxX = Math.max(W / 2, W - REST_RADIUS - 12);
        const minY = Math.min(H / 2, REST_RADIUS + 12), maxY = Math.max(H / 2, H - REST_RADIUS - 12);
        state.x = clamp(state.x, minX, maxX);
        state.y = clamp(state.y, minY, maxY);
    }
    function openBlob(state) {
        if (!hoverCapable() || selected === state) return;
        if (selected) closeBlob(selected);
        selected = state; state.open = true;
        const halfW = openWidth / 2, halfH = openHeight / 2;
        state.x = clamp(state.x, halfW + 14, W - halfW - 14);
        state.y = clamp(state.y, halfH + 14, H - halfH - 14);
        if (!reduced()) state.el.style.transition = 'transform 620ms cubic-bezier(.22,1,.36,1)';
        state.el.classList.add('is-open');
        place(state);
    }
    function closeBlob(state) {
        if (!state) return;
        state.open = false;
        if (selected === state) selected = null;
        state.el.classList.remove('is-open');
        state.el.style.transition = '';
        state.vx += (Math.random() - .5) * 7;
        state.vy += (Math.random() - .5) * 7;
        if (running) place(state);
    }
    function step(now) {
        if (!running) { frame = 0; return; }
        frame = requestAnimationFrame(step);
        if (!lastTime) lastTime = now;
        const dt = Math.min(48, now - lastTime) / 1000;
        lastTime = now;
        if (dt <= 0) return;
        const drag = Math.exp(-1.4 * dt);
        for (const state of states) {
            if (state.open) continue;
            state.phase += dt * state.wander;
            const ax = Math.cos(state.phase * 1.55 + 1.2) * 18 + Math.cos(state.phase * .63 + 3.1) * 12;
            const ay = Math.sin(state.phase * 1.21 + 2.4) * 15 + Math.sin(state.phase * .47 + .8) * 11;
            state.vx = (state.vx + ax * dt) * drag;
            state.vy = (state.vy + ay * dt) * drag;
            const speed = Math.hypot(state.vx, state.vy);
            if (speed > 30) { state.vx *= 30 / speed; state.vy *= 30 / speed; }
            state.x += state.vx * dt;
            state.y += state.vy * dt;
        }
        // Soft separation keeps the liquid from collapsing into one mass.
        for (let i = 0; i < states.length; i += 1) {
            const a = states[i];
            const raX = a.open ? openWidth / 2 : REST_RADIUS, raY = a.open ? openHeight / 2 : REST_RADIUS;
            for (let j = i + 1; j < states.length; j += 1) {
                const b = states[j];
                if (a.open && b.open) continue;
                const rbX = b.open ? openWidth / 2 : REST_RADIUS, rbY = b.open ? openHeight / 2 : REST_RADIUS;
                const rx = raX + rbX + 12, ry = raY + rbY + 12;
                const dx = b.x - a.x, dy = b.y - a.y;
                const overlapX = 1 - Math.abs(dx) / rx, overlapY = 1 - Math.abs(dy) / ry;
                if (overlapX <= 0 || overlapY <= 0) continue;
                const pushX = Math.min(rx * overlapX * .5, 2.5), pushY = Math.min(ry * overlapY * .5, 2.5);
                if (pushX <= pushY) {
                    const shift = Math.sign(dx || 1) * pushX;
                    if (a.open) b.x += shift * 2;
                    else if (b.open) a.x -= shift * 2;
                    else { a.x -= shift; b.x += shift; }
                } else {
                    const shift = Math.sign(dy || 1) * pushY;
                    if (a.open) b.y += shift * 2;
                    else if (b.open) a.y -= shift * 2;
                    else { a.y -= shift; b.y += shift; }
                }
            }
        }
        for (const state of states) {
            if (state.open) continue;
            if (state.x < REST_RADIUS + 12) { state.x = REST_RADIUS + 12; state.vx = Math.abs(state.vx) * .5; }
            if (state.x > W - REST_RADIUS - 12) { state.x = W - REST_RADIUS - 12; state.vx = -Math.abs(state.vx) * .5; }
            if (state.y < REST_RADIUS + 12) { state.y = REST_RADIUS + 12; state.vy = Math.abs(state.vy) * .5; }
            if (state.y > H - REST_RADIUS - 12) { state.y = H - REST_RADIUS - 12; state.vy = -Math.abs(state.vy) * .5; }
            place(state);
        }
    }
    function canRun() {
        return view === 'icons' && inView && !document.hidden && !reduced() && states.length > 0
            && !document.body.classList.contains('project-dialog-open');
    }
    function sync() {
        const next = canRun();
        if (next === running) return;
        running = next;
        lastTime = 0;
        if (next) { if (!frame) frame = requestAnimationFrame(step); }
        else if (frame) { cancelAnimationFrame(frame); frame = 0; }
    }
    function setView(next, persist = true) {
        closeBlob(selected);
        view = next; stage.hidden = hint.hidden = view !== 'icons'; container.hidden = view === 'icons';
        container.classList.toggle('is-grid', view === 'grid'); toggle.dataset.view = view;
        const target = { icons: 'list', list: 'grid', grid: 'icons' }[view];
        toggle.setAttribute('aria-label', `Use ${target} layout`); toggle.title = `Use ${target} layout`; toggle.setAttribute('aria-pressed', String(view !== 'icons'));
        if (persist) { try { localStorage.setItem('project-view-v2', view); } catch {} }
        if (view === 'icons') { layout(); for (const state of states) { constrain(state); place(state); } }
        sync();
    }
    stage.addEventListener('click', event => {
        const button = event.target.closest('[data-project-id]');
        const project = button && projects.find(item => item.id === button.dataset.projectId);
        if (project) void openProject(project, button);
    });
    stage.addEventListener('pointerleave', () => closeBlob(selected));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.body.classList.contains('project-dialog-open')) closeBlob(selected);
    });
    toggle.addEventListener('click', () => setView({ icons: 'list', list: 'grid', grid: 'icons' }[view]));
    window.addEventListener('motionchange', () => { closeBlob(selected); sync(); });
    window.addEventListener('dialogchange', () => { closeBlob(selected); sync(); });
    window.addEventListener('scroll', () => closeBlob(selected), { passive: true });
    window.addEventListener('resize', () => {
        closeBlob(selected);
        if (view !== 'icons') return;
        layout();
        for (const state of states) { constrain(state); place(state); }
    });
    document.addEventListener('visibilitychange', sync);
    let initial = 'icons';
    try {
        const saved = localStorage.getItem('project-view-v2');
        if (saved === 'carousel' || ['icons', 'list', 'grid'].includes(saved)) initial = saved === 'carousel' ? 'icons' : saved;
    } catch {}
    container.showProjectList = () => setView('list', false);
    layout(); seed();
    setView(initial, false);
    toggle.hidden = false;
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            inView = entries.some(entry => entry.isIntersecting);
            sync();
        }, { threshold: .05 });
        observer.observe(stage);
    } else {
        inView = true;
    }
    sync();
}
