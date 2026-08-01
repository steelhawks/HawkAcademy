--- 
sidebar_position: 6
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import NoteTabs, { NoteTab } from '@site/src/components/NoteTabs'

# Control & Feedforward

Every subsystem you write eventually has to answer the same question: *"I know where I want to be &rarr; how do I turn that into motor output?"* The classes on this page live right at that boundary between setpoints and voltage.

This page covers the three utility classes in `org.steelhawks.util` that handle control and path planning:

- `SwerveDriveController` &rarr; wraps three `PIDController`s into a single object that outputs field-relative `ChassisSpeeds` for driving to a pose
- `ArmDriveFeedforward` &rarr; compensates an arm's feedforward voltage for the extra force caused by the robot's own acceleration while driving
- `LocalADStarAK` &rarr; wraps PathPlanner's on-the-fly pathfinder so it works correctly with AdvantageKit's log-replay system

By the end, you'll understand not just what each class does but *why* it exists as a utility instead of being written inline inside a subsystem.

---

## `SwerveDriveController`

Driving a swerve robot to a specific pose on the field means controlling three independent things at once: X position, Y position, and heading. Each of those needs its own PID loop. `SwerveDriveController` bundles all three `PIDController`s into one object, so the rest of the codebase never has to manage them separately.

```java
public class SwerveDriveController {

    private final PIDController xController;
    private final PIDController yController;
    private final PIDController thetaController;
    private boolean firstRun = true;

    public SwerveDriveController(
        PIDController xController, PIDController yController, PIDController thetaController) {
        this.xController = xController;
        this.yController = yController;
        this.thetaController = thetaController;
        thetaController.enableContinuousInput(-Math.PI, Math.PI);
    }
```

<Note title="New term: PIDController">
A `PIDController` is WPILib's built-in closed-loop controller. You give it a measurement (where the mechanism actually is) and a setpoint (where you want it to be), and it outputs a correction value: proportional (`kP`) to the current error, integral (`kI`) to accumulated past error, and derivative (`kD`) to how fast the error is changing. Together they form a PID loop that nudges the mechanism toward the setpoint and keeps it there. You'll see PID used throughout the codebase for position, velocity, and angle control.
</Note>

Notice that `thetaController.enableContinuousInput(-Math.PI, Math.PI)` is called in the constructor. This is essential for heading control: without it, a PID controller trying to rotate from `+170°` to `-170°` would try to spin `340°` the long way around, instead of recognizing that `20°` in the other direction is shorter.

<Note title="Why does heading need continuous input?">
A heading is an angle, and angles wrap around: `+180°` and `-180°` are the same physical direction. Without continuous input, a `PIDController` sees the error as `+360°` (or `-360°`) &rarr; a huge number that drives the motors at full speed even though the robot barely needs to move. `enableContinuousInput(-Math.PI, Math.PI)` tells the controller to always pick the shorter path around the circle, so the error is always at most `π` radians in magnitude.
</Note>

### Configuring tolerances fluently

After construction, you can add tolerances with a chainable builder style:

```java
public SwerveDriveController withLinearTolerance(double xyTolerance) {
    xController.setTolerance(xyTolerance);
    yController.setTolerance(xyTolerance);
    return this;
}

public SwerveDriveController withRotationalTolerance(double thetaTolerance) {
    thetaController.setTolerance(thetaTolerance);
    return this;
}
```

Returning `this` from each method allows the configuration to be chained directly onto the constructor call:

```java
// Swerve.java
private final SwerveDriveController autonController =
    new SwerveDriveController(
        new PIDController(AutonConstants.TRANSLATION_KP.getAsDouble(), AutonConstants.TRANSLATION_KI.getAsDouble(), AutonConstants.TRANSLATION_KD.getAsDouble()),
        new PIDController(AutonConstants.TRANSLATION_KP.getAsDouble(), AutonConstants.TRANSLATION_KI.getAsDouble(), AutonConstants.TRANSLATION_KD.getAsDouble()),
        new PIDController(AutonConstants.ROTATION_KP.getAsDouble(), AutonConstants.ROTATION_KI.getAsDouble(), AutonConstants.ROTATION_KD.getAsDouble()))
        .withLinearTolerance(0.05)
        .withRotationalTolerance(Math.PI / 60.0);
```

The tolerance values matter: `0.05` meters for X/Y means "we're done if we're within 5 cm," and `Math.PI / 60.0` radians (~3°) for heading means "we're done if we're within 3 degrees." These are the thresholds used during autonomous to decide when the robot has "arrived."

### Computing the output

```java
public ChassisSpeeds getOutput(Pose2d measurement, Pose2d setpoint) {
    if (firstRun) {
        reset(measurement);
        firstRun = false;
    }

    double xOutput = xController.calculate(measurement.getX(), setpoint.getX());
    double yOutput = yController.calculate(measurement.getY(), setpoint.getY());
    double thetaOutput = thetaController.calculate(
        measurement.getRotation().getRadians(), setpoint.getRotation().getRadians());

    return ChassisSpeeds.fromFieldRelativeSpeeds(
        xOutput,
        yOutput,
        thetaOutput,
        measurement.getRotation());
}
```

<NoteTabs>
  <NoteTab title="New term: ChassisSpeeds">
`ChassisSpeeds` is a WPILib type that bundles three values together: `vx` (forward/backward speed in m/s), `vy` (left/right speed in m/s), and `omega` (rotation speed in rad/s). These three numbers together fully describe how the robot as a whole should be moving. Swerve kinematics then converts that into individual wheel speeds and angles for each module.
  </NoteTab>
  <NoteTab title="Why fromFieldRelativeSpeeds and not just a plain ChassisSpeeds?">
The PID controllers produce corrections in **field-relative** coordinates: "move 0.3 m/s in the field's X direction." But a swerve drive's kinematics expects **robot-relative** speeds: "move 0.3 m/s out the front of the robot." If the robot is rotated 45° on the field, "field X" and "robot front" point in completely different directions. `ChassisSpeeds.fromFieldRelativeSpeeds(...)` does the trigonometry to rotate the field-relative PID outputs into the robot's own frame, given the robot's current heading. Without this step, the robot would drive in the wrong direction whenever it wasn't facing directly toward field X.
  </NoteTab>
  <NoteTab title="Why reset on the first run?">
PID controllers accumulate an integral term over time. If the controller was constructed while the robot was parked somewhere, but then first *called* while the robot is somewhere else, the previous "zero error" state doesn't match reality. Calling `reset()` at the first `getOutput()` call clears any accumulated integral and sets the controller's internal "previous measurement" correctly, so the very first output isn't polluted by stale state from before the motion started.
  </NoteTab>
</NoteTabs>

### Getting the current error

```java
public ChassisSpeeds getError() {
    return new ChassisSpeeds(
        xController.getError(),
        yController.getError(),
        thetaController.getError());
}
```

This is convenient for checking "are we close enough to the target?" and for logging how far off the robot is from its setpoint during autonomous.

### How it's used in `Swerve.java`

`followTrajectory` is called every loop during path following. It takes the trajectory's current target point (`SwerveSample`), runs the controller against the robot's live estimated pose, and *adds* the trajectory's feedforward speeds on top of the PID correction:

```java
// Swerve.java
public void followTrajectory(SwerveSample sample) {
    var robot = RobotState.getInstance().getEstimatedPose();
    var nextSetpoint = new Pose2d(sample.x, sample.y, new Rotation2d(sample.heading));
    var speeds = autonController.getOutput(robot, nextSetpoint)
        .plus(new ChassisSpeeds(sample.vx, sample.vy, sample.omega));
    Logger.recordOutput("Swerve/Auto/Setpoint", nextSetpoint);
    Logger.recordOutput("Swerve/Auto/Speeds", speeds);
    Logger.recordOutput("Swerve/Auto/PID", speeds.minus(new ChassisSpeeds(sample.vx, sample.vy, sample.omega)));
    Logger.recordOutput("Swerve/Auto/Feedforward", new ChassisSpeeds(sample.vx, sample.vy, sample.omega));
    runVelocity(speeds);
}
```

<Note title="PID + feedforward: why both?">
The trajectory already knows the ideal speeds for each moment (`sample.vx`, `sample.vy`, `sample.omega`) &rarr; that's the feedforward. But the robot may drift slightly from the ideal path due to wheel slip, battery sag, or imprecise initial pose. The PID terms from `autonController.getOutput(...)` add a corrective nudge on top of the ideal speeds to close that gap. This is the same feedforward + feedback pattern used for velocity control on flywheels and other mechanisms throughout the codebase.
</Note>

---

## `ArmDriveFeedforward`

A standard arm feedforward uses `kG * cos(angle)` (or `kG * sin(angle)`, depending on your zero reference) to counteract gravity. But there's a subtler problem: when the robot accelerates or decelerates while driving, there's an extra pseudo-force acting on the arm in the robot's frame of reference, the same effect you feel in a car when you brake hard and your body lurches forward. If the arm's feedforward doesn't account for that, the arm will sag or jerk every time the robot drives aggressively.

`ArmDriveFeedforward` compensates for exactly that.

```java
public class ArmDriveFeedforward {

    private final double kG;

    /**
     * Creates a new ArmDriveFeedforward.
     *
     * @param kG the volts to hold the arm up
     */
    public ArmDriveFeedforward(double kG) {
        this.kG = kG;
    }

    /**
     * Calculates the feedforward voltage based on the current measurement.
     *
     * @param measurement the current angle of the arm in radians
     * @param xAccelInGs the acceleration in Gs
     * @return the calculated feedforward voltage
     */
    public double calculate(double measurement, DoubleSupplier xAccelInGs) {
        return -(kG * Math.sin(measurement) * xAccelInGs.getAsDouble());
    }
}
```

<NoteTabs>
  <NoteTab title="New term: kG and gravity feedforward">
`kG` (sometimes called "gravity gain") is the voltage required to hold the arm perfectly level against gravity when it's horizontal, at 90° from vertical. For any other angle, you multiply by `sin(angle)` (if your zero is at vertical) or `cos(angle)` (if your zero is at horizontal) to scale the compensation to how much the arm is actually fighting gravity at that position. A fully vertical arm pointing straight up needs zero gravity compensation; a fully horizontal arm needs the full `kG`.
  </NoteTab>
  <NoteTab title="What is xAccelInGs, and where does it come from?">
`xAccelInGs` is the robot's linear acceleration in the X direction (front/back), measured in units of g's (where 1 g = 9.81 m/s²). It comes from the IMU (inertial measurement unit) built into the Pigeon2 gyro, which reports raw accelerometer data. When the robot accelerates forward, this value goes positive; when it brakes, it goes negative. In the arm's frame of reference, robot acceleration feels identical to a change in the effective gravitational pull on the arm &rarr; which is exactly why it appears in the feedforward calculation the same way `sin(angle)` does.
  </NoteTab>
  <NoteTab title="Why is the result negated?">
When the robot accelerates forward (positive `xAccelInGs`), inertia pushes the arm *backward* relative to the robot. For an arm that's above horizontal, that backward push tends to *drop* the arm toward the robot's front &rarr; the motor needs to apply extra voltage to fight that drop. The sign depends on your specific arm geometry, but the negation ensures the correction opposes the direction of the pseudo-force rather than adding to it.
  </NoteTab>
</NoteTabs>

### Why a `DoubleSupplier` instead of a plain `double`?

```java
public double calculate(double measurement, DoubleSupplier xAccelInGs) {
    return -(kG * Math.sin(measurement) * xAccelInGs.getAsDouble());
}
```

`DoubleSupplier` (a lambda `() -> ...`) means the current acceleration is read fresh every time `calculate` is called. If a plain `double` were passed instead, the acceleration would be frozen at whatever value existed at the moment of the call site, and would never update even if the robot's actual acceleration changed. This is the same reason `RobotFootprint.Extension` uses a `DoubleSupplier` for its extension length &rarr; values that change in real time need a supplier, not a snapshot.

<Note title="Why doesn't this show up in a subsystem in Rebuilt2026?">
`ArmDriveFeedforward` was written as an in-house utility for any mechanism that could benefit from drive-acceleration compensation (originally intended for a hood or similar pivoting arm). The specific mechanisms in `Rebuilt2026` (Hood, Turret, Flywheel) either use standard gravity feedforward through WPILib's `ArmFeedforward` directly, or don't need drive-acceleration compensation for their geometry. The class remains in `util` as a ready-to-use tool for any future season that has a rotating arm affected by chassis acceleration.
</Note>

---

## `LocalADStarAK`

PathPlanner includes a built-in on-the-fly pathfinder called `LocalADStar` that can dynamically plan a path around obstacles to reach a goal pose. But there's a problem: it runs its planning algorithm on a background thread, which means its outputs are **not** captured by AdvantageKit's deterministic log-replay system. If you replay a match log and re-run the planner, you might get a slightly different path than the one the robot actually drove, which defeats the purpose of log replay.

`LocalADStarAK` solves this by wrapping `LocalADStar` inside AdvantageKit's `LoggableInputs` pattern, the same pattern used throughout every `IO` class you've seen in the codebase.

```java
public class LocalADStarAK implements Pathfinder {
    private final ADStarIO io = new ADStarIO();
```

`LocalADStarAK` implements PathPlanner's own `Pathfinder` interface, so it's a drop-in replacement for the default pathfinder.

<Note title="New term: AdvantageKit log replay">
AdvantageKit is a logging framework that records every input from hardware and sensors, and can then "replay" a match log by feeding those exact same inputs back through the robot code as if the match were happening again. This lets you re-run your control logic against real match data after the fact, to debug what happened or to test a code change against real conditions. The key requirement is **determinism**: given the same inputs, the code must always produce the same outputs. Any computation that runs on its own thread (like `LocalADStar`'s background planner) can produce slightly different results between the real match and a replay run, breaking that guarantee.
</Note>

### The `ADStarIO` inner class

```java
private static class ADStarIO implements LoggableInputs {
    public LocalADStar adStar = new LocalADStar();
    public boolean isNewPathAvailable = false;
    public List<PathPoint> currentPathPoints = Collections.emptyList();

    @Override
    public void toLog(LogTable table) {
        table.put("IsNewPathAvailable", isNewPathAvailable);

        double[] pointsLogged = new double[currentPathPoints.size() * 2];
        int idx = 0;
        for (PathPoint point : currentPathPoints) {
            pointsLogged[idx] = point.position.getX();
            pointsLogged[idx + 1] = point.position.getY();
            idx += 2;
        }
        table.put("CurrentPathPoints", pointsLogged);
    }

    @Override
    public void fromLog(LogTable table) {
        isNewPathAvailable = table.get("IsNewPathAvailable", false);

        double[] pointsLogged = table.get("CurrentPathPoints", new double[0]);
        List<PathPoint> pathPoints = new ArrayList<>();
        for (int i = 0; i < pointsLogged.length; i += 2) {
            pathPoints.add(
                new PathPoint(new Translation2d(pointsLogged[i], pointsLogged[i + 1]), null));
        }
        currentPathPoints = pathPoints;
    }
```

<NoteTabs>
  <NoteTab title="New term: LoggableInputs / toLog / fromLog">
`LoggableInputs` is AdvantageKit's interface for anything that crosses the "real hardware vs. replay" boundary. `toLog` is called during a real match to serialize the current state to the log file; `fromLog` is called during replay to restore that state from the log file. By implementing both, `ADStarIO` ensures that during replay, the exact path the planner computed in the real match is restored from the log &rarr; rather than re-running the (potentially non-deterministic) planner and getting a slightly different path.
  </NoteTab>
  <NoteTab title="Why store path points as a flat double array?">
AdvantageKit's `LogTable` stores primitive types like `double[]`, not arbitrary Java objects like `List&lt;PathPoint&gt;`. So `toLog` serializes each `PathPoint` as two consecutive doubles (`x` at index `2i`, `y` at index `2i+1`), and `fromLog` deserializes them back by reading pairs and reconstructing `Translation2d` points. This is the same "flatten to an array, unflatten on the other side" pattern used throughout the codebase for logging WPILib geometry types.
  </NoteTab>
</NoteTabs>

### The replay guard: `!Logger.hasReplaySource()`

Every method that would call the real `LocalADStar` is guarded by this check:

```java
@Override
public boolean isNewPathAvailable() {
    if (!Logger.hasReplaySource()) {
        io.updateIsNewPathAvailable();
    }
    Logger.processInputs("LocalADStarAK", io);
    return io.isNewPathAvailable;
}

@Override
public PathPlannerPath getCurrentPath(PathConstraints constraints, GoalEndState goalEndState) {
    if (!Logger.hasReplaySource()) {
        io.updateCurrentPathPoints(constraints, goalEndState);
    }
    Logger.processInputs("LocalADStarAK", io);

    if (io.currentPathPoints.isEmpty()) {
        return null;
    }
    return PathPlannerPath.fromPathPoints(io.currentPathPoints, constraints, goalEndState);
}
```

<Note title="What does Logger.processInputs do?">
`Logger.processInputs("LocalADStarAK", io)` is what actually bridges the two modes. During a real match (`!hasReplaySource()`), the real planner is queried first, then `processInputs` calls `io.toLog(...)` to write the result to the log. During replay (`hasReplaySource()`), the real planner query is skipped entirely, and `processInputs` calls `io.fromLog(...)` to restore the state from the log instead. Either way, by the time the return value is read, `io.isNewPathAvailable` and `io.currentPathPoints` hold the correct values for that mode &rarr; real during a match, logged-and-restored during replay.
</Note>

### How it's used in `Swerve.java`

```java
// Swerve.java
Pathfinding.setPathfinder(new LocalADStarAK());
```

That's the entire integration. PathPlanner's `Pathfinding` class accepts any object that implements `Pathfinder`, so swapping in `LocalADStarAK` instead of the default makes pathfinding log-replay-safe across the entire codebase without changing anything else. Commands like `pathfindToPose(...)` automatically use whichever `Pathfinder` is registered here.

<Note title="Why pull the passthrough methods into a separate inner class?">
The passthrough methods for `setStartPosition`, `setGoalPosition`, and `setDynamicObstacles` just delegate to the real `LocalADStar` (again, only when not in replay mode). Keeping all of `LocalADStar`'s state inside `ADStarIO` means there's exactly one place where real vs. replay behavior is separated, and the outer `LocalADStarAK` class never touches `adStar` directly &rarr; it always goes through `io`. This is the same strict IO-layer boundary you've seen in every subsystem's `IOInputs` design throughout the codebase.
</Note>

---

## Putting it together: control utilities in action

Here's how all three classes on this page interact during a typical autonomous routine:

```text
PathPlanner plans a trajectory
         │
         ▼
  LocalADStarAK computes an obstacle-avoiding path
  (and logs it so replays reproduce the exact same path)
         │
         ▼
  Swerve.followTrajectory() is called each loop
         │
    ┌────┴────────────────────────────────┐
    ▼                                     ▼
 autonController.getOutput(...)     sample.vx, sample.vy, sample.omega
 (SwerveDriveController PID         (PathPlanner feedforward: the ideal
  correction: closes the gap         speeds for this moment in the path)
  between estimated and ideal pose)
    │                                     │
    └────────────────┬────────────────────┘
                     ▼
              ChassisSpeeds.plus(...)
          (PID correction + feedforward)
                     │
                     ▼
              runVelocity(speeds)
          (swerve kinematics → module states → motors)
```

If the robot had a rotating arm, `ArmDriveFeedforward.calculate(...)` would additionally run every loop alongside the arm's own PID and standard gravity feedforward, adding a small voltage correction whenever the chassis is accelerating, so the arm holds steady through aggressive autonomous driving.

Each class does one clearly-scoped job: `LocalADStarAK` handles log-safe planning, `SwerveDriveController` handles closed-loop pose correction, and `ArmDriveFeedforward` handles the interaction between chassis dynamics and arm control.

---

<Quiz questions={[
{
prompt: "Why does SwerveDriveController call thetaController.enableContinuousInput(-Math.PI, Math.PI) in its constructor?",
options: [
"So the theta controller runs faster than the x and y controllers",
"To prevent the controller from outputting negative values",
"So the PID controller always takes the shorter rotational path between two headings, instead of spinning the long way around a full circle",
"WPILib requires all heading controllers to call this method"
],
correct: 2,
explanation: "Without continuous input, a controller moving from +170° to -170° would compute a 340° error and spin the long way around. enableContinuousInput(-Math.PI, Math.PI) tells the controller that angles wrap around, so it always finds the shortest arc."
},
{
prompt: "In Swerve.followTrajectory(), why is the PID output from autonController.getOutput(...) added to the trajectory's feedforward speeds rather than just using one or the other?",
options: [
"ChassisSpeeds.plus() is required by the PathPlanner API",
"The feedforward provides the ideal speeds for the planned path, while the PID provides corrective speeds to close any gap between the robot's actual pose and the ideal pose",
"The PID output replaces the feedforward when the robot is close to the setpoint",
"Feedforward is only used during teleop, not autonomous"
],
correct: 1,
explanation: "Feedforward (sample.vx, sample.vy, sample.omega) is the trajectory's prediction of what speeds the robot should have at this moment. PID (from autonController) corrects for accumulated pose error caused by wheel slip, timing drift, etc. Together they are more accurate than either alone."
},
{
prompt: "Why does ArmDriveFeedforward.calculate() accept a DoubleSupplier for xAccelInGs instead of a plain double?",
options: [
"DoubleSupplier is required by WPILib's ArmFeedforward class",
"So the current robot acceleration is always read fresh at the moment calculate() is called, rather than frozen at the value from when the call was set up",
"A plain double cannot be multiplied by Math.sin()",
"DoubleSupplier values are automatically logged by AdvantageKit"
],
correct: 1,
explanation: "Robot acceleration changes every loop cycle. Passing a DoubleSupplier (a lambda like () -> gyro.getAccelX()) means the value is re-evaluated each call, so the feedforward always reflects the robot's actual instantaneous acceleration."
},
{
prompt: "What problem does LocalADStarAK solve that PathPlanner's built-in LocalADStar does not?",
options: [
"LocalADStar cannot plan paths around obstacles",
"LocalADStar uses too much CPU",
"LocalADStar runs on a background thread, so its outputs are not captured by AdvantageKit's log replay system; LocalADStarAK wraps it in LoggableInputs so the exact same path is reproduced during log replay",
"LocalADStar does not implement the Pathfinder interface"
],
correct: 2,
explanation: "LocalADStar's background thread can produce non-deterministic results between runs. LocalADStarAK logs the path that was actually computed during a real match and restores it from the log during replay, guaranteeing the same path is seen in both."
},
{
prompt: "In LocalADStarAK, why is every call to the real LocalADStar guarded by !Logger.hasReplaySource()?",
options: [
"LocalADStar crashes if called during log replay",
"During replay, inputs should be restored from the log rather than re-computed, so the actual planner must be skipped to preserve determinism",
"Logger.hasReplaySource() is a performance optimization that skips pathfinding when the robot is not moving",
"WPILib requires all background-thread calculations to check hasReplaySource()"
],
correct: 1,
explanation: "During replay, Logger.processInputs() restores all inputs from the log file. If the real LocalADStar were also called, it might produce a different path than the logged one, breaking determinism. The guard ensures only one source of truth (the log) is used during replay."
}
]} />

## Next Steps

You've now covered all of the major utility class groups in `org.steelhawks.util`. Move on to the next page to explore the timing, logging, and robot-state utilities &rarr; the classes that keep the robot's loop healthy and track its power consumption.
