import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>Steel Hawks · CAD Curriculum</p>
          <Heading as="h1" className={styles.heroTitle}>
            Real robots <span className={styles.heroAccent}>begin in CAD.</span>
          </Heading>
          <p className={styles.heroLead}>
            Every motor mount, every bumper, every 3D-printed bracket starts as a sketch in Onshape.
            This is where the team's mechanical, electrical, and programming work meet — long before
            anything gets cut.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/cad/learn/intro" className={styles.ctaPrimary}>
              Start learning
              <span className={styles.ctaArrow}>→</span>
            </Link>
            <a href="#why" className={styles.ctaSecondary}>
              Why CAD matters
            </a>
          </div>
        </div>

        <div className={styles.heroVideo} aria-hidden>
          <div className={styles.videoFrame}>
            <div className={styles.videoPlay}>▶</div>
            <span className={styles.videoCaption}>Robot fly-through · 0:42</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Why CAD ──────────────────────────────────────────────────────────────────

const WHY_REASONS = [
  {
    title: 'It connects every subteam',
    body: 'CNC, electrical, programming, mechanical — they all read the same CAD. Without it, every subteam is guessing.',
    tags: ['CNC', 'Electrical', 'Programming', 'Mechanical'],
  },
  {
    title: 'It shows the whole robot at once',
    body: 'Before a single part is cut, we know what the robot looks like, how big it is, and where every wire goes.',
    tags: ['Layout', 'Packaging'],
  },
  {
    title: 'It turns ideas into final products',
    body: 'A rough sketch becomes a part studio, becomes an assembly, becomes drawings — and then a real part on the robot.',
    tags: ['Iteration'],
  },
  {
    title: 'It lets us test ideas before committing',
    body: 'You can break something in CAD for free. You cannot break something on the practice bot for free.',
    tags: ['Simulation', 'Cost'],
  },
];

function WhyCad() {
  return (
    <section id="why" className={styles.section}>
      <div className={styles.sectionInner}>
        <p className={styles.sectionEyebrow}>Why CAD</p>
        <Heading as="h2" className={styles.sectionTitle}>
          Why this section is the home page.
        </Heading>
        <p className={styles.sectionLead}>
          CAD isn't just a step in our build process — it's the connective tissue between every
          subteam. Here's what it does for the team.
        </p>

        <div className={styles.reasonsGrid}>
          {WHY_REASONS.map((r, i) => (
            <article key={r.title} className={styles.reasonCard}>
              <span className={styles.reasonIndex}>{String(i + 1).padStart(2, '0')}</span>
              <Heading as="h3" className={styles.reasonTitle}>
                {r.title}
              </Heading>
              <p className={styles.reasonBody}>{r.body}</p>
              <div className={styles.reasonTags}>
                {r.tags.map((t) => (
                  <span key={t} className={styles.reasonTag}>
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  {
    n: '1',
    label: 'Sketch',
    body: '2D constraints. Define intent before geometry.',
  },
  {
    n: '2',
    label: 'Part Studio',
    body: 'Extrude, revolve, pattern. Build the part.',
  },
  {
    n: '3',
    label: 'Assembly',
    body: 'Mate parts. Check fit and motion.',
  },
  {
    n: '4',
    label: 'Drawings / Prints / DXFs',
    body: 'Export what the shop and printers actually need.',
  },
];

function Workflow() {
  return (
    <section id="workflow" className={styles.sectionAlt}>
      <div className={styles.sectionInner}>
        <p className={styles.sectionEyebrow}>The Pipeline</p>
        <Heading as="h2" className={styles.sectionTitle}>
          Turns ideas into final products.
        </Heading>
        <p className={styles.sectionLead}>
          Every part on the robot goes through the same four stages. Knowing where you are in the
          pipeline is half the battle.
        </p>

        <ol className={styles.workflowTrack}>
          {WORKFLOW_STEPS.map((step, i) => (
            <li key={step.n} className={styles.workflowStep}>
              <div className={styles.workflowCard}>
                <span className={styles.workflowN}>{step.n}</span>
                <Heading as="h3" className={styles.workflowLabel}>
                  {step.label}
                </Heading>
                <p className={styles.workflowBody}>{step.body}</p>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <span className={styles.workflowArrow} aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── Dive-in cards ────────────────────────────────────────────────────────────

const DIVE_CARDS = [
  {
    title: 'Start Here',
    body: 'New to CAD? Begin with the Learn CAD curriculum from lesson one.',
    href: '/cad/learn/intro',
    accent: 'A',
  },
  {
    title: 'Onshape Basics',
    body: 'Account setup, the interface, your first sketch.',
    href: '/cad/learn/intro',
    accent: 'B',
  },
  {
    title: 'Part Studios & Assemblies',
    body: 'Build real parts and mate them into a working assembly.',
    href: '/cad/learn/intro',
    accent: 'C',
  },
  {
    title: 'Manufacturing Outputs',
    body: 'Drawings, DXFs for laser, STLs for the printer.',
    href: '/cad/learn/intro',
    accent: 'D',
  },
];

function DiveIn() {
  return (
    <section id="resources" className={styles.section}>
      <div className={styles.sectionInner}>
        <p className={styles.sectionEyebrow}>Dive In</p>
        <Heading as="h2" className={styles.sectionTitle}>
          Pick a path.
        </Heading>
        <p className={styles.sectionLead}>
          Click any card to jump straight into that part of the curriculum. You can always come
          back here.
        </p>

        <div className={styles.diveGrid}>
          {DIVE_CARDS.map((c) => (
            <Link key={c.title} to={c.href} className={styles.diveCard}>
              <span className={styles.diveAccent}>{c.accent}</span>
              <Heading as="h3" className={styles.diveTitle}>
                {c.title}
              </Heading>
              <p className={styles.diveBody}>{c.body}</p>
              <span className={styles.diveCta}>
                Open <span>→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CadHome(): ReactNode {
  return (
    <Layout
      title="CAD Curriculum"
      description="Steel Hawks CAD curriculum — Onshape, part studios, assemblies, manufacturing outputs.">
      <main className={styles.page}>
        <Hero />
        <WhyCad />
        <Workflow />
        <DiveIn />
      </main>
    </Layout>
  );
}
