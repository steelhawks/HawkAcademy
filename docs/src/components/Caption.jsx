import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function Caption({ src, alt, caption, width }) {
  const resolvedSrc = useBaseUrl(src);
  return (
    <figure className={styles.captionFigure} style={width ? { width } : undefined}>
      <img src={resolvedSrc} alt={alt} className={styles.captionImage} />
      <figcaption className={styles.captionText}>{caption}</figcaption>
    </figure>
  );
}
