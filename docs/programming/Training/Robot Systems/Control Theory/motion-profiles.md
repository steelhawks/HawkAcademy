---
sidebar_position: 4
title: Motion Profiles
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Motion Profiles

We have two tools so far: PID closes a gap, and feedforward predicts the push. But there's a question neither one answers well. Feedforward, by its nature, sets a **speed** — give it a velocity and it predicts the voltage. It doesn't know anything about *getting to a position*. And if you just hand a position controller a far-away target, it tries to go there **as hard as possible, instantly** — slamming the mechanism, jerking the robot, maybe tipping it. A **motion profile** is the fix.

## The problem: A to B without slamming

Say the elevator is at the bottom and you want it at the top. The naive move is "set target = top" and let PID blast full voltage until it arrives. That's violent: max acceleration at the start, max deceleration at the end, huge stress on the mechanism, and easy to overshoot.

What you actually want is a **plan**: speed up smoothly, cruise, then slow down smoothly into the target. A **motion profile** generates exactly that plan — a smooth trajectory of **position, velocity, and acceleration over time** that respects limits you set (max speed, max acceleration). Instead of one far-away target, the controller chases a *moving* setpoint that walks calmly from A to B.

<Note title="Definition: motion profile">
A <strong>motion profile</strong> is a time-based plan for a move: at every instant it says where the mechanism <em>should</em> be, how fast it <em>should</em> be going, and how hard it <em>should</em> be accelerating — all within physical limits. The controller then just follows that plan point by point.
</Note>

## Trapezoidal vs. S-curve

### Trapezoidal (the default)
The most common profile in FRC has three phases. Graph **velocity over time** and you get a trapezoid:

1. **Acceleration** — ramp speed up at a constant rate.
2. **Cruise** — hold maximum velocity.
3. **Deceleration** — ramp speed back down into the target.

Simple, fast, and good for almost everything. The catch: at the corners of the trapezoid, acceleration changes *instantly* (from "accelerating" to "cruising" to "decelerating"). That instant change in acceleration is felt as a jolt.

### S-curve (jerk-limited)
An **S-curve** profile rounds off those corners by ramping the acceleration up and down gradually instead of switching it instantly. The result is smoother and gentler on the hardware — at the cost of being slightly slower.

The thing an S-curve limits is **jerk**. Straight from [Calculus Basics](./calculus-basics): jerk is the derivative of acceleration, $\dddot{d}$ — *how fast the acceleration itself is changing.* A trapezoidal profile lets jerk be infinite at the corners (acceleration snaps); an S-curve caps it.

$$\text{position} \xrightarrow{\frac{d}{dt}} \dot{d}\;(\text{velocity}) \xrightarrow{\frac{d}{dt}} \ddot{d}\;(\text{acceleration}) \xrightarrow{\frac{d}{dt}} \dddot{d}\;(\text{jerk})$$

| Profile | Jerk | Acceleration shape | Use it for |
|---|---|---|---|
| **Trapezoidal** | Unlimited (snaps at corners) | Flat with sharp edges | The common default — most mechanisms |
| **S-curve** | Limited | Ramped, S-shaped | Precise, wear-sensitive, or tip-prone moves |

## Two places to generate the profile (with our real code)

Here's the architecture point that matters most. **Where the profile is generated is a separate question from where the PID runs.** We do it in two different places on two different mechanisms — and both are worth understanding.

### Pattern A — profile on the RoboRIO: the Intake
The intake generates its trapezoidal profile **on the rio** using WPILib's `TrapezoidProfile`, then feeds the resulting setpoint to the TalonFX's position PID. From `subsystems/intake/Intake.java`:

```java
// Intake.java — build a trapezoidal profile on the rio with velocity/accel limits
profile = new TrapezoidProfile(
    new TrapezoidProfile.Constraints(
        MAX_VELOCITY_METERS_PER_SEC.get(),
        MAX_ACCEL_METERS_PER_SEC_SQ.get()));
```

Then, **every 20 ms loop**, it advances the profile by one timestep to get the next setpoint and hands that to the motor:

```java
// Intake.java periodic() — walk the profile forward one 20 ms step...
setpoint = profile.calculate(Constants.UPDATE_LOOP_DT, setpoint, goal);
...
// ...and send the profiled position to the TalonFX (which runs the position PID)
io.runRackPositionBoth(setpoint.position, leftFF, rightFF);
```

So the **rio computes the trajectory** (and a feedforward), but the **TalonFX still runs the position PID** — `runRackPositionBoth` issues a `PositionTorqueCurrentFOC` request under the hood (see `IntakeIOTalonFX.java`). Profile on rio, PID on controller.

### Pattern B — profile on the TalonFX: the Turret
The turret does **both** the profile *and* the PID **onboard the TalonFX**, using CTRE's **MotionMagic**. You configure the limits once in a `MotionMagicConfigs` block. From `subsystems/superstructure/turret/TurretIOTalonFX.java`:

```java
// TurretIOTalonFX.java — the profile limits live ON the motor controller
motorConfig.MotionMagic.MotionMagicCruiseVelocity = Units.radiansToRotations(constants.maxVelocityRadPerSec());
motorConfig.MotionMagic.MotionMagicAcceleration   = Units.radiansToRotations(constants.maxAccelerationRadPerSecSq());
motorConfig.MotionMagic.MotionMagicJerk           = 0.0;   // 0 = trapezoidal
```

After that, the subsystem just **names a target position once** and the controller generates the whole trajectory and follows it internally:

```java
// TurretIOTalonFX.java — send the goal; the TalonFX profiles AND runs the PID
motor.setControl(
    motionMagicTorqueCurrentFOC.withPosition(Units.radiansToRotations(setpoint))
        .withFeedForward(feedforward));
```

Notice `MotionMagicJerk = 0.0` above — that makes it a **trapezoidal** MotionMagic move. Set a nonzero jerk (the turret's `setMotionMagic(cruise, accel, jerk)` method does exactly this via `.withMotionMagicJerk(...)`) and the same move becomes an **S-curve**. One number flips trapezoid ↔ S-curve.

<Note title="The two questions, kept separate">
<strong>Where is the profile generated?</strong> — rio (<code>TrapezoidProfile</code>, Intake) or TalonFX (MotionMagic, Turret).<br/>
<strong>Where does the PID run?</strong> — almost always the TalonFX (<a href="./what-is-pid">What is PID</a>).<br/>
The Intake splits them (rio profile, controller PID). The Turret keeps both onboard. Don't conflate the two questions.
</Note>

## Why onboard (MotionMagic) is our preferred default

For most position mechanisms, generating the profile **on the TalonFX** is the better choice. Here's the full argument:

- **Speed.** The TalonFX runs its control loop at roughly **1 kHz**; the RoboRIO's main loop runs at **50 Hz** (every 20 ms). A loop running 20× faster produces smoother, more responsive motion.
- **It off-loads the rio's CPU.** This is a safety issue, not just performance. If rio code takes longer than 20 ms in a loop, you get a **`CommandScheduler` loop overrun** — and as our Programming Reference warns, an overrun is *extremely dangerous*: critical code like **swerve stops running and the robot goes unresponsive**. Pushing profiling onto the controllers keeps the rio loop light.
- **Lower latency.** You send the target **once**. With rio-side profiling you send a fresh setpoint over the CAN bus every single loop — a round trip each time. MotionMagic skips all of that.
- **Deterministic timing.** The controller's loop isn't subject to rio thread starvation or garbage-collection pauses, so the timing is rock-steady.
- **Less CAN traffic.** One target instead of 50 setpoints per second frees up the bus.
- **Built-in feedforward and jerk limiting.** kS/kV/kA/kG and the S-curve all live in the config — no extra rio code.
- **Simpler rio code.** The whole move is one `setControl(...)` call.

### The honest counterpoint
Onboard isn't *always* right. Generate the profile on the rio when:

- **The target isn't a single motor's state.** Auto-align steers the whole robot's pose from vision — no one TalonFX knows that, so its profile and PID live on the rio (the [What is PID](./what-is-pid) exception).
- **You need rio-side coordination or custom logic.** The intake's profile is wrapped in rio code that also does current-based homing, stall detection, and a physics feedforward computed from the drivetrain's acceleration — logic that has to live on the rio anyway, so generating the profile there keeps it all together.

## Run it: a tiny trapezoidal profile generator

The code below generates a trapezoidal velocity profile for a 1-meter move (max speed 1 m/s, max accel 2 m/s²) and integrates it into a position — the same idea as `TrapezoidProfile.calculate(...)`, just stripped to the bone. Press **▶ Run** and watch velocity ramp up, cruise, and ramp back down while position eases smoothly into 1.0.

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        double target = 1.0;     // meters
        double maxVel = 1.0;     // m/s
        double maxAcc = 2.0;     // m/s^2
        double dt = 0.05;

        double pos = 0.0, vel = 0.0;
        System.out.println("time | velocity | position |  phase");
        for (double t = 0; t < 2.0 && pos < target; t += dt) {
            // distance still needed to stop from current speed
            double stopDist = (vel * vel) / (2 * maxAcc);
            String phase;
            if ((target - pos) <= stopDist) {           // time to brake
                vel -= maxAcc * dt; phase = "decelerate";
            } else if (vel < maxVel) {                  // still ramping up
                vel += maxAcc * dt; phase = "accelerate";
            } else {                                    // at top speed
                phase = "cruise";
            }
            if (vel < 0) vel = 0;
            pos += vel * dt;                            // integrate velocity -> position
            System.out.printf(" %.2f |   %.3f  |  %.3f  | %s%n", t, vel, pos, phase);
        }
        System.out.println("\\nVelocity formed a trapezoid; position eased into the target.");
    }
}`}
/>

<Quiz questions={[
{
prompt: "What does a motion profile produce?",
options: [
"A single far-away target the controller jumps to instantly",
"A smooth, time-based plan of position/velocity/acceleration that respects max speed and acceleration limits",
"The PID gains for a mechanism",
"A log file of past motor currents"
],
correct: 1,
explanation: "A motion profile is a time-based trajectory: at each instant it says where to be, how fast, and how hard to accelerate — within limits — so the move is smooth instead of a violent jump."
},
{
prompt: "What is 'jerk', and what does an S-curve profile do with it?",
options: [
"Jerk is the velocity; an S-curve maximizes it",
"Jerk is the derivative of acceleration (how fast acceleration changes); an S-curve limits it for smoother moves",
"Jerk is static friction; an S-curve removes it",
"Jerk is the error; an S-curve integrates it"
],
correct: 1,
explanation: "Jerk is the rate of change of acceleration (d-triple-dot). A trapezoidal profile lets it spike at the corners; an S-curve caps jerk so acceleration ramps gradually — smoother and gentler on hardware."
},
{
prompt: "On the Intake, where is the motion profile generated and where does the position PID run?",
options: [
"Both on the TalonFX via MotionMagic",
"Profile on the RoboRIO (WPILib TrapezoidProfile); position PID on the TalonFX",
"Both on the RoboRIO",
"Profile on the driver station; PID on the rio"
],
correct: 1,
explanation: "The Intake builds a TrapezoidProfile on the rio and advances it each 20 ms loop, then sends the setpoint to the TalonFX, which runs the position PID (PositionTorqueCurrentFOC). Profile on rio, PID on controller."
},
{
prompt: "On the Turret, what does MotionMagic do, and how do you switch a trapezoidal MotionMagic move into an S-curve?",
options: [
"It only runs PID; you switch by changing kP",
"It generates the profile AND runs the PID onboard the TalonFX; set a nonzero MotionMagicJerk (.withMotionMagicJerk) to make it an S-curve",
"It runs on the rio; you add a TrapezoidProfile",
"It disables feedforward; you re-enable kS"
],
correct: 1,
explanation: "MotionMagic generates the trajectory and runs the PID entirely on the TalonFX. MotionMagicJerk = 0 is trapezoidal; setting a nonzero jerk turns it into a jerk-limited S-curve."
},
{
prompt: "Which is NOT one of the reasons we prefer generating profiles onboard the TalonFX?",
options: [
"It runs ~1 kHz vs the rio's 50 Hz, and off-loads the rio CPU (avoiding dangerous CommandScheduler loop overruns)",
"Lower latency and less CAN traffic — you send the target once instead of a setpoint every loop",
"It lets you ignore feedforward entirely",
"Deterministic timing, not subject to rio thread starvation or GC pauses"
],
correct: 2,
explanation: "Onboard control still uses feedforward (kS/kV/kA/kG live in the same config) — that's a benefit, not something it lets you skip. The real reasons are speed, CPU off-load, lower latency, determinism, and less CAN traffic."
}
]} />

---

**Previous:** [Feedforward](./feedforward) · **Next:** [Tuning PID](./tuning-pid) — the practical workflow for finding good gains, and where we tune them.

*Section path: Calculus Basics → What is PID → Feedforward → **Motion Profiles** → Tuning PID → Choosing a Control Method.*
