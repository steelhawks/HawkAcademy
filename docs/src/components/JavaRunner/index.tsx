import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import styles from './styles.module.css';

interface JavaRunnerProps {
  starterCode: string;
  expectedOutput?: string;
}

// HawkBridge endpoint — update this if the server URL changes
const HAWKBRIDGE_URL = 'https://scout.steelhawks.net/api/run-java';

type Status = 'idle' | 'running' | 'success' | 'wrong' | 'error';

export default function JavaRunner({ starterCode, expectedOutput }: JavaRunnerProps) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const run = async (check = false) => {
    setStatus('running');
    setOutput('');

    try {
      const res = await fetch(HAWKBRIDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);

      const data = await res.json();
      const out: string = data.output ?? '(no output)';
      setOutput(out);

      if (check && expectedOutput) {
        setStatus(out.trim() === expectedOutput.trim() ? 'success' : 'wrong');
      } else {
        setStatus('idle');
      }
    } catch (e) {
      setOutput(`Could not reach the code runner.\n${e}`);
      setStatus('error');
    }
  };

  const statusBadge = () => {
    if (status === 'success') return <span className={styles.badgeSuccess}>✓ Correct!</span>;
    if (status === 'wrong') return <span className={styles.badgeWrong}>✗ Not quite — keep trying</span>;
    if (status === 'error') return <span className={styles.badgeError}>Error</span>;
    return null;
  };

  return (
    <div className={styles.root}>
      {/* toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.filename}>Main.java</span>
        <div className={styles.buttons}>
          <button
            className={styles.btnRun}
            onClick={() => run(false)}
            disabled={status === 'running'}
          >
            {status === 'running' ? '⏳ Running…' : '▶ Run'}
          </button>
          {expectedOutput && (
            <button
              className={styles.btnCheck}
              onClick={() => run(true)}
              disabled={status === 'running'}
            >
              ✓ Check Solution
            </button>
          )}
        </div>
      </div>

      {/* editor */}
      <Editor
        height="260px"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={(val) => setCode(val ?? '')}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          wordWrap: 'on',
          padding: { top: 10 },
        }}
      />

      {/* output */}
      <div className={styles.outputPane}>
        <div className={styles.outputHeader}>
          <span className={styles.outputLabel}>Output</span>
          {statusBadge()}
        </div>
        <pre className={styles.outputBody}>
          {output || 'Click ▶ Run to execute your code…'}
        </pre>
      </div>
    </div>
  );
}
