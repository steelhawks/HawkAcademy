---
sidebar_position: 5
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Where Do We Use Telemetry

Now you know what telemetry is, how NetworkTables carries it, and how `Logger` routes it to Elastic and AdvantageScope.

*But where does all of this actually show up in real code?*

The answer is: almost everywhere. Telemetry isn't a separate feature bolted onto a subsystem &mdash; it's woven into the same `periodic()` methods, constructors, and helper classes you've already been studying since the Robot Systems and Swerve sections. In this page we'll walk through `Rebuilt2026` and point at the exact lines where each telemetry mechanism from the last two pages is actually used, then zoom out to general rules you can apply to any subsystem you write.

---

## 1. The IO Inputs Pattern, Everywhere

Every subsystem's IO interface defines an `@AutoLog`-annotated inputs class, and every subsystem's `periodic()` starts by handing that object to `Logger.processInputs`. `Intake` is a good example:

```java
// IntakeIO.java
public interface IntakeIO {

    @AutoLog
    class IntakeIOInputs {
        public double goal = 0;

        public boolean leftConnected = false;
        public double leftPositionMeters = 0.0;
        public double leftVelocityMetersPerSec = 0.0;
        public double leftAppliedVolts = 0.0;
        public double leftSupplyCurrentAmps = 0.0;
        public double leftTorqueCurrentAmps = 0.0;
        public double leftTempCelsius = 0.0;
        // ... right + intake motor fields
    }

    default void updateInputs(IntakeIOInputs inputs) {}
}
```

```java
// Intake.java
private final IntakeIOInputsAutoLogged inputs = new IntakeIOInputsAutoLogged();

@Override
public void periodic() {
    io.updateInputs(inputs);
    Logger.processInputs("Intake", inputs);
    // ...
}
```

<Note title="IntakeIOInputsAutoLogged, not IntakeIOInputs">
Notice the `periodic()` method holds an `IntakeIOInputsAutoLogged`, not a plain `IntakeIOInputs`. That `AutoLogged` class is code-generated at build time from the `@AutoLog` annotation &mdash; it's what actually knows how to serialize every field to `Logger`. You never write it by hand.
</Note>

This exact pattern &mdash; an `@AutoLog` inputs class, updated by the IO layer, processed once per loop &mdash; is what you already saw for `Swerve`'s `ModuleIO`/`GyroIO` back in the Swerve section. It isn't unique to one subsystem; it's the standard shape every IO-based subsystem in the codebase follows.

---

## 2. Intake: Manual Outputs and Tunables Side by Side

Past the raw IO inputs, `Intake` also shows the other two mechanisms from the last page living in the same file. Its gains are declared as `LoggedTunableNumber`s in the constructor:

```java
// Intake.java
private static LoggedTunableNumber currentHomingThreshold;
private static LoggedTunableNumber kP;
private static LoggedTunableNumber kI;
private static LoggedTunableNumber kD;
private static LoggedTunableNumber MAX_VELOCITY_METERS_PER_SEC;

public Intake(IntakeIO io, SubsystemConstants.IntakeConstants constants) {
    currentHomingThreshold = new LoggedTunableNumber("Intake/CurrentHomingThreshold", constants.currentHomingThreshold());
    kP = new LoggedTunableNumber("Intake/kP", constants.kP());
    kI = new LoggedTunableNumber("Intake/kI", constants.kI());
    kD = new LoggedTunableNumber("Intake/kD", constants.kD());
    MAX_VELOCITY_METERS_PER_SEC = new LoggedTunableNumber("Intake/MaxVelocityMetersPerSec", constants.maxVelocityMetersPerSec());
    // ...
}
```

And its `periodic()` records computed, derived values manually &mdash; homing state, motion-profile setpoints, and feedforward terms &mdash; right alongside the IO inputs it just processed:

```java
// Intake.java
Logger.recordOutput("Intake/IsHomed", isHomed);
Logger.recordOutput("Intake/ShouldRun", shouldRun);
Logger.recordOutput("Intake/LeftFF", leftFF);
Logger.recordOutput("Intake/RightFF", rightFF);
Logger.recordOutput("Intake/PositionError", positionError);
Logger.recordOutput("Intake/SetpointPosition", setpoint.position);
Logger.recordOutput("Intake/SetpointVelocity", setpoint.velocity);
Logger.recordOutput("Intake/GoalPosition", goal.position);
Logger.recordOutput("Intake/GoalVelocity", goal.velocity);
```

It also exposes a few of its own booleans with `@AutoLogOutput` instead of a manual call, since they're just plain getters with no extra logic needed at the call site:

```java
// Intake.java
@AutoLogOutput(key = "Intake/AtGoal")
public boolean atGoal() {
    return atGoal;
}
```

<Note title="Why mix @AutoLogOutput and manual recordOutput in the same class?">
`@AutoLogOutput` is for values you'd log unconditionally, every loop, off a getter you already have. Manual `Logger.recordOutput(...)` is for anything that needs extra logic first &mdash; here, `leftFF`/`rightFF` and the setpoint/goal pairs are only meaningful *inside* a conditional branch of `periodic()`, so they can't just be annotated on a field.
</Note>

---

## 3. IntakeVisualizer: Visual Telemetry as Its Own Class

Rather than mixing mechanism-drawing code into `Intake.java` itself, that logic lives in a dedicated `IntakeVisualizer`:

```java
// IntakeVisualizer.java
public class IntakeVisualizer {
    private final LoggedMechanism2d mechanism;
    private final LoggedMechanismLigament2d rack;

    public void update() {
        double positionMeters = rackPositionSupplier.get();
        rack.setLength(positionMeters);
        Logger.recordOutput("Intake/Mechanism", mechanism);
        Logger.recordOutput("Intake/ComponentPoses", new Pose3d[]{
            new Pose3d(
                new Translation3d(
                    positionMeters * Math.cos(Intake.RACK_ANGLE.getRadians()),
                    0.0,
                    positionMeters * Math.sin(Intake.RACK_ANGLE.getRadians())),
                new Rotation3d())
        });
    }
}
```

`Intake` hands the visualizer a `Supplier<Double>` for its current position rather than the visualizer reaching into `Intake` directly &mdash; the same getter-not-field pattern you saw `Swerve`'s consumers use. AdvantageScope reads `Intake/Mechanism` for a 2D side-view animation, and `Intake/ComponentPoses` for a 3D overlay on the robot model.

---

## 4. RobotState: The Central Hub for Computed State

`RobotState` is the busiest telemetry producer in the codebase, because it's where raw sensor data from `Swerve` and `Vision` gets turned into decisions. Several booleans are exposed with plain `@AutoLogOutput`:

```java
// RobotState.java
@AutoLogOutput
private final Trigger sotmTrigger;
@AutoLogOutput
private final Trigger inTrenchTrigger;
@AutoLogOutput
private final Trigger inBumpTrigger;
@AutoLogOutput
private final Trigger turretStuckTrigger;
@AutoLogOutput
private final Trigger nearHubTrigger;
```

State *transitions*, on the other hand, are logged manually so the change itself (not just the current value) is visible in AdvantageScope's log:

```java
// RobotState.java
public void setAimState(AimState mode) {
    Logger.recordOutput("AimState/ModeChange", currentAimState.name() + " -> " + mode.name());
    Logger.recordOutput("AimState/CurrentMode", mode.name());
}
```

And its two pose sources &mdash; the fused estimate and the raw wheel-only odometry &mdash; are recorded every loop so you can visually compare them after a match:

```java
// RobotState.java
Logger.recordOutput("RobotState/PoseEstimation/PoseEstimation", poseEstimator.getEstimatedPosition());
Logger.recordOutput("RobotState/PoseEstimation/Odometry", wheelOdometry.getPoseMeters());
```

<Note title="Why log both the fused pose and raw odometry?">
If `RobotState/PoseEstimation/PoseEstimation` ever jumps or drifts strangely during a match, having `RobotState/PoseEstimation/Odometry` logged right alongside it lets you tell, after the fact, whether the problem came from a bad vision correction or from the wheels themselves &mdash; exactly the kind of question REPLAY mode exists to answer.
</Note>

---

## 5. Vision: High-Volume Structured Telemetry

`Vision` shows that telemetry doesn't have to be a single number &mdash; it logs whole arrays of poses, per camera, every loop:

```java
// Vision.java
Logger.processInputs("Vision/" + io[i].getName(), inputs[i]);
// ...
Logger.recordOutput("Vision/Camera" + cameraIndex + "/TagPoses", tagPoses.toArray(new Pose3d[0]));
Logger.recordOutput("Vision/Camera" + cameraIndex + "/RobotPoses", robotPoses.toArray(new Pose3d[0]));
Logger.recordOutput("Vision/Camera" + cameraIndex + "/RobotPosesAccepted", robotPosesAccepted.toArray(new Pose3d[0]));
Logger.recordOutput("Vision/Camera" + cameraIndex + "/RobotPosesRejected", robotPosesRejected.toArray(new Pose3d[0]));
```

It also rolls every camera's results into a single set of `"Vision/Summary/..."` keys, so AdvantageScope can show "everything vision saw this loop" as one combined 3D overlay instead of clicking through each camera individually:

```java
// Vision.java
Logger.recordOutput("Vision/Summary/RobotPosesAccepted", allRobotPosesAccepted.toArray(new Pose3d[0]));
Logger.recordOutput("Vision/Summary/RobotPosesRejected", allRobotPosesRejected.toArray(new Pose3d[0]));
```

Splitting `RobotPosesAccepted` from `RobotPosesRejected` is itself a telemetry decision: it turns an internal filtering decision (should this vision measurement be trusted?) into something you can literally see, camera by camera, after a match.

---

## 6. Toggles: Two-Way Telemetry for Every Subsystem

The `Toggles` interface from the last page isn't one flag &mdash; it's a whole namespace of `LoggedNetworkBoolean`s, one nested interface per subsystem:

```java
// Toggles.java
interface Flywheel {
    LoggedNetworkBoolean isEnabled = new LoggedNetworkBoolean("Toggles/Flywheel/IsEnabled", true);
    LoggedNetworkBoolean toggleVoltageOverride = new LoggedNetworkBoolean("Toggles/Flywheel/ToggleVoltageOverride", false);
}

interface Intake {
    LoggedNetworkBoolean isEnabled = new LoggedNetworkBoolean("Toggles/Intake/IsEnabled", true);
    LoggedNetworkBoolean toggleVoltageOverride = new LoggedNetworkBoolean("Toggles/Intake/ToggleVoltageOverride", false);
}
```

`Toggles` also builds momentary "buttons" out of the same mechanism &mdash; a boolean that a subsystem watches with a `Trigger`, and immediately resets after the bound command runs:

```java
// Toggles.java
private static void bindMomentary(String key, Command command) {
    var toggle = new LoggedNetworkBoolean(key, false);
    new Trigger(toggle::get)
        .onTrue(command.andThen(Commands.runOnce(() -> toggle.set(false))));
}

static void configureOverrides() {
    Subsystems.hoodIfPresent().ifPresent(h ->
        bindMomentary("Dashboard/Zero/Hood", h.zeroHood()));
    Subsystems.intakeIfPresent().ifPresent(i ->
        bindMomentary("Dashboard/Zero/Intake", i.zeroIntake()));
}
```

<Note title="A dashboard button is just telemetry flowing backward">
`Dashboard/Zero/Hood` looks like a button in Elastic, but under the hood it's exactly the same mechanism as any other `LoggedNetworkBoolean`: the dashboard sets a NetworkTables value to `true`, a `Trigger` on the robot notices, runs `h.zeroHood()`, and immediately flips the value back to `false` so the "button" resets. No new system was needed &mdash; two-way telemetry already covers it.
</Note>

---

## 7. Robot.java: Orchestrating Performance Telemetry Every Loop

`Robot.java`'s `robotPeriodic()` doesn't just call `CommandScheduler.run()` &mdash; it wraps every phase of the loop with `LoopTimeUtil`, and folds `BatteryUtil` in right alongside it:

```java
// Robot.java
@Override
public void robotPeriodic() {
    LoopTimeUtil.reset();
    BatteryUtil.reset();

    PhoenixUtil.refreshAll();
    LoopTimeUtil.record("PhoenixUtil");

    RobotState.getInstance().periodic();
    CommandScheduler.getInstance().run();
    LoopTimeUtil.record("Commands");

    BatteryUtil.integrateAndLogTotal();
    LoopTimeUtil.record("BatteryUtil");

    // ...
    LoopTimeUtil.record("RobotPeriodic");
}
```

```java
// LoopTimeUtil.java
public static void record(String subsystem) {
    double now = Timer.getFPGATimestamp();
    Logger.recordOutput("LoopTimes/" + subsystem + "ms", (now - startTime) * 1000.0);
    startTime = now;
}
```

Each `LoopTimeUtil.record(...)` call measures the time *since the previous call*, so the resulting `LoopTimes/PhoenixUtil ms`, `LoopTimes/Commands ms`, and `LoopTimes/BatteryUtil ms` keys break one 20ms loop down into exactly how long each phase took &mdash; if a match ever has intermittent loop overruns, this is the first place to look in AdvantageScope.

`Robot.java` also switches Elastic's visible tab based on which part of the match is running:

```java
// Robot.java
@Override
public void teleopInit() {
    setState(RobotState.TELEOP);
    Elastic.selectTab("Teleoperated");
    // ...
}
```

This is the same `Elastic.selectTab(...)` mentioned on the previous page &mdash; it's called from exactly one place, the mode-transition methods in `Robot.java`, so drive team never has to manually click a tab mid-match.

---

## Summary Table

| Consumer | Telemetry mechanism(s) used | Why |
|---|---|---|
| `IntakeIO` / every IO interface | `@AutoLog` inputs class + `Logger.processInputs` | Record raw hardware state automatically, every loop |
| `Intake` | `LoggedTunableNumber`, manual `Logger.recordOutput`, `@AutoLogOutput` | Live-tune gains and expose both raw and computed motion-profile state |
| `IntakeVisualizer` | `Logger.recordOutput` with `LoggedMechanism2d` / `Pose3d[]` | Turn a position value into a 2D/3D picture other subsystems don't need to know about |
| `RobotState` | `@AutoLogOutput` (triggers, poses), manual `Logger.recordOutput` (state transitions) | Publish both current computed state and the moment it changes |
| `Vision` | `Logger.processInputs` per camera, manual `Logger.recordOutput` (per-camera + summary) | Make an internal accept/reject filtering decision visible, camera by camera |
| `Toggles` | `LoggedNetworkBoolean`, momentary bind pattern | Two-way telemetry for tuning flags, subsystem enables, and dashboard "buttons" |
| `Robot.java` | `LoopTimeUtil.record`, `BatteryUtil.integrateAndLogTotal`, `Elastic.selectTab` | Measure the robot's own performance and drive the dashboard's visible tab |

---

## General Rules: Adding Telemetry to a New Subsystem

None of this is specific to `Intake`, `Vision`, or 2026's game. Here's how to apply the same patterns to any subsystem you write:

### Rule 1 &rarr; Every IO-based subsystem logs its inputs first, unconditionally

`Logger.processInputs(...)` should be the very first thing that happens in `periodic()`, before any control logic runs &mdash; that way even a subsystem that's about to error out or return early still has its raw sensor state captured for that loop.

### Rule 2 &rarr; Use `@AutoLogOutput` for plain getters, manual `recordOutput` for anything conditional

If a value is just a field or a one-line getter with no extra logic, annotate it and let AdvantageKit handle it automatically. If it only exists inside an `if` branch, or needs to be formatted/combined first (like `RobotState`'s `"X -> Y"` mode-change string), log it manually at the point it's computed.

### Rule 3 &rarr; Visual telemetry belongs in its own class

`IntakeVisualizer` never touches motor controllers, and `Intake` never builds a `LoggedMechanism2d`. Keeping visualization code separate from control code means you can change how a mechanism is drawn without touching the logic that actually moves it, and vice versa.

### Rule 4 &rarr; Key names are a hierarchy, not a label

Every key in this page follows `"Subsystem/Category/Field"` (`Intake/SetpointPosition`, `Vision/Camera0/TagPoses`, `Toggles/Flywheel/IsEnabled`). This isn't just style &mdash; both Elastic and AdvantageScope group keys by their `/`-separated prefixes, so a consistent hierarchy is what makes a dashboard or log actually browsable instead of a flat list of hundreds of values.

### Rule 5 &rarr; Tunables and toggles are declared once, not recreated every loop

Every `LoggedTunableNumber` and `LoggedNetworkBoolean` you've seen on this page is a field, initialized once (usually in a constructor or as an interface constant) &mdash; never inside `periodic()`. Recreating one every loop would keep resetting it to its default value, throwing away whatever a human just tuned it to.

### Rule 6 &rarr; If you can measure it, measure it, even if it's "just" performance

`LoopTimeUtil` and `BatteryUtil` don't describe any mechanism &mdash; they describe the robot's own code and power system. Treating your own loop time and current draw as telemetry, with the same rigor as a sensor reading, is often what actually explains a mysterious match-day problem.

<Note title="The throughline">
Every mechanism covered across this whole section &mdash; `@AutoLog`, `@AutoLogOutput`, manual `recordOutput`, `LoggedTunableNumber`, `LoggedNetworkBoolean`, and the Visualizer pattern &mdash; shows up in nearly every subsystem you've already studied. Telemetry isn't a separate topic from `Intake`, `Swerve`, or `Vision`; it's a layer that sits inside all of them, and now you know exactly what it looks like when you go looking for it.
</Note>

---

<Quiz questions={[
{
prompt: "In Intake.java, why are Logger.recordOutput calls for leftFF, rightFF, and PositionError written manually instead of using @AutoLogOutput?",
options: [
"@AutoLogOutput doesn't support double values",
"These values only exist inside a conditional branch of periodic(), so they can't be captured by annotating a field or a no-argument getter",
"Manual recordOutput calls run faster than @AutoLogOutput",
"LoggedTunableNumber requires manual logging"
],
correct: 1,
explanation: "@AutoLogOutput works for plain fields or simple getters logged unconditionally every loop. Values like leftFF and rightFF are only computed inside part of periodic()'s control flow, so they have to be logged manually at the point they're calculated."
},
{
prompt: "Why does IntakeVisualizer receive a Supplier<Double> for the rack's position instead of holding a reference to the Intake instance directly?",
options: [
"Suppliers are required by AdvantageKit for all visualizers",
"It follows the same getter-based decoupling pattern seen elsewhere in the codebase (like Swerve's consumers), so the visualizer only depends on the value it needs, not the whole subsystem",
"Intake instances cannot be passed between classes in Java",
"It makes the mechanism animate faster"
],
correct: 1,
explanation: "Passing a Supplier<Double> means IntakeVisualizer only depends on the one value it actually needs, the same 'ask for a getter, don't reach into the whole object' pattern used throughout the codebase (e.g. subsystems reading Swerve.getChassisSpeeds() instead of holding a full Swerve reference)."
},
{
prompt: "Why does RobotState log both RobotState/PoseEstimation/PoseEstimation (the fused pose) and RobotState/PoseEstimation/Odometry (raw wheel odometry) every loop?",
options: [
"Only one of them is ever actually used, the other is dead code",
"Logging both means that if the fused pose ever looks wrong after a match, you can compare it against pure wheel odometry to tell whether the problem came from vision or from the wheels themselves",
"WPILib requires every pose estimator to log exactly two poses",
"Odometry is always more accurate so PoseEstimation is unnecessary",
],
correct: 1,
explanation: "Having both logged side by side lets you diagnose, after the fact, whether a strange pose jump came from a bad vision correction or from the wheel odometry itself — exactly the kind of question REPLAY mode is built to answer."
},
{
prompt: "In Toggles.java, what happens when a dashboard 'button' like Dashboard/Zero/Hood is pressed?",
options: [
"The dashboard directly calls a Java method on the robot over the network",
"A LoggedNetworkBoolean is set to true by the dashboard, a Trigger on the robot notices and runs the bound command, then the boolean is automatically set back to false",
"The robot polls a REST API every loop to check for button presses",
"Nothing, Dashboard/Zero/Hood is purely cosmetic"
],
correct: 1,
explanation: "bindMomentary wires a LoggedNetworkBoolean to a Trigger. The dashboard flips the NetworkTables value to true, the Trigger's onTrue fires the bound command, and that command chain resets the boolean back to false — the exact same two-way telemetry mechanism as LoggedTunableNumber, just used as a momentary button."
},
{
prompt: "Why does Robot.java call LoopTimeUtil.record(...) multiple times inside robotPeriodic(), with a different subsystem name each time (PhoenixUtil, Commands, BatteryUtil, RobotPeriodic)?",
options: [
"To generate random data for testing purposes",
"Each call measures the time since the previous record() call, breaking one 20ms loop down into how long each individual phase took, which helps diagnose exactly where a loop overrun is coming from",
"LoopTimeUtil requires exactly four calls per loop or it throws an error",
"To reset the robot's internal clock at each phase"
],
correct: 1,
explanation: "record(subsystem) logs the elapsed time since the last record() call and then resets its internal timer. Calling it after each phase (PhoenixUtil refresh, command scheduling, battery integration) breaks the full loop time into named segments, so a slow loop can be traced to a specific phase instead of just 'the loop was slow.'"
}
]} />
