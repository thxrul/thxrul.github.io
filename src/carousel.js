// The strip moves on the compositor. Hover previews stay above it, outside its transform.
export function mountCarousel(projects, container, openProject) {
    const section = document.getElementById('projects');
    const toggle = document.getElementById('projects-layout-toggle');
    const controls = document.createElement('div'); controls.className = 'project-view-controls';
    toggle.before(controls); controls.append(toggle);
    const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'carousel-pause'; pause.textContent = 'Pause'; pause.setAttribute('aria-label', 'Pause moving projects'); pause.setAttribute('aria-pressed', 'false'); controls.prepend(pause);
    const stage = document.createElement('div'); stage.className = 'repository-carousel'; stage.id = 'repository-carousel'; toggle.setAttribute('aria-controls', 'project-list repository-carousel'); stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', 'Moving GitHub repositories');
    const track = document.createElement('div'); track.className = 'repository-track';
    const group = document.createElement('div'); group.className = 'repository-group';
    for (const project of projects) {
        const source = container.querySelector(`[data-project-id="${CSS.escape(project.id)}"]`);
        const card = source.cloneNode(true); card.classList.add('repository-tile'); card.removeAttribute('aria-expanded');
        const number = document.createElement('span'); number.className = 'repository-number'; number.textContent = String(projects.indexOf(project) + 1).padStart(2, '0'); number.setAttribute('aria-hidden','true');
        const summary = document.createElement('span'); summary.className = 'repository-summary'; summary.textContent = Array.isArray(project.description) ? project.description[0] : project.description;
        card.append(number, summary); group.append(card);
    }
    // Repeat small collections to cover the viewport. Only the first copy enters tab order.
    const originalCards = [...group.children];
    const repeats = Math.max(1, Math.ceil(6 / projects.length));
    for (let i = 1; i < repeats; i++) for (const source of originalCards) {
        const copy = source.cloneNode(true); copy.tabIndex = -1; copy.setAttribute('aria-hidden', 'true'); group.append(copy);
    }
    const duplicate = group.cloneNode(true); duplicate.setAttribute('aria-hidden', 'true'); duplicate.querySelectorAll('button').forEach(button => { button.tabIndex = -1; });
    track.append(group, duplicate); stage.append(track); container.before(stage);
    const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'project-card project-hover-preview'; preview.tabIndex = -1; preview.hidden = true; stage.append(preview);
    const hint = document.createElement('p'); hint.className = 'carousel-hint'; hint.textContent = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Hover to explore · click for details' : 'Tap a repository to explore'; stage.after(hint);
    let view = 'carousel', paused = false, visible = false, travel = null, selected = null, leaveTimer;
    const reduced = () => document.documentElement.classList.contains('motion-reduced');
    function updatePlayback() {
        const running = view === 'carousel' && visible && !paused && !reduced() && !document.hidden && !document.body.classList.contains('project-dialog-open');
        if (travel) { const duration = travel.effect.getTiming().duration; travel.effect.updateTiming({ easing: document.documentElement.classList.contains('performance-lite') ? `steps(${Math.max(1, Math.round(duration / 1000 * 30))}, end)` : 'linear' }); }
        if (running) travel?.play(); else travel?.pause();
        pause.textContent = paused ? 'Play' : 'Pause'; pause.setAttribute('aria-pressed', String(paused)); pause.setAttribute('aria-label', paused ? 'Play moving projects' : 'Pause moving projects');
        pause.disabled = reduced();
    }
    function sizeTrack() {
        if (view !== 'carousel') return;
        const width = group.getBoundingClientRect().width;
        if (!width) return;
        const progress = travel ? (Number(travel.currentTime) % travel.effect.getTiming().duration) / travel.effect.getTiming().duration : .35;
        travel?.cancel();
        travel = track.animate([{ transform: `translate3d(${-width}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: width / 28 * 1000, iterations: Infinity, easing: 'linear' });
        travel.currentTime = progress * width / 28 * 1000; updatePlayback();
    }
    function dismissPreview() { if (document.body.classList.contains('project-dialog-open')) return; clearTimeout(leaveTimer); selected = null; preview.hidden = true; }
    function setView(next, persist = true) {
        dismissPreview(); view = next; stage.hidden = hint.hidden = pause.hidden = view !== 'carousel'; container.hidden = view === 'carousel';
        container.classList.toggle('is-grid', view === 'grid'); toggle.dataset.view = view;
        const target = { carousel: 'list', list: 'grid', grid: 'carousel' }[view];
        toggle.setAttribute('aria-label', `Use ${target} layout`); toggle.title = `Use ${target} layout`; toggle.setAttribute('aria-pressed', String(view !== 'carousel'));
        if (persist) { try { localStorage.setItem('project-view-v2', view); } catch {} }
        if (view === 'carousel') sizeTrack(); updatePlayback();
    }
    function projectFor(button) { return projects.find(p => p.id === button?.dataset.projectId); }
    function showPreview(button) {
        const project = projectFor(button);
        if (!project || reduced() || selected === project.id) return;
        clearTimeout(leaveTimer); selected = project.id;
        const source = button.getBoundingClientRect(), bounds = stage.getBoundingClientRect();
        preview.replaceChildren(...[...button.children].filter(node => !node.classList.contains('repository-number')).map(node => node.cloneNode(true)));
        const more = document.createElement('span'); more.className = 'repository-more'; more.textContent = 'Explore repository ↗'; preview.append(more);
        preview.dataset.projectId = project.id; preview.setAttribute('aria-label', `Open ${project.name} project details`); preview.setAttribute('aria-haspopup', 'dialog'); preview.setAttribute('aria-expanded', 'false'); preview.hidden = false;
        const width = Math.min(430, bounds.width - 32);
        const left = Math.max(16, Math.min(bounds.width - width - 16, source.left - bounds.left + source.width / 2 - width / 2));
        preview.style.width = `${width}px`; preview.style.left = `${left}px`;
        preview.getAnimations().forEach(a => a.cancel());
        preview.animate([{ transform: 'translateY(12px) scale(.88)', opacity: .4 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 330, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    track.addEventListener('pointerover', event => { if (event.pointerType === 'mouse' && matchMedia('(hover: hover)').matches) { const card = event.target.closest('.repository-tile'); if (card) showPreview(card); } });
    stage.addEventListener('pointerleave', () => { leaveTimer = setTimeout(dismissPreview, 120); });
    stage.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
    stage.addEventListener('click', event => { const button = event.target.closest('[data-project-id]'); const project = projectFor(button); if (project) void openProject(project, button); });
    // Keyboard visitors get stable, fully visible cards instead of chasing a moving focus target.
    stage.addEventListener('focusin', event => { const button = event.target.closest('[data-project-id]'); if (button?.matches(':focus-visible')) { const id = button.dataset.projectId; setView('list', false); container.querySelector(`[data-project-id="${CSS.escape(id)}"]`)?.focus({preventScroll: true}); } });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.body.classList.contains('project-dialog-open')) dismissPreview(); });
    pause.addEventListener('click', () => { paused = !paused; updatePlayback(); });
    toggle.addEventListener('click', () => setView({carousel: 'list', list: 'grid', grid: 'carousel'}[view]));
    window.addEventListener('motionchange', () => { dismissPreview(); if (reduced()) setView('list', false); updatePlayback(); });
    window.addEventListener('dialogchange', updatePlayback);
    window.addEventListener('performancechange', updatePlayback);
    document.addEventListener('visibilitychange', updatePlayback);
    window.addEventListener('scroll', dismissPreview, { passive: true });
    new ResizeObserver(sizeTrack).observe(stage);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) dismissPreview(); updatePlayback(); }).observe(stage);
    let initial = 'carousel'; try { const saved = localStorage.getItem('project-view-v2'); if (['carousel','list','grid'].includes(saved)) initial = saved; } catch {}
    container.showProjectList = () => setView('list', false);
    setView(reduced() ? 'list' : initial, false); toggle.hidden = false;
}
