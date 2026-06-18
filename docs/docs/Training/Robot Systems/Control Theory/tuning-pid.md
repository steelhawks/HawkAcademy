---
sidebar_position: 5
title: Tuning PID
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Tuning PID

You now know what the gains *mean* — $K_p$, $K_i$, $K_d$, and the feedforward constants. **Tuning** is the practical craft of finding good values for a real mechanism. It's part method, part feel, and this page gives you the method so the feel comes faster.

## The goal, restated

From the [PID page](./what-is-pid): you're trying to land on a **critically damped** response — reach the target as fast as possible with **no overshoot and no oscillation**. Underdamped overshoots and rings; overdamped crawls. Tuning is the process of nudging gains until the response sits right in between.

## The workflow

Tune one term at a time, in this order. This is the procedure we follow on 2601:

1. **Start with $K_p$ low**, everything else at 0. Command a move and watch the response.
2. **Raise $K_p$** until the mechanism reaches the target briskly and just *barely* starts to oscillate. That tells you P is doing as much as it safely can.
3. **Add $K_d$** to damp out that oscillation. D is the brake — it kills the ringing and lets you keep a healthy $K_p$. Nudge it up until the overshoot is gone and the landing is clean.
4. **Got leftover steady-state error** (it settles close but not *on* target)? **Reach for feedforward, not $K_i$.** Per our doctrine ([Feedforward](./feedforward)), add/raise $K_s$ and $K_g$ to supply the holding push. Only if that genuinely can't close the gap do you consider a *small* $K_i$ — and if you do, watch for windup.

<Note title="Velocity loops barely need D">
For a <strong>velocity</strong> loop (a flywheel, a drivetrain wheel), $K_d$ is usually unnecessary — the response doesn't ring the way a position loop does. That's exactly why our flywheel ships with <code>kD = 0</code> (and <code>kI = 0</code>): for velocity, $K_v$ feedforward plus a little $K_p$ does the job. Save your $K_d$ effort for position mechanisms.
</Note>

## Where we tune: on the controller, live

Two practical truths shape *how* we tune:

**1. The gains live on the TalonFX, so that's where we tune.** Because our PID runs in the motor's `Slot0Configs` ([What is PID](./what-is-pid)), tuning means adjusting those slot values. **Phoenix Tuner X** — CTRE's utility — is the main tool: it's where you check device **IDs**, view live **plots** of a signal vs. its setpoint (so you can actually *see* the overshoot or oscillation you're tuning out), and apply config changes.

**2. Do not redeploy code for every gain change.** Recompiling and redeploying for each tweak would make tuning agonizingly slow. Instead we change values **live**, while the robot is enabled in **test mode**.

In our codebase this live-tuning is wired up with **`LoggedTunableNumber`** plus a **`Toggles.tuningMode`** flag. A subsystem reads its gains as tunable numbers and re-applies them to the motor *only when they change* and *only in tuning mode*. From `subsystems/superstructure/flywheel/Flywheel.java`:

```java
// Flywheel.java periodic() — change gains live, no redeploy
if (Toggles.tuningMode.get()) {
    LoggedTunableNumber.ifChanged(this.hashCode(), () -> {
        io.setPID(kP.get(), kI.get(), kD.get());   // push new gains to Slot0 on the TalonFX
    }, kP, kI, kD);
}
```

`io.setPID(...)` writes straight into the motor's slot config — for the flywheel, `FlywheelIOTalonFX.setPID(...)` sets `config.Slot0.kP/kI/kD` and re-applies it. You drag a number in the dashboard, the gain updates on the controller, and you watch the plot respond — no rebuild. The intake (`setRackPID`) and turret (`setPID`, plus `setMotionMagic` for the profile limits) follow the same pattern.

<Note title="The connection to remember">
Every knob you turn while tuning is one of the <code>Slot0</code> fields from the last three pages. Tuning isn't separate from the theory — it's you adjusting $K_p$, $K_d$, $K_s$, $K_g$ on the real motor and watching the response. The math and the knobs are the same thing.
</Note>

## Characterization gets you a starting point

You don't have to find feedforward constants by hand. As covered on the [Feedforward](./feedforward) page, our **`feedforwardCharacterization()`** command ramps the mechanism and measures $K_s$ and $K_v$ for you — a solid starting point for the feedforward, with the PID gains tuned by feel on top. (We use our own command rather than WPILib's SysId because SysId can't characterize the torque-current/FOC loops we run.) The measured values usually still need a little fine-tuning, and for niche loops like **auto-align** (the rio PID), hand-tuning is expected — but characterization saves you from starting at zero.

## Practice: tune it to critically damped

Here's a position loop you can tune by feel — the same toy plant from the PID page. It prints **overshoot** and whether it **oscillated**, so you get instant feedback. Your mission: reach the target fast with **0 overshoot and no oscillation** (critically damped). Try the workflow:

1. Raise `kP` (try 5, then 12) until you see overshoot/oscillation appear.
2. Add `kD` (try 1, then 2) to damp it back out.
3. Find the combo with the smallest settling time and no overshoot.

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        // ---- TUNE THESE ----
        double kP = 2.0;
        double kD = 0.0;
        // --------------------
        double kI = 0.0;     // leave at 0 (our doctrine)

        double target = 1.0, position = 0.0, velocity = 0.0, dt = 0.02;
        double errorSum = 0.0, prevError = target;
        double maxPosition = 0.0;
        boolean oscillated = false;
        double lastVel = 0.0;
        int settledStep = -1;

        for (int step = 1; step <= 150; step++) {
            double error = target - position;
            errorSum += error * dt;
            double dError = (error - prevError) / dt;
            prevError = error;

            double output = kP * error + kI * errorSum + kD * dError;
            velocity += output * dt;
            velocity *= 0.90;        // plant damping
            position += velocity * dt;

            if (position > maxPosition) maxPosition = position;
            if (lastVel > 0 && velocity < 0) oscillated = true;  // direction reversal = ringing
            lastVel = velocity;
            if (settledStep < 0 && Math.abs(error) < 0.02 && Math.abs(velocity) < 0.02)
                settledStep = step;
        }

        double overshoot = Math.max(0, maxPosition - target);
        System.out.printf("kP=%.2f kD=%.2f%n", kP, kD);
        System.out.printf("overshoot: %.3f   oscillated: %b   settled at step: %s%n",
            overshoot, oscillated, settledStep < 0 ? "never" : settledStep);
        if (overshoot < 0.01 && !oscillated && settledStep > 0)
            System.out.println("Critically damped - nice. Fast, no overshoot, no ringing.");
        else if (oscillated || overshoot > 0.01)
            System.out.println("Underdamped - too much P or not enough D. Add kD.");
        else
            System.out.println("Overdamped or too weak - speed it up with more kP.");
    }
}`}
/>

<Quiz questions={[
{
prompt: "What is the correct order to tune a position PID loop?",
options: [
"Max out kI first, then kP, then kD",
"Raise kP until it just starts to oscillate, add kD to damp it, and use feedforward (not kI) for leftover steady-state error",
"Set all three gains equal and adjust together",
"Tune kD first, then kP, then kI"
],
correct: 1,
explanation: "Start kP low and raise it until slight oscillation, add kD to damp the oscillation, and fix any steady-state error with feedforward rather than kI. One term at a time."
},
{
prompt: "Why don't we redeploy code for every gain change while tuning?",
options: [
"Redeploying is impossible on the competition field",
"It's far too slow; instead we change gains live in test mode (LoggedTunableNumber + Toggles.tuningMode) and the new values are pushed to Slot0 on the TalonFX",
"Gains can only be changed once per match",
"Redeploying erases the SysId results"
],
correct: 1,
explanation: "Rebuilding for each tweak is painfully slow. We use LoggedTunableNumber in tuning mode so dragging a value live calls io.setPID(...), which writes straight to the motor's Slot0 config — no redeploy."
},
{
prompt: "Which tool do we use to view live plots of a signal vs. its setpoint and apply config changes to a TalonFX?",
options: ["AdvantageScope only", "Phoenix Tuner X", "recalc", "The Driver Station charts tab"],
correct: 1,
explanation: "Phoenix Tuner X (CTRE's utility) is where you check IDs, plot signals against setpoints to see overshoot/oscillation, and apply Slot config changes while tuning."
},
{
prompt: "For a velocity loop like the flywheel, which gain is usually unnecessary?",
options: ["kP", "kV feedforward", "kD", "kS"],
correct: 2,
explanation: "Velocity loops rarely ring, so kD is usually unneeded — the flywheel runs kD = 0. kV feedforward plus a little kP carries the load. Save kD for position mechanisms."
},
{
prompt: "A position mechanism settles slightly below its target and just stays there. What's the right first move on 2601?",
options: [
"Crank up kI until it closes the gap",
"Add/raise feedforward (kS, and kG if gravity is involved) to supply the holding push — reach for kI only as a last resort",
"Increase kD",
"Lower kP to zero"
],
correct: 1,
explanation: "Steady-state error usually means un-modeled holding force. Our doctrine is feedforward first (kS/kG), kI only as a last resort because of windup risk."
}
]} />

---

**Previous:** [Motion Profiles](./motion-profiles) · **Next:** [Choosing a Control Method](./choosing-a-control-method) — the capstone: a decision tree that takes any mechanism to the right control method and the right place to run it.

*Section path: Calculus Basics → What is PID → Feedforward → Motion Profiles → **Tuning PID** → Choosing a Control Method.*
