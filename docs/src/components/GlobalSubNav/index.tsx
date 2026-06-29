import React, {useMemo} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './styles.module.css';

type SubItem = {
  label: string;
  to: string;
};

type Item = {
  label: string;
  to: string;
  children?: SubItem[];
};

type Section = {
  match: string;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    match: '/cad',
    items: [
      {label: 'Why CAD', to: '/cad#why'},
      {
        label: 'Learn CAD',
        to: '/cad/learn/intro',
        children: [
          {label: 'Start 1 — Intro', to: '/cad/learn/intro'},
          {label: 'Start 2 — Onshape Basics', to: '/cad/learn/intro'},
          {label: 'Start 3 — Part Studios', to: '/cad/learn/intro'},
          {label: 'Start 4 — Assemblies', to: '/cad/learn/intro'},
        ],
      },
      {label: 'Workflow', to: '/cad#workflow'},
      {
        label: '3D Printing',
        to: '/cad/learn/intro',
        children: [
          {label: 'Printer Setup', to: '/cad/learn/intro'},
          {label: 'Slicing', to: '/cad/learn/intro'},
          {label: 'Materials', to: '/cad/learn/intro'},
        ],
      },
      {
        label: 'Laser Cutting',
        to: '/cad/learn/intro',
        children: [
          {label: 'DXF Export', to: '/cad/learn/intro'},
          {label: 'Cut Settings', to: '/cad/learn/intro'},
        ],
      },
      {label: 'Resources', to: '/cad#resources'},
    ],
  },
  {
    match: '/electrical',
    items: [
      {label: 'Intro', to: '/electrical/intro'},
    ],
  },
  {
    match: '/mechanical',
    items: [
      {label: 'Intro', to: '/mechanical/intro'},
    ],
  },
  {
    match: '/docs',
    items: [
      {label: 'Intro', to: '/docs/intro'},
      {
        label: 'Training',
        to: '/docs/Training/github-basics',
        children: [
          {label: 'GitHub Basics', to: '/docs/Training/github-basics'},
        ],
      },
      {
        label: 'Java Basics',
        to: '/docs/Training/Java Basics/simple-basics',
        children: [
          {label: 'Simple Basics', to: '/docs/Training/Java Basics/simple-basics'},
          {label: 'Basics 103', to: '/docs/Training/Java Basics/basics-103'},
          {label: 'Logic & Loops', to: '/docs/Training/Java Basics/logic-loops'},
        ],
      },
      {
        label: 'WPILib',
        to: '/docs/Training/WPILIB Basics/wpilib-install',
        children: [
          {label: 'WPILib Install', to: '/docs/Training/WPILIB Basics/wpilib-install'},
          {label: 'Explore WPILib', to: '/docs/Training/WPILIB Basics/explore-wpilib'},
          {label: 'Hardware 101', to: '/docs/Training/WPILIB Basics/hardware-101'},
          {label: 'Hardware 102', to: '/docs/Training/WPILIB Basics/hardware-102'},
          {label: 'Motors', to: '/docs/Training/WPILIB Basics/motors'},
          {label: 'Configs', to: '/docs/Training/WPILIB Basics/configs'},
        ],
      },
    ],
  },
];

function pickSection(pathname: string, baseUrl: string): Section | null {
  const stripped = pathname.startsWith(baseUrl)
    ? pathname.slice(baseUrl.length - (baseUrl.endsWith('/') ? 1 : 0))
    : pathname;
  return SECTIONS.find((s) => stripped.includes(s.match)) ?? null;
}

export default function GlobalSubNav(): JSX.Element | null {
  const {pathname} = useLocation();
  const baseUrl = useBaseUrl('/');

  const section = useMemo(() => pickSection(pathname, baseUrl), [pathname, baseUrl]);

  if (!section) return null;

  return (
    <nav className={styles.subNav} aria-label="Section sub-navigation">
      <div className={styles.subNavInner}>
        {section.items.map((item, i) => {
          const hasChildren = !!item.children?.length;
          return (
            <div
              key={item.label}
              className={`${styles.subNavCell} ${hasChildren ? styles.hasChildren : ''}`}>
              <Link to={item.to} className={styles.subNavItem}>
                <span className={styles.subNavIndex}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={styles.subNavLabel}>{item.label}</span>
                {hasChildren && (
                  <span className={styles.caret} aria-hidden>
                    ▾
                  </span>
                )}
              </Link>

              {hasChildren && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownInner}>
                    {item.children!.map((child) => (
                      <Link
                        key={child.label}
                        to={child.to}
                        role="menuitem"
                        className={styles.dropdownItem}>
                        <span className={styles.dropdownDot} aria-hidden />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
