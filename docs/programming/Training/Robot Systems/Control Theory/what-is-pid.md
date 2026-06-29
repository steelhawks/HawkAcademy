---
sidebar_position: 2
title: What is PID
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# What is PID

On the last page you learned the two ideas this whole section rests on: the **derivative** (rate of change) and the **integral** (running total). Now we use them to build your first real controller.

The problem PID solves comes up everywhere: you have a mechanism, you want it at some **target** (a setpoint), and right now it's somewhere else. How much voltage do you send to close that gap — without overshooting, oscillating, or never quite getting there? **PID** is the classic answer.

## Intuition first: the thermostat

Forget robots for a second. Think about a thermostat heating a room to 70°F.

- If the room is at 50°F (a **big** gap), you want the heater blasting.
- If the room is at 69°F (a **tiny** gap), you want just a trickle, or you'll shoot past 70 and cook everyone.

So the obvious rule is: **push in proportion to how far off you are.** Big error → big push; small error → small push. That single instinct is the **P** in PID. Cruise control works the same way — far below your set speed, it floors it; nearly there, it eases off.

PID is just that instinct, made precise and given two helpers. The gap between where you are and where you want to be is called the **error**:

$$e(t) = \text{target} - \text{current measurement}$$

PID looks at that error three different ways — **now**, **the past**, and **the trend** — and adds the three responses together.

<Note title="New term: closed-loop control">
PID is <strong>closed-loop</strong> (also called <strong>feedback</strong>) control: it constantly <em>measures</em> the mechanism and corrects based on the error. "Closed loop" = there's a sensor closing the loop back to the controller. Contrast with <strong>open-loop</strong> (just send a fixed output and hope) — we cover that on the <a href="./choosing-a-control-method">Choosing a Control Method</a> page.
</Note>

## The three terms

### P — Proportional (react to the error *now*)
Push proportional to the **current** error. This does the bulk of the work.

- Error is large → large correction.
- Error is small → small correction.
- Error is zero → no correction.

The constant that scales it is **$K_p$**. Too small and the mechanism crawls to the target; too large and it slams past and oscillates. P alone usually leaves a little leftover gap (more on that in a moment).

If you take physics, think of it this way.

$$F(x) = \text-kx$$ or just $$F = \text-kx$$

Have you seen this before? Well what difference is $$K_p * e(t)$$. The Spring Force equation cleanly maps to the $$K_p$$ component. Where the further away you are: the greater your error is, the harder the motor will be commanded to close the distance; the same way the more you pull out a Hookean Spring, the stronger it will pull itself back to equilibrium.

### I — Integral (react to the *accumulated* past error)
The **integral** term adds up error over time — exactly the running total from the last page. Its job is to wipe out a small, stubborn leftover error that P can't finish off (called **steady-state error** — the error that just sits there because the proportional push has gotten too weak to move the last little bit). Phoenix 6, the library CTRE motors, such as Krakens run on, have integral windup protection built in; you do not have to have a integrator range set up or even worry about this concept at all. It is still recommended to familiarize yourself with this concept.

But we **mostly avoid the I term**, and you should know why:

- **Integral windup.** If the error stays large for a while, the integral keeps piling up into a huge number. By the time you reach the target, that accumulated value sends way too much output and you overshoot badly.
- **It's a band-aid for missing physics.** Almost always, the *real* reason for steady-state error is that we never told the controller how much push the mechanism needs just to hold position (gravity, friction). The honest fix is **feedforward** (the next page), which predicts that push from the physics instead of slowly discovering it by accumulating error.

<Note title="Our doctrine on kI">
On 2601 we treat the I term as a last resort and reach for feedforward instead. It's not just talk — look at the real <code>Slot0</code> gains in <code>Rebuilt2026</code>: the flywheel (<code>SubsystemConstants.OmegaBot.FLYWHEEL</code>), the hood (<code>HOOD</code>), and the intake (<code>IntakeConstants</code>) all ship with <strong>kI = 0</strong>. A few precise mechanisms keep a small integral term (the turret's <code>TURRET</code> constants use a nonzero kI), but the default is zero. When in doubt, leave kI at 0 and fix steady-state error with feedforward.
</Note>

### D — Derivative (react to the *trend*)
The **derivative** term looks at how fast the error is changing — the rate from the last page. It's the brake. If the error is shrinking fast (you're racing toward the target and about to overshoot), D pushes *back* to slow the approach. This **damps oscillation** and smooths the landing. Its constant is **$K_d$**.

### Putting it together
Add the three responses and you get the full PID control law — the single most important equation in this section:

$$u(t) = K_p\,e(t) + K_i\!\int_0^t e(\tau)\,d\tau + K_d\,\frac{de(t)}{dt}$$

Read it straight off the last page:

- $K_p\,e(t)$ — **P**: the constant $K_p$ times the error right now.
- $K_i\!\int_0^t e(\tau)\,d\tau$ — **I**: the constant $K_i$ times the **integral** (running total) of error. That $\int$ is the accumulation you ran in code.
- $K_d\,\frac{de(t)}{dt}$ — **D**: the constant $K_d$ times the **derivative** (rate of change) of error. That $\frac{d}{dt}$ is the difference you ran in code.

$u(t)$ is the **output** the controller sends to the motor (think volts or amps). That's the entire algorithm.

## How the mechanism responds: damping

When PID drives toward a target, the *shape* of the approach has a name. Tuning is mostly about landing in the third row:

| Response | What it looks like | Verdict |
|---|---|---|
| **Underdamped** | Overshoots the target and oscillates before settling | Too much P / too little D |
| **Overdamped** | Crawls in slowly, never overshoots, takes forever | Too much D / too little P |
| **Critically damped** | Reaches the target as fast as possible **without** overshooting | **The goal** |

You tune $K_p$ and $K_d$ to get as close to **critically damped** as you can. The full step-by-step workflow is on the [Tuning PID](./tuning-pid) page.

## Where does the PID loop actually run?

This is the part rookies miss, and it's central to how *we* build robots. The PID math above can run in two different places, and **we strongly default to one of them.**

### Default: on the motor controller (TalonFX)
Almost every closed-loop mechanism we have runs its PID **on the TalonFX motor controller itself**, not on the RoboRIO. You hand the controller your gains once — they live in a **`Slot0Configs`** block — and the controller runs the loop internally at about 1 kHz. Here's the real configuration for the flywheel, from `subsystems/superstructure/flywheel/FlywheelIOTalonFX.java`:

```java
// FlywheelIOTalonFX.java — gains live ON the motor controller
config.Slot0.kP = constants.kP();   // 10.0 for OmegaBot
config.Slot0.kI = constants.kI();   // 0.0  — see our kI doctrine above
config.Slot0.kD = constants.kD();   // 0.0  — velocity loops rarely need D
```

After that, the subsystem just *names a target* and the TalonFX does the PID:

```java
// FlywheelIOTalonFX.java — "spin at this velocity"; the controller closes the loop
leftMotor.setControl(velocityVoltage.withVelocity(setpoint).withFeedForward(feedforward));
```

We used to run subsystem PID on the RoboRIO; we've since moved it onto the controllers. Page 4 ([Motion Profiles](./motion-profiles)) explains the full list of *why* — it's faster, off-loads the rio's CPU, and is more deterministic.

### The one exception: auto-align runs PID on the RoboRIO
There is exactly **one** place we still run PID on the rio, and it's a perfect teaching case for *when* that's the right call: **auto-align** — pointing/driving the robot to a field target using the camera (we use **PhotonVision**) and the robot's estimated pose.

Look at `commands/align/SwerveDriveAlignment.java`. It builds a WPILib controller on the rio for the robot's **heading**:

```java
// SwerveDriveAlignment.java — PID on the RoboRIO, controlling robot heading
angleController = new ProfiledPIDController(
    AutonConstants.ROTATION_KP.get(),
    AutonConstants.ROTATION_KI.get(),
    AutonConstants.ROTATION_KD.get(),
    new TrapezoidProfile.Constraints(/* max angular vel, accel */));
...
double omegaRadPerSec =
    angleController.calculate(currPose.getRotation().getRadians(),
                              output.targetAngle().getRadians());
s_Swerve().runVelocity(/* chassis speeds using omegaRadPerSec */);
```

**Why can't this live on a TalonFX like everything else?** Because the thing being controlled — *the robot's heading on the field* — isn't any single motor's position. It's computed from vision and odometry and fed to *all four* swerve modules at once. No individual motor controller "knows" the robot's heading, so the loop has to run on the rio, where the pose estimate lives. That's the rule:

> **Run PID on the TalonFX whenever the target is one motor's own state (position/velocity). Run it on the rio only when the target is something no single motor knows — like the whole robot's pose.**

We'll come back to this exact distinction as an axis of the decision tree on the [final page](./choosing-a-control-method).

## Run it: a PID loop you can tune

Theory is cheap. Below is a tiny **P-D controller** (we left I at 0, per our doctrine) driving a simulated mass from 0 toward a target of **1.0**. Press **▶ Run** and read the approach. Then:

- **Crank `kP` up** (try 0.9) and watch it overshoot and oscillate — *underdamped*.
- **Add some `kD`** (try kP 0.9, kD 0.5) and watch the oscillation get damped out — closer to *critically damped*.
- **Set `kD` huge** (try kP 0.2, kD 2.0) and watch it crawl — *overdamped*.

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        // ---- knobs to play with ----
        double kP = 0.4;
        double kI = 0.0;   // our default: leave it at 0
        double kD = 0.0;
        // ----------------------------

        double target = 1.0;
        double position = 0.0;
        double velocity = 0.0;
        double dt = 0.02;          // 20 ms loop

        double errorSum = 0.0;     // the integral (running total of error)
        double prevError = 0.0;

        System.out.println("step | position | error  | output");
        for (int step = 1; step <= 20; step++) {
            double error = target - position;
            errorSum += error * dt;                 // I: accumulate
            double dError = (error - prevError) / dt; // D: rate of change
            prevError = error;

            double output = kP * error + kI * errorSum + kD * dError;

            // pretend physics: output pushes the mass, with a little inertia
            velocity += output * dt;
            velocity *= 0.85;          // friction/damping of the plant
            position += velocity * dt;

            System.out.printf("  %2d |  %+.3f | %+.3f | %+.3f%n",
                step, position, error, output);
        }
        System.out.println("\\nGoal: reach 1.000 fast, with no overshoot (critically damped).");
    }
}`}
/>

Every number you changed maps straight to the equation: `kP * error` is P, `kI * errorSum` is the integral term, `kD * dError` is the derivative term. That's PID — nothing hidden.

<Quiz questions={[
{
prompt: "In PID, what is the 'error'?",
options: [
"A bug in the robot code",
"target minus current measurement — how far the mechanism is from where you want it",
"The accumulated voltage sent to the motor",
"The derivative of the position"
],
correct: 1,
explanation: "Error e(t) = target − current measurement. All three PID terms are different ways of reacting to that error."
},
{
prompt: "Which term reacts to how fast the error is changing, and damps oscillation?",
options: ["P (proportional)", "I (integral)", "D (derivative)", "F (feedforward)"],
correct: 2,
explanation: "The D (derivative) term watches the rate of change of error — it acts like a brake as you approach the target, reducing overshoot and oscillation."
},
{
prompt: "Why does 2601 usually leave kI at 0 and use feedforward instead?",
options: [
"The I term is illegal in FRC",
"Integral windup causes overshoot, and steady-state error is better fixed by predicting the needed push with feedforward",
"kI makes the code longer",
"TalonFX motors don't support an I term"
],
correct: 1,
explanation: "The I term can wind up and overshoot, and steady-state error usually comes from un-modeled physics (gravity/friction). Feedforward predicts that push directly, which is the honest fix. Our flywheel, hood, and intake all ship with kI = 0."
},
{
prompt: "A mechanism overshoots its target and oscillates a few times before settling. What is this called, and a typical fix?",
options: [
"Overdamped — increase kP",
"Critically damped — it's already ideal",
"Underdamped — add some kD (and/or lower kP)",
"Steady-state error — add kI"
],
correct: 2,
explanation: "Overshoot + oscillation = underdamped. Add D to damp it (and/or reduce P). The goal is critically damped: fast as possible with no overshoot."
},
{
prompt: "Where do we run the PID loop by default, and what's the one exception?",
options: [
"On the RoboRIO by default; the exception is the flywheel",
"On the TalonFX (gains in Slot0Configs) by default; the exception is auto-align, which runs on the rio because it controls the whole robot's heading/pose",
"Always on the rio; there are no exceptions",
"On the driver station laptop"
],
correct: 1,
explanation: "Default is on the TalonFX (Slot0 gains, ~1 kHz). The lone rio exception is auto-align: it controls the robot's pose from vision, which no single motor controller knows, so that loop must live on the rio."
}
]} />

---

**Previous:** [Calculus Basics](./calculus-basics) · **Next:** [Feedforward](./feedforward) — how we predict the needed push from physics, and why it replaces the I term.

*Section path: Calculus Basics → **What is PID** → Feedforward → Motion Profiles → Tuning PID → Choosing a Control Method.*
