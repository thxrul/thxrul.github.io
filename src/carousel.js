// Stationary repository icons expand into a foreground description on hover.
export function mountCarousel(projects, container, openProject) {
    const toggle = document.getElementById('projects-layout-toggle');
    const controls = document.createElement('div'); controls.className = 'project-view-controls';
    toggle.before(controls); controls.append(toggle);
    const stage = document.createElement('div'); stage.className = 'repository-carousel'; stage.id = 'repository-carousel'; toggle.setAttribute('aria-controls', 'project-list repository-carousel'); stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', 'GitHub repositories');
    const track = document.createElement('div'); track.className = 'repository-track';
    const group = document.createElement('div'); group.className = 'repository-group';
    for (const project of projects) {
        const source = container.querySelector(`[data-project-id="${CSS.escape(project.id)}"]`);
        const card = source.cloneNode(true); card.classList.add('repository-tile'); card.removeAttribute('aria-expanded');
        const number = document.createElement('span'); number.className = 'repository-number'; number.textContent = String(projects.indexOf(project) + 1).padStart(2, '0'); number.setAttribute('aria-hidden','true');
        const summary = document.createElement('span'); summary.className = 'repository-summary'; summary.textContent = Array.isArray(project.description) ? project.description.join('\n\n') : project.description;
        card.append(number, summary); group.append(card);
    }
    track.append(group); stage.append(track); container.before(stage);
    const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'project-card project-hover-preview'; preview.tabIndex = -1; preview.hidden = true; stage.append(preview);
    const hint = document.createElement('p'); hint.className = 'carousel-hint'; hint.textContent = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Hover to explore · click for details' : 'Tap a repository to explore'; stage.after(hint);
    let view = 'icons', selected = null, leaveTimer;
    const reduced = () => document.documentElement.classList.contains('motion-reduced');
    function dismissPreview() { if (document.body.classList.contains('project-dialog-open')) return; clearTimeout(leaveTimer); selected = null; preview.hidden = true; }
    function setView(next, persist = true) {
        dismissPreview(); view = next; stage.hidden = hint.hidden = view !== 'icons'; container.hidden = view === 'icons';
        container.classList.toggle('is-grid', view === 'grid'); toggle.dataset.view = view;
        const target = { icons: 'list', list: 'grid', grid: 'icons' }[view];
        toggle.setAttribute('aria-label', `Use ${target} layout`); toggle.title = `Use ${target} layout`; toggle.setAttribute('aria-pressed', String(view !== 'icons'));
        if (persist) { try { localStorage.setItem('project-view-v2', view); } catch {} }
    }
    function projectFor(button) { return projects.find(p => p.id === button?.dataset.projectId); }
    function showPreview(button) {
        const project = projectFor(button);
        if (!project || selected === project.id) return;
        clearTimeout(leaveTimer); selected = project.id;
        const source = button.getBoundingClientRect(), bounds = stage.getBoundingClientRect();
        preview.replaceChildren(...[...button.children].filter(node => !node.classList.contains('repository-number')).map(node => node.cloneNode(true)));
        const more = document.createElement('span'); more.className = 'repository-more'; more.textContent = 'Explore repository ↗'; preview.append(more);
        preview.dataset.projectId = project.id; preview.setAttribute('aria-label', `Open ${project.name} project details`); preview.setAttribute('aria-haspopup', 'dialog'); preview.setAttribute('aria-expanded', 'false'); preview.hidden = false;
        const width = Math.min(600, bounds.width - 32);
        const left = Math.max(16, Math.min(bounds.width - width - 16, source.left - bounds.left + source.width / 2 - width / 2));
        preview.style.width = `${width}px`; preview.style.left = `${left}px`;
        preview.getAnimations().forEach(a => a.cancel());
        const height = preview.getBoundingClientRect().height;
        const top = Math.max(16, Math.min(Math.max(16, bounds.height - height - 16), source.top - bounds.top + source.height / 2 - height / 2));
        preview.style.top = `${top}px`;
        if (!reduced()) preview.animate([{ transform: `translate(${source.left - bounds.left - left}px,${source.top - bounds.top - top}px) scale(${source.width / width},${source.height / height})`, opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    track.addEventListener('pointerover', event => { if (event.pointerType === 'mouse' && matchMedia('(hover: hover)').matches) { const card = event.target.closest('.repository-tile'); if (card) showPreview(card); } });
    function leaveItem(event) { if (!event.relatedTarget?.closest?.('.repository-tile, .project-hover-preview')) { clearTimeout(leaveTimer); leaveTimer = setTimeout(dismissPreview, 120); } }
    track.addEventListener('pointerout', leaveItem);
    preview.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
    preview.addEventListener('pointerleave', leaveItem);
    stage.addEventListener('pointerleave', () => { leaveTimer = setTimeout(dismissPreview, 120); });
    stage.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
    stage.addEventListener('click', event => { const button = event.target.closest('[data-project-id]'); const project = projectFor(button); if (project) void openProject(project, button); });
    // Keyboard focus exposes readable names and descriptions in the list.
    stage.addEventListener('focusin', event => { const button = event.target.closest('[data-project-id]'); if (button?.matches(':focus-visible')) { const id = button.dataset.projectId; setView('list', false); container.querySelector(`[data-project-id="${CSS.escape(id)}"]`)?.focus({preventScroll: true}); } });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.body.classList.contains('project-dialog-open')) dismissPreview(); });
    toggle.addEventListener('click', () => setView({icons: 'list', list: 'grid', grid: 'icons'}[view]));
    window.addEventListener('motionchange', dismissPreview);
    window.addEventListener('scroll', dismissPreview, { passive: true });
    let initial = 'icons'; try { const saved = localStorage.getItem('project-view-v2'); if (saved === 'carousel' || ['icons','list','grid'].includes(saved)) initial = saved === 'carousel' ? 'icons' : saved; } catch {}
    container.showProjectList = () => setView('list', false);
    setView(initial, false); toggle.hidden = false;
}
