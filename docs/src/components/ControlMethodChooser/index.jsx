import React, { useState } from "react";

/**
 * ControlMethodChooser — an interactive decision tree for picking a
 * TalonFX control request and deciding where to run the loop.
 * Self-contained (inline styles), in the spirit of Quiz.jsx / JavaRunner.
 *
 * Encodes the 2601 control-method decision logic:
 *   pose vs motor  ->  open vs closed loop  ->  velocity vs position
 *   ->  profiled vs snap  ->  profile on TalonFX vs rio.
 */

// Each node is either a question (has `q` + `options`) or a result (has `result`).
const NODES = {
  start: {
    q: "What are you actually controlling?",
    help: "Most mechanisms are a single motor. Auto-align is the rare case that controls the whole robot.",
    options: [
      { label: "A single mechanism's motor (elevator, arm, flywheel, roller, turret…)", next: "loopType" },
      { label: "The whole robot's pose / heading on the field (from vision + odometry)", next: "robotPose" },
    ],
  },

  robotPose: {
    result: {
      title: "PID on the RoboRIO",
      request: "WPILib ProfiledPIDController (rio) → ChassisSpeeds → swerve",
      where: "RoboRIO",
      flavor: "—",
      rationale:
        "The target is the robot's heading/translation, which no single TalonFX knows — it's computed from vision (PhotonVision) and odometry and fed to all four modules. So this loop must live on the rio.",
      example: "Auto-align — commands/align/SwerveDriveAlignment.java (angleController).",
      exception: true,
    },
  },

  loopType: {
    q: "Do you need closed-loop control (hold a precise target), or just make it go?",
    help: "Closed-loop = there's a sensor and a target to hold. Open-loop = send an output and don't care about the exact result.",
    options: [
      { label: "Just make it spin / move — no precise target", next: "openLoop" },
      { label: "Hold a precise target (a speed or a position)", next: "velOrPos" },
      { label: "Command force / torque directly (e.g. a controlled push or grip)", next: "torque" },
    ],
  },

  openLoop: {
    result: {
      title: "Open-loop output",
      request: "DutyCycleOut (percent) — or VoltageOut (volts)",
      where: "TalonFX",
      flavor: "Voltage / duty cycle",
      rationale:
        "No target to hold, so no feedback needed. Use VoltageOut when you want behavior independent of battery sag; DutyCycleOut for a simple percentage.",
      example: "A roller / indexer — IndexerIOTalonFX runs the spindexer & feeder open-loop; the intake rollers use DutyCycleOut.",
    },
  },

  torque: {
    result: {
      title: "Open-loop torque",
      request: "TorqueCurrentFOC (commands stator amps; torque ∝ current)",
      where: "TalonFX",
      flavor: "TorqueCurrentFOC (needs Phoenix Pro — we have it)",
      rationale:
        "When you care about force, not position/speed — current maps directly to torque. We use Phoenix Pro/FOC, so this is available; on a team without Pro you'd fall back to VoltageOut.",
      example: "Open-loop rack pushes — IntakeIOTalonFX.runRackOpenLoop(..., isTorqueCurrent=true).",
    },
  },

  velOrPos: {
    q: "Are you holding a velocity or a position?",
    help: "Velocity = spin at an RPS (flywheel, wheel speed). Position = go to and hold a spot/angle (elevator, arm, turret).",
    options: [
      { label: "Velocity — spin at a target speed", next: "velocity" },
      { label: "Position — go to and hold a target", next: "profiled" },
    ],
  },

  velocity: {
    result: {
      title: "Closed-loop velocity",
      request: "VelocityVoltage — or VelocityTorqueCurrentFOC (high performance)",
      where: "TalonFX (gains in Slot0)",
      flavor: "Voltage (default) or TorqueCurrentFOC",
      rationale:
        "A velocity PID on the controller holds the target RPS. Velocity loops rarely need kD; kV feedforward does most of the work. Pick TorqueCurrentFOC for consistent torque across speeds.",
      example: "Flywheel — FlywheelIOTalonFX uses VelocityTorqueCurrentFOC.withVelocity(setpoint).withFeedForward(ff).",
    },
  },

  profiled: {
    q: "Does the move need a smooth profile (accel/cruise/decel), or can it just snap to the target?",
    help: "Heavy, long, or tip-prone moves need a profile to avoid slamming. Short/light moves can snap.",
    options: [
      { label: "Just snap / hold — short, light move", next: "snap" },
      { label: "Needs a smooth profile — heavy, long, or precise", next: "profileWhere" },
    ],
  },

  snap: {
    result: {
      title: "Closed-loop position, no profile",
      request: "PositionVoltage — or PositionTorqueCurrentFOC",
      where: "TalonFX (gains in Slot0)",
      flavor: "Voltage (default) or TorqueCurrentFOC",
      rationale:
        "Holds a position with PID but no trajectory — fine when the move is small enough that easing isn't needed.",
      example: "Turret's non-profiled hold path — TurretIOTalonFX.runPivot uses PositionTorqueCurrentFOC.",
    },
  },

  profileWhere: {
    q: "Where should the motion profile be generated?",
    help: "Onboard (MotionMagic) is the preferred default. Choose rio only if you need rio-side coordination or custom profile logic.",
    options: [
      { label: "On the TalonFX (preferred default)", next: "motionMagic" },
      { label: "On the RoboRIO (need rio-side coordination / custom logic)", next: "rioProfile" },
    ],
  },

  motionMagic: {
    result: {
      title: "Profiled position, profile on the TalonFX",
      request: "MotionMagicVoltage — or MotionMagicTorqueCurrentFOC (add .withMotionMagicJerk for an S-curve)",
      where: "TalonFX (profile AND PID onboard)",
      flavor: "Voltage (default) or TorqueCurrentFOC",
      rationale:
        "The controller generates the trajectory and runs the PID at ~1 kHz — smoother, lower latency, off the rio's CPU. This is the preferred default for position moves.",
      example: "Turret — TurretIOTalonFX.runPivotMM uses MotionMagicTorqueCurrentFOC.withPosition(...).",
    },
  },

  rioProfile: {
    result: {
      title: "Profiled position, profile on the RoboRIO",
      request: "WPILib TrapezoidProfile (rio) → PositionVoltage / PositionTorqueCurrentFOC on the controller",
      where: "Profile on rio; PID on TalonFX",
      flavor: "Voltage or TorqueCurrentFOC",
      rationale:
        "Generate setpoints on the rio when the profile must coordinate with other rio-side logic. The TalonFX still runs the position PID on each setpoint.",
      example: "Intake — Intake.java advances a TrapezoidProfile each loop and sends it to IntakeIOTalonFX (PositionTorqueCurrentFOC). Wrapped with homing/stall logic that lives on the rio.",
    },
  },
};

const wrap = {
  border: "1px solid var(--ifm-color-emphasis-200,#e5e7eb)",
  borderRadius: "12px",
  padding: "1.6rem",
  margin: "1.5rem 0",
  background: "var(--ifm-card-background-color, var(--ifm-background-surface-color))",
};

const optionStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "13px 16px",
  marginBottom: "10px",
  borderRadius: "9px",
  border: "1px solid var(--ifm-color-emphasis-200,#e5e7eb)",
  background: "transparent",
  color: "var(--ifm-font-color-base)",
  fontSize: "15px",
  lineHeight: 1.5,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "border-color 0.15s, background 0.15s, transform 0.1s",
};

const pill = {
  display: "inline-block",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ifm-color-primary)",
  marginBottom: "10px",
};

function ResultCard({ r }) {
  const accent = r.exception ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ animation: "cmc-fade 0.25s ease forwards" }}>
      <span style={{ ...pill, color: accent }}>
        {r.exception ? "Recommendation — the rio exception" : "Recommendation"}
      </span>
      <h3 style={{ margin: "0 0 0.9rem", fontSize: "20px", color: "var(--ifm-font-color-base)" }}>{r.title}</h3>
      <div
        style={{
          borderLeft: `3px solid ${accent}`,
          padding: "12px 16px",
          background: "var(--ifm-color-emphasis-100,#f3f4f6)",
          borderRadius: "8px",
          marginBottom: "1rem",
        }}
      >
        <Row label="Use" value={r.request} mono />
        <Row label="Run it on" value={r.where} />
        <Row label="Output flavor" value={r.flavor} />
      </div>
      <p style={{ margin: "0 0 0.8rem", lineHeight: 1.65 }}>
        <strong>Why:</strong> {r.rationale}
      </p>
      <p style={{ margin: 0, lineHeight: 1.65, fontSize: "14px", color: "var(--ifm-color-emphasis-700,#374151)" }}>
        <strong>In our code:</strong> {r.example}
      </p>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "6px", fontSize: "14.5px" }}>
      <span style={{ flex: "0 0 110px", color: "var(--ifm-color-emphasis-600,#6b7280)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: mono ? "var(--ifm-font-family-monospace)" : "inherit" }}>{value}</span>
    </div>
  );
}

export default function ControlMethodChooser() {
  const [nodeId, setNodeId] = useState("start");
  const [history, setHistory] = useState([]);

  const node = NODES[nodeId];
  const isResult = !!node.result;

  const choose = (next) => {
    setHistory((h) => [...h, nodeId]);
    setNodeId(next);
  };
  const back = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setNodeId(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };
  const restart = () => {
    setHistory([]);
    setNodeId("start");
  };

  return (
    <>
      <style>{`
        @keyframes cmc-fade { from { opacity: 0; transform: translateY(6px);} to {opacity:1; transform: translateY(0);} }
        .cmc-opt:hover { border-color: var(--ifm-color-primary) !important; background: var(--ifm-color-primary-lightest,#eff6ff) !important; transform: translateX(3px); }
        .cmc-btn { padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
      `}</style>
      <div style={wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ ...pill, marginBottom: 0 }}>Control Method Chooser</span>
          <span style={{ display: "flex", gap: "8px" }}>
            {history.length > 0 && (
              <button className="cmc-btn" onClick={back} style={{ border: "1px solid var(--ifm-color-emphasis-300,#d1d5db)", background: "transparent", color: "var(--ifm-font-color-base)" }}>
                ← Back
              </button>
            )}
            {(history.length > 0 || isResult) && (
              <button className="cmc-btn" onClick={restart} style={{ border: "none", background: "var(--ifm-color-primary)", color: "#fff" }}>
                Restart
              </button>
            )}
          </span>
        </div>

        {isResult ? (
          <ResultCard r={node.result} />
        ) : (
          <div style={{ animation: "cmc-fade 0.25s ease forwards" }}>
            <p style={{ fontSize: "17px", fontWeight: 600, margin: "0 0 0.5rem", lineHeight: 1.5, color: "var(--ifm-font-color-base)" }}>
              {node.q}
            </p>
            {node.help && (
              <p style={{ fontSize: "13.5px", color: "var(--ifm-color-emphasis-600,#6b7280)", margin: "0 0 1.1rem", lineHeight: 1.55 }}>
                {node.help}
              </p>
            )}
            {node.options.map((opt, i) => (
              <button key={i} className="cmc-opt" style={optionStyle} onClick={() => choose(opt.next)}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
