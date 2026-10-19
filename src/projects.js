/* Motion Primitives Basic Two interaction, implemented with native dialog and
 * compositor animations. Spring: mass 1, stiffness 200, damping 24.
 * No framework, projection engine, or permanent animation loop is needed.
 */
import fallbackProjects from '../projects.json';

const reduced = () => document.body.classList.contains('motion-reduced');
const springSteps = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24 * 0.5;
    const progress = i === 24 ? 1 : 1 - Math.exp(-12 * t) * (Math.cos(Math.sqrt(56) * t) + 12 / Math.sqrt(56) * Math.sin(Math.sqrt(56) * t));
    return { offset: i / 24, progress };
});
function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function validProjects(data) {
    return Array.isArray(data) && data.length > 0 && data.every(project =>
        ['id', 'name', 'language', 'symbol', 'url'].every(key => typeof project[key] === 'string') &&
        /^https:\/\/github\.com\//.test(project.url) &&
        (typeof project.description === 'string' || Array.isArray(project.description) && project.description.every(p => typeof p === 'string'))
    ) && new Set(data.map(project => project.id)).size === data.length;
}
function metadata(project) { return project.language + (project.status ? ` · ${project.status}` : ''); }

// Apple physics: rubber-banding resistance for edge overshoot
function rubberband(overshoot, dimension = 500, constant = 0.55) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Apple physics: exponential momentum projection (WWDC 2018)
function projectMomentum(initialVelocity, decelerationRate = 0.998) {
    return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

let currentDialog = null;
function morphFrames(from, to, closing = false) {
    const dx = from.x + from.width / 2 - to.x - to.width / 2;
    const dy = from.y + from.height / 2 - to.y - to.height / 2;
    const sx = from.width / to.width, sy = from.height / to.height;
    return springSteps.map(({ offset, progress }) => {
        const p = closing ? progress : 1 - progress;
        return { offset, transform: `translate3d(${dx * p}px, ${dy * p}px, 0) scale(${1 + (sx - 1) * p}, ${1 + (sy - 1) * p})` };
    });
}
function animateMorph(trigger, panel, dialog, closing) {
    if (reduced() || !panel.animate) return Promise.resolve();
    const animations = [], clones = [], hidden = [];
    const sourceRect = trigger.getBoundingClientRect(), targetRect = panel.getBoundingClientRect();
    // Read all shared geometry before changing any styles.
    const shared = [
        ['.project-symbol', '.project-symbol'],
        ['.project-trigger-name', '.project-dialog-title'],
        ['.project-trigger-meta', '.project-dialog-meta'],
    ].map(([source, target]) => {
        const from = trigger.querySelector(source), to = panel.querySelector(target);
        return { to, fromRect: from.getBoundingClientRect(), toRect: to.getBoundingClientRect() };
    });
    for (const { to, fromRect, toRect } of shared) {
        if (!fromRect.width || !fromRect.height || !toRect.width || !toRect.height) continue;
        const clone = to.cloneNode(true);
        clone.removeAttribute('id'); clone.setAttribute('aria-hidden', 'true');
        clone.classList.add('project-morph-clone');
        Object.assign(clone.style, { position: 'fixed', margin: '0', left: `${toRect.x}px`, top: `${toRect.y}px`, width: `${toRect.width}px`, height: `${toRect.height}px` });
        dialog.appendChild(clone); clones.push(clone); hidden.push(to); to.style.visibility = 'hidden';
        animations.push(clone.animate(morphFrames(fromRect, toRect, closing), { duration: 380, fill: 'both', easing: 'linear' }));
    }
    animations.push(panel.animate(morphFrames(sourceRect, targetRect, closing), { duration: 380, fill: 'both', easing: 'linear' }));
    for (const node of panel.querySelectorAll('.project-dialog-description, .project-repository-link, .project-dialog-close')) {
        animations.push(node.animate(closing ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: closing ? 100 : 180, delay: closing ? 0 : 100, fill: 'both' }));
    }
    const finished = Promise.allSettled(animations.map(animation => animation.finished)).finally(() => {
        hidden.forEach(node => { node.style.visibility = ''; });
        clones.forEach(node => node.remove());
        animations.forEach(animation => animation.cancel());
    });
    finished.cancel = () => animations.forEach(animation => animation.cancel());
    return finished;
}
async function openProject(project, trigger) {
    if (currentDialog) return;
    const dialog = element('dialog', 'project-dialog-overlay project-native-dialog');
    const panel = element('div', 'project-dialog-panel');
    const handle = element('div', 'project-dialog-handle'); handle.setAttribute('aria-hidden', 'true');
    const content = element('div', 'project-dialog-scroll');
    const titleId = `project-dialog-title-${project.id}`, descriptionId = `project-dialog-description-${project.id}`;
    dialog.setAttribute('aria-labelledby', titleId); dialog.setAttribute('aria-describedby', descriptionId);
    const art = element('div', 'project-dialog-art');
    const symbol = element('span', 'project-symbol project-symbol-large', project.symbol); symbol.setAttribute('aria-hidden', 'true'); art.append(symbol);
    const title = element('h3', 'project-dialog-title', project.name); title.id = titleId;
    const meta = element('span', 'project-dialog-meta', metadata(project));
    const description = element('div', 'project-dialog-description'); description.id = descriptionId;
    const paragraphs = Array.isArray(project.description) ? project.description : project.description.split(/\n\s*\n/);
    paragraphs.filter(Boolean).forEach(paragraph => description.append(element('p', '', paragraph)));
    const repository = element('a', 'project-repository-link'); repository.href = project.url; repository.target = '_blank'; repository.rel = 'noopener noreferrer';
    const ink = element('span', 'link-ink', 'View on GitHub '), arrow = element('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true'); ink.append(arrow); repository.append(ink);
    content.append(art, title, meta, description, repository);
    const close = element('button', 'project-dialog-close'); close.type = 'button'; close.autofocus = true; close.setAttribute('aria-label', 'Close project details');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
    panel.append(handle, content, close); dialog.append(panel); document.body.append(dialog);
    const previousOverflow = document.body.style.overflow;
    const inertState = [...document.body.children].filter(node => node !== dialog).map(node => [node, node.inert]);
    currentDialog = dialog; trigger.setAttribute('aria-expanded', 'true');
    dialog.showModal(); content.scrollTop = 0;
    inertState.forEach(([node]) => { node.inert = true; });
    document.body.style.overflow = 'hidden'; document.body.classList.add('project-dialog-open');
    window.dispatchEvent(new Event('dialogchange')); close.focus({ preventScroll: true });
    let opening = true, closing = false, pendingClose = false, interrupted = false, openingAnimation;
    async function closeProject() {
        if (closing) return;
        if (opening) { pendingClose = true; interrupted = true; openingAnimation?.cancel?.(); return; }
        closing = true;
        // Return a long description to its top so shared elements remain in place.
        content.scrollTop = 0;
        if (!interrupted) await animateMorph(trigger, panel, dialog, true);
        dialog.close(); dialog.remove(); currentDialog = null;
        inertState.forEach(([node, value]) => { node.inert = value; });
        document.body.style.overflow = previousOverflow; document.body.classList.remove('project-dialog-open');
        trigger.setAttribute('aria-expanded', 'false'); trigger.style.opacity = '';
        window.dispatchEvent(new Event('dialogchange')); trigger.focus({ preventScroll: true });
    }
    close.addEventListener('click', closeProject);
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
    dialog.addEventListener('pointerdown', event => { if (event.target === dialog) closeProject(); });
    dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        if (event.shiftKey && document.activeElement === repository) { event.preventDefault(); close.focus(); }
        else if (!event.shiftKey && document.activeElement === close) { event.preventDefault(); repository.focus(); }
    });

    // 1:1 Gesture tracking, rubber-banding, momentum projection, and spring release handoff
    let isDragging = false, startY = 0, initialY = 0, history = [], gestureAnim = null;
    function getLiveY() {
        const matrixStr = getComputedStyle(panel).transform;
        if (!matrixStr || matrixStr === 'none') return 0;
        try { return new DOMMatrix(matrixStr).m42; } catch { return 0; }
    }

    panel.addEventListener('pointerdown', e => {
        if (reduced()) return;
        if (e.target.closest('a, button:not(.project-dialog-handle)') && !e.target.closest('.project-dialog-art, .project-dialog-title, .project-dialog-handle')) return;
        if (content.scrollTop > 0 && e.target.closest('.project-dialog-scroll') && !e.target.closest('.project-dialog-handle')) return;

        isDragging = true;
        try { panel.setPointerCapture(e.pointerId); } catch {}
        startY = e.clientY;
        initialY = getLiveY();
        if (gestureAnim) { gestureAnim.cancel(); gestureAnim = null; }
        history = [{ y: e.clientY, time: performance.now() }];
        panel.style.willChange = 'transform';
    });

    panel.addEventListener('pointermove', e => {
        if (!isDragging) return;
        const now = performance.now();
        const deltaY = e.clientY - startY;
        let y = initialY + deltaY;
        if (y < 0) y = rubberband(y);
        panel.style.transform = `translate3d(0, ${y}px, 0)`;
        history.push({ y: e.clientY, time: now });
        if (history.length > 5) history.shift();
    });

    function handleRelease(e) {
        if (!isDragging) return;
        isDragging = false;
        try { panel.releasePointerCapture(e.pointerId); } catch {}

        const currentY = getLiveY();
        let velocity = 0;
        if (history.length > 1) {
            const first = history[0], last = history[history.length - 1];
            const dt = (last.time - first.time) / 1000;
            if (dt > 0) velocity = (last.y - first.y) / dt;
        }

        const projectedY = currentY + projectMomentum(velocity);

        if ((projectedY > 150 || velocity > 400 || currentY > 160) && velocity > -100) {
            const targetY = window.innerHeight;
            const distance = targetY - currentY;
            const duration = Math.min(320, Math.max(160, distance / Math.max(Math.abs(velocity), 700) * 1000));
            gestureAnim = panel.animate([
                { transform: `translate3d(0, ${currentY}px, 0)` },
                { transform: `translate3d(0, ${targetY}px, 0)` }
            ], { duration, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' });
            gestureAnim.finished.then(() => closeProject()).catch(() => {});
        } else {
            const duration = Math.min(380, Math.max(200, Math.abs(currentY) * 1.5));
            gestureAnim = panel.animate([
                { transform: `translate3d(0, ${currentY}px, 0)` },
                { transform: 'translate3d(0, 0px, 0)' }
            ], { duration, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)', fill: 'forwards' });
            gestureAnim.finished.then(() => {
                panel.style.transform = '';
                panel.style.willChange = '';
                gestureAnim = null;
            }).catch(() => {});
        }
    }

    panel.addEventListener('pointerup', handleRelease);
    panel.addEventListener('pointercancel', handleRelease);
    trigger.style.opacity = '0';
    openingAnimation = animateMorph(trigger, panel, dialog, false);
    await openingAnimation;
    opening = false; window.dispatchEvent(new Event('dialogchange'));
    if (pendingClose) closeProject();
}
async function mountProjects() {
    const container = document.getElementById('project-list');
    if (!container) return;
    let projects = fallbackProjects;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch('projects.json', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Project descriptions unavailable');
        const latest = await response.json();
        if (validProjects(latest)) projects = latest;
    } catch { /* Keep the bundled copy if an edit is malformed or the network is unavailable. */ }
    finally { clearTimeout(timeout); }
    const fragment = document.createDocumentFragment();
    for (const project of projects) {
        const entry = element('article', 'project-entry');
        if (project.id === 'OpenMyau-Plus') entry.id = 'project-myau';
        if (project.id === 'thxrul.github.io') entry.id = 'project-website';
        const button = element('button', 'project-card project-dialog-trigger');
        button.type = 'button'; button.dataset.projectId = project.id;
        button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-label', `Open ${project.name} project details`);
        const symbol = element('span', 'project-symbol', project.symbol); symbol.setAttribute('aria-hidden', 'true');
        const copy = element('span', 'project-trigger-copy'); copy.append(element('span', 'project-trigger-name', project.name), element('span', 'project-trigger-meta', metadata(project)));
        const expand = element('span', 'project-expand-mark', '+'); expand.setAttribute('aria-hidden', 'true');
        button.append(symbol, copy, expand); button.addEventListener('click', () => { void openProject(project, button); });
        entry.append(button); fragment.append(entry);
    }
    const focusedId = document.activeElement?.closest('a[data-project-id]')?.dataset.projectId;
    container.replaceChildren(fragment);
    if (focusedId) container.querySelector(`button[data-project-id="${CSS.escape(focusedId)}"]`)?.focus({ preventScroll: true });
    // The existing one-shot reveal is compositor-only and releases its layers on completion.
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting) return;
            target.classList.remove('reveal-pending'); target.classList.add('is-visible');
            target.addEventListener('animationend', () => target.classList.remove('is-visible'), { once: true });
            observer.unobserve(target);
        }), { threshold: 0.1 });
        for (const entry of container.children) {
            if (!reduced() && entry.getBoundingClientRect().top >= innerHeight) entry.classList.add('reveal-pending');
            observer.observe(entry);
        }
    }
}
export const projectsReady = mountProjects();
