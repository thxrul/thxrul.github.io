import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'motion/react';
import {
  MorphingDialog, MorphingDialogTrigger, MorphingDialogContainer,
  MorphingDialogContent, MorphingDialogTitle, MorphingDialogSubtitle,
  MorphingDialogImage, MorphingDialogDescription, MorphingDialogClose,
} from './morphing-dialog.jsx';
import fallbackProjects from '../projects.json';

function moveSpotlight(event) {
  if (document.body.classList.contains('motion-reduced') || event.pointerType === 'touch') return;
  const box = event.currentTarget;
  const rect = box.getBoundingClientRect();
  box.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
  box.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(document.body.classList.contains('motion-reduced'));
  useEffect(() => {
    const update = () => setReduced(document.body.classList.contains('motion-reduced'));
    window.addEventListener('motionchange', update);
    return () => window.removeEventListener('motionchange', update);
  }, []);
  return reduced;
}
function Project({ project, reduced }) {
  const paragraphs = Array.isArray(project.description) ? project.description : project.description.split(/\n\s*\n/);
  return (
    <motion.article className="project-entry" id={project.id === 'OpenMyau-Plus' ? 'project-myau' : project.id === 'thxrul.github.io' ? 'project-website' : undefined}
      initial={reduced ? false : { opacity: 0, x: -24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, x: 0, filter: reduced ? 'none' : 'blur(0px)', transitionEnd: { filter: 'none' } }} viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <MorphingDialog reducedMotion={reduced}>
        <MorphingDialogTrigger className="project-card project-dialog-trigger" label={`Open ${project.name} project details`} onPointerMove={moveSpotlight}>
          <MorphingDialogImage className="project-symbol">{project.symbol}</MorphingDialogImage>
          <span className="project-trigger-copy">
            <MorphingDialogTitle className="project-trigger-name">{project.name}</MorphingDialogTitle>
            <MorphingDialogSubtitle className="project-trigger-meta">{project.language}{project.status ? ` · ${project.status}` : ''}</MorphingDialogSubtitle>
          </span>
          <span className="project-expand-mark" aria-hidden="true">+</span>
        </MorphingDialogTrigger>
        <MorphingDialogContainer>
          <MorphingDialogContent onPointerMove={moveSpotlight}>
            <div className="project-dialog-scroll">
              <div className="project-dialog-art"><MorphingDialogImage className="project-symbol project-symbol-large">{project.symbol}</MorphingDialogImage></div>
              <MorphingDialogTitle as="h3" className="project-dialog-title">{project.name}</MorphingDialogTitle>
              <MorphingDialogSubtitle className="project-dialog-meta">{project.language}{project.status ? ` · ${project.status}` : ''}</MorphingDialogSubtitle>
              <MorphingDialogDescription>{paragraphs.filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</MorphingDialogDescription>
              <a className="project-repository-link" href={project.url} target="_blank" rel="noopener noreferrer"><span className="link-ink">View on GitHub <span aria-hidden="true">↗</span></span></a>
            </div>
            <MorphingDialogClose />
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </motion.article>
  );
}
function Projects({ projects }) {
  const reduced = useReducedMotion();
  return projects.map(project => <Project key={project.id} project={project} reduced={reduced} />);
}
function validProjects(data) {
  return Array.isArray(data) && data.length > 0 && data.every(project =>
    ['id', 'name', 'language', 'symbol', 'url'].every(key => typeof project[key] === 'string') &&
    /^https:\/\/github\.com\//.test(project.url) &&
    (typeof project.description === 'string' || (Array.isArray(project.description) && project.description.every(p => typeof p === 'string')))
  ) && new Set(data.map(project => project.id)).size === data.length;
}
async function mountProjects() {
  const container = document.getElementById('project-list');
  if (!container) return;
  let projects = fallbackProjects;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('projects.json', { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Project descriptions unavailable');
    const latest = await response.json();
    if (validProjects(latest)) projects = latest;
  } catch { /* Bundled descriptions preserve the dialogs during a failed request. */ }
  finally { clearTimeout(timeout); }
  const host = document.createElement('div');
  host.id = 'project-dialog-root';
  document.body.appendChild(host);
  createRoot(container).render(<Projects projects={projects} />);
}
mountProjects();
