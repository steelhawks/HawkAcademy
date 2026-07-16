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
        to: '/cad/intro',
        children: [
          {label: 'Start 1 — Intro', to: '/cad/intro'},
          {label: 'Start 2 — Onshape Basics', to: '/cad/intro'},
          {label: 'Start 3 — Part Studios', to: '/cad/intro'},
          {label: 'Start 4 — Assemblies', to: '/cad/intro'},
        ],
      },
      {label: 'Workflow', to: '/cad#workflow'},
      {
        label: '3D Printing',
        to: '/cad/intro',
        children: [
          {label: 'Printer Setup', to: '/cad/intro'},
          {label: 'Slicing', to: '/cad/intro'},
          {label: 'Materials', to: '/cad/intro'},
        ],
      },
      {
        label: 'Laser Cutting',
        to: '/cad/intro',
        children: [
          {label: 'DXF Export', to: '/cad/intro'},
          {label: 'Cut Settings', to: '/cad/intro'},
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
    match: '/programming',
    items: [
      {label: 'Intro', to: '/programming/intro'},
      {
        label: 'Training',
        to: '/programming/Training/github-basics',
        children: [
          {label: 'GitHub Basics', to: '/programming/Training/github-basics'},
        ],
      },
      {
        label: 'Java Basics',
        to: '/programming/Training/Java Basics/simple-basics',
        children: [
          {label: 'Simple Basics', to: '/programming/Training/Java Basics/simple-basics'},
          {label: 'Basics 103', to: '/programming/Training/Java Basics/basics-103'},
          {label: 'Logic & Loops', to: '/programming/Training/Java Basics/logic-loops'},
        ],
      },
      {
        label: 'WPILib',
        to: '/programming/Training/WPILIB Basics/wpilib-install',
        children: [
          {label: 'WPILib Install', to: '/programming/Training/WPILIB Basics/wpilib-install'},
          {label: 'Explore WPILib', to: '/programming/Training/WPILIB Basics/explore-wpilib'},
          {label: 'Hardware 101', to: '/programming/Training/WPILIB Basics/hardware-101'},
          {label: 'Hardware 102', to: '/programming/Training/WPILIB Basics/hardware-102'},
          {label: 'Motors', to: '/programming/Training/WPILIB Basics/motors'},
          {label: 'Configs', to: '/programming/Training/WPILIB Basics/configs'},
        ],
      },
      {
        label: 'Subsystems',
        to: '/programming/Training/Robot Systems/subsystem-introductions',
        children: [
          {label: 'Subsystem Introduction', to: '/programming/Training/Robot Systems/subsystem-introductions'},
        ]
      },
      {
        label: 'Commands',
        to: '/programming/Training/Commands/intro',
        children: [
          {label: 'Intro', to: '/programming/Training/Commands/intro'},
          {label: 'What is A Command?', to: '/programming/Training/Commands/command'},
          {label: 'Common Commands', to: '/programming/Training/Commands/common-commands'},
        ]
      },
      {
        label: 'Swerve',
        to: '/programming/Training/Swerve/intro',
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
