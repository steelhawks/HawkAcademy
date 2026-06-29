import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import clsx from 'clsx';

import styles from './styles.module.css';

type Section = {
  label: string;
  to: string;
  /** Path segment used to determine the active state. */
  match: string;
};

const SECTIONS: Section[] = [
  {label: 'Programming', to: '/docs/intro', match: '/docs'},
  {label: 'Electrical', to: '/electrical/intro', match: '/electrical'},
  {label: 'Mechanical', to: '/mechanical/intro', match: '/mechanical'},
  {label: 'CAD', to: '/cad/', match: '/cad'},
];

export default function SectionSwitcher(): JSX.Element {
  const {pathname} = useLocation();

  return (
    <div className={styles.switcher} role="tablist" aria-label="Curriculum section">
      {SECTIONS.map((section) => {
        const active = pathname.includes(section.match);
        return (
          <Link
            key={section.to}
            to={section.to}
            role="tab"
            aria-selected={active}
            className={clsx(styles.item, active && styles.itemActive)}>
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
