---
sidebar_position: 1
---

# Introduction to Utility Classes

By now you've learned about subsystems, commands, swerve, and vision &rarr; the core pieces that make the robot move and see. But if you look closely at our codebase, you'll notice a folder that doesn't fit neatly into any of those categories: `org.steelhawks.util`.

This is our **utility package**, and it's full of small, focused classes that don't control a motor or represent a mechanism on their own. Instead, they solve small, recurring problems &rarr; math conversions, tunable numbers, alliance flipping, logging helpers &rarr; that show up over and over again throughout the rest of the codebase. Every subsystem you write leans on at least a few of these classes, whether you realize it or not.

---

## What You'll Learn

### Why Utility Classes Exist

You'll learn the philosophy behind pulling logic out of subsystems and into standalone, reusable classes. Good utility classes are usually `static`, stateless (or carefully manage the little state they have), and named for exactly the one job they do. We'll talk about why this matters for readability, testing, and not repeating yourself across dozens of subsystem files.

### The Util Classes In Our Codebase

We'll walk through each utility class in `Rebuilt2026`, grouped by what they're used for:

**Math & Geometry**
- `Maths` &rarr; angle wrapping, unit conversions (rotations ↔ meters, RPS ↔ MPS), and `Translation`/`Pose` ↔ `Vector` conversions used with our dyn4j physics helpers.
- `AllianceFlip` &rarr; mirrors poses, translations, and rotations across the field so autonomous routines and vision targets work identically on Red and Blue alliance.
- `geometry/RobotFootprint` and `geometry/Boundary` &rarr; model the robot's physical footprint (bumpers plus extending mechanisms like an intake) and let you build `Trigger`s that fire when the robot enters a zone on the field, like the stage or reef.
- `AprilTag` &rarr; a small record pairing a tag ID with its `Pose3d` from the field layout.

**Tuning & Dashboard**
- `TunableNumber` and `LoggedTunableNumber` &rarr; let you tweak PID gains and constants live from the dashboard without redeploying code, and fall back to hardcoded defaults outside of tuning mode.
- `Elastic` &rarr; sends notifications and switches tabs on our Elastic dashboard over NetworkTables.
- `FeedforwardCharacterize` &rarr; runs a mechanism through a series of voltages to help calculate `kV` for feedforward control.

**Hardware Helpers**
- `SparkUtil` &rarr; safely reads values from REV Spark motor controllers, only accepting a value if the last hardware call succeeded, and tracking sticky faults otherwise.
- `PhoenixUtil` &rarr; the CTRS Phoenix 6 equivalent, handling retryable hardware calls and batching `BaseStatusSignal` refreshes per CAN bus for efficiency.
- `LimelightHelpers` &rarr; the (mostly vendor-provided) library we use to pull AprilTag pose estimates, raw fiducials, and IMU data off our Limelight cameras over NetworkTables.

**Control & Feedforward**
- `SwerveDriveController` &rarr; combines three `PIDController`s (x, y, theta) into a single controller that outputs field-relative `ChassisSpeeds` for driving to a pose.
- `ArmDriveFeedforward` &rarr; compensates an arm's feedforward voltage for acceleration caused by the robot's own driving.
- `LocalADStarAK` &rarr; wraps PathPlanner's pathfinder so it plays nicely with AdvantageKit's log-replay system.

**Timing, Logging & Robot State**
- `LoopTimeUtil` &rarr; measures and logs how long each subsystem's periodic code takes, so we can catch loop overruns.
- `BatteryUtil` &rarr; integrates current draw over time to log amp-hours and watt-hours used during a match.
- `VirtualSubsystem` &rarr; lets you run periodic logic outside the normal `SubsystemBase`/`CommandScheduler` flow, and automatically warns you if any of it takes longer than 20ms.
- `LatchedBoolean` and `DoublePressTrigger` &rarr; small triggers for detecting a rising edge exactly once, or a double button press within a debounce window.
- `DashboardTrigger` &rarr; a Kotlin `Trigger` that reads a boolean straight off a "controls" NetworkTables entry, handy for debugging or driver-station toggles.


### How To Use Them In Your Own Code

You won't just read about these classes &rarr; you'll see real examples of them being used inside our subsystems, and you'll get practice reaching for the right utility class instead of rewriting the same math or hardware-safety logic yourself.

---

## Why This Matters

Utility classes are what keep a large codebase like ours maintainable. Instead of copy-pasting the same angle-wrapping math or the same "did this Spark call actually succeed" check into every subsystem, we write it once, test it once, and reuse it everywhere.

As you go through the rest of this section, keep an eye out for a simple rule: **if you find yourself writing the same helper logic in multiple subsystems, it probably belongs in `util` instead.**

## Next Steps

When you're ready, move on to the next page to start digging into these classes in more detail.
