---
sidebar_position: 3
title: Feedforward
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Feedforward

On the last page we kept hitting the same wall: PID is **reactive**. It does nothing until there's already an error, and it leans on the I term to clean up the leftover — which we said we'd rather avoid. **Feedforward** is the fix, and it's the other half of how we actually control mechanisms.

## Feedback reacts; feedforward predicts

Here's the difference in one picture.

- **Feedback (PID)** is like driving while only looking at the *gap* between you and the car ahead. You only correct once a gap opens up. It's reactionary — it always lags reality a little, because there has to be an error before it responds.
- **Feedforward** is like already knowing the road. Going up a hill, you press the gas *before* you slow down, because you know a hill needs more throttle. You're **predicting** the effort required from the physics of the situation, not waiting to fall behind.

Feedforward provides the controller with **physical constants about the mechanism** so it can compute, ahead of time, roughly how much voltage the move needs. Then feedback only has to clean up the small leftover — disturbances, a defender shoving the robot, manufacturing differences.

> **Feedforward does the heavy lifting; feedback cleans up.** Together they're far stronger than either alone.

This is also our answer to steady-state error. Remember the stubborn leftover gap from the PID page? Instead of slowly accumulating it away with the I term (and risking windup), feedforward just *predicts the holding effort directly*. That's why our doctrine is **feedforward instead of kI** — it fixes the cause (un-modeled physics) rather than the symptom.

<Note title="Reactive vs predictive — the takeaway">
PID feedback only knows the present error. Feedforward knows the <em>physics</em> and supplies the expected voltage in advance. We combine them: feedforward for the bulk of the effort, a little feedback to correct what the model misses.
</Note>

## The four feedforward constants

Feedforward is built from up to four constants. Each one answers a physical question, and each carries **units of voltage** (because the whole point is to predict a voltage). The dot notation is from [Calculus Basics](./calculus-basics): $\dot{d}$ is velocity, $\ddot{d}$ is acceleration.

| Constant | Answers | Intuition | Units |
|---|---|---|---|
| **$K_s$** | "How much voltage just to *start* moving?" | Overcomes **static friction** — the stiction you must beat before anything moves at all. | volts |
| **$K_v$** | "How much voltage per unit of *speed*?" | The faster you want to go, the more voltage. The dominant term for velocity control. | $\text{V}\cdot\text{s}/\text{distance}$ (volts per velocity) |
| **$K_a$** | "How much *extra* voltage to *accelerate*?" | Extra push to change speed quickly; really only important for high inertia systems; we usually never use it. | $\text{V}\cdot\text{s}^2/\text{distance}$ (volts per acceleration) |
| **$K_g$** | "How much voltage just to *hold against gravity*?" | The constant push an elevator or arm needs to not fall. | volts |

### Three equations for three situations

You pick the feedforward equation that matches the mechanism's physics.

**Simple motor feedforward** — a flat mechanism where gravity doesn't fight you (a flywheel, a drivetrain wheel). No $K_g$:

$$V = K_s\,\operatorname{sgn}(\dot{d}) + K_v\,\dot{d} + K_a\,\ddot{d}$$

**Elevator feedforward** — add a constant $K_g$, because gravity pulls straight down on the carriage with the same force at every height:

$$V = K_g + K_s\,\operatorname{sgn}(\dot{d}) + K_v\,\dot{d} + K_a\,\ddot{d}$$

**Arm feedforward** — gravity's pull depends on the arm's **angle** $\theta$. It's hardest to hold straight out ($\theta = 0$, $\cos\theta = 1$) and easiest straight up or down, so $K_g$ is scaled by $\cos\theta$:

$$V = K_g\cos(\theta) + K_s\,\operatorname{sgn}(\dot{\theta}) + K_v\,\dot{\theta} + K_a\,\ddot{\theta}$$

<Note title="What is sgn?">
$\operatorname{sgn}(\dot{d})$ is the <strong>sign</strong> of the velocity: $+1$ moving one way, $-1$ the other. It just points the static-friction term $K_s$ in the direction you're trying to move — you always have to fight stiction <em>toward</em> your target, never against it.
</Note>

## Where the constants come from

You don't guess these values — you measure them. Here's how we actually do it.

- **Our own `feedforwardCharacterization()` command (what we mainly use).** Each characterized mechanism has one — see `feedforwardCharacterization()` in `subsystems/superstructure/flywheel/Flywheel.java`. When you run it, it slowly **ramps the torque current** on the motor (at a fixed rate, `FF_RAMP_RATE`), records velocity and current samples as the mechanism speeds up, then does a least-squares **linear fit** of current vs. velocity. The line's intercept is $K_s$ and its slope is $K_v$ — it prints both straight to the console. That's where the real numbers in our constants file came from.
- **Why not SysId?** WPILib's **SysId** is the tool most teams use, but it **does not support torque-current (FOC) characterization at all** — and we run our closed loops on `...TorqueCurrentFOC` (see [Choosing a Control Method](./choosing-a-control-method)). SysId can only characterize voltage-based control, so it simply can't measure the loops we actually run. That mismatch is the whole reason we wrote and use `feedforwardCharacterization()` instead.
- **[recalc](https://www.reca.lc/)** estimates constants from a mechanism's specs (motor, gear ratio, mass). It's fine for a rough first guess, but **it can't find $K_s$** (static friction is a real-world quirk it can't predict), so a real characterization run is always better.

You can see real results sitting right in our constants file as comments — for example, next to `SubsystemConstants.OmegaBot.FLYWHEEL` the characterization output reads `kS: 7.44627, kV: 0.04831`, and next to the turret you'll find several runs of `kS`/`kV` values from repeated runs.

<Note title="What characterization finds (and doesn't)">
A <code>feedforwardCharacterization()</code> run measures $K_s$ and $K_v$ — the friction and velocity terms that dominate most mechanisms. $K_a$ (acceleration) is rarely worth measuring and we usually leave it at 0; $K_g$ (gravity) is found separately for arms/elevators. For most of our mechanisms, $K_s$ and $K_v$ plus the PID gains are all you need.
</Note>

## Where the constants live in our code

Here's the payoff that ties back to the [PID page](./what-is-pid): the feedforward constants live in the **same `Slot0Configs` block on the TalonFX** as the PID gains. The motor controller applies feedforward *and* feedback together, onboard. From `subsystems/superstructure/hood/HoodIOTalonFX.java`:

```java
// HoodIOTalonFX.java — feedforward constants sit right next to the PID gains
motorConfig.Slot0.kP = constants.kP();
motorConfig.Slot0.kI = constants.kI();   // 0 — feedforward instead
motorConfig.Slot0.kD = constants.kD();
motorConfig.Slot0.kS = constants.kS();   // static friction
motorConfig.Slot0.kG = constants.kG();   // gravity (hood is arm-like)
motorConfig.Slot0.kA = constants.kA();   // acceleration
```

For mechanisms where we compute the feedforward on the RoboRIO instead (like the intake's rack), the value is passed into the control request with **`.withFeedForward(...)`** — you saw this on the flywheel's `velocityVoltage.withVelocity(setpoint).withFeedForward(feedforward)` call, and the intake does the same with `PositionTorqueCurrentFOC`. Either way, the feedforward voltage gets *added* to the PID output, exactly like our reactive-plus-predictive picture.

## Run it: feedforward vs. pure feedback

The demo below holds a mechanism against a constant "gravity" disturbance. **Run 1** uses pure proportional feedback (kP only) and settles *below* the target — that leftover gap is **steady-state error**. **Run 2** adds a feedforward term that predicts the gravity push, and it lands on target. This is the whole argument for feedforward-over-kI, in numbers.

<JavaRunner
  starterCode={`public class Main {
    // hold 'position' at target against a constant gravity pull
    static double simulate(double kP, double kG_feedforward) {
        double target = 1.0, position = 0.0, dt = 0.02;
        double gravity = 0.30;   // constant downward push (volts-equivalent)
        for (int i = 0; i < 200; i++) {
            double error = target - position;
            double output = kP * error + kG_feedforward;  // feedback + feedforward
            position += (output - gravity) * dt;          // gravity fights us
        }
        return position;
    }

    public static void main(String[] args) {
        double settledNoFF = simulate(2.0, 0.00);   // feedback only
        double settledWithFF = simulate(2.0, 0.30); // + feedforward that predicts gravity

        System.out.printf("Target = 1.000%n");
        System.out.printf("Feedback only   -> settles at %.3f   (steady-state error!)%n", settledNoFF);
        System.out.printf("Feedback + kG FF -> settles at %.3f   (on target)%n", settledWithFF);
        System.out.println("\\nFeedforward predicted the holding push, so no leftover gap - no kI needed.");
    }
}`}
/>

<Quiz questions={[
{
prompt: "What is the core difference between feedback and feedforward?",
options: [
"Feedback predicts the needed effort from physics; feedforward only reacts to error",
"Feedback reacts to the current error; feedforward predicts the needed effort from the mechanism's physics",
"They are two names for the same thing",
"Feedforward only works on the RoboRIO"
],
correct: 1,
explanation: "Feedback (PID) is reactive — it responds after an error appears. Feedforward is predictive — it supplies the expected voltage from known physics, before the error grows. We combine them."
},
{
prompt: "Which feedforward constant overcomes static friction — the voltage just to get a still mechanism to start moving?",
options: ["kV", "kA", "kS", "kG"],
correct: 2,
explanation: "kS overcomes static friction (stiction). It's multiplied by sgn(velocity) so it always pushes in the direction you're trying to move."
},
{
prompt: "Why does the ARM feedforward equation multiply kG by cos(θ), while the ELEVATOR equation uses a plain kG?",
options: [
"Arms are heavier than elevators",
"An elevator fights the same downward gravity at every height (constant kG); an arm's gravity load changes with angle, peaking when horizontal — cos(θ) captures that",
"cos(θ) makes the math look harder on purpose",
"Elevators don't experience gravity"
],
correct: 1,
explanation: "Gravity pulls an elevator carriage with the same force at any height, so kG is constant. An arm's torque from gravity depends on its angle (max when horizontal, zero when vertical), which is exactly cos(θ)."
},
{
prompt: "How do we mainly measure kS and kV on 2601, and why not just use SysId?",
options: [
"Guess and check; SysId only runs on Linux",
"Our own feedforwardCharacterization() command (ramps torque current, fits current vs. velocity for kS/kV); SysId can't characterize torque-current/FOC loops, which is what we run",
"We read them off the motor label; SysId is for kP only",
"We always set them to 1.0; SysId finds kP"
],
correct: 1,
explanation: "We use feedforwardCharacterization() (in Flywheel.java): it ramps torque current, records velocity/current, and least-squares fits the intercept (kS) and slope (kV). SysId doesn't support torque-current/FOC characterization at all, and our loops run on ...TorqueCurrentFOC, so SysId can't measure them."
},
{
prompt: "In our code, where do the feedforward constants for a TalonFX-controlled mechanism live?",
options: [
"In a separate file on the driver station",
"In the same Slot0Configs block as the PID gains (e.g. Slot0.kS, Slot0.kG on the hood)",
"They are hard-coded as magic numbers in periodic()",
"Only in SysId; they're never stored"
],
correct: 1,
explanation: "Feedforward constants sit right next to the PID gains in Slot0Configs (e.g. HoodIOTalonFX sets Slot0.kS, Slot0.kG, Slot0.kA). The controller applies feedforward and feedback together, onboard."
}
]} />

---

**Previous:** [What is PID](./what-is-pid) · **Next:** [Motion Profiles](./motion-profiles) — feedforward sets a *speed*; a motion profile gets you to a *position* smoothly.

*Section path: Calculus Basics → What is PID → **Feedforward** → Motion Profiles → Tuning PID → Choosing a Control Method.*
