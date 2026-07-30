---
sidebar_position: 3
title: Tuning & Dashboard
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import NoteTabs, { NoteTab } from '@site/src/components/NoteTabs'

# Tuning & Dashboard

PID gains, feedforward constants, and tolerances almost never get set correctly on the first try. If every one of those numbers were hardcoded as a `private static final double`, changing a single `kP` value to test a fix would mean: stop the robot, edit code, recompile, redeploy, and try again &rarr; over and over, for every mechanism, every match day.

This page covers `org.steelhawks.util`'s tuning and dashboard tools, which exist to remove that redeploy step entirely, and to give drive team a way to talk to the robot code without touching Java at all:

- `LoggedTunableNumber` &rarr; the class you'll use almost every time you need a "live-editable number," logged and replayable through AdvantageKit
- `TunableNumber` &rarr; an older, simpler sibling that talks to `SmartDashboard` directly instead
- `Elastic` &rarr; sends pop-up notifications and switches dashboard tabs on our Elastic driver station dashboard
- `FeedforwardCharacterize` &rarr; automates running a mechanism through a series of voltages to help calculate feedforward constants
- `Toggles` &rarr; not technically in the `util` package, but the class that gates *when* tuning mode (and dozens of other overrides) is actually active

By the end, you'll understand not just how to make a number tunable, but why our subsystems check `Toggles.tuningMode.get()` before doing it.

---

## `LoggedTunableNumber`

`LoggedTunableNumber` is how almost every PID gain, tolerance, and feedforward constant in `Rebuilt2026` is defined. Search the codebase and you'll find it everywhere &rarr; `Swerve/DrivekP`, `Flywheel/kV`, `Turret/kP`, `Hood/kG`, and dozens more.

```java
public class LoggedTunableNumber implements DoubleSupplier {
    private static final String tableKey = "/Tuning";

    private final String key;
    private boolean hasDefault = false;
    private double defaultValue;
    private LoggedNetworkNumber dashboardNumber;
    private Map<Integer, Double> lastHasChangedValues = new HashMap<>();
```

<Note title="New term: NetworkTables">
NetworkTables is WPILib's built-in networking system that lets the robot and the driver station computer share live data over WiFi, organized like a filesystem of key/value pairs (for example `/Tuning/Swerve/DrivekP`). The robot can publish a value (like a sensor reading) for the dashboard to read, and the dashboard can publish a value (like a slider the driver dragged) for the robot to read. `LoggedTunableNumber` uses NetworkTables in *both* directions: it publishes the default value so the dashboard can display it, and reads back whatever the dashboard currently has, in case a human changed it.
</Note>

### Creating one

```java
public LoggedTunableNumber(String dashboardKey) {
    this.key = tableKey + "/" + dashboardKey;
}

public LoggedTunableNumber(String dashboardKey, double defaultValue) {
    this(dashboardKey);
    initDefault(defaultValue);
}
```

You'll almost always use the two-argument constructor, giving both a dashboard key (where it shows up under `/Tuning/...`) and a default value (what the robot uses if tuning mode is off, or if the dashboard hasn't loaded a value yet):

```java
// Hood.java
kP = new LoggedTunableNumber("Hood/kP", constants.kP());
kI = new LoggedTunableNumber("Hood/kI", constants.kI());
kD = new LoggedTunableNumber("Hood/kD", constants.kD());
kS = new LoggedTunableNumber("Hood/kS", constants.kS());
kV = new LoggedTunableNumber("Hood/kV", 0.02385);
kG = new LoggedTunableNumber("Hood/kG", constants.kG());
```

The one-argument constructor (no default) is used when a static field needs to be declared before you know its starting value yet &rarr; `initDefault(...)` is called later once the real constants are available:

```java
// SwerveModule.java
private static final LoggedTunableNumber drivekP = new LoggedTunableNumber("Swerve/DrivekP");
// ...
drivekP.initDefault(constants.DriveMotorGains.kP);
```

<Note title="Why can the default only be set once?">
```java
public void initDefault(double defaultValue) {
    if (!hasDefault) {
        hasDefault = true;
        this.defaultValue = defaultValue;
        if (Toggles.tuningMode.get()) {
            dashboardNumber = new LoggedNetworkNumber(key, defaultValue);
        }
    }
}
```
The `hasDefault` boolean guard means you called initDefault once, and it allows for an immutable `LoggedTunableNumber`. What this means is that the value of the tunable number is the only thing that can change, and it's what should be accessed and modified from **NetworkTables**, and mainly for tuning purposes. 
</Note>

### Reading the value

```java
public double get() {
    if (!hasDefault) {
        return 0.0;
    } else {
        if (dashboardNumber == null) {
            dashboardNumber = new LoggedNetworkNumber(key, defaultValue);
        }
        return Toggles.tuningMode.get() ? dashboardNumber.get() : defaultValue;
    }
}
```

This is the core behavior of the whole class, spelled out in one line: **if tuning mode is on, read the live dashboard value; otherwise, use the hardcoded default.** That's what makes it safe to leave `LoggedTunableNumber`s scattered throughout competition code &rarr; when tuning mode is off (which it should be during an actual match), every one of them behaves exactly like a plain `final double` would.

<Note title="Why check dashboardNumber == null here too?">
Because of the guard in `initDefault`, it's possible for `get()` to be called before tuning mode was ever turned on (so `dashboardNumber` was never created). This lazy-initialization check means the `LoggedNetworkNumber` object only gets created the first time it's actually needed, instead of always paying that cost up front &rarr; useful since most `LoggedTunableNumber`s spend their whole life *not* being tuned.
</Note>

### Checking whether a value changed &rarr; `hasChanged` and `ifChanged`

Reading a tunable number's `get()` every loop is fine, but calling `io.setPID(...)` on a motor controller every single loop (50 times a second) just because you *might* have changed a slider is wasteful &rarr; PID gains only need to be re-applied when they actually change. That's what `hasChanged` and `ifChanged` solve:

```java
public boolean hasChanged(int id) {
    double currentValue = get();
    Double lastValue = lastHasChangedValues.get(id);
    if (lastValue == null || currentValue != lastValue) {
        lastHasChangedValues.put(id, currentValue);
        return true;
    }
    return false;
}
```

<Note title="Why does hasChanged take an id parameter?">
The same `LoggedTunableNumber` instance might be checked from more than one place (for example, a shared swerve gain checked by all four independent `SwerveModule` objects). If `hasChanged` only remembered a single "last value," the first module to check it in a given loop would "consume" the change, and the other three modules would see `hasChanged() == false` even though *they* hadn't reacted to it yet. Passing a unique `id` per caller (the class's own `hashCode()` is the usual choice) gives each caller its own independent "have I seen this value before" memory, stored in the `lastHasChangedValues` map.
</Note>

`ifChanged` builds directly on top of `hasChanged`, and is the version you'll actually call from subsystem code:

```java
public static void ifChanged(
    int id, Consumer<double[]> action, LoggedTunableNumber... tunableNumbers) {
    boolean anyChanged = false;
    for (LoggedTunableNumber n : tunableNumbers) {
        if (n.hasChanged(id)) anyChanged = true;
    }
    if (anyChanged) {
        double[] values = new double[tunableNumbers.length];
        for (int i = 0; i < tunableNumbers.length; i++) {
            values[i] = tunableNumbers[i].get();
        }
        action.accept(values);
    }
}

/** Runs action if any of the tunableNumbers have changed */
public static void ifChanged(int id, Runnable action, LoggedTunableNumber... tunableNumbers) {
    ifChanged(id, values -> action.run(), tunableNumbers);
}
```

Notice `tunableNumbers` is declared with `...` &rarr; a **varargs** parameter, meaning you can pass in any number of `LoggedTunableNumber`s (one, three, six) and they'll all be collected into an array automatically. This is exactly what lets `ifChanged` watch an entire group of related gains (`kP`, `kI`, `kD`) at once, and only re-apply them together when *any* of them moves:

```java
// Hood.java
LoggedTunableNumber.ifChanged(
    this.hashCode(),
    () -> io.setPID(kP.get(), kI.get(), kD.get()),
    kP, kI, kD
);
```

<Note title="Why pass this.hashCode() instead of a plain number?">
`hashCode()` returns a number that (practically) uniquely identifies a specific object instance. Using `this.hashCode()` as the `id` means every `Hood` instance automatically gets its own independent change-tracking, without anyone having to invent and manage id numbers by hand. If there were ever two `Hood` objects, they'd have different hash codes and wouldn't interfere with each other's `hasChanged` bookkeeping.
</Note>

The same pattern shows up for `Swerve`, `SwerveModule`, `Flywheel`, `Turret`, and any align command that needs live PID gains:

```java
// SwerveModule.java
LoggedTunableNumber.ifChanged(hashCode(), () -> {
    io.setDrivePID(drivekP.get(), drivekI.get(), drivekD.get());
    io.setSteerPID(steerkP.get(), steerkI.get(), steerkD.get());
}, drivekP, drivekI, drivekD, steerkP, steerkI, steerkD);
```

```java
// SwerveDriveAlignment.java
protected void updatePID() {
    LoggedTunableNumber.ifChanged(hashCode(), () -> {
        angleController.setPID(
            AutonConstants.ROTATION_KP.get(),
            AutonConstants.ROTATION_KI.get(),
            AutonConstants.ROTATION_KD.get());
    },
        AutonConstants.ROTATION_KP,
        AutonConstants.ROTATION_KI,
        AutonConstants.ROTATION_KD);
}
```

### Tuning-only overrides: open-loop voltage and current testing

Beyond PID gains, `LoggedTunableNumber` is also used to build **manual override sliders** that only appear (and only do anything) while tuning mode and a specific toggle are both on:

```java
// Flywheel.java
if (Toggles.tuningMode.get()) {
    if (Toggles.Flywheel.toggleVoltageOverride.get()) {
        if (tuningVolts == null) {
            tuningVolts = new LoggedTunableNumber("Flywheel/TuningVolts", 0.0);
        }
        io.runFlywheelOpenLoop(tuningVolts.get(), false);
    }
    if (Toggles.Flywheel.toggleCurrentOverride.get()) {
        if (tuningAmps == null) {
            tuningAmps = new LoggedTunableNumber("Flywheel/TuningAmps", 0.0);
        }
        io.runFlywheelOpenLoop(tuningAmps.get(), true);
    }
    LoggedTunableNumber.ifChanged(this.hashCode(), () -> {
        io.setPID(kP.get(), kI.get(), kD.get());
    }, kP, kI, kD);
}
```

<NoteTabs>
  <NoteTab title="Why the lazy tuningVolts == null check?">
`tuningVolts` isn't created in the constructor &rarr; it's only created the first time the voltage override toggle is actually flipped on. This avoids cluttering the dashboard with a `Flywheel/TuningVolts` entry for every single mechanism at all times; the entry only appears once someone actually needs it. The same `Hood`, `Intake`, and `SwerveModule` (via `driveOpenLoop`/`turnOpenLoop`) classes follow this exact pattern for testing raw voltage or current output on a motor, bypassing closed-loop control entirely &rarr; useful for diagnosing "is this actually a PID problem, or is the motor/wiring broken?"
</NoteTab>
  <NoteTab title="New term: open-loop vs. closed-loop control">
**Closed-loop** control means the code constantly checks the mechanism's actual position/velocity (from an encoder) and adjusts its output to correct any error &rarr; that's what a PID controller does. **Open-loop** control means just commanding a fixed voltage or duty cycle and not checking anything afterward &rarr; "just send 2 volts and see what happens." Testing a mechanism open-loop is a useful debugging step because it isolates hardware problems (bad wiring, a stuck mechanism, a miscalibrated encoder) from tuning problems (bad `kP`), since open-loop mode doesn't depend on the encoder feedback being correct at all.
</NoteTab>
</NoteTabs>

---

## `TunableNumber`

`TunableNumber` predates `LoggedTunableNumber` and solves the exact same problem, but talks to plain `SmartDashboard` instead of AdvantageKit's `LoggedNetworkNumber`:

```java
public class TunableNumber implements DoubleSupplier {
    private static final String TABLE_KEY = "TunableNumbers/";

    private final String key;
    private double defaultValue;
    private double lastValue = defaultValue;

    public TunableNumber(String dashboardKey, double defaultValue) {
        this.key = TABLE_KEY + dashboardKey;
        setDefault(defaultValue);
    }

    public double get() {
        return isTuningMode() ? SmartDashboard.getNumber(key, defaultValue) : defaultValue;
    }
}
```

<Note title="SmartDashboard vs. LoggedNetworkNumber &rarr; what's the actual difference?">
Both ultimately read and write values over NetworkTables, so functionally they look almost identical from the outside. The difference is *when* AdvantageKit-aware code (like `LoggedNetworkNumber`) captures its values: `LoggedTunableNumber` values get folded into AdvantageKit's log replay system, meaning during a log replay, the exact tunable value used *during the actual match* is faithfully reproduced. `SmartDashboard.getNumber(...)` calls made through plain `TunableNumber` are not replay-safe in the same way &rarr; the value read back during a replay could differ from what was live on the field. This is why `LoggedTunableNumber` is the one used almost everywhere in `Rebuilt2026` today; `TunableNumber` is mostly legacy/template code kept around for reference.
</Note>

`isTuningMode()` on both classes is a private wrapper around the same underlying check:

```java
private boolean isTuningMode() {
    return Toggles.tuningMode.get();
}
```

Which brings us to the class that actually gates all of this.

---

## `Toggles`: the switchboard tuning mode lives behind

`Toggles` isn't in the `util` package (it lives directly in `org.steelhawks`), but every tuning tool on this page checks it before doing anything, so it's worth understanding here.

```java
public interface Toggles {
    LoggedNetworkBoolean debugMode =
        new LoggedNetworkBoolean("Toggles/DebugMode", false);
    LoggedNetworkBoolean tuningMode =
        new LoggedNetworkBoolean("Toggles/TuningMode", false);
    // ...
}
```

<Note title="New term: LoggedNetworkBoolean">
This is the boolean counterpart to `LoggedNetworkNumber` &rarr; a boolean value published over NetworkTables (so a dashboard checkbox can flip it) that AdvantageKit also captures for log replay. `Toggles.tuningMode` is a single global switch: when it's `true`, every `LoggedTunableNumber.get()` call across the entire codebase starts reading live dashboard values instead of hardcoded defaults, all at once.
</Note>

`Toggles` also defines dozens of per-subsystem overrides, organized as nested interfaces &rarr; `Toggles.Flywheel.toggleVoltageOverride`, `Toggles.Swerve.driveOpenLoopOverride`, `Toggles.Hood.disableBrakeMode`, and so on:

```java
interface Flywheel {
    LoggedNetworkBoolean isEnabled =
        new LoggedNetworkBoolean("Toggles/Flywheel/IsEnabled", true);
    LoggedNetworkBoolean toggleVoltageOverride =
        new LoggedNetworkBoolean("Toggles/Flywheel/ToggleVoltageOverride", false);
    LoggedNetworkBoolean toggleCurrentOverride =
        new LoggedNetworkBoolean("Toggles/Flywheel/ToggleCurrentOverride", false);
    LoggedNetworkBoolean toggleAdaptiveFeedforward =
        new LoggedNetworkBoolean("Toggles/Flywheel/ToggleAdaptiveFeedforward", true);
}
```

This two-level structure &rarr; a global `tuningMode` switch, plus a specific override switch per mechanism &rarr; is *why* the tuning code you saw above always checks both:

```java
if (Toggles.tuningMode.get()) {
    if (Toggles.Flywheel.toggleVoltageOverride.get()) {
        // ...
    }
}
```

You have to be in tuning mode globally *and* have flipped that specific mechanism's override switch, which prevents someone from accidentally leaving a single mechanism stuck in open-loop voltage mode and having it silently activate the next time tuning mode gets turned on for something unrelated.

`Toggles` also has a static helper for building one-shot "momentary" dashboard buttons &rarr; a button that runs a command once, then automatically resets itself:

```java
private static void bindMomentary(String key, Command command) {
    var toggle = new LoggedNetworkBoolean(key, false);
    new Trigger(toggle::get)
        .onTrue(command.andThen(Commands.runOnce(() -> toggle.set(false))));
}
```

which is what powers dashboard "zero the turret" / "zero the hood" buttons used from `configureOverrides()`:

```java
static void configureOverrides() {
    if (RobotConfig.getConfig().hasTurret && Constants.getRobot() != Constants.RobotType.OMEGABOT)
        bindMomentary("Dashboard/Zero/Turret", RobotContainer.s_Turret.zeroTurret());
    if (RobotConfig.getConfig().hasHood)
        bindMomentary("Dashboard/Zero/Hood", RobotContainer.s_Hood.zeroHood());
    // ...
}
```

<Note title="What makes a button 'momentary'?">
A `LoggedNetworkBoolean` used as a dashboard button naturally stays `true` after you click it, since nothing sets it back to `false` on its own. `bindMomentary` fixes that by chaining `Commands.runOnce(() -> toggle.set(false))` onto the end of whatever command the button triggers &rarr; so the moment the zeroing command finishes, the toggle flips itself back off, and the dashboard button is ready to be pressed again. Without this, the button would only work once per code deploy.
</Note>

---

## `Elastic`

[Elastic](https://github.com/Gold872/elastic-dashboard) is the dashboard software our drive team uses on the driver station laptop during matches. `Elastic` (the util class) is a thin wrapper that lets robot code control *that dashboard* over NetworkTables &rarr; showing pop-up notifications, and jumping to a specific tab.

```java
public final class Elastic {
    private static final StringTopic notificationTopic =
        NetworkTableInstance.getDefault().getStringTopic("/Elastic/RobotNotifications");
    private static final StringPublisher notificationPublisher =
        notificationTopic.publish(PubSubOption.sendAll(true), PubSubOption.keepDuplicates(true));
    private static final StringTopic selectedTabTopic =
        NetworkTableInstance.getDefault().getStringTopic("/Elastic/SelectedTab");
    private static final StringPublisher selectedTabPublisher =
        selectedTabTopic.publish(PubSubOption.keepDuplicates(true));
```

<NoteTabs>
  <NoteTab title="New term: Topic and Publisher">
In NetworkTables terms, a **topic** is the *name* of a communication channel (like `/Elastic/SelectedTab`), and a **publisher** is the object your code actually calls `.set(...)` on to send a new value out on that topic. Separating them lets you configure how values are sent (see `PubSubOption` below) once, up front, instead of every time you publish a value.
</NoteTab>
  <NoteTab title="What do sendAll and keepDuplicates mean?">
By default, NetworkTables optimizes bandwidth by *not* re-sending a value if it hasn't changed since the last publish. That's usually what you want for something like a sensor reading, but it's exactly wrong for notifications &rarr; if the robot wants to show the *same* warning message twice in a row (say, "Flywheel Overheating" fires again a minute later), a naive publisher would silently drop the second one since the string is identical to the first. `PubSubOption.sendAll(true)` and `PubSubOption.keepDuplicates(true)` disable that optimization for the notification publisher specifically, guaranteeing every `sendNotification(...)` call actually reaches the dashboard, even if it looks identical to the last one.
</NoteTab>
</NoteTabs>

### Selecting a tab

```java
public static void selectTab(String tabName) {
    selectedTabPublisher.set(tabName);
}

public static void selectTab(int tabIndex) {
    selectTab(Integer.toString(tabIndex));
}
```

`Robot.java` uses this to automatically switch the driver's view to the right tab as the match progresses, without anyone touching the dashboard by hand:

```java
// Robot.java
Elastic.selectTab("Teleoperated");
```

### Sending notifications

```java
public static void sendNotification(Notification notification) {
    try {
        notificationPublisher.set(objectMapper.writeValueAsString(notification));
    } catch (JsonProcessingException e) {
        e.printStackTrace();
    }
}
```

<Note title="New term: serialization / JSON">
Elastic's notification popup needs several pieces of information at once &rarr; a level, a title, a description, how long to show it, and its size. NetworkTables strings can only carry text, not a structured Java object directly, so `Elastic` **serializes** the `Notification` object into a single JSON string (a standard, human-readable text format for structured data, like `{"level":"INFO","title":"...","description":"..."}`) using Jackson's `ObjectMapper`, and sends that string over the wire. Elastic's dashboard code on the other end knows how to parse that same JSON format back into a notification popup.
</Note>

`Notification` itself is a small, chainable **builder-style** object &rarr; every `withX(...)` method sets a field and returns `this`, so notifications can be constructed and configured in one expression:

```java
public Notification withLevel(NotificationLevel level) {
    this.level = level;
    return this;
}

public Notification withTitle(String title) {
    setTitle(title);
    return this;
}
```

which would typically be used like:

```java
Elastic.sendNotification(
    new Elastic.Notification()
        .withLevel(Elastic.Notification.NotificationLevel.WARNING)
        .withTitle("Flywheel Overheating")
        .withDescription("Stator current exceeded safe threshold")
        .withDisplaySeconds(5.0));
```

<Note title="New term: method chaining / builder pattern">
Notice each `withX` method returns `this` instead of `void`. That's what lets you write `.withLevel(...).withTitle(...).withDescription(...)` all in a single chained expression, rather than creating a `Notification`, then calling four separate statements to configure it. This pattern is called the **builder pattern**, and it's especially useful for objects like `Notification` that have several optional settings with sensible defaults (`3000`ms display time, auto-inferred height) &rarr; you only chain the `with...` calls for the settings you actually want to override.
</Note>

`NotificationLevel` is a simple `enum` controlling the popup's color/icon on the dashboard:

```java
public enum NotificationLevel {
    INFO,
    WARNING,
    ERROR
}
```

---

## `FeedforwardCharacterize`

Feedforward control (the "expected voltage for this speed" term in a mechanism's control loop) needs constants like `kV` (volts per unit of velocity). Rather than guessing `kV` or computing it by hand from a spec sheet, `FeedforwardCharacterize` automates the process of measuring it directly from the real mechanism.

<Note title="New term: feedforward and kV">
A feedforward term predicts the voltage a mechanism needs *before* any feedback correction, based on physics: "to spin this flywheel at X radians/sec, I already know from experience it roughly needs Y volts, so start there instead of waiting for a PID controller to slowly ramp up to it." `kV` specifically is the "volts per unit of velocity" constant in that prediction &rarr; a stiffer or heavier mechanism needs a higher `kV` to reach the same speed.
</Note>

```java
public static Command runkV(
    DoubleConsumer voltageSetter, DoubleSupplier encoderPosition, DoubleSupplier encoderVelocity,
    SubsystemBase subsystem, double minPosition, double maxPosition) {
    List<Double> voltages = List.of(0.5, 1.0, 1.5, 2.0, 2.5);
    List<Double> velocities = new ArrayList<>();
    List<Double> recordedVoltages = new ArrayList<>();

    return Commands.sequence(
        Commands.runOnce(() -> voltageSetter.accept(0), subsystem),
        Commands.sequence(
            voltages.stream().map(voltage ->
                Commands.sequence(
                    Commands.runOnce(() -> {
                        double position = encoderPosition.getAsDouble();
                        if (position >= maxPosition) return;
                        voltageSetter.accept(voltage);
                        recordedVoltages.add(voltage);
                    }, subsystem),
                    Commands.waitSeconds(1.0), // time to let mechanism stabilize itself
                    Commands.runOnce(() -> velocities.add(encoderVelocity.getAsDouble()), subsystem)
                )
            ).toArray(Command[]::new)
        ),
        // ...
    );
}
```

The command runs the mechanism at a fixed list of voltages (`0.5V, 1.0V, 1.5V, 2.0V, 2.5V`), waits a second at each one for the speed to stabilize, and records the resulting steady-state velocity &rarr; then repeats it in reverse. Once every voltage/velocity pair is collected, it estimates `kV` as the average slope between consecutive points:

```java
private static double calculateKV(List<Double> voltages, List<Double> velocities) {
    double sumSlope = 0;
    int count = voltages.size() - 1;
    for (int i = 0; i < count; i++) {
        double slope = (velocities.get(i + 1) - velocities.get(i)) / (voltages.get(i + 1) - voltages.get(i));
        sumSlope += slope;
    }
    return sumSlope / count;
}
```

<NoteTabs>
  <NoteTab title="Why is slope the right way to calculate kV?">
If voltage and velocity are (roughly) proportional &rarr; which is the whole assumption behind a `kV` feedforward term &rarr; then plotting velocity against voltage should look close to a straight line through the origin, and `kV` is exactly that line's **slope** (`Δvelocity / Δvoltage`). Measuring the slope between several different voltage steps, then averaging those slopes together, gives a more reliable estimate than trusting any single data point, since it smooths out sensor noise or a mechanism that hadn't fully stabilized during the 1-second wait.
</NoteTab>
  <NoteTab title="This class is marked 'UNTESTED' &rarr; why include it at all?">
```java
// everything is UNTESTED
```
Not every utility class in a season's codebase gets used in that season's robot. `FeedforwardCharacterize` is a good example of infrastructure that was written to be *available* &rarr; a generic tool any future mechanism could reach for &rarr; even if it wasn't exercised on this year's robot. Compare this to WPILib's own SysId tooling (which `Swerve.java` uses instead, via `driveSysIdQuasistatic`/`driveSysIdDynamic`), which solves a very similar problem with a more heavily tested, general-purpose library.
</NoteTab>
</NoteTabs>

---

## Putting it together: a realistic tuning session

Here's how a driver-station tuning session for the flywheel's PID gains would flow through these classes:

```text
Drive team flips "TuningMode" checkbox on Elastic
                │
                ▼
     Toggles.tuningMode  becomes true (LoggedNetworkBoolean over NetworkTables)
                │
                ▼
  Flywheel.periodic() sees Toggles.tuningMode.get() == true
                │
                ▼
   kP / kI / kD (LoggedTunableNumber) now read live dashboard
   values instead of their hardcoded defaults
                │
                ▼
  LoggedTunableNumber.ifChanged(...) notices a value moved,
  and calls io.setPID(kP.get(), kI.get(), kD.get()) exactly once
                │
                ▼
      Elastic.sendNotification(...) confirms "PID Updated"
      as a pop-up on the dashboard
```

Every class on this page plays one clear role in that chain: `Toggles` is the master switch, `LoggedTunableNumber` is the live value plus change-detection, and `Elastic` is the feedback loop back to the humans watching the dashboard.

---

<Quiz questions={[
{
prompt: "Why does LoggedTunableNumber.get() return the hardcoded default instead of the dashboard value when Toggles.tuningMode is false?",
options: [
"So that competition code behaves exactly like using a plain final double, with zero risk of a leftover dashboard value silently affecting a real match",
"Because reading from NetworkTables is too slow to do every loop",
"Because the dashboard value is deleted whenever tuning mode is turned off",
"LoggedTunableNumber cannot read values while the robot is enabled"
],
correct: 0,
explanation: "This is exactly why it's safe to leave LoggedTunableNumbers scattered throughout competition code: with tuning mode off, every one of them ignores whatever is on the dashboard and just returns its safe, hardcoded default."
},
{
prompt: "Why does LoggedTunableNumber.hasChanged take an id parameter instead of just remembering a single 'last value'?",
options: [
"To make the method run faster",
"Because NetworkTables requires a unique key for every read",
"So multiple independent callers (like four separate SwerveModule instances sharing one gain) can each track whether *they* have seen the latest change, without 'consuming' it for each other",
"id is required by the DoubleSupplier interface"
],
correct: 2,
explanation: "If hasChanged only tracked one global 'last value,' the first caller to check it in a loop would consume the change, and other callers checking the same LoggedTunableNumber would incorrectly see hasChanged() == false even though they hadn't reacted to it yet."
},
{
prompt: "In Toggles, why do tuning overrides check both Toggles.tuningMode AND a mechanism-specific toggle like Toggles.Flywheel.toggleVoltageOverride?",
options: [
"Checking two booleans is a WPILib requirement",
"toggleVoltageOverride only exists to satisfy a Java interface",
"So a single mechanism can't get stuck running in open-loop override mode and silently reactivate the next time tuning mode is turned on globally for something unrelated",
"There is no real reason, it's leftover template code"
],
correct: 2,
explanation: "Requiring both the global tuningMode switch and a specific mechanism's override switch prevents an accidentally-left-on override (like Flywheel voltage override) from suddenly taking effect the next time someone turns on tuning mode to test something completely different."
},
{
prompt: "Why does Elastic serialize its Notification object to a JSON string before publishing it, instead of publishing the fields directly?",
options: [
"NetworkTables strings can only hold plain text, so a structured object with multiple fields (level, title, description, etc.) has to be encoded into one string that the dashboard knows how to parse back into a notification",
"JSON is required by the WPILib Trigger class",
"Serialization makes the notification display for a shorter amount of time",
"Elastic does not support numeric NetworkTables values"
],
correct: 0,
explanation: "A NetworkTables StringTopic can only carry text. Since a Notification bundles several related pieces of data together, Elastic serializes the whole object into a single JSON string that Elastic's own dashboard code knows how to parse back into a popup."
},
{
prompt: "Why does FeedforwardCharacterize calculate kV as the average slope between voltage/velocity data points, rather than just velocity divided by voltage at a single point?",
options: [
"Averaging several slopes together smooths out sensor noise and any single measurement that hadn't fully stabilized, giving a more reliable estimate than trusting one data point alone",
"A single data point cannot be used in Java math",
"Division only works correctly with at least two numbers",
"Averaging is required by the DoubleConsumer interface"
],
correct: 0,
explanation: "kV is the slope of a roughly linear voltage-to-velocity relationship. Measuring that slope across several different voltage steps and averaging the results reduces the impact of noise or an unstabilized reading at any one point."
}
]} />

## Next Steps

Now that you've seen how to make numbers tunable and talk to the driver station dashboard, move on to the next page to explore the hardware helper classes in `util` &rarr; the ones that keep motor controller calls safe and efficient.
