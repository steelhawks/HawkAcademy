import React from 'react';
import styles from './styles.module.css';

export default function Note({ title = 'Note', children }) {
  return (
    <div className={styles.noteBox}>
      <div className={styles.noteHeader}>
        <span className={styles.noteDiamond} aria-hidden="true">◆</span>
        <span className={styles.noteTitle}>{title}</span>
      </div>
      <div className={styles.noteContent}>{children}</div>
    </div>
  );
}