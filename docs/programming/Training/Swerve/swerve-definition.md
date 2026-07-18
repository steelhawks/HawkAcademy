---
sidebar_position: 2
title: What is Swerve Drive?
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import JavaRunner from '@site/src/components/JavaRunner'
import CadRenderer from '@site/src/components/Visualizer/CadRenderer'

# What is Swerve Drive?

Before diving into swerve drive specifically, it helps to understand **drivetrains** in general — what they are and why the choice matters so much in robotics.

## What is a Drivetrain?

A **drivetrain** is the system of motors, wheels, and mechanical components that moves your robot around the field. It's one of the most important decisions a robotics team makes each season, because it directly affects:

- How fast the robot can move
- How precisely it can position itself
- How much pushing force it can exert
- How complex it is to build and program

Different drivetrains make different tradeoffs between speed, maneuverability, mechanical simplicity, and cost.

---

## Common Types of Drivetrains

### Tank Drive (Differential Drive)

Tank drive is the simplest and most common drivetrain in FRC. It uses two sets of wheels — one on the left side and one on the right side — each powered independently.

**How it works:**
- Both left wheels spin at the same speed
- Both right wheels spin at the same speed
- To turn, you spin one side faster than the other (or spin them in opposite directions)

**Pros:**
- Very simple to build and program
- Extremely durable and reliable
- Great pushing power — good for defense-heavy robots
- Cheap

**Cons:**
- Can only drive forward/backward and turn — **no strafing**
- To face a different direction, you must physically rotate the robot
- Slow to reorient, which costs time in matches

<Note title="Real-world analogy">
Think of a bulldozer or a tank — they steer by slowing down or reversing one set of treads while the other keeps going. That's exactly how tank drive works.
</Note>

---

### Mecanum Drive

Mecanum drive uses four special wheels with rollers mounted at a **45° angle** around the rim. By spinning each wheel at different speeds and directions, the robot can move in any direction — including sideways — without rotating.

**How it works:**
- Each wheel has diagonal rollers that redirect force at an angle
- Combining the forces from all four wheels lets the robot move in any 2D direction
- The math is more complex but the mechanical setup is straightforward

**Pros:**
- Can strafe (move sideways) without rotating
- Simpler to build than swerve
- Holonomic — can move in any direction

**Cons:**
- Significantly **less traction** than other drivetrains — the diagonal rollers reduce grip
- Much weaker under defense (easy to push around)
- Loses efficiency when strafing — the angled rollers waste a lot of power
- Wheels are expensive and wear out faster

---

###  Swerve Drive

Swerve drive is the most advanced and capable drivetrain used in FRC. Unlike the drivetrains above, **each wheel can rotate 360° independently**, meaning the robot can point each wheel in any direction at any time.

This is covered in full detail below.

## What is Swerve Drive?

A swerve drivetrain is made up of **4 swerve modules**, one at each corner of the robot. Each module contains:

1. **A drive motor** — spins the wheel to move the robot
2. **A steering motor** — rotates the entire wheel assembly to point in any direction
3. **An encoder** — tells the program exactly which direction the wheel is facing

Because each module steers independently, the robot can:
- Drive in **any direction** without rotating
- **Rotate** while simultaneously moving in any direction
- **Hold its orientation** while strafing — unlike mecanum, it doesn't lose power doing so

<Note title="New term: holonomic">
A drivetrain is <strong>holonomic</strong> when it can move in any direction on the field regardless of which way it's currently facing. Mecanum and swerve are both holonomic; tank drive is not — it can only move along the direction it's pointed.
</Note>

---

### How the Modules Work Together

The four modules are coordinated by a control algorithm called **inverse kinematics**. Given a desired direction, speed, and rotation rate from the driver's joysticks, the algorithm calculates the exact angle and speed each individual wheel needs to be set to.

For example:
- **Drive forward:** all 4 wheels point straight ahead and spin
- **Strafe left:** all 4 wheels point 90° left and spin
- **Rotate in place:** each wheel points tangentially around the robot's center and spins
- **Drive forward while rotating:** each wheel gets a unique angle that combines both movements

This happens dozens of times per second, allowing extremely fluid and precise movement.

---

## Why Swerve Over Other Drivetrains?

| Feature | Tank Drive | Mecanum Drive | Swerve Drive |
|---|---|---|---|
| Move in any direction | ❌ | ✅ | ✅ |
| Strong traction / defense resistance | ✅ | ❌ | ✅ |
| Rotate while translating | ❌ | ✅ | ✅ |
| Efficient power transfer | ✅ | ❌ | ✅ |
| Mechanical simplicity | ✅ | ✅ | ❌ |
| Programming complexity | Low | Medium | High |
| Cost | Low | Medium | High |

Swerve is the only drivetrain that combines **full holonomic movement** (any direction, any rotation) with **strong traction**. Mecanum can also move in any direction, but the angled rollers bleed power and provide very little grip — a robot can easily shove a mecanum-drive robot off course. Swerve wheels are just regular traction wheels, so they grip the carpet firmly.

In modern FRC, swerve drive has become the competitive standard because the game designs increasingly reward precise positioning and quick reorientation. The ability to face your shooter or intake in one direction while driving in a completely different direction is a massive strategic advantage.

---

### The Tradeoffs

Swerve isn't perfect — it comes with real costs:

- **Complexity:** 8 motors (2 per module × 4 modules) vs. 4 for tank or mecanum. That's more wiring, more code, more things that can break.
- **Cost:** A full set of swerve modules can cost $1,000–$2,000, compared to ~$200 for a tank drive kit.
- **Programming:** The inverse kinematics, odometry, and auto-alignment logic is significantly more involved than other drivetrains.
- **Maintenance:** Steering gears and encoders need to be properly calibrated. If a module loses its zero position, the whole drivetrain behaves incorrectly.

For a team that has the resources and technical depth to support it — like Steel Hawks — swerve drive is absolutely worth those tradeoffs.

---

## Here's a render of a swerve module

In this example of a swerve drive, you can see:
- 2 motors
- wheels
- the whole drivetrain
- Chassis

<Note title="Chassis vs Drivetrain">
A chassis is skeleton of the drivetrain, essentially all the metal and mechanical pieces to it, while the drivetrain is everything from the chassis to the motors and wheels.
</Note>

<CadRenderer
  src="/other/swerve.glb"
  name="Swerve Module"f
  height="480px"
  upAxis="z"
/>
>This is <strong>NOT</strong> the Steel Hawks swerve drive, but it is a good example of what a swerve drive looks like online

<Quiz questions={[
{
prompt: "What is the main limitation of tank drive?",
options: [
"It can't strafe — to face a new direction, the whole robot has to physically rotate",
"It can't push other robots",
"It requires 8 motors",
"It has no traction"
],
correct: 0,
explanation: "Tank drive can only move along the direction it's pointing. To change direction, you have to rotate the entire robot, which costs time."
},
{
prompt: "Why does mecanum drive have worse traction than tank or swerve?",
options: [
"Mecanum wheels are smaller",
"Mecanum robots are always heavier",
"The wheels are made of a slippery material",
"The 45° diagonal rollers redirect force at an angle instead of gripping straight ahead, reducing overall grip"
],
correct: 3,
explanation: "Mecanum wheels use angled rollers to enable strafing, but those same rollers reduce the contact patch and grip compared to a normal traction wheel, making mecanum robots easy to push around."
},
{
prompt: "What are the three main components inside a single swerve module?",
options: [
"Two drive motors and a gearbox",
"A battery, a radio, and a Systemcore",
"A drive motor, a steering motor, and an encoder",
"Four wheels and a chain"
],
correct: 2,
explanation: "Each swerve module has a drive motor (spins the wheel), a steering motor (rotates the wheel's direction), and an encoder (reports the wheel's current angle)."
},
{
prompt: "What algorithm coordinates the four swerve modules to produce a desired robot motion?",
options: [
"PID control",
"Motion profiling",
"Feedforward",
"Inverse kinematics"
],
correct: 3,
explanation: "Inverse kinematics takes a desired robot direction, speed, and rotation rate and calculates the exact angle and speed for each of the four independent modules."
},
{
prompt: "What makes swerve drive holonomic while still keeping strong traction, unlike mecanum?",
options: [
"Swerve uses lighter wheels",
"Swerve doesn't actually have strong traction",
"Swerve wheels are regular traction wheels that physically rotate to point any direction, instead of relying on angled rollers",
"Swerve only has 2 motors per module"
],
correct: 2,
explanation: "Because each swerve wheel itself rotates to face the desired direction, the wheel can stay a normal, high-traction wheel — it doesn't need angled rollers like mecanum to move sideways."
}
]} />

## Summary

- **Tank drive** is simple and sturdy but can't strafe and must rotate to change direction.
- **Mecanum drive** can strafe but sacrifices traction and efficiency.
- **Swerve drive** combines full holonomic movement with strong traction, at the cost of mechanical and software complexity.
- Each swerve module has an independent drive motor and steering motor, allowing the wheel to point in any direction.
- A control algorithm called inverse kinematics coordinates all four modules to produce any desired robot motion.
