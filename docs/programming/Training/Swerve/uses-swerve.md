---
sidebar_position: 5
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Where Do We Use Swerve

Now you know how to program swerve and how to tune swerve!

*But where do we actually use swerve?*

The `Swerve` subsystem isn't just a "drive the robot" class &rarr; almost every other subsystem eventually asks it a question: *"where am I?"*, *"how fast am I moving?"*, or *"take me here."* In this section we'll walk through every place in **Rebuilt2026** (our 2026 competition codebase) that touches `Swerve`, and then zoom out to general rules you can apply to **any** FRC codebase, regardless of the game.

---

## 1. RobotContainer: Wiring Swerve Into the Robot

`RobotContainer` is where the singleton `s_Swerve` instance is created and handed its **default command**:

```java
public static Swerve s_Swerve = null;

public RobotContainer() {
    s_Swerve = config.createSwerve();
    // ...
    s_Swerve.setDefaultCommand(
        new TeleopSwerve(
            s_Swerve,
            () -> -driver.getLeftY(),
            () -> -driver.getLeftX(),
            () -> -driver.getRightX()));
}
```

This is the **first and most fundamental use** of swerve: giving the driver manual control whenever no other command is requesting the subsystem. Every other use of `Swerve` in the codebase is a command that **temporarily takes over** from this default (pathfinding, alignment, characterization) and then gives control back.

<Note title="Why a default command?">
WPILib's command-based framework runs exactly one command per subsystem at a time. By setting `TeleopSwerve` as the *default*, the driver always has control unless something more specific (like `SwerveDriveAlignment`) explicitly requires the `Swerve` subsystem and interrupts it.
</Note>

---

## 2. TeleopSwerve:  Turning Joysticks Into Motion

`TeleopSwerve` is the default command mentioned above, and it's the most frequently executed piece of swerve-consuming code (it runs every 20ms during teleop). It reads three swerve getters every loop:

```java
double speedMult = s_Swerve.getSpeedMultiplier();
Translation2d desiredMps = new Translation2d(
    linearVelocity.getX() * s_Swerve.getMaxLinearSpeedMetersPerSec() * speedMult,
    linearVelocity.getY() * s_Swerve.getMaxLinearSpeedMetersPerSec() * speedMult);

double finalOmega =
    MathUtil.applyDeadband(omega, Constants.Deadbands.ANGLE_DEADBAND)
        * s_Swerve.getMaxAngularSpeedRadPerSec()
        * speedMult;

s_Swerve.runVelocity(ChassisSpeeds.fromFieldRelativeSpeeds(fieldRel, driveYaw));
```

Notice the pattern: **read robot capability constants** (`getMaxLinearSpeedMetersPerSec`, `getMaxAngularSpeedRadPerSec`, `getSpeedMultiplier`) to scale a normalized joystick input, then hand the final result to `runVelocity` &rarr; the single entry point for commanding motion. `TeleopSwerve` never touches individual modules or motors directly.

It also calls `s_Swerve.stopWithX()` and `s_Swerve.stop()` in special cases:

```java
if (DriverStation.isAutonomous()) {
    s_Swerve.stopWithX(); // lock wheels if teleop's default command somehow runs during auton
}
```

```java
@Override
public void end(boolean interrupted) {
    s_Swerve.stop(); // always release cleanly when interrupted
}
```

---

## 3. DriveCommands:  Autonomous Movement Helpers

`DriveCommands` is a factory class (no instances, only static methods) that wraps **PathPlanner** pathfinding calls around swerve state:

```java
public static Command driveToPosition(Pose2d target, PathConstraints constraints, BooleanSupplier emergencyStop) {
    return AutoBuilder.pathfindToPose(target, constraints)
        .onlyWhile(() -> s_Swerve.shouldContinuePathfinding(emergencyStop))
        .beforeStarting(() -> s_Swerve.setPathfinding(true))
        .finallyDo(() -> s_Swerve.setPathfinding(false))
        .withName("Drive to Position");
}
```

Here `s_Swerve.setPathfinding(true/false)` is a **state flag**, not a motion command &rarr; it just tells the rest of the robot code "I am currently driving to a point autonomously" so other systems (like LEDs or driver feedback) can react. The actual driving is handled entirely by PathPlanner's `AutoBuilder`, which was configured back in `Swerve`'s constructor to call `runVelocity` under the hood.

This file also contains the **characterization routines**:

```java
public static Command feedforwardCharacterization(Swerve drive) {
    // ...
    drive.runDriveCharacterization(voltage);
    velocitySamples.add(drive.getFFCharacterizationVelocity());
}
```

```java
public static Command wheelRadiusCharacterization(Swerve drive) {
    drive.runVelocity(new ChassisSpeeds(0.0, 0.0, speed));
    // ...
    double[] positions = drive.getWheelRadiusCharacterizationPositions();
}
```

These are one-time, offline routines (see the tuning section) &rarr; you run them once per robot, save the resulting constants, and never touch them again during a match.

---

## 4. Autos: Following Trajectories

`Autos.java` wires `Swerve` directly into the **Choreo** trajectory follower:

```java
private static final AutoFactory factory =
    new AutoFactory(
        RobotState.getInstance()::getEstimatedPose,
        s_Swerve::setPose,
        s_Swerve::followTrajectory,
        true,
        s_Swerve,
        /* ... */);
```

`s_Swerve::followTrajectory` is passed as a **method reference** &rarr; Choreo calls it every loop with the next sample point along the path, and internally it runs:

```java
public void followTrajectory(SwerveSample sample) {
    var speeds = autonController.getOutput(robot, nextSetpoint)
        .plus(new ChassisSpeeds(sample.vx, sample.vy, sample.omega));
    runVelocity(speeds);
}
```

This combines **feedback** (a PID controller correcting for position error, via `autonController`) with **feedforward** (the trajectory's own planned velocity) &rarr; a pattern you'll see everywhere in FRC motion control, not just swerve.

`Autos` also uses `s_Swerve::setPose` to tell the odometry system "the trajectory says the robot should be exactly *here* at the start," and `Commands.runOnce(RobotContainer.s_Swerve::stopWithX)` at the end of nearly every auto routine, so the robot doesn't drift after the last path finishes.

---

## 5. SwerveDriveAlignment: Precision Positioning

`SwerveDriveAlignment` is a reusable command (other alignment commands extend it) that drives the robot to an exact `Pose2d`, used for things like lining up against a scoring location:

```java
protected ChassisSpeeds getOutput() {
    ChassisSpeeds robotRelativeSpeeds = s_Swerve.getChassisSpeeds();
    APResult output = autopilot.calculate(currPose, robotRelativeSpeeds, target);
    return ChassisSpeeds.fromFieldRelativeSpeeds(vx, vy, omegaRadPerSec, currPose.getRotation());
}

@Override
public void execute() {
    s_Swerve.runVelocity(getOutput());
}

@Override
public void end(boolean interrupted) {
    s_Swerve.runVelocity(new ChassisSpeeds());
    s_Swerve.setPathfinding(false);
}
```

This shows two more swerve getters in action: `getChassisSpeeds()` is fed into the alignment library (Autopilot) so it can plan a **motion profile that accounts for the robot's current velocity**, not just its position &rarr; a stationary robot and one already moving at 2 m/s need very different outputs to arrive smoothly. And notice `end()` always sends a zero `ChassisSpeeds` &rarr; **every command that calls `runVelocity` must clean up after itself** when it ends, or the last commanded speed keeps running forever.

---

## 6. Feeding Other Subsystems: Shoot-on-the-Move

This is the most interesting category: subsystems that have **nothing to do with driving** still read from `Swerve` because the robot's motion affects their own physics.

### Turret: leading a moving target

```java
var chassisSpeeds =
    ChassisSpeeds.fromRobotRelativeSpeeds(
        RobotContainer.s_Swerve.getChassisSpeeds(),
        RobotState.getInstance().getRotation());
double omegaRobot = chassisSpeeds.omegaRadiansPerSecond;

double turretVx = chassisSpeeds.vxMetersPerSecond - omegaRobot * robotToTurret.getY();
double turretVy = chassisSpeeds.vyMetersPerSecond + omegaRobot * robotToTurret.getX();
```

If the robot is driving while trying to shoot ("shoot on the move"), the turret must aim ahead of where the target *would appear* if the robot were standing still &rarr; exactly like leading a moving target with a thrown ball. It gets the robot's current translational **and rotational** velocity straight from `Swerve.getChassisSpeeds()` to compute this lead angle.

### Flywheel: the same idea, for shot velocity

`Flywheel` reads `RobotContainer.s_Swerve.getChassisSpeeds()` for the same reason: the game piece already has some of the robot's velocity added to it when it leaves the shooter, so the required flywheel speed has to account for whether the robot is moving toward or away from the target.

### Vision: trusting sensors less when driving over bumps

```java
if (RobotContainer.s_Swerve.isOnBump()) {
    linearStdDev *= VisionConstants.baselineDropOdomFactor.get();
    angularStdDev *= VisionConstants.baselineDropOdomFactor.get();
}
```

`isOnBump()` reads the gyro's pitch/roll to detect a bump crossing. While bumping, camera images are blurrier and odometry is less reliable, so `Vision` widens its "standard deviation" (its way of saying "trust this measurement less") specifically because `Swerve` told it the robot is currently unstable.

### Intake: compensating for chassis acceleration

```java
double rawAccelY = RobotContainer.s_Swerve.getRobotRelativeYAccelGs();
double pitchRadians = RobotContainer.s_Swerve.getPitch().getRadians();
double drivetrainAccelG = rawAccelY - Math.sin(pitchRadians);
```

The intake mechanism uses the chassis's own measured acceleration (from the swerve's gyro) as a **feedforward term** in its own control loop, since a hard acceleration or deceleration of the whole robot physically pushes on anything mounted to it.

<Note title="The pattern to notice">
None of these subsystems know *how* swerve produces `getChassisSpeeds()`, `isOnBump()`, or `getPitch()` &rarr; they just ask for a value and use it. This is the same IO-layer style of abstraction used inside `Swerve` itself, just one level up: **the drivetrain is a service other subsystems consume, not something they need to understand internally.**
</Note>

---

## 7. RobotState:  Sharing Kinematics

`RobotState` (the pose estimator) doesn't hold a reference to the `Swerve` instance, but it does use its static geometry:

```java
new SwerveDriveKinematics(Objects.requireNonNull(Swerve.getModuleTranslations()));
```

`getModuleTranslations()` is `static` because the physical geometry of the robot (where the modules are mounted) doesn't depend on any particular `Swerve` instance &rarr; it's a property of the robot's frame. `RobotState` needs its own `SwerveDriveKinematics` object to run its pose estimation filter, so it asks `Swerve` for this geometry directly rather than duplicating the module positions.

---

## Summary Table

| Consumer | Swerve method(s) used | Why |
|---|---|---|
| `RobotContainer` | `setDefaultCommand` | Give the driver manual control by default |
| `TeleopSwerve` | `runVelocity`, `getMaxLinearSpeedMetersPerSec`, `getMaxAngularSpeedRadPerSec`, `getSpeedMultiplier`, `stop`, `stopWithX` | Turn joystick input into commanded motion |
| `DriveCommands` | `setPathfinding`, `shouldContinuePathfinding`, `runDriveCharacterization`, `getFFCharacterizationVelocity`, `getWheelRadiusCharacterizationPositions` | Autonomous pathfinding + one-time characterization |
| `Autos` | `setPose`, `followTrajectory`, `stopWithX` | Trajectory following during autonomous |
| `SwerveDriveAlignment` | `getChassisSpeeds`, `runVelocity`, `setPathfinding` | Precision point-to-point alignment |
| `Turret` / `Flywheel` | `getChassisSpeeds` | Shoot-on-the-move lead compensation |
| `Vision` | `isOnBump` | Trust sensors less during unstable driving |
| `Intake` | `getRobotRelativeYAccelGs`, `getPitch` | Chassis-acceleration feedforward |
| `RobotState` | `getModuleTranslations` (static) | Build its own kinematics object for pose estimation |

---

## General Rules: When (and When Not) to Reach Into Swerve

Everything above is specific to our 2026 robot and game, but the *reasoning* generalizes to any FRC season, any game, and any swerve codebase. Here are the rules of thumb:

### Rule 1 &rarr; If you're commanding motion, go through one method

Whether it's teleop, autonomous, pathfinding, or an alignment command, **every** path to moving the robot should end at a single method (in our codebase, `runVelocity(ChassisSpeeds)`). Never have a command reach past that method into individual modules or motors. This keeps discretization, kinematics, and desaturation logic in exactly one place.

### Rule 2 &rarr; If you need "where am I" or "how fast am I going," ask, don't recompute

Any subsystem that needs the robot's position or velocity (shooter leading a shot, vision confidence, mechanism feedforward, LED indicators, etc.) should call a getter (`getChassisSpeeds()`, `getPose()`/`RobotState`, `getPitch()`, etc.) instead of re-deriving it from raw encoders or gyros itself. This avoids duplicate logic and guarantees every subsystem agrees on the same numbers.

### Rule 3 &rarr; State flags belong to the subsystem that owns the behavior they describe

`setPathfinding(true/false)` doesn't move a motor &rarr; it's a flag other code can query (`isPathfinding()`) to know *why* the drivetrain is currently busy. When you build a new feature that has an "I'm doing X right now" concept (climbing, aligning, shooting), consider whether other subsystems need to observe that state, and expose a getter for it rather than letting other code guess from side effects.

### Rule 4 &rarr; Every command that touches motion must clean up in `end()`

If a command calls `runVelocity`, it must also stop (or hand back to the default command) in its `end(boolean interrupted)` method. Forgetting this is one of the most common swerve bugs: the last commanded velocity silently continues to apply even after the command supposedly finished.

### Rule 5 &rarr; Static geometry vs. instance state

Physical facts about the robot that never change during a match &rarr; where the modules are mounted, the wheelbase radius, max theoretical speed &rarr; can be exposed as `static` methods (like `getModuleTranslations()`), since they don't depend on *which* swerve instance exists (useful in simulation vs. real robot, or multi-robot testing). Anything that changes moment-to-moment (current speed, current pose, current gyro reading) must be an instance method.

### Rule 6 &rarr; Characterization and tuning code lives beside, not inside, the subsystem

Routines used to *measure* robot constants (feedforward gains, wheel radius, wheel COF) should be exposed as public methods on `Swerve` (`runDriveCharacterization`, `getFFCharacterizationVelocity`, etc.) but the actual **command sequences** that drive these routines belong in a separate file (`DriveCommands`), not baked into the subsystem itself. This keeps `Swerve.java` focused on "how the robot moves" rather than "how we calibrate the robot."

### Rule 7 &rarr; Prefer reading sensor-derived signals over raw math when they already exist

Instead of manually computing acceleration or tilt from scratch in `Intake` or `Vision`, those subsystems ask `Swerve` for `getRobotRelativeYAccelGs()` and `getPitch()` because `Swerve` already owns the gyro and has already done the unit conversions. If a value is already computed elsewhere, don't recompute it &rarr; expose it as a getter and reuse it.

<Note title="Why this generalizes across games">
None of these rules mention shooting, climbing, intaking notes/cubes/coral, or any specific 2026 mechanism. They're really about **software architecture**: a single entry point for commands, getters instead of duplicated math, explicit state flags for cross-subsystem coordination, and clean teardown. Whatever game comes next, these same six rules will tell you where a new subsystem should reach into `Swerve`.
</Note>

---

<Quiz questions={[
{
  prompt: "Why does TeleopSwerve call s_Swerve.getMaxLinearSpeedMetersPerSec() instead of using a hardcoded speed value?",
  options: [
    "Hardcoded values are faster to compute",
    "The max speed differs per robot (different tuner constants), so reading it from Swerve keeps the command portable across robots",
    "WPILib requires all speeds to come from getters",
    "It doesn't matter, either approach works the same"
  ],
  correct: 1,
  explanation: "Different physical robots (OmegaBot, AlphaBot, Chassis, LastYear) have different max speeds based on their TunerConstants. By asking Swerve for this value, TeleopSwerve automatically adapts to whichever robot it's running on."
},
{
  prompt: "Why do Turret and Flywheel call RobotContainer.s_Swerve.getChassisSpeeds() even though they aren't drivetrain subsystems?",
  options: [
    "It's required by WPILib for all subsystems",
    "To slow down the flywheel when the robot is moving",
    "To lead a moving target and account for velocity already imparted on the game piece by the moving robot (shoot-on-the-move)",
    "Swerve requires other subsystems to report their state to it"
  ],
  correct: 2,
  explanation: "When shooting while driving, the game piece inherits some of the robot's velocity. Turret and Flywheel read the current chassis speed to compute the correct lead angle and shot power, exactly like leading a moving target."
},
{
  prompt: "According to the general rules, what should happen in a command's end() method if it calls runVelocity() during execute()?",
  options: [
    "It should call runVelocity with a zero ChassisSpeeds (or otherwise release control) so the last commanded velocity doesn't keep applying",
    "Nothing, WPILib automatically stops the drivetrain",
    "It should call resetPose()",
    "It should disable the robot"
  ],
  correct: 0,
  explanation: "If a command doesn't stop the drivetrain in end(), the last velocity it commanded will keep being applied even after the command finishes, since Swerve has no way of knowing the command is done unless explicitly told to stop."
},
{
  prompt: "Why is Swerve.getModuleTranslations() a static method instead of an instance method?",
  options: [
    "Static methods run faster in Java",
    "It's required by AutoBuilder",
    "Because SwerveDriveKinematics requires static input",
    "Module locations are a fixed physical property of the robot's frame that doesn't depend on which Swerve instance exists, so other classes (like RobotState) can use it without needing a live Swerve reference"
  ],
  correct: 3,
  explanation: "The physical geometry of where each module sits on the robot never changes during a match and isn't tied to a specific instance's runtime state, so it makes sense as a static utility method that any class (like RobotState building its own kinematics) can call directly."
},
{
  prompt: "What is the general architectural lesson from Vision.isOnBump() being used to widen vision standard deviations?",
  options: [
    "Vision should never trust odometry",
    "A subsystem can expose a state signal (like isOnBump) that other subsystems consume to adjust their own confidence or behavior, without those subsystems needing to know how that signal was computed",
    "Bumps should be avoided entirely on the field",
    "Standard deviation should always be a constant value"
  ],
  correct: 1,
  explanation: "This is the general pattern of one subsystem exposing meaningful state (isOnBump) as a getter, which other subsystems (Vision) consume to make their own decisions, without needing to understand gyro pitch/roll math themselves."
}
]} />
