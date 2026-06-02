import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// ─── Hero ────────────────────────────────────────────────────────────────────

function HomepageHeader() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroNoise} aria-hidden />
      <div className={styles.heroAccent} aria-hidden />

      <div className={clsx('container', styles.heroInner)}>
        {/* Logo slot */}
        <div className={styles.logoWrapper}>
          <div className={styles.logoPlaceholder}>
           <img src={require('@site/static/img/hawk.png').default} alt="SteelHawks Logo" />
          </div>
        </div>

        <div className={styles.heroText}>
          <Heading as="h1" className={styles.heroTitle}>
            Steel<span> Hawks</span>
            <span className={styles.heroAccentWord}>Hawk Academy</span>
          </Heading>

          <div className={styles.heroCtas}>
            <Link className={styles.ctaPrimary} to="/docs/intro">
              Get Started
              <span className={styles.ctaArrow}>→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.heroScrollHint} aria-hidden>
        <span />
      </div>
    </header>
  );
}


const features = [
  {
    icon: '☕',
    title: 'Java Fundamentals',
    body:
      'Start with the basics of Java programming. Learn about variables, control flow, OOP principles, and how to set up your development environment for FRC coding.',
    href: '/docs/Training/Java Basics/simple-basics',
  },
  {
    icon: '🤖',
    title: 'WPILib & Command-Based Programming',
    body:
      'Dive into the WPILib command-based framework. Learn subsystems, commands, the scheduler, and how hardware IO is abstracted using AdvantageKit\'s IO layer.',
    href: '/docs/Training/WPILIB Basics/wpilib-install',
  },
  {
    icon: '🛠️',
    title: 'PID and Control Theory',
    body:
      'Understand the fundamentals of control systems. Learn how to implement PID controllers, tune them for your robot, and apply them to various mechanisms.',
    href: '/docs/intro',
  },
  {
    icon: '🛣️',
    title: 'Autonomous & Choreo',
    body:
      'Build full auto routines using Choreo path planning. Learn trajectory following, event markers, AutoFactory patterns, and how to debug with AdvantageScope.',
    href: '/docs/intro',
  },
];

function FeatureCards() {
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <p className={styles.sectionEyebrow}>What You'll Learn</p>
        <Heading as="h2" className={styles.sectionTitle}>
          The Curriculum
        </Heading>
        <div className={styles.cardsGrid}>
          {features.map((f) => (
            <Link key={f.title} to={f.href} className={styles.card}>
              <span className={styles.cardIcon}>{f.icon}</span>
              <Heading as="h3" className={styles.cardTitle}>
                {f.title}
              </Heading>
              <p className={styles.cardBody}>{f.body}</p>
              <span className={styles.cardCta}>
                Read More <span>→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const footerLinks = {
  Curriculum: [
    { label: 'Java Basics',     href: '/docs/Training/Java Basics/simple-basics' },
    { label: 'Git & OOP',        href: '/docs/intro' },
    { label: 'WPILib',           href: '/docs/Training/WPILIB Basics/wpilib-install' },
    { label: 'Hardware IO',      href: '/docs/intro' },
    { label: 'AdvantageKit',     href: '/docs/intro' },
    { label: 'Autonomous',       href: '/docs/intro' },
  ],
  Resources: [
    { label: 'WPILib Docs',     href: 'https://docs.wpilib.org' },
    { label: 'Choreo',          href: 'https://choreo.autos' },
    { label: 'AdvantageKit',    href: 'https://github.com/Mechanical-Advantage/AdvantageKit' },
    { label: 'Phoenix 6',       href: 'https://pro.docs.ctr-electronics.com' },
  ],
  Team: [
    { label: 'GitHub',          href: 'https://github.com/steelhawks' },
    { label: 'The Blue Alliance', href: 'https://www.thebluealliance.com/team/2601' },
    { label: 'FIRST Inspires',  href: 'https://www.firstinspires.org' },
  ],
};

function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerNoise} aria-hidden />
      <div className="container">

        {/* Top row: brand + columns */}
        <div className={styles.footerTop}>
          {/* Brand */}
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <img src={require('@site/static/img/hawk.png').default} alt="SteelHawks Logo" />
            </div>
          </div>

          {/* Link columns */}
          <nav className={styles.footerNav}>
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group} className={styles.footerCol}>
                <p className={styles.footerColHeading}>{group}</p>
                <ul className={styles.footerColList}>
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.href} className={styles.footerLink}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className={styles.footerDivider} />

        {/* Bottom row: copyright + legal */}
        <div className={styles.footerBottom}>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} SteelHawks Inc. All rights reserved.
          </p>
          <div className={styles.footerLegal}>
            <Link to="/docs/intro" className={styles.footerLink}>Privacy</Link>
            <Link to="/docs/intro" className={styles.footerLink}>Terms</Link>
            <Link to="/docs/intro" className={styles.footerLink}>Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home(): ReactNode {
  return (
    <main className={styles.page}>
      <HomepageHeader />
      <FeatureCards />
      <SiteFooter />
    </main>
  );
}