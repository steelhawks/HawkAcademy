---
sidebar_position: 4
title: Hardware Helpers
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Hardware Helpers

Talking to real hardware over CAN is not like calling a normal Java method. A CAN bus is a shared wire that every motor controller, sensor, and gyro on the robot has to take turns broadcasting on, and any individual message can arrive late, get dropped, or simply fail because the device browned out for a fraction of a second. If every subsystem handled that unreliability its own way, you'd end up with dozens of slightly different (and slightly buggy) "did this actually work?" checks scattered across the codebase.

This page covers the two classes in `org.steelhawks.util` that exist specifically to make talking to our two motor controller ecosystems &rarr; REV (Spark Max/Flex) and CTRE (TalonFX/Phoenix 6) &rarr; safe and efficient, plus the vendor library we use to pull data off our Limelight cameras:

- `SparkUtil` &rarr; safely reads values from REV Spark motor controllers, only accepting a value if the hardware call actually succeeded
- `PhoenixUtil` &rarr; the CTRE Phoenix 6 equivalent, plus a trick for refreshing dozens of sensor readings in a single, efficient batch
- `LimelightHelpers` &rarr; the (mostly vendor-provided) library that turns raw Limelight NetworkTables data into usable Java objects

By the end, you'll understand why almost every `IO` implementation class in `Rebuilt2026` &rarr; `ModuleIOTalonFX`, `FlywheelIOTalonFX`, `GyroIOPigeon2`, and friends &rarr; routes its hardware calls through one of these two classes instead of calling the vendor library directly.

---

## `SparkUtil`

`SparkUtil` exists to answer one recurring question safely: *"I just asked a Spark motor controller for a value over CAN &rarr; can I actually trust the number I got back?"*

```java
public class SparkUtil {
    /** Stores whether any error was has been detected by other utility methods. */
    public static boolean sparkStickyFault = false;
```

<Note title="New term: CAN bus">
CAN (Controller Area Network) is the wiring standard almost every FRC motor controller and many sensors communicate over. Picture it like a single shared telephone line that every device on the robot is plugged into &rarr; each device takes turns "speaking" (sending small packets of data), and every other device on the bus can "hear" every message. Because it's a shared, real-time bus running over physical wires, a message can occasionally get corrupted, delayed, or dropped entirely &rarr; a loose connector, electrical noise, or a brief brownout can all cause a single read to fail even though the device is working fine a millisecond later.
</Note>

<Note title="New term: sticky fault">
A "fault" is hardware's way of reporting that something went wrong. A **sticky** fault is one that, once set, stays set (`true`) until something explicitly clears it &rarr; as opposed to a fault that automatically clears itself the next time a call succeeds. `sparkStickyFault` is a single global flag: if *any* Spark call anywhere in the robot code fails even once, this flag flips to `true` and stays `true`, which lets other code (like a dashboard alert) check "has anything gone wrong with a Spark today?" without needing to track every individual motor controller separately.
</Note>

### The core pattern: `ifOk`

```java
/** Processes a value from a Spark only if the value is valid. */
public static void ifOk(SparkBase spark, DoubleSupplier supplier, DoubleConsumer consumer) {
    double value = supplier.getAsDouble();
    if (spark.getLastError() == REVLibError.kOk) {
        consumer.accept(value);
    } else {
        sparkStickyFault = true;
    }
}
```

<Note title="Reading the three type parameters">
- **`SparkBase spark`** &rarr; the motor controller you just talked to. REV's library remembers the result of the *last* command sent to this specific object, retrievable via `spark.getLastError()`.
- **`DoubleSupplier supplier`** &rarr; a small piece of code, usually a method reference like `spark::getEncoder`, that actually performs the read and hands back a `double`.
- **`DoubleConsumer consumer`** &rarr; a small piece of code that receives the value *only if it turned out to be trustworthy*, and does something with it (like storing it into an `inputs` field for logging).
</Note>

The order of operations here matters: `supplier.getAsDouble()` is called *first*, which is what actually performs the CAN read and, as a side effect, updates what `spark.getLastError()` will report. Only *then* does the code check whether that specific read succeeded. If it did, `consumer` receives the value; if it didn't, the value is silently thrown away and `sparkStickyFault` is raised instead of writing a garbage/stale number into the robot's state.

A typical call looks like:

```java
SparkUtil.ifOk(spark, spark::getEncoderPositionRotations, (value) -> inputs.positionRad = value);
```

<Note title="Why not just do inputs.positionRad = spark.getEncoderPositionRotations() directly?">
If that specific CAN read silently failed (returning `0.0`, or whatever REVLib's fallback value happens to be), assigning it directly would quietly corrupt `inputs.positionRad` with a wrong number, and nothing downstream would know to distrust it &rarr; a PID loop reacting to that corrupted position could send the mechanism somewhere dangerous. Routing the assignment through `ifOk` means a failed read simply leaves `inputs.positionRad` holding its *previous* value (since the consumer never runs), which is a far safer failure mode than overwriting it with garbage.
</Note>

### Reading several values at once

```java
/** Processes a value from a Spark only if the value is valid. */
public static void ifOk(
    SparkBase spark, DoubleSupplier[] suppliers, Consumer<double[]> consumer) {
    double[] values = new double[suppliers.length];
    for (int i = 0; i < suppliers.length; i++) {
        values[i] = suppliers[i].getAsDouble();
        if (spark.getLastError() != REVLibError.kOk) {
            sparkStickyFault = true;
            return;
        }
    }
    consumer.accept(values);
}
```

This overload accepts an *array* of suppliers instead of just one. It's for cases where several readings only make sense **together** &rarr; for example, computing a mechanism's velocity from two separate encoder readings that both need to be valid, or none of them should be trusted. Notice the loop `return`s the moment any single read fails, so `consumer` (which receives the whole `double[]`) only ever runs when *every* value in the batch succeeded.

### Returning a default instead of doing nothing

Sometimes you don't want to skip an update on failure &rarr; you want a safe fallback value instead, so the rest of your code always has *some* number to work with:

```java
/** Return a value from a Spark (or the default if the value is invalid). */
public static double ifOkOrDefault(
    SparkBase spark, DoubleSupplier supplier, double defaultValue) {
    double value = supplier.getAsDouble();
    if (spark.getLastError() == REVLibError.kOk) {
        return value;
    } else {
        sparkStickyFault = true;
        return defaultValue;
    }
}
```

There's also a version that reads several values and then **transforms** them into a single result, again only if every underlying read succeeded:

```java
public static double ifOkOrDefault(
    SparkBase spark,
    DoubleSupplier[] suppliers,
    Function<Double[], Double> transformer,
    double defaultValue) {
    Double[] values = new Double[suppliers.length];
    for (int i = 0; i < suppliers.length; i++) {
        values[i] = suppliers[i].getAsDouble();
        if (spark.getLastError() != REVLibError.kOk) {
            sparkStickyFault = true;
            return defaultValue;
        }
    }
    return transformer.apply(values);
}
```

<Note title="New term: Function&lt;T, R&gt;">
`Function<Double[], Double>` is another functional interface, similar to `DoubleSupplier` and `DoubleConsumer` from the tuning page, but more general: it represents any piece of code that takes an input of type `T` (here, `Double[]`) and produces an output of type `R` (here, a single `Double`). `transformer` here is what lets the caller decide *how* to combine several raw values into one number &rarr; averaging two encoder readings together, for instance &rarr; without `ifOkOrDefault` needing to know anything about what that combination should be.
</Note>

### Retrying a command until it succeeds

The last tool in `SparkUtil` is for a slightly different situation: not *reading* a value, but *sending a configuration command* (like applying current limits) that absolutely needs to land, even if the first attempt gets lost on the bus:

```java
/** Attempts to run the command until no error is produced. */
public static void tryUntilOk(int maxAttempts, Supplier<REVLibError> command) {
    for (int i = 0; i < maxAttempts; i++) {
        var error = command.get();
        if (error == REVLibError.kOk) {
            break;
        } else {
            sparkStickyFault = true;
        }
    }
}
```

<Note title="Why retry configuration commands but not sensor reads?">
A sensor reading is naturally refreshed every loop cycle (every 20ms) &rarr; if this loop's read fails, there will be a fresh opportunity to read it again almost immediately, so retrying in a tight loop right now wouldn't help much. A *configuration* command (like "set this motor's current limit to 40A") is different: it's usually only sent **once**, during the subsystem's constructor, while the robot is booting up. If that single attempt is lost on the bus, the motor controller would silently keep its old (possibly unsafe) configuration for the entire match, with no second chance to fix it. `tryUntilOk` closes that gap by immediately retrying the same command up to `maxAttempts` times until one of them actually succeeds.
</Note>

---

## `PhoenixUtil`

`PhoenixUtil` solves the exact same "did this hardware call actually work" problem as `SparkUtil`, but for CTRE's Phoenix 6 ecosystem (TalonFX motor controllers, CANcoders, Pigeon2 gyros, CANrange sensors). Phoenix 6's API is shaped differently from REVLib's, so `PhoenixUtil` looks a little different too, and adds one extra trick REVLib doesn't need: batched signal refreshing.

```java
public final class PhoenixUtil {
    private static BaseStatusSignal[] drivetrainCanivoreSignals = new BaseStatusSignal[0];
    private static BaseStatusSignal[] turretCanivoreSignals = new BaseStatusSignal[0];
    private static BaseStatusSignal[] rioSignals = new BaseStatusSignal[0];

    private PhoenixUtil() {
        throw new InstantiationError("PhoenixUtil is a utility class and cannot be instantiated.");
    }
```

<Note title="Why throw in the constructor?">
`PhoenixUtil` (like `LoopTimeUtil` and `BatteryUtil` from the tuning page) is meant to be used entirely through its `static` methods &rarr; there's never a reason to write `new PhoenixUtil()`. Throwing an `InstantiationError` from a `private` constructor is a defensive pattern that turns an accidental `new PhoenixUtil()` into an immediate, obvious crash at the exact line that made the mistake, instead of quietly allowing a pointless object to exist.
</Note>

### `tryUntilOk`: the same retry pattern, different type

```java
public static void tryUntilOk(int maxAttempts, Supplier<StatusCode> command) {
    for (int i = 0; i < maxAttempts; i++) {
        var error = command.get();
        if (error.isOK()) break;
    }
}
```

This is functionally identical to `SparkUtil.tryUntilOk`, just built around Phoenix 6's own `StatusCode` type instead of REVLib's `REVLibError`. It's used constantly across every TalonFX-based `IO` class to apply a device's configuration when it's first constructed:

```java
// FlywheelIOTalonFX.java
config.Slot0.kP = constants.kP();
config.Slot0.kI = constants.kI();
config.Slot0.kD = constants.kD();
PhoenixUtil.tryUntilOk(5, () -> leftMotor.getConfigurator().apply(config));
```

```java
// GyroIOPigeon2.java  (indirectly, via registerSignals below)
pigeon.getConfigurator().apply(new Pigeon2Configuration());
```

```java
// BeamIOCANRange.java
import static org.steelhawks.util.PhoenixUtil.tryUntilOk;
// ...
tryUntilOk(5, () -> range.getConfigurator().apply(config));
```

<Note title="Static import: tryUntilOk vs PhoenixUtil.tryUntilOk">
Some files write `PhoenixUtil.tryUntilOk(...)`, others write `import static org.steelhawks.util.PhoenixUtil.tryUntilOk;` at the top and then just call `tryUntilOk(...)` directly, with no class name prefix. Both do exactly the same thing &rarr; a **static import** just lets you drop the class name when a static method is used often enough in one file that repeating `PhoenixUtil.` every time would clutter the code. `ModuleIOTalonFX.java` even imports the whole class at once with `import static org.steelhawks.util.PhoenixUtil.*;`.
</Note>

### `registerSignals` and `refreshAll`: batching CAN reads for efficiency

This is the part of `PhoenixUtil` that doesn't have a direct `SparkUtil` equivalent, because it solves a problem specific to how Phoenix 6 devices report data: **`StatusSignal`s**.

<Note title="New term: StatusSignal">
In Phoenix 6, every individual measurement you can read off a device (position, velocity, voltage, temperature, current, ...) is represented by its own `StatusSignal<T>` object, rather than a plain method call that immediately talks to the CAN bus. Calling `.getValueAsDouble()` on a `StatusSignal` just returns whatever value it *already has cached* &rarr; it does **not** trigger a new CAN read by itself. To actually pull fresh data from the device, you have to explicitly **refresh** the signal.
</Note>

If every subsystem refreshed its own signals independently, one at a time, you'd be sending far more individual CAN requests than necessary &rarr; each with its own latency and bus overhead. Phoenix 6's `BaseStatusSignal.refreshAll(...)` solves this by refreshing an entire batch of signals in a single, efficient CAN transaction. `PhoenixUtil` exists to collect *every* signal from *every* subsystem into the right batches, so this one efficient call can refresh the whole robot's sensor state once per loop.

```java
public static void registerSignals(CANBus bus, BaseStatusSignal... signals) {
    if (bus.isNetworkFD()) {
        var selectedBusSignals = bus.equals(RobotConfig.CANBusList.kDrivetrainBus)
            ? drivetrainCanivoreSignals
            : turretCanivoreSignals;
        BaseStatusSignal[] newSignals = new BaseStatusSignal[selectedBusSignals.length + signals.length];
        System.arraycopy(selectedBusSignals, 0, newSignals, 0, selectedBusSignals.length);
        System.arraycopy(signals, 0, newSignals, selectedBusSignals.length, signals.length);
        if (bus.equals(RobotConfig.CANBusList.kDrivetrainBus)) {
            drivetrainCanivoreSignals = newSignals;
        } else if (bus.equals(RobotConfig.CANBusList.kTurretBus)) {
            turretCanivoreSignals = newSignals;
        } else {
            DriverStation.reportWarning("Unknown CANivore bus: " + bus.getName(), false);
            throw new RuntimeException("Unknown CANivore bus: " + bus.getName());
        }
    } else {
        BaseStatusSignal[] newSignals = new BaseStatusSignal[rioSignals.length + signals.length];
        System.arraycopy(rioSignals, 0, newSignals, 0, rioSignals.length);
        System.arraycopy(signals, 0, newSignals, rioSignals.length, signals.length);
        rioSignals = newSignals;
    }
}
```

<Note title="New term: CANivore bus vs. the RoboRIO's onboard CAN bus">
A robot doesn't have to have just one CAN bus &rarr; the roboRIO has a single built-in CAN bus (referred to here as the `rio` bus), but you can also plug in a **CANivore**, a separate CAN controller device that provides its own independent, higher-bandwidth bus (CAN FD, hence `isNetworkFD()`). `Rebuilt2026` uses two CANivores (`kDrivetrainBus` for the swerve modules, `kTurretBus` for the turret/hood/flywheel/indexer), plus the roboRIO's own `kRioBus` for everything else. Each physical bus can only efficiently batch-refresh signals that live *on that same bus* &rarr; you can't combine a drivetrain CANivore signal and a roboRIO signal into one refresh call &rarr; which is exactly why `registerSignals` sorts incoming signals into three separate arrays (`drivetrainCanivoreSignals`, `turretCanivoreSignals`, `rioSignals`) based on which bus they came from.
</Note>

<Note title="New term: variadic (varargs) parameter, and System.arraycopy">
`BaseStatusSignal... signals` is a **varargs** parameter (you saw this same pattern with `LoggedTunableNumber.ifChanged` on the tuning page) &rarr; it lets a subsystem pass in any number of signals in one call, like `registerSignals(bus, leftPosition, leftVelocity, leftVoltage, ...)`. Since Java arrays have a fixed size once created, adding new signals to an existing bus's array means creating a brand new, bigger array and copying the old contents into it. `System.arraycopy(source, sourceStart, destination, destStart, length)` does that copying in one efficient native call, rather than writing a manual `for` loop to copy each element &rarr; `arraycopy` is used here twice per bus: once to copy over whatever signals were already registered, and once to append the newly passed-in ones.
</Note>

Every `IO` class calls `registerSignals` once, right after creating its `StatusSignal`s, so `PhoenixUtil` slowly accumulates the *entire robot's* set of signals across all the subsystems that get constructed at startup:

```java
// FlywheelIOTalonFX.java
BaseStatusSignal.setUpdateFrequencyForAll(
    100, leftPosition, leftVelocity, leftVoltage, leftTorqueCurrent, rightPosition, rightVelocity, rightVoltage, rightTorqueCurrent);
PhoenixUtil.registerSignals(
    bus,
    leftPosition, leftVelocity, leftVoltage, leftCurrent, leftTorqueCurrent, leftTemp,
    rightPosition, rightVelocity, rightVoltage, rightCurrent, rightTorqueCurrent, rightTemp);
```

```java
// GyroIOPigeon2.java
PhoenixUtil.registerSignals(
    canBus,
    roll, pitch, yaw,
    accelerationX, accelerationY,
    gravityVectorX, gravityVectorY, gravityVectorZ,
    yawVelocity);
```

```java
// BeamIOCANRange.java
PhoenixUtil.registerSignals(bus, distanceSignal, detectedSignal);
```

Then, once per loop, a *single* call refreshes every signal on every bus at once:

```java
public static void refreshAll() {
    if (drivetrainCanivoreSignals.length > 0) {
        BaseStatusSignal.refreshAll(drivetrainCanivoreSignals);
    }
    if (turretCanivoreSignals.length > 0) {
        BaseStatusSignal.refreshAll(turretCanivoreSignals);
    }
    if (rioSignals.length > 0) {
        BaseStatusSignal.refreshAll(rioSignals);
    }
}
```

```java
// Robot.java
@Override
public void robotPeriodic() {
    LoopTimeUtil.reset();
    BatteryUtil.reset();

    PhoenixUtil.refreshAll();
    LoopTimeUtil.record("PhoenixUtil");
    // ...
}
```

<Note title="Why call this once in Robot.java instead of once per subsystem?">
This is the entire point of the pattern: if every subsystem's `periodic()` called its own `BaseStatusSignal.refreshAll(mySignals)`, you'd be back to sending one CAN transaction per subsystem per loop &rarr; exactly the inefficiency this design avoids. By having every subsystem *register* its signals once at startup, but only *refresh* them from a single, central call in `Robot.robotPeriodic()`, the entire robot's worth of TalonFX/Pigeon2/CANrange data (dozens of individual signals) gets pulled off each CAN bus in just three efficient batched transactions &rarr; one per bus &rarr; every single loop.
</Note>

### One more helper: simulated odometry timestamps

```java
/** Used for MapleSim simulation for the Gyro and Odometry */
public static double[] getSimulationOdometryTimeStamps() {
    final double[] odometryTimeStamps = new double[SimulatedArena.getSimulationSubTicksIn1Period()];
    for (int i = 0; i < odometryTimeStamps.length; i++) {
        odometryTimeStamps[i] = Timer.getFPGATimestamp()
            - 0.02
            + i * SimulatedArena.getSimulationDt().in(Seconds);
    }
    return odometryTimeStamps;
}
```

<Note title="Why does simulation need fake timestamps at all?">
On a real robot, swerve odometry samples position multiple times *within* a single 20ms loop, using real hardware timestamps attached to each CAN signal, for smoother and more accurate pose tracking (you'll see this idea again as "high-frequency odometry" elsewhere in the codebase). A physics simulation doesn't have real hardware generating those in-between timestamps, so this method manufactures a set of evenly-spaced fake timestamps spanning the last 20ms, based on how many simulation "sub-ticks" occurred in that period. This lets the exact same odometry-processing code run unmodified in both real and simulated robots &rarr; `GyroIOSim` and `ModuleIOSim` call this instead of reading real hardware timestamps.
</Note>

---

## `LimelightHelpers`

Unlike `SparkUtil` and `PhoenixUtil` (both written in-house), `LimelightHelpers` is a (mostly) vendor-provided library from Limelight themselves, dropped into `org.steelhawks.util` so the rest of the codebase has one consistent place to pull Limelight data from. It's the biggest file in `util` by far &rarr; over 1,700 lines &rarr; because it has to cover every feature across every generation of Limelight hardware.

```java
/**
 * LimelightHelpers provides static methods and classes for interfacing with Limelight vision
 * cameras in FRC. This library supports all Limelight features including AprilTag tracking, Neural
 * Networks, and standard color/retroreflective tracking.
 */
public class LimelightHelpers {
```

### The problem it solves: raw NetworkTables arrays &rarr; real Java objects

A Limelight publishes almost all of its data as raw arrays of numbers over NetworkTables (for example, a flat `double[]` where every 7 numbers describes one detected AprilTag). Reading that directly in subsystem code would mean remembering exactly which array index means what, for every single feature &rarr; error-prone and hard to read. `LimelightHelpers` exists to hide that raw parsing behind clearly-named Java classes.

```java
/** Represents a Limelight Raw Fiducial result from Limelight's NetworkTables output. */
public static class RawFiducial {
    public int id = 0;
    public double txnc = 0;
    public double tync = 0;
    public double ta = 0;
    public double distToCamera = 0;
    public double distToRobot = 0;
    public double ambiguity = 0;
    // ...
}

/** Represents a Limelight Raw Neural Detector result from Limelight's NetworkTables output. */
public static class RawDetection {
    public int classId = 0;
    public double txnc = 0;
    public double tync = 0;
    public double ta = 0;
    public double corner0_X = 0;
    public double corner0_Y = 0;
    // ... corner1, corner2, corner3
}
```

<Note title="New term: fiducial">
A "fiducial" is any marker placed in a scene specifically to be recognized by a machine vision system &rarr; in FRC, that's the AprilTag. `RawFiducial` represents one single detected AprilTag, with `id` telling you *which* tag it is, `ta` its apparent size in the camera image (target area, useful as a rough distance/confidence signal), and `ambiguity` a measure of how confident the camera is about that tag's exact orientation (a flat marker seen nearly edge-on can be ambiguous about which way it's actually facing).
</Note>

<Note title="New term: neural detector / classId">
Besides AprilTags, Limelight cameras can also run a neural network object detector to find game pieces (or other objects) that don't have a fiducial marker on them at all. `RawDetection` represents one such detected object, and `classId` identifies *what kind* of object it is (the neural network is trained to recognize a fixed set of object classes, and returns which class this particular detection matched). The four `cornerN_X`/`cornerN_Y` pairs are the pixel coordinates of the detected object's bounding box corners in the camera's raw image.
</Note>

`ObjectVisionIOLimelight` is a good real example of using `RawDetection`:

```java
// ObjectVisionIOLimelight.java
LimelightHelpers.RawDetection[] detections =
    LimelightHelpers.getRawDetections(name);

for (LimelightHelpers.RawDetection detection : detections) {
    double[] convertedCornersX = convertPixelsToAngles(
        new double[] {
            detection.corner0_X, detection.corner1_X,
            detection.corner2_X, detection.corner3_X}, false);
    // ...
}
```

Notice the subsystem code never touches NetworkTables directly, or worries about which raw array index means "corner 0's X pixel coordinate." `getRawDetections(name)` does that parsing once, inside `LimelightHelpers`, and hands back an array of already-organized `RawDetection` objects.

### `PoseEstimate`: turning AprilTags into a robot position

The most important type in the whole file is `PoseEstimate` &rarr; the Limelight's best guess at *where the robot is on the field*, computed from however many AprilTags it can currently see:

```java
public static class PoseEstimate {
    public Pose2d pose;
    public double timestampSeconds;
    public double latency;
    public int tagCount;
    public double tagSpan;
    public double avgTagDist;
    public double avgTagArea;

    public RawFiducial[] rawFiducials;
    public boolean isMegaTag2;
}
```

<Note title="Why does PoseEstimate carry more than just a Pose2d?">
A single `Pose2d` tells you *where* the Limelight thinks the robot is, but not *how much to trust it*. `tagCount` (more tags seen at once generally means a more reliable estimate), `avgTagDist` (closer tags are more accurate than distant ones), and `tagSpan` (tags spread far apart across the field of view constrain the pose better than tags clustered together) are exactly the extra context a vision subsystem needs to decide *how strongly* to trust and blend this particular pose estimate into the robot's odometry &rarr; this is the same idea you'll see expanded on when the vision section of this curriculum covers standard deviations.
</Note>

<Note title="New term: MegaTag2">
`isMegaTag2` flags whether this estimate came from Limelight's "MegaTag2" algorithm, an improved multi-tag pose estimation method that (unlike the original MegaTag) requires the robot's current heading to already be known accurately (usually from the gyro) in order to produce a more precise position estimate. You don't need to know the internal math to use it &rarr; just that `getBotPoseEstimate_..._MegaTag2(...)` variants exist alongside the regular ones, and expect you to have already told the Limelight the robot's current gyro heading first.
</Note>

```java
public static PoseEstimate getBotPoseEstimate_wpiBlue(String limelightName) { /* ... */ }
public static PoseEstimate getBotPoseEstimate_wpiBlue_MegaTag2(String limelightName) { /* ... */ }
public static PoseEstimate getBotPoseEstimate_wpiRed(String limelightName) { /* ... */ }
public static PoseEstimate getBotPoseEstimate_wpiRed_MegaTag2(String limelightName) { /* ... */ }
```

<Note title="Why separate wpiBlue and wpiRed methods, instead of one generic method plus AllianceFlip?">
This might look like it duplicates what `AllianceFlip` (from the math & geometry page) already does, but it's solving a different problem: the Limelight device itself computes the pose using its own internal understanding of the field's origin, and it needs to know *which* alliance's coordinate convention you want the answer expressed in before it does that math &rarr; not after. `AllianceFlip` mirrors a pose *you already have* across the field; `getBotPoseEstimate_wpiBlue` vs `_wpiRed` instead asks the Limelight to compute the pose in a specific coordinate frame from the start.
</Note>

### JSON parsing as a fallback

Some data (like the full list of raw fiducials in one shot) is more conveniently read as a JSON blob from the Limelight rather than several separate raw NetworkTables entries:

```java
private static final ObjectMapper mapper = new ObjectMapper()
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
```

<Note title="Recognize this from the tuning & dashboard page?">
This is the same Jackson `ObjectMapper` concept you saw with `Elastic.sendNotification`, just used in reverse: instead of *serializing* a Java object into a JSON string to send out, `LimelightHelpers` *deserializes* a JSON string coming back from the Limelight into Java objects. `FAIL_ON_UNKNOWN_PROPERTIES, false` tells Jackson not to throw an error if the Limelight's JSON contains extra fields this version of `LimelightHelpers` doesn't know about yet &rarr; useful since Limelight firmware updates occasionally add new fields, and you don't want an unrelated firmware update to suddenly crash robot code that was working fine before.
</Note>

---

## Putting it together: why hardware helpers exist at all

Here's the shared idea underneath all three classes on this page, even though they wrap two completely different vendor ecosystems:

```text
Subsystem code wants a value from a motor controller / sensor / camera
                │
                ▼
   SparkUtil.ifOk(...)         PhoenixUtil.registerSignals(...) +
   (REV: check getLastError    refreshAll() (CTRE: batch-refresh
    after every read)           StatusSignals once per loop)
                │                           │
                └─────────────┬─────────────┘
                               ▼
        A trustworthy value lands in the subsystem's
        `inputs` object, or the previous value is safely
        kept if this particular read failed
                               │
                               ▼
       LimelightHelpers turns raw NetworkTables arrays
       into typed objects (RawFiducial, RawDetection,
       PoseEstimate) so vision code never touches raw
       array indices directly
```

Every `IO` class you write should lean on these tools rather than calling the vendor library directly &rarr; that's what keeps "is this CAN read actually valid?" and "how do I parse this Limelight array?" solved in exactly one place, instead of reinvented (and occasionally gotten wrong) in every subsystem.

---

<Quiz questions={[
{
prompt: "In SparkUtil.ifOk, why is supplier.getAsDouble() called before checking spark.getLastError()?",
options: [
"Calling the supplier is what actually performs the CAN read, which updates what getLastError() will report for that specific call, so the error check has to happen after the read, not before",
"Java requires all method calls to happen in alphabetical order",
"getLastError() only works if a value has never been read before",
"It doesn't matter, the order could be swapped with no effect"
],
correct: 0,
explanation: "getLastError() reports the result of the most recent command sent to that SparkBase. The supplier call is what performs the actual CAN read, so it must run first for getLastError() to accurately reflect whether *that specific* read succeeded."
},
{
prompt: "Why does a failed SparkUtil.ifOk call leave the destination field unchanged instead of writing some default number like 0.0?",
options: [
"Writing a garbage/stale-but-wrong value like 0.0 into a field that feeds a PID loop or the robot's pose could cause dangerous or incorrect behavior; leaving the previous (last known good) value in place is a safer failure mode",
"Java does not allow default values to be written inside a DoubleConsumer",
"0.0 is reserved for a different purpose in WPILib",
"ifOk always succeeds, so this situation never actually happens"
],
correct: 0,
explanation: "Since consumer.accept(value) is only called when the read is verified successful, a failed read simply skips the update, leaving whatever value was already there. This is safer than overwriting good data with a potentially meaningless fallback."
},
{
prompt: "Why does PhoenixUtil sort registered signals into three separate arrays (drivetrainCanivoreSignals, turretCanivoreSignals, rioSignals) instead of one combined array?",
options: [
"Each physical CAN bus (the two CANivores and the roboRIO's own bus) can only be efficiently batch-refreshed on its own, so signals have to be grouped by which physical bus they actually live on",
"Java arrays cannot exceed a certain length",
"Sorting by bus makes the code alphabetize more easily",
"There is no real reason, it's arbitrary"
],
correct: 0,
explanation: "BaseStatusSignal.refreshAll(...) refreshes a batch of signals over a single CAN bus in one transaction. Signals from different physical buses can't be combined into one refresh call, so PhoenixUtil keeps three separate arrays, one per bus, and refreshes each batch separately."
},
{
prompt: "Why is PhoenixUtil.refreshAll() called exactly once in Robot.robotPeriodic(), instead of once inside each subsystem's own periodic() method?",
options: [
"Calling it once centrally lets every subsystem's registered signals across a given CAN bus get pulled in a single efficient batched CAN transaction per bus per loop, instead of many separate, less efficient per-subsystem refreshes",
"WPILib requires all periodic hardware calls to happen in Robot.java",
"Subsystems are not allowed to call static methods",
"It has no effect on efficiency either way"
],
correct: 0,
explanation: "The whole point of registerSignals + refreshAll is batching: every subsystem registers its signals once at startup, but the actual refresh happens once per bus per loop from one central call, minimizing the number of separate CAN transactions needed."
},
{
prompt: "Why does LimelightHelpers provide typed classes like RawFiducial and RawDetection instead of subsystem code reading the Limelight's raw NetworkTables number arrays directly?",
options: [
"Raw NetworkTables arrays require remembering which array index corresponds to which specific piece of data; typed classes with named fields (like detection.corner0_X) hide that raw parsing behind clear, readable names, and let that parsing logic live in exactly one place",
"NetworkTables cannot publish arrays of numbers",
"RawFiducial and RawDetection are required by WPILib's Trigger class",
"Reading raw arrays directly would be faster but is disabled for safety"
],
correct: 0,
explanation: "Limelight publishes most of its data as flat number arrays. LimelightHelpers exists specifically to parse that raw data once and expose it as clearly-named Java objects, so subsystem code never has to remember or hardcode 'array index 4 means target area.'"
}
]} />

## Next Steps

Now that you've seen how the codebase talks to hardware safely and efficiently, move on to the next page to explore the control and feedforward utilities &rarr; the classes that turn sensor readings and setpoints into actual motor output.
