---
sidebar_position: 6
title: Choosing a Control Method
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'
import ControlMethodChooser from '@site/src/components/ControlMethodChooser'

# Choosing a Control Method

This is the page the whole section was building toward. You know PID, feedforward, and motion profiles, and you know they can run on the TalonFX or the RoboRIO. Now we turn that into a **thought process**: look at any mechanism and reason your way to *which control method to use and where to run it.*

The single skill to walk away with: **don't memorize a lookup table — ask a short series of questions and let the answers lead you to the leaf.**

## First, untangle the four questions

Rookies get stuck because they jam four separate decisions into one. Pull them apart and each is easy:

1. **What am I commanding?** — raw output / torque / velocity / position.
2. **Voltage or TorqueCurrentFOC?** — the *flavor* of the output.
3. **Profiled or not?** — MotionMagic vs. plain Position vs. a rio `TrapezoidProfile`.
4. **Where does the loop run?** — TalonFX (default) or RoboRIO (the auto-align exception).

These are **orthogonal** — almost any combination is valid. "Position, FOC, profiled-on-controller" is the turret; "velocity, FOC, not profiled" is the flywheel. Keep them separate in your head and the decision tree below practically walks itself.

## The control requests, briefly

Every option is a CTRE **control request** you hand to `motor.setControl(...)`. Here's the whole menu — one line of *what it commands* and *when you'd reach for it*, each with a real example from `Rebuilt2026`.

| Request | What it commands | Reach for it when… | Our example |
|---|---|---|---|
| **`DutyCycleOut`** | A percent of battery voltage (−1…1), open-loop | You just need it to spin and don't care about exact speed | Intake rollers, indexer (`runRackPercentOut`, spindexer/feeder) |
| **`VoltageOut`** | A fixed voltage, open-loop | Same, but you want behavior independent of battery sag | Intake rack open-loop (`runRackOpenLoop`, voltage branch) |
| **`TorqueCurrentFOC`** | Stator **amps** → torque (∝ current), open-loop | You care about *force*, not speed/position (a controlled push) | Intake rack torque branch; swerve module torque |
| **`VelocityVoltage`** | Hold a target **velocity**, closed-loop (volts) | Spin at a target RPS, simple case | Flywheel (voltage branch) |
| **`VelocityTorqueCurrentFOC`** | Hold a target **velocity**, closed-loop (amps) | Spin at a target RPS, high-performance | **Flywheel** (`runFlywheel`) |
| **`PositionVoltage`** | Hold a **position**, closed-loop (volts), no profile | Go to a spot, short/light move | Turret Slot1 (`positionVoltage`) |
| **`PositionTorqueCurrentFOC`** | Hold a **position**, closed-loop (amps), no profile | Same, high-performance, or fed by a rio profile | **Intake** rack (`runRackPositionBoth`), turret `runPivot` |
| **`MotionMagicVoltage`** | **Position with an onboard profile** (volts) | Smooth position move, preferred default | (available; FOC variant used on turret) |
| **`MotionMagicTorqueCurrentFOC`** | **Position with an onboard profile** (amps) | Smooth position move, high-performance | **Turret** (`runPivotMM`) |

<Note title="Two axes hiding in that table">
Notice every closed-loop row comes in a <strong>Voltage</strong> and a <strong>TorqueCurrentFOC</strong> pair, and the position rows come in a <strong>plain</strong> and a <strong>MotionMagic</strong> (profiled) pair. That's axes #2 and #3 from above. Same control goal, different flavor and profiling — pick independently.
</Note>

### Axis 2: the output flavor — DutyCycleOut vs. VoltageOut vs. TorqueCurrentFOC

Every request above ultimately has to tell the motor *how hard to push*. There are three ways to express that "push," and they are **not** interchangeable — they command different physical quantities. This is worth understanding properly, because on **Rebuilt2026 we run nearly everything in the TorqueCurrentFOC flavor**, and you should know why.

**`DutyCycleOut` — command a percentage of the bus.**
You give it a number from −1 to 1, and the motor applies that fraction of *whatever the battery is currently supplying*. `0.5` means "half of the available bus voltage right now." The problem: the battery sags under load (from ~12.8 V at rest down toward 10 V mid-match), so the *same* `0.5` produces different real output at the start of a match than at the end. Fine for "just spin a roller," useless for anything that needs to be repeatable.

**`VoltageOut` — command actual volts.**
You give it a voltage (say `6.0 V`) and the controller compensates for battery sag to actually deliver that voltage. More repeatable than duty cycle. But voltage still isn't the thing you usually *care* about — what a motor actually does is produce **torque** (turning force), and the torque you get from a fixed voltage **changes with speed**. A motor spinning fast generates back-EMF that opposes the applied voltage, so the same 6 V gives lots of torque when stalled and little torque at high speed. Voltage is one step removed from what you want.

**`TorqueCurrentFOC` — command torque directly.** This is the one we lean on.

First, **FOC** = *Field-Oriented Control*. A brushless motor (like our Krakens) makes torque from the interaction of the stator's magnetic field and the rotor. Torque is strongest when those fields are held exactly 90° apart, and weakest when they drift out of alignment. FOC is a commutation technique that continuously steers the stator field to stay optimally oriented to the rotor — so you get **more torque per amp, smoother output, and less wasted heat** than ordinary control. (It's a **Phoenix Pro** firmware feature; more on licensing below.)

Now the key fact: in a motor, **torque is directly proportional to current** — $\tau = k_T \cdot I$, where $k_T$ is a fixed motor constant. So if you command **current (in amps)**, you are effectively commanding **torque directly.** `TorqueCurrentFOC` does exactly that: you hand it stator amps, and FOC delivers that current (and therefore that torque) cleanly. That gives you, concretely:

- **Deterministic acceleration.** Torque is force, and $F = ma$. Commanding a known torque means a known acceleration, regardless of how fast the mechanism is already moving. Voltage can't promise that (back-EMF changes the torque with speed); current can.
- **Consistency across battery state and speed.** The amps you ask for are the amps you get — it doesn't matter whether the battery is fresh or sagging, or whether the mechanism is stalled or spinning fast. This makes setpoints repeatable match-to-match.
- **Better disturbance rejection.** When something fights the mechanism (a defender, a game piece, gravity), commanding torque holds the *force* steady instead of letting it droop the way a fixed voltage would.
- **Cleaner, cooler operation.** FOC commutation wrings more torque out of each amp and runs the motor more efficiently.

The trade-offs: gains and feedforward are expressed in **amps**, not volts (so `kP`, `kS`, etc. are tuned in current units), and it requires **Phoenix Pro / FOC** licensing.

<Note title="How we use FOC in Rebuilt2026">
2601 runs <strong>Phoenix Pro with FOC</strong>, and we use the TorqueCurrentFOC flavor for essentially everything that matters:
<ul>
<li><strong>Turret</strong> — <code>PositionTorqueCurrentFOC</code> and <code>MotionMagicTorqueCurrentFOC</code> (and open-loop <code>TorqueCurrentFOC</code>).</li>
<li><strong>Flywheel</strong> — <code>VelocityTorqueCurrentFOC</code> for the closed-loop speed, <code>TorqueCurrentFOC</code> for open-loop/characterization.</li>
<li><strong>Intake</strong> — <code>PositionTorqueCurrentFOC</code> for the rack position, <code>TorqueCurrentFOC</code> for open-loop pushes; even the roller's <code>DutyCycleOut</code> is created <code>.withEnableFOC(true)</code>.</li>
<li><strong>Swerve modules</strong> — <code>TorqueCurrentFOC</code>, <code>PositionTorqueCurrentFOC</code>, and <code>VelocityTorqueCurrentFOC</code> for steer/drive.</li>
</ul>
The <code>...Voltage</code> and <code>DutyCycleOut</code> variants still exist in our IO classes as fallbacks/open-loop options, but the FOC flavor is the default we reach for. <strong>Important caveat:</strong> a team <em>without</em> Phoenix Pro cannot use TorqueCurrentFOC at all — they'd use the <code>...Voltage</code> variants instead. So don't assume it's available everywhere; it's a licensed feature we happen to have.
</Note>

### Axis 4: where the loop runs
- **On the TalonFX** — the default for *every* row above. Gains live in `Slot0Configs`, the loop runs at ~1 kHz, off the rio's CPU.
- **On the RoboRIO** — only when the target isn't a single motor's state. **Auto-align** controls the robot's heading/translation from vision, so its PID lives on the rio. It is the *only* rio PID loop we still run.

## The decision tree (try it)

Here's the reasoning flow as an interactive tool. Answer the questions about your mechanism and it walks you to a recommended request, where to run it, and why — with the real subsystem that lands on that same leaf. Click through it a few times with different mechanisms in mind.

<ControlMethodChooser />

<SolutionDropdown
  label="See the decision logic in plain steps"
  explanation="The chooser above encodes exactly this reasoning. If you prefer it as text, here it is:"
  code={`STEP 0 — What am I controlling?
   - The whole robot's pose/heading (vision+odometry) -> PID on the RoboRIO (auto-align). Done.
   - A single mechanism's motor -> continue.

STEP 1 — Closed-loop, or just go?
   - Just go (rollers)            -> open-loop: DutyCycleOut (percent) or VoltageOut (volts)
   - Command force/torque directly -> TorqueCurrentFOC (Pro)
   - Hold a precise target         -> STEP 2

STEP 2 — Velocity or position?
   - Velocity (flywheel, wheel RPS) -> VelocityVoltage / VelocityTorqueCurrentFOC  (little/no kD)
   - Position (elevator/arm/turret) -> STEP 3

STEP 3 — Profiled, or snap?
   - Snap / short move -> PositionVoltage / PositionTorqueCurrentFOC
   - Smooth move       -> STEP 4

STEP 4 — Where to generate the profile?
   - On the TalonFX (preferred) -> MotionMagicVoltage / MotionMagicTorqueCurrentFOC
                                   (+ .withMotionMagicJerk for an S-curve)
   - On the RoboRIO (need rio-side coordination) -> WPILib TrapezoidProfile -> controller Position PID

ORTHOGONAL — Voltage vs TorqueCurrentFOC (flavor), and the loop runs on the
TalonFX by default (Slot0) — on the rio only when the target isn't one motor's state.`}
/>

## Worked examples: our subsystems at the leaves

The tree is abstract until you see real mechanisms land on it. Here's where five of ours end up and *why*.

**Intake — deploy the rack to a position; heavy, needs smoothness.**
Closed-loop → position → profiled → profile on the **rio**. The intake advances a WPILib `TrapezoidProfile` each loop and feeds the setpoint to `PositionTorqueCurrentFOC` on the TalonFX. *Why rio-side profiling?* Its motion is wrapped in rio logic — current-based homing, stall detection, a feedforward computed from the drivetrain's acceleration — that has to live on the rio anyway. → `Intake.java` + `IntakeIOTalonFX.runRackPositionBoth`.

**Turret — rotate to an angle; smooth and precise.**
Closed-loop → position → profiled → profile on the **TalonFX**. This is the textbook MotionMagic case: `MotionMagicTorqueCurrentFOC.withPosition(...)`, profile and PID onboard at ~1 kHz. → `TurretIOTalonFX.runPivotMM`.

**Flywheel/shooter — hold a target RPS.**
Closed-loop → **velocity**. `VelocityTorqueCurrentFOC.withVelocity(setpoint).withFeedForward(ff)` on the TalonFX. No profile needed (you want it at speed, now), and velocity loops need little/no kD — `kD = 0`. → `FlywheelIOTalonFX.runFlywheel`.

**A simple roller — just spin to move game pieces.**
**Open-loop.** No target to hold, so no feedback: `DutyCycleOut` / `VoltageOut`. → indexer spindexer/feeder, intake rollers.

**Auto-align — point/drive the robot at a field target from the camera.**
**PID on the RoboRIO** — the exception. The target is the *robot's* heading/translation (PhotonVision + odometry), which no single motor controller knows, so the loop can't be offloaded to a TalonFX. A rio `ProfiledPIDController` produces `ChassisSpeeds` for the swerve drive. → `commands/align/SwerveDriveAlignment.java`.

<Note title="The pattern across all five">
Four of the five run their loop on the <strong>TalonFX</strong> — that's the default. Only auto-align runs on the <strong>rio</strong>, and only because its target isn't a single motor's state. If you can answer "is the target one motor's own position/velocity, or something bigger?", you've answered the hardest question on this page.
</Note>

## Test the thought process

These questions give you a mechanism and ask you to *reason* to the method — exactly what you'll do on a real robot. Work the tree in your head before answering.

<Quiz questions={[
{
prompt: "A new climber uses one motor to wind a rope and lift the robot to a precise height. The move is heavy and you want it smooth (no slamming at the top). Single motor. What's the best fit?",
options: [
"DutyCycleOut, open-loop",
"VelocityVoltage on the TalonFX",
"MotionMagic (e.g. MotionMagicTorqueCurrentFOC) on the TalonFX — profiled position, onboard",
"PID on the RoboRIO"
],
correct: 2,
explanation: "Closed-loop → position → needs a smooth profile → generate it on the TalonFX (preferred default). That's MotionMagic. It's one motor's own position, so the loop stays on the controller."
},
{
prompt: "You add a hopper agitator: a motor that just needs to spin to keep game pieces from jamming. Exact speed doesn't matter. Best fit?",
options: [
"MotionMagicVoltage",
"Open-loop — DutyCycleOut or VoltageOut",
"PositionTorqueCurrentFOC",
"ProfiledPIDController on the rio"
],
correct: 1,
explanation: "No target to hold → open-loop. DutyCycleOut (percent) or VoltageOut (volts, if you want battery-sag independence). No feedback needed at all."
},
{
prompt: "A shooter flywheel must hold a target RPS so shots are consistent. Single motor. Best fit, and does it need much kD?",
options: [
"PositionVoltage; needs lots of kD",
"VelocityVoltage or VelocityTorqueCurrentFOC on the TalonFX; little/no kD",
"MotionMagic on the TalonFX; needs lots of kD",
"PID on the rio; no kD"
],
correct: 1,
explanation: "Holding a speed = closed-loop velocity → VelocityVoltage / VelocityTorqueCurrentFOC on the controller. Velocity loops rarely need kD (the flywheel runs kD = 0); kV feedforward carries it."
},
{
prompt: "Why does auto-align run its PID on the RoboRIO instead of a TalonFX, even though everything else runs on the controller?",
options: [
"The RoboRIO is faster than a TalonFX",
"Because it controls the whole robot's heading/translation (from vision + odometry) — a target no single motor controller knows — so the loop can't be offloaded to one TalonFX",
"Because auto-align doesn't use PID at all",
"To save CAN bandwidth on the motors"
],
correct: 1,
explanation: "The target isn't one motor's state — it's the robot's pose, computed from PhotonVision and odometry and sent to all four modules. No single TalonFX knows that, so the loop lives on the rio. It's the only rio PID we still run."
},
{
prompt: "You decide a precise arm needs TorqueCurrentFOC for deterministic acceleration. What must be true, and what's the fallback if it isn't?",
options: [
"Nothing special; TorqueCurrentFOC is always free. No fallback needed",
"The team needs Phoenix Pro / FOC licensing (we have it); without Pro, fall back to the ...Voltage variant",
"The motor must be a NEO; fallback is DutyCycleOut",
"It must run on the rio; fallback is MotionMagic"
],
correct: 1,
explanation: "TorqueCurrentFOC requires Phoenix Pro/FOC. 2601 has it, so it's a real option for high-performance mechanisms — but a team without Pro would use the ...Voltage variant instead. Never assume FOC is available everywhere."
},
{
prompt: "Which set of four questions should you ask to choose a control method?",
options: [
"What color is the motor? How heavy? What year? What brand?",
"What am I commanding (output/torque/velocity/position)? Voltage or TorqueCurrentFOC? Profiled or not? Where does the loop run (TalonFX vs rio)?",
"Only: what are the PID gains?",
"Only: is it an arm or an elevator?"
],
correct: 1,
explanation: "Those four orthogonal questions are the whole thought process. Answer them in order and the decision tree leads you to the right request and the right place to run it."
}
]} />

---

**Previous:** [Tuning PID](./tuning-pid)

That's the section. You can now look at a mechanism — a new climber, a wrist, a shooter — and **reason** your way to the right control method and the right place to run it, the same way our real subsystems do it.

*Section path: Calculus Basics → What is PID → Feedforward → Motion Profiles → Tuning PID → **Choosing a Control Method**.*
