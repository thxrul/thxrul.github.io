// Liquid repository field: blobs drift on their own and swell in place under the pointer.
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
        field.append(blob);
        const state = {
            el: blob, x: 0, y: 0, vx: 0, vy: 0,
            phase: index * 1.73 + .6,
            wander: .18 + ((index * 29) % 8) / 100,
            open: false, empty: false,
        };
        states.push(state);
        blob.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') expand(state); });
        blob.addEventListener('pointerleave', () => { if (state.open) collapse(state); });
        blob.style.setProperty('--blob-morph', `${(9.5 + (index % 4) * 1.6).toFixed(1)}s`);
        blob.style.animationDelay = `${(-index * 2.3).toFixed(1)}s`;
    });
    // Passive blobs sit in the gaps between projects so the field never looks half empty.
    const empties = [];
    const emptyCount = Math.min(9, Math.max(3, Math.round(states.length * .7)));
    for (let i = 0; i < emptyCount; i += 1) {
        const el = document.createElement('div');
        el.className = 'repository-tile is-empty';
        el.setAttribute('aria-hidden', 'true');
        const radius = 26 + ((i * 17 + 9) % 32);
        el.style.setProperty('--blob-size', `${radius * 2}px`);
        el.style.setProperty('--blob-morph', `${(12 + (i % 3) * 2.4).toFixed(1)}s`);
        el.style.animationDelay = `${(-i * 3.1).toFixed(1)}s`;
        field.append(el);
        empties.push({
            el, x: 0, y: 0, vx: 0, vy: 0,
            phase: i * 2.11 + 4, wander: .13 + ((i * 31) % 7) / 100,
            open: false, empty: true, r: radius + 6, d: radius * 2,
        });
    }
    const all = states.concat(empties);
    stage.append(field);
    container.before(stage);

    let view = 'icons', selected = null, W = 0, H = 0;
    let running = false, frame = 0, lastTime = 0, inView = false;
    const reduced = () => document.documentElement.classList.contains('motion-reduced');
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
    const hoverCapable = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
    const columnsFor = width => Math.max(2, Math.min(states.length || 2, 5, Math.floor(width / 230)));
    const restHalf = () => W <= 700 ? 52 : 64;
    const hoverHalf = () => W <= 700 ? 81 : 99;
    // Resting blobs keep enough clearance that a hover swell fits the stage, except on narrow
    // touch layouts where nothing can hover and the field can sit tight against the edges.
    const boundOf = state => {
        if (state.empty) return state.r + 10;
        return W <= 700 && !hoverCapable() ? restHalf() + 12 : hoverHalf() + 8;
    };
    function sizeEmpties(width) {
        const factor = (width || stage.clientWidth) <= 700 ? .72 : 1;
        for (const state of empties) {
            const size = Math.round(state.d * factor);
            state.el.style.setProperty('--blob-size', `${size}px`);
            state.r = Math.round(size / 2) + 4;
        }
    }

    function measure() {
        const width = field.clientWidth || stage.clientWidth || 0;
        const height = field.clientHeight || stage.clientHeight || 0;
        if (!width || !height) return;
        W = width; H = height;
    }
    function place(state) {
        state.el.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    }
    function layout() {
        const width = stage.clientWidth;
        if (!width) return;
        const narrow = width <= 700;
        const roomy = narrow && hoverCapable();
        const columns = columnsFor(width);
        const rows = Math.ceil(Math.max(1, states.length) / columns);
        const rowHeight = narrow ? (roomy ? 152 : 130) : 180;
        const padding = narrow ? (roomy ? 122 : 104) : 176;
        const floor = narrow ? (roomy ? 360 : 290) : 440;
        stage.style.height = `${clamp(rows * rowHeight + padding, floor, 1150)}px`;
        sizeEmpties(width);
        measure();
    }
    function seed() {
        measure();
        if (!W || !H) return;
        const columns = columnsFor(W);
        const rows = Math.ceil(Math.max(1, states.length) / columns);
        const insetX = hoverHalf() + 8, insetY = hoverHalf() + 8;
        const innerW = Math.max(1, W - insetX * 2), innerH = Math.max(1, H - insetY * 2);
        states.forEach((state, index) => {
            const column = index % columns, row = Math.floor(index / columns);
            const jitterX = (((index * 37) % 11) / 10 - .5) * (W / (columns + 1)) * .3;
            const jitterY = (((index * 53) % 7) / 6 - .5) * (H / (rows + 1)) * .35;
            state.x = insetX + (column + .5) * innerW / columns + jitterX;
            state.y = insetY + (row + .5) * innerH / rows + jitterY;
            state.vx = Math.cos(index * 2.1) * 7;
            state.vy = Math.sin(index * 1.37) * 7;
            constrain(state);
            place(state);
        });
        empties.forEach((state, index) => {
            const pad = state.r + 12;
            const gx = (index * .61803398875 + .21) % 1;
            const gy = (index * .75487766625 + .37) % 1;
            state.x = pad + gx * Math.max(1, W - pad * 2);
            state.y = pad + gy * Math.max(1, H - pad * 2);
            state.vx = Math.cos(index * 1.9) * 5;
            state.vy = Math.sin(index * 2.3) * 5;
            constrain(state);
            place(state);
        });
    }
    function constrain(state) {
        const bound = boundOf(state);
        const minX = Math.min(W / 2, bound), maxX = Math.max(W / 2, W - bound);
        const minY = Math.min(H / 2, bound), maxY = Math.max(H / 2, H - bound);
        state.x = clamp(state.x, minX, maxX);
        state.y = clamp(state.y, minY, maxY);
    }
    function expand(state) {
        if (!hoverCapable() || selected === state) return;
        if (selected) collapse(selected);
        selected = state; state.open = true;
        state.el.classList.add('is-expanded');
    }
    function collapse(state) {
        if (!state) return;
        state.open = false;
        if (selected === state) selected = null;
        state.el.classList.remove('is-expanded');
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
        for (const state of all) {
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
        for (let i = 0; i < all.length; i += 1) {
            const a = all[i];
            const ra = a.open ? hoverHalf() : (a.empty ? a.r : restHalf());
            for (let j = i + 1; j < all.length; j += 1) {
                const b = all[j];
                if (a.open && b.open) continue;
                const rb = b.open ? hoverHalf() : (b.empty ? b.r : restHalf());
                const rx = ra + rb + 10, ry = rx;
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
        for (const state of all) {
            if (state.open) continue;
            const bound = boundOf(state);
            if (state.x < bound) { state.x = bound; state.vx = Math.abs(state.vx) * .5; }
            if (state.x > W - bound) { state.x = W - bound; state.vx = -Math.abs(state.vx) * .5; }
            if (state.y < bound) { state.y = bound; state.vy = Math.abs(state.vy) * .5; }
            if (state.y > H - bound) { state.y = H - bound; state.vy = -Math.abs(state.vy) * .5; }
            place(state);
        }
    }
    function canRun() {
        return view === 'icons' && inView && !document.hidden && !reduced() && all.length > 0
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
        collapse(selected);
        view = next; stage.hidden = view !== 'icons'; container.hidden = view === 'icons';
        container.classList.toggle('is-grid', view === 'grid'); toggle.dataset.view = view;
        const target = { icons: 'list', list: 'grid', grid: 'icons' }[view];
        toggle.setAttribute('aria-label', `Use ${target} layout`); toggle.title = `Use ${target} layout`; toggle.setAttribute('aria-pressed', String(view !== 'icons'));
        if (persist) { try { localStorage.setItem('project-view-v2', view); } catch {} }
        if (view === 'icons') { layout(); for (const state of all) { constrain(state); place(state); } }
        sync();
    }
    stage.addEventListener('click', event => {
        const button = event.target.closest('[data-project-id]');
        const project = button && projects.find(item => item.id === button.dataset.projectId);
        if (project) void openProject(project, button);
    });
    stage.addEventListener('pointerleave', () => collapse(selected));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.body.classList.contains('project-dialog-open')) collapse(selected);
    });
    toggle.addEventListener('click', () => setView({ icons: 'list', list: 'grid', grid: 'icons' }[view]));
    window.addEventListener('motionchange', () => { collapse(selected); sync(); });
    window.addEventListener('dialogchange', () => { collapse(selected); sync(); });
    window.addEventListener('scroll', () => collapse(selected), { passive: true });
    window.addEventListener('resize', () => {
        collapse(selected);
        if (view !== 'icons') return;
        layout();
        for (const state of all) { constrain(state); place(state); }
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
