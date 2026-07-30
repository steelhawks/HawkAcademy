import React, { useState, Children, isValidElement } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

/**
 * A single tab inside a <NoteTabs> group. Only meant to be used as a direct
 * child of NoteTabs &rarr; it just carries a `title` and its explanation
 * content, the same way <Note title="..."> does on its own.
 */
export function NoteTab({ children }) {
  return <>{children}</>;
}

/**
 * Groups several back-to-back <Note>-style term explanations into one
 * compact, tabbed component instead of stacking many boxes in a row.
 *
 * Usage:
 * <NoteTabs>
 *   <NoteTab title="New term: foo">...</NoteTab>
 *   <NoteTab title="New term: bar">...</NoteTab>
 * </NoteTabs>
 */
export default function NoteTabs({ children }) {
  const tabs = Children.toArray(children).filter(isValidElement);
  const [active, setActive] = useState(0);

  if (tabs.length === 0) {
    return null;
  }

  const activeIndex = Math.min(active, tabs.length - 1);
  const activeTab = tabs[activeIndex];

  return (
    <div className={styles.noteTabsBox}>
      <div className={styles.noteTabsHeader}>
        <span className={styles.noteDiamond} aria-hidden="true">
          ◆
        </span>
        <div className={styles.tabList} role="tablist" aria-label="Term explanations">
          {tabs.map((tab, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={clsx(styles.tabButton, index === activeIndex && styles.tabButtonActive)}
              onClick={() => setActive(index)}
            >
              {tab.props.title ?? `Tab ${index + 1}`}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.noteTabsContent} role="tabpanel">
        {activeTab.props.children}
      </div>
    </div>
  );
}
