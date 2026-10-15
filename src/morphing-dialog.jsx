/*!
MIT License

Copyright (c) 2024 ibelick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
app/page.tsx

*/
/* Adapted from Motion Primitives' Morphing Dialog (MIT), ibelick.
 * https://github.com/ibelick/motion-primitives/blob/main/components/core/morphing-dialog.tsx
 * Matches Basic Two's shared-layout spring; adds named controls, focus return,
 * inert background, and native keyboard navigation. See MOTION-PRIMITIVES-LICENSE.
 */
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

const Context = createContext(null);
const useDialog = () => useContext(Context);

export function MorphingDialog({ children, reducedMotion = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef(null);
  return (
    <Context.Provider value={{ isOpen, setIsOpen, uniqueId, triggerRef, reducedMotion }}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'} transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 24 }}>
        {children}
      </MotionConfig>
    </Context.Provider>
  );
}

export function MorphingDialogTrigger({ children, className, label, onPointerMove }) {
  const { isOpen, setIsOpen, uniqueId, triggerRef } = useDialog();
  return (
    <motion.button ref={triggerRef} type="button" layoutId={`dialog-${uniqueId}`}
      className={className} style={{ borderRadius: 12 }} onClick={() => setIsOpen(true)}
      onPointerMove={onPointerMove} aria-haspopup="dialog" aria-expanded={isOpen}
      aria-controls={isOpen ? `dialog-content-${uniqueId}` : undefined} aria-label={label}>
      {children}
    </motion.button>
  );
}

export function MorphingDialogContainer({ children }) {
  const { isOpen, setIsOpen, triggerRef, reducedMotion } = useDialog();
  const host = document.getElementById('project-dialog-root');
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.body.children].filter(node => node !== host);
    const inertState = background.map(node => [node, node.inert]);
    background.forEach(node => { node.inert = true; });
    document.body.style.overflow = 'hidden';
    const panel = host.querySelector('[role="dialog"]');
    const focusables = () => [...panel.querySelectorAll('button, a[href], [tabindex="0"]')].filter(node => !node.disabled);
    const focusFrame = requestAnimationFrame(() => panel.querySelector('.project-dialog-close')?.focus({ preventScroll: true }));
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); }
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKey);
      inertState.forEach(([node, value]) => { node.inert = value; });
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, host, setIsOpen, triggerRef]);
  return createPortal(
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div className="project-dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onPointerDown={event => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>, host
  );
}

export function MorphingDialogContent({ children, onPointerMove }) {
  const { uniqueId } = useDialog();
  return (
    <motion.div layoutId={`dialog-${uniqueId}`} id={`dialog-content-${uniqueId}`}
      className="project-dialog-panel" style={{ borderRadius: 16 }} onPointerMove={onPointerMove}
      role="dialog" aria-modal="true" aria-labelledby={`dialog-title-${uniqueId}`}
      aria-describedby={`dialog-description-${uniqueId}`} tabIndex={-1}>
      {children}
    </motion.div>
  );
}

export function MorphingDialogTitle({ children, as = 'span', className }) {
  const { uniqueId } = useDialog();
  const Component = motion[as];
  return <Component layoutId={`dialog-title-${uniqueId}`} id={as === 'h3' ? `dialog-title-${uniqueId}` : undefined} className={className}>{children}</Component>;
}
export function MorphingDialogSubtitle({ children, className }) {
  const { uniqueId } = useDialog();
  return <motion.span layoutId={`dialog-subtitle-${uniqueId}`} className={className}>{children}</motion.span>;
}
export function MorphingDialogImage({ children, className }) {
  const { uniqueId } = useDialog();
  return <motion.span layoutId={`dialog-image-${uniqueId}`} className={className} aria-hidden="true">{children}</motion.span>;
}
export function MorphingDialogDescription({ children }) {
  const { uniqueId } = useDialog();
  return <div className="project-dialog-description" id={`dialog-description-${uniqueId}`}>{children}</div>;
}
export function MorphingDialogClose() {
  const { setIsOpen } = useDialog();
  return <button className="project-dialog-close" type="button" aria-label="Close project details" onClick={() => setIsOpen(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>;
}
