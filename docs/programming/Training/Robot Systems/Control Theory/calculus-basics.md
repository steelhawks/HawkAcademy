---
sidebar_position: 1
title: Calculus Basics
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Calculus Basics

Welcome to **Control Theory** — the part of the curriculum that teaches the robot how to *move on purpose*: go to a position smoothly, hold a speed, point itself at a target. Everything in this section is built on two ideas from calculus, so we start here.

**Don't panic.** This is not a math class. You will not take a limit, you will not memorize the power rule, and you will never integrate anything by hand — WPILib and the motor controllers do all the real calculus for us. You just need the *intuition* behind two words so the equations on the next pages don't look like hieroglyphics:

1. **Derivative** — how fast something is changing *right now*.
2. **Integral** — the running total of something *added up over time*.

That's the whole page. Let's make both feel obvious.

## Derivative = rate of change (the slope right now)

A **derivative** answers the question: *"how fast is this value changing at this instant?"*

You already have the intuition. When you're driving and the speedometer reads 30 mph, that number *is* a derivative — it's how fast your **position** is changing right now. Step on the gas and your **speed** starts changing; how fast *that* changes is another derivative, called acceleration.

So motion is just one quantity, derived over and over:

$$\text{position} \xrightarrow{\;\frac{d}{dt}\;} \text{velocity} \xrightarrow{\;\frac{d}{dt}\;} \text{acceleration} \xrightarrow{\;\frac{d}{dt}\;} \text{jerk}$$

Each arrow means "take the derivative" — *how fast is the thing before me changing?* Read it left to right:

- **Velocity** is the rate of change of **position** (how fast you're moving).
- **Acceleration** is the rate of change of **velocity** (how fast your speed is changing).
- **Jerk** is the rate of change of **acceleration** (how *abruptly* the push changes — the lurch you feel when a car brakes unevenly).

<Note title="The d/dt symbol">
$\frac{d}{dt}$ just means "the rate of change with respect to time." When you see it, read it out loud as <em>"how fast this changes per second."</em> It is not a fraction you divide — it's one symbol meaning "take the derivative."
</Note>

### Why you care
The whole spine of this section is that chain. **Motion profiles** (page 4) are built by stacking velocity, acceleration, and jerk limits. The **D term** in PID (page 2) is literally a derivative — it watches how fast the error is changing. If you understand "derivative = rate of change," you already understand *why* those tools exist.

## Integral = accumulation (the running total)

An **integral** is the opposite move. Instead of "how fast is it changing," it asks: *"if I add this up over time, what's the total?"*

Back to the car. If you drive at 30 mph for 2 hours, how far did you go? You **accumulated** distance: $30 \times 2 = 60$ miles. You just integrated velocity to get position. Add up (accumulate) velocity over time and you get distance traveled.

$$\text{velocity, accumulated over time} \;=\; \text{distance}$$

That's it — an integral is a running total, the **area under the curve** when you graph the value against time.

<Note title="Plant this seed for later: odometry">
Knowing where the robot is on the field — called <strong>odometry</strong> — works exactly this way. The robot reads its wheel velocities every loop and <em>accumulates</em> them over time to estimate how far and where it has moved. Odometry is an integral. You'll meet it again outside this section, but now you know what it's doing.
</Note>

### Why you care
The **I term** in PID (the next page) is an integral — it accumulates *error* over time. Understanding "integral = running total" is all you need to understand what that term does (and why we're careful with it).

## Dot notation (so the equations read cleanly)

The feedforward equations on page 3 are written with **dots over letters**. A dot is just a shorthand for "the time-derivative of." If $d$ is a distance (position), then:

- $\dot{d}$ (read "d-dot") $=$ velocity — the first derivative of position.
- $\ddot{d}$ (read "d-double-dot") $=$ acceleration — the second derivative.
- $\dddot{d}$ (read "d-triple-dot") $=$ jerk — the third derivative.

So when you see $K_v\,\dot{d}$ later, your brain should read *"some constant times velocity."* That's all the dots mean. Same chain as before, just compressed:

$$d \;\xrightarrow{\frac{d}{dt}}\; \dot{d} \;\xrightarrow{\frac{d}{dt}}\; \ddot{d} \;\xrightarrow{\frac{d}{dt}}\; \dddot{d}$$

## Run it: integral = sum, derivative = difference

Here's the part that makes it click. Computers don't do "real" calculus — they take a measurement every loop (every 20 ms on our robot) and approximate:

- To **integrate** (accumulate), they **add up** small pieces: `total += value * dt`.
- To **differentiate** (find the rate), they take a **difference**: `(now − before) / dt`.

The program below drives a pretend robot at a constant **2 m/s**. Each step it (1) *integrates* velocity to track position, and (2) *differentiates* the position back to recover velocity. Press **▶ Run** and watch: the accumulated position climbs by 0.04 m each 20 ms step, and the differenced velocity comes back out as 2 m/s. Try changing `velocity` or `dt`.

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        double dt = 0.02;        // 20 ms loop, like our robot
        double velocity = 2.0;   // m/s - constant speed (try changing me)

        double position = 0.0;   // running total (the INTEGRAL of velocity)
        double prevPosition = 0.0;

        System.out.println("step |  position (integral) | velocity (derivative)");
        for (int step = 1; step <= 5; step++) {
            // INTEGRAL: accumulate velocity over time -> position
            position += velocity * dt;

            // DERIVATIVE: difference of position over time -> velocity
            double measuredVelocity = (position - prevPosition) / dt;
            prevPosition = position;

            System.out.printf("  %d  |        %.3f m       |     %.2f m/s%n",
                step, position, measuredVelocity);
        }
        System.out.println();
        System.out.println("Integral added it up; derivative recovered the rate.");
    }
}`}
/>

Notice you never needed a single calculus rule — just **add** for an integral and **subtract** for a derivative. That's exactly how the robot does it 50 times a second.

## The payoff

Hold onto this one sentence, because the rest of the section leans on it:

> **Every term in the PID equation and every feedforward constant is one of these two ideas** — a derivative (a rate of change) or an integral (a running total). Nothing more complex is coming.

<Quiz questions={[
{
prompt: "What does a derivative tell you?",
options: [
"The running total of a value added up over time",
"How fast a value is changing right now (its rate of change)",
"The largest value a quantity will ever reach",
"The average of all past values"
],
correct: 1,
explanation: "A derivative is an instantaneous rate of change — the slope right now. Velocity is the derivative of position; acceleration is the derivative of velocity."
},
{
prompt: "Take the derivative of position three times in a row. What do you get?",
options: [
"Position, velocity, distance",
"Velocity, then acceleration, then jerk",
"Three copies of velocity",
"The integral of velocity"
],
correct: 1,
explanation: "position → (d/dt) velocity → (d/dt) acceleration → (d/dt) jerk. Each derivative asks how fast the previous quantity is changing."
},
{
prompt: "A robot wheel reports its velocity every loop. You add up (accumulate) those velocities over time. What are you computing, and what is it an example of?",
options: [
"Acceleration — an example of a derivative",
"Distance traveled — an example of an integral (this is how odometry works)",
"Jerk — an example of a derivative",
"Error — an example of the P term"
],
correct: 1,
explanation: "Accumulating velocity over time gives distance. That running total is an integral, and it's exactly how odometry estimates the robot's position on the field."
},
{
prompt: "What does the dot over a letter mean — for example, d-dot (written d with a dot above it)?",
options: [
"Multiply d by 10",
"The time-derivative of d — here, velocity",
"The integral of d",
"d measured in degrees"
],
correct: 1,
explanation: "A dot means 'the time-derivative of.' So d-dot is velocity, d-double-dot is acceleration, and d-triple-dot is jerk."
},
{
prompt: "On the robot, how does code actually approximate an integral each loop?",
options: [
"It solves the integral symbolically with the power rule",
"It adds a small piece each loop: total += value * dt",
"It divides the value by the loop time",
"It takes the difference between two values"
],
correct: 1,
explanation: "Computers integrate by accumulating (total += value * dt) and differentiate by taking a difference ((now − before) / dt). No symbolic calculus required."
}
]} />

---

**Next:** [What is PID](./what-is-pid) — your first real controller, built entirely from the derivative and integral you just met.

*Section path: **Calculus Basics** → What is PID → Feedforward → Motion Profiles → Tuning PID → Choosing a Control Method.*
