---
sidebar_position: 2
title: What is Vision?
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# What is Vision?

Vision in FRC® uses one or more cameras mounted on the robot to help it "see" the field — reading AprilTags, tracking game pieces, and reporting that information back to your code. It's used during both the autonomous and teleoperated periods, and it's one of the biggest levers a team has for improving scoring consistency and driver confidence.

---

## Why Vision Matters

A robot that only relies on encoders and a gyro slowly drifts — small errors build up over the course of a match until the robot's internal idea of "where am I" no longer matches reality. Vision fixes this by giving the robot external, ground-truth reference points to correct against. Depending on how it's used, vision can affect:

- How accurately the robot can align to a scoring location
- How reliable autonomous routines are, match after match
- How much of the scoring workload can be automated instead of resting entirely on driver skill
- How quickly the robot can recover if it gets bumped or its odometry starts to drift

---

## Types of Vision

### Streaming

Streaming sends the camera feed straight to the Driver Station so the driver and manipulator can see what the robot sees.

**How it works:**
- The camera captures frames and sends them over the network to the Driver Station
- No processing happens onboard — it's just a live video feed

**Pros:**
- Very simple and fast to set up
- Gives the drive team useful visual context (e.g. lining up a shot, seeing under the robot)

**Cons:**
- Provides no numerical data your code can act on
- Doesn't help autonomous at all, since there's no driver watching

---

### Processing

Processing goes a step further: instead of just showing the frames, a program analyzes them to extract numbers your code can use — like a target's angle and distance from the camera.

**How it works:**
- Each frame is analyzed to detect a target, like an AprilTag
- The result (angle, distance, ID, etc.) is published so your robot code can read it, typically over NetworkTables

**Pros:**
- Enables autonomous alignment and "auto-scoring" assists during teleop
- Can run continuously in the background without driver input

**Cons:**
- More technically demanding to set up and tune
- Computationally expensive — running it directly on the roboRIO can cause loop overruns

<Note title="New term: coprocessor">
A <strong>coprocessor</strong> is a second onboard computer — separate from the roboRIO — dedicated to running vision processing. Offloading this work to something like a Raspberry Pi or Orange Pi keeps the roboRIO's CPU free for the rest of your robot code, avoiding loop overruns.
</Note>

---

### Object Detection

Object detection uses a trained neural network model to recognize specific objects — like game pieces — in the camera frame, instead of relying on a fixed marker like an AprilTag.

**How it works:**
- A model trained to recognize specific object classes scans each frame for matches
- The coprocessor reports the angle to each detected object, which can be combined with the camera's known mounting height and angle to estimate distance

**Pros:**
- Lets the robot find and track game pieces without a human aiming
- Combined with your robot's field position (from AprilTags + swerve odometry), the robot can know exactly where objects are located on the field

**Cons:**
- Requires a coprocessor with dedicated neural-network hardware (an NPU) — not every coprocessor supports it
- Only recognizes whatever classes the model was trained on

---

## Comparing the Three

| Feature                    | Streaming | Processing  | Object Detection |
|----------------------------|-----------|-------------|------------------|
| Gives code usable data     | ❌         | ✅           | ✅                |
| Helps autonomous           | ❌         | ✅           | ✅                |
| Setup difficulty           | Low       | Medium      | High             |
| Computational cost         | Low       | Medium      | High             |
| Needs specialized hardware | ❌         | Recommended | ✅ Required (NPU) |

In this section, we will only focus on AprilTag Processing.

---

## How Does AprilTag Processing Work?

We use **PhotonVision**, a free, open-source vision processing tool built for FRC, to detect **AprilTags** — a common type of visual fiducial marker.

<Note title="New term: fiducial marker">
A <strong>fiducial marker</strong> is an artificial landmark added to a scene to make "localization" (finding your current position) possible from an image. AprilTags are similar to QR codes in that they encode information, but each one only encodes a single ID number rather than arbitrary data.
</Note>

After detecting a tag, PhotonVision doesn't just measure distance — it uses an algorithm called **SolvePnP** to calculate the tag's full 3D position *and* orientation relative to the camera. Since we already know exactly where every AprilTag is bolted down on the field ahead of time (from a provided field layout), PhotonVision can work backward: "here's where the tag is relative to my camera" becomes "here's where my camera — and therefore my robot — is on the field." This process is called **pose estimation**, and it's the core of how vision helps localize the robot.

<Note title="Getting more accurate: MultiTag">
When more than one AprilTag is visible at once, PhotonVision can combine all of them into a single, more accurate pose estimate — a feature called <strong>MultiTag</strong>. More visible tags generally means a more reliable position estimate.
</Note>

---

## Limitations

Vision isn't perfect, and it's important to understand where it can let you down:

- **Requires line of sight.** A partially blocked tag usually isn't detected at all, rather than just being detected less accurately.
- **Accuracy drops off** the farther away a tag is, or the more extreme the viewing angle.
- **Latency.** There's a delay between when a frame is captured and when the coprocessor finishes processing it.
- **Discrete updates.** Vision only reports a new position when a frame finishes processing — unlike a gyro or encoder, it isn't updating continuously.

Because of these limitations, vision alone is unreliable during a fast-paced, chaotic match. That's why we fuse vision data with swerve odometry: vision corrects for long-term drift, while swerve odometry fills in the gaps between vision updates with smooth, continuous, high-frequency data. Combined, they're far more reliable than either one alone — this kind of fusion pipeline is exactly what gives a team like Steel Hawks the positioning accuracy needed for consistent auto-scoring.

<Quiz questions={[
{
prompt: "What's the main limitation of streaming vision to the Driver Station?",
options: [
"It requires a coprocessor",
"It gives your code no usable data — it's just a live video feed",
"It can't run during teleop",
"It requires a trained neural network"
],
correct: 1,
explanation: "Streaming only shows raw video for the humans to look at. Since nothing is analyzed, your robot code has no numbers to act on."
},
{
prompt: "Why is it recommended to run vision processing on a coprocessor instead of directly on the roboRIO?",
options: [
"The roboRIO doesn't have a camera port",
"Coprocessors are required by FRC rules",
"Vision processing is computationally expensive and can cause the roboRIO's loop to overrun",
"The roboRIO can't connect to a network"
],
correct: 2,
explanation: "Vision processing eats a lot of CPU time. Running it on the roboRIO competes with the rest of your robot code and can cause loop overruns, so it's offloaded to a coprocessor like a Raspberry Pi or Orange Pi."
},
{
prompt: "What does a single AprilTag actually encode, compared to a QR code?",
options: [
"A full webpage URL",
"Just a single ID number",
"The robot's current position",
"A 3D model of the tag"
],
correct: 1,
explanation: "Unlike a QR code, which can hold arbitrary data, an AprilTag only encodes one ID number. The tag's real-world position comes from a separate field layout, not the tag itself."
},
{
prompt: "What algorithm does PhotonVision use to calculate a tag's full 3D position and orientation?",
options: [
"Kalman filter",
"Inverse kinematics",
"SolvePnP",
"A* pathfinding"
],
correct: 2,
explanation: "SolvePnP (Perspective-n-Point) takes the tag's known corner geometry and its position in the camera image to solve for the camera's full 3D position and orientation relative to the tag."
},
{
prompt: "Why do we combine vision data with swerve odometry instead of using either alone?",
options: [
"Vision updates too fast and needs to be slowed down",
"Swerve odometry alone is already perfectly accurate",
"Vision corrects long-term drift, while odometry fills the gaps between vision updates with continuous data",
"Swerve odometry doesn't work without vision"
],
correct: 2,
explanation: "Vision gives accurate, drift-free position fixes but only updates occasionally and can be blocked. Swerve odometry updates continuously but slowly drifts. Together they cover each other's weaknesses."
}
]} />

## Summary

- **Streaming** sends raw video to the Driver Station for humans to see. **Processing** extracts usable numbers from the frames. **Object Detection** recognizes specific trained objects, like game pieces.
- We use PhotonVision to detect AprilTags, a fiducial marker that encodes a single ID number rather than arbitrary data.
- PhotonVision uses SolvePnP to calculate a tag's full 3D position *and* orientation, not just its distance — this is what makes robot pose estimation possible.
- Vision has real limitations — line of sight, distance, latency, and discrete updates — so we fuse it with swerve odometry for reliable, continuous positioning.