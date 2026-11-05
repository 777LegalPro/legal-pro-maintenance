import React, { useEffect, useRef } from 'react';

export function ExternalLink({ href, children, className = '' }) {
  return <a className={`external-link ${className}`} href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true">↗</span><span className="sr-only"> — откроется в новой вкладке</span></a>;
}

export function SectionHeading({ eyebrow, title, children, action }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{children && <p className="section-description">{children}</p>}</div>{action}</div>;
}

export function Pill({ children, tone = '' }) { return <span className={`pill ${tone}`}>{children}</span>; }

export function EmptyState({ title = 'Ничего не найдено', children, onReset }) {
  return <div className="empty-state" role="status"><span className="empty-mark" aria-hidden="true">∅</span><h3>{title}</h3><p>{children}</p>{onReset && <button className="button secondary" onClick={onReset}>Сбросить фильтры</button>}</div>;
}

export function Dialog({ title, children, onClose, label = 'Подробности' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const cancel = event => { event.preventDefault(); onClose(); };
    dialog.addEventListener('cancel', cancel);
    return () => { dialog.removeEventListener('cancel', cancel); if (dialog.open) dialog.close(); previous?.focus({preventScroll:true}); };
  }, []);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-top"><span className="eyebrow">{label}</span><button className="icon-button" aria-label="Закрыть окно" onClick={onClose}>×</button></div>
    <h2 id="dialog-title">{title}</h2>{children}
  </dialog>;
}

export function downloadText(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const DEMO_NOTE = 'Учебные данные. Действия в прототипе не направляют обращения в ведомства.';
