---
sidebar_position: 7
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import NoteTabs, { NoteTab } from '@site/src/components/NoteTabs'

# Timing & Logging

A robot's main loop runs 50 times a second, every 20ms, for the entire match. If any single piece of that loop &rarr; a subsystem's `periodic()`, a vision update, a command &rarr; takes even a little too long, the whole loop overruns, and everything downstream of it (motor commands, odometry updates, driver feedback) gets delayed. You can't fix what you can't measure, so this page covers the small set of classes in `org.steelhawks.util` that exist to *measure* the robot &rarr; how long each piece of code takes, how much battery it's using, and a couple of small helpers for detecting state changes over time:

- `LoopTimeUtil` &rarr; measures and logs how long each chunk of `robotPeriodic()` takes, so loop overruns can be traced back to a specific subsystem
- `BatteryUtil` &rarr; integrates current draw over time to log amp-hours and watt-hours used during a match
- `VirtualSubsystem` &rarr; a lightweight alternative to `SubsystemBase` for periodic logic that doesn't belong to the `CommandScheduler`, with built-in 20ms overrun warnings
- `LatchedBoolean` &rarr; a tiny "did this just become true?" edge detector
- `DoublePressTrigger` &rarr; a `Trigger` that only fires after the same condition becomes true twice within a debounce window
- `DashboardTrigger` &rarr; a legacy Kotlin `Trigger` that reads a boolean straight off a "controls" NetworkTables entry

By the end, you'll understand not just how each of these works, but why "how long did that take?" and "did this just start being true?" are common enough problems in robot code to deserve their own reusable classes.

---

## `LoopTimeUtil`

`LoopTimeUtil` answers a simple but critical question during debugging: *"my loop overran 20ms &rarr; which specific chunk of code is actually slow?"*

```java
public class LoopTimeUtil {

    private static double startTime = -1;

    private LoopTimeUtil() {
        throw new InstantiationError("This is a utility class and cannot be instantiated.");
    }

    public static void reset() {
        startTime = Timer.getFPGATimestamp();
    }

    public static void record(String subsystem) {
        double now = Timer.getFPGATimestamp();
        Logger.recordOutput("LoopTimes/" + subsystem + "ms", (now - startTime) * 1000.0);
        startTime = now;
    }
}
```

<Note title="Static class, private constructor &rarr; a pattern you've seen before">
Just like `PhoenixUtil` and `BatteryUtil`, `LoopTimeUtil` is meant to be used entirely through `static` methods, and its `private` constructor immediately throws if anyone tries `new LoopTimeUtil()` by mistake. There's no reason for more than one "current timing checkpoint" to exist at once &rarr; a single `static startTime` field is all this class needs.
</Note>

### The pattern: `reset()` once, `record(...)` repeatedly

The whole class is built around two calls working together:

- `reset()` &rarr; marks "the clock starts now," called once at the very top of `robotPeriodic()`
- `record(subsystem)` &rarr; logs how much time has passed since the *last* `reset()` or `record()` call, under a name you choose, then immediately resets the clock again for the next segment

This means each `record(...)` call doesn't measure "total time since the loop started" &rarr; it measures "time since the *previous checkpoint*," which is exactly what you want when you're trying to find which specific segment is slow, rather than just knowing the whole loop was slow.

```java
// Robot.java
@Override
public void robotPeriodic() {
    LoopTimeUtil.reset();

    PhoenixUtil.refreshAll();
    LoopTimeUtil.record("PhoenixUtil");

    org.steelhawks.RobotState.getInstance().periodic();
    CommandScheduler.getInstance().run();
    LoopTimeUtil.record("Commands");

    BatteryUtil.integrateAndLogTotal();
    LoopTimeUtil.record("BatteryUtil");
    // ...
    LoopTimeUtil.record("RobotPeriodic");
}
```

<Note title="Reading this chain of calls">
Notice `record("Commands")` covers *two* lines &rarr; both the `RobotState` update and `CommandScheduler.getInstance().run()`. That's intentional: `LoopTimeUtil` doesn't automatically know where one logical section ends and another begins, it only knows "time since the last checkpoint you told it about." It's up to whoever writes the code to decide how finely to slice the loop into named segments &rarr; here, `PhoenixUtil` (CAN refresh), `Commands` (the whole scheduler pass, including every subsystem's `periodic()` and every running command), and `BatteryUtil` each get their own segment, so a dashboard showing `LoopTimes/Commandsms` spiking to 15ms immediately tells you *where* to look, even before checking any individual subsystem.
</Note>

### Subsystems record their own segments too

`LoopTimeUtil` isn't limited to `Robot.java` &rarr; individual subsystems call `record(...)` at the end of their own `periodic()` methods, giving even finer-grained timing data:

```java
// Swerve.java
public void periodic() {
    // ... odometry updates, module periodic, pose estimation ...
    LoopTimeUtil.record("Swerve");
}
```

```java
// Turret.java
public void periodic() {
    // ... trajectory generation, motor output ...
    LoopTimeUtil.record("Turret");
}
```

<Note title="Why is this safe even though the checkpoint is shared globally?">
Since `startTime` is a single `static` field shared across the whole robot, every one of these `record(...)` calls &mdash; whether from `Robot.java`, `Swerve.java`, or `Turret.java` &mdash; is really measuring the same thing: "time since whichever `record()` or `reset()` ran immediately before this one." As long as `CommandScheduler.getInstance().run()` calls every subsystem's `periodic()` in a predictable order each loop (which it does), each subsystem's `record(...)` call ends up timing just its own slice of that pass, back to back, without any subsystem needing to know about the others.
</Note>

Once logged, every `LoopTimes/...ms` entry shows up as its own line on an AdvantageScope graph, so during a debugging session you can literally watch which subsystem's line spikes at the exact moment the robot stutters.

---

## `BatteryUtil`

Robots run on a finite battery, and knowing *how much* power a match actually used &rarr; and which subsystem used the most of it &rarr; is valuable both for diagnosing brownouts and for planning practice match schedules around battery charge cycles. `BatteryUtil` answers this by integrating current draw over time into running totals.

```java
public class BatteryUtil {
    private static double lastMeasurement = -1;
    private static double loopTotalCurrent = 0;
    private static double ampHoursUsed = 0.0;
    private static double wattHoursUsed = 0.0;

    private BatteryUtil() {
        throw new InstantiationError("This is a utility class and cannot be instantiated.");
    }

    public static void reset() {
        loopTotalCurrent = 0;
    }
```

<NoteTabs>
  <NoteTab title="New term: amp-hours and watt-hours">
An **amp-hour** (Ah) is a unit of electric charge: drawing 1 amp continuously for 1 hour uses 1 amp-hour. Batteries are often rated in amp-hours (an FRC battery is roughly 18 Ah) &rarr; knowing how many amp-hours a match used tells you roughly what fraction of the battery's total capacity got consumed. A **watt-hour** (Wh) is a unit of actual energy (amp-hours multiplied by voltage), which is a more complete picture since it accounts for the battery sagging under load &rarr; the same current draw at a lower voltage represents less actual energy delivered.
  </NoteTab>
  <NoteTab title="Why does reset() only clear loopTotalCurrent, not the running totals?">
`ampHoursUsed` and `wattHoursUsed` are meant to keep accumulating for the *entire match*, so they're never reset during normal operation &mdash; only `loopTotalCurrent` (this loop's running sum of every subsystem's current draw) gets zeroed out, once per loop, so each new loop starts counting from zero again instead of double-counting the previous loop's current.
  </NoteTab>
</NoteTabs>

### Subsystems report their own current draw

Every subsystem that draws significant current calls `recordCurrentUsage(...)` once per loop, adding its own reading into the shared running total:

```java
public static void recordCurrentUsage(String device, double currentAmps) {
    loopTotalCurrent += currentAmps;
    Logger.recordOutput("BatteryUtil/Devices/" + device, currentAmps);
}
```

```java
// Flywheel.java
BatteryUtil.recordCurrentUsage("Flywheel", inputs.leftSupplyCurrentAmps + inputs.rightSupplyCurrentAmps);
```

```java
// SwerveModule.java
BatteryUtil.recordCurrentUsage(batteryKey, inputs.driveCurrentAmps + inputs.turnCurrentAmps);
```

```java
// Indexer.java
BatteryUtil.recordCurrentUsage("Feeder", feederInputs.currentAmps);
BatteryUtil.recordCurrentUsage(
    "Spindexer",
    spindexerInputs.motor1CurrentAmps + spindexerInputs.motor2CurrentAmps);
```

<Note title="Two things happening in one method">
`recordCurrentUsage` does two jobs at once: it adds `currentAmps` into the shared `loopTotalCurrent` running sum (used later for the amp-hour/watt-hour math), *and* it logs that individual device's current draw under its own name (`BatteryUtil/Devices/Flywheel`, `BatteryUtil/Devices/Feeder`, etc.). That second part means you get a per-device breakdown "for free" &mdash; if the robot ever browns out, you can look at the `BatteryUtil/Devices/...` logs from that exact moment and immediately see which mechanism was pulling the most current when it happened.
</Note>

### Integrating current into amp-hours and watt-hours

Once every subsystem has reported its current for this loop, one central call turns that running total into the match's cumulative energy usage:

```java
public static void integrateAndLogTotal() {
    double now = Timer.getFPGATimestamp();
    double voltage = RobotController.getBatteryVoltage();
    loopTotalCurrent += RobotController.getInputCurrent();

    Logger.recordOutput("BatteryUtil/TotalCurrentDraw", loopTotalCurrent);

    if (lastMeasurement < 0) {
        // first run, don't integrate yet
        lastMeasurement = now;
        return;
    }

    double dt = now - lastMeasurement;
    ampHoursUsed += (loopTotalCurrent * dt) / 3600.0;

    double power = voltage * loopTotalCurrent;
    wattHoursUsed += (power * dt) / 3600.0;

    lastMeasurement = now;
    Logger.recordOutput("BatteryUtil/AmpHoursUsed", ampHoursUsed);
    Logger.recordOutput("BatteryUtil/CurrentAmps", loopTotalCurrent);
    Logger.recordOutput("BatteryUtil/Power", power);
    Logger.recordOutput("BatteryUtil/WattHours", wattHoursUsed);
}
```

<NoteTabs>
  <NoteTab title="New term: numerical integration, and why dt matters">
"Integrating" current over time just means adding up small slices of `current × time` to build a running total of charge used. Since this runs once every loop, `loopTotalCurrent * dt` represents "how many amp-*seconds* were used during this one 20ms slice," and dividing by `3600` converts that into amp-*hours* to match the units the rest of the class uses. Using the *actual* elapsed time (`now - lastMeasurement`) rather than assuming a fixed 20ms every loop matters because a loop overrun (exactly the kind `LoopTimeUtil` helps you find!) would make that slice longer than expected &mdash; using real `dt` keeps the integration accurate even when the loop doesn't run at a perfectly steady 50Hz.
  </NoteTab>
  <NoteTab title="Why skip integration on the very first run?">
On the very first call, `lastMeasurement` is still `-1` (its initial sentinel value), meaning there's no previous timestamp to compute a `dt` against yet. Integrating anyway would either throw away a meaningless `dt` calculated against `-1`, or (worse) silently produce a huge, wrong `dt`. The guard `if (lastMeasurement < 0)` just records the current timestamp as a baseline and returns early, so the very next call has a valid, small `dt` to work with.
  </NoteTab>
  <NoteTab title="RobotController.getInputCurrent() vs. each subsystem's recordCurrentUsage">
Notice `integrateAndLogTotal()` calls `loopTotalCurrent += RobotController.getInputCurrent();` &mdash; adding in a reading straight from the PDP/roboRIO's own total input current sensor, on top of whatever individual subsystems already added via `recordCurrentUsage`. This means the final `BatteryUtil/TotalCurrentDraw` number isn't purely "the sum of everything we happened to instrument" &mdash; it's anchored to a real hardware measurement of the *entire* robot's current draw, so it stays accurate even for devices (like the roboRIO itself, or a sensor) that never explicitly call `recordCurrentUsage`.
  </NoteTab>
</NoteTabs>

### How it fits into `Robot.java`

```java
// Robot.java
@Override
public void robotPeriodic() {
    LoopTimeUtil.reset();
    BatteryUtil.reset();

    PhoenixUtil.refreshAll();
    // ... subsystem periodic() calls happen here via CommandScheduler,
    //     each one calling BatteryUtil.recordCurrentUsage(...) along the way ...
    CommandScheduler.getInstance().run();

    BatteryUtil.integrateAndLogTotal();
    LoopTimeUtil.record("BatteryUtil");
    // ...
}
```

The ordering here matters: `BatteryUtil.reset()` runs first (clearing last loop's total), then every subsystem's `periodic()` (invoked indirectly through `CommandScheduler.getInstance().run()`) calls `recordCurrentUsage(...)` to add its own draw into the now-empty total, and only *after* every subsystem has had a chance to report in does `integrateAndLogTotal()` run once, converting that loop's fully-assembled total into the match's running amp-hour and watt-hour totals.

---

## `VirtualSubsystem`

Most periodic logic in the codebase lives inside a `SubsystemBase`, whose `periodic()` method is automatically called every loop by the `CommandScheduler`. But sometimes you want periodic logic for something that *isn't* really a physical subsystem &mdash; there's no motor to control, no hardware `IO` layer &mdash; and registering it with the full `SubsystemBase`/command-requirement machinery would be overkill. `VirtualSubsystem` exists for exactly that case.

```java
public abstract class VirtualSubsystem {

    private static final List<VirtualSubsystem> mSubsystems = new ArrayList<>();
    private final String subsystemName;
    private static long lastOverrunTime = 0; // Last time an overrun was logged

    public abstract void periodic();

    public VirtualSubsystem() {
        mSubsystems.add(this);
        subsystemName = getClass().getSimpleName();
    }

    public VirtualSubsystem(String name) {
        mSubsystems.add(this);
        subsystemName = name;
    }
```


### `periodicAll()`: running every virtual subsystem, with overrun detection

```java
public static void periodicAll() {
    long currentTime = RobotController.getFPGATime();
    boolean shouldPrintOverrun = (currentTime - lastOverrunTime) >= 5_000_000; // 5 sec

    StringBuilder overrunMessage = new StringBuilder("WARNING: The following subsystems exceeded 20ms:\n");
    boolean overrunOccurred = false;

    for (VirtualSubsystem subsystem : mSubsystems) {
        long startTime = RobotController.getFPGATime();
        subsystem.periodic();
        long endTime = RobotController.getFPGATime();

        double loopTimeMs = (endTime - startTime) / 1_000.0; // convert to ms

        if (loopTimeMs > 20) {
            overrunOccurred = true;
            overrunMessage.append(
                String.format("  - %s: %.3f ms\n", subsystem.subsystemName, loopTimeMs));
        }
    }

    if (overrunOccurred && shouldPrintOverrun) {
        DriverStation.reportError(overrunMessage.toString(), false);
        System.out.println("VirtualSubsystem Loop Overrun");
        lastOverrunTime = currentTime;
    }
}
```

<NoteTabs>
  <NoteTab title="Why measure each subsystem's time individually, right here, instead of relying on LoopTimeUtil?">
`LoopTimeUtil` requires someone to remember to call `record("Name")` after each segment, by hand, at the right spot in the code. `VirtualSubsystem.periodicAll()` builds essentially the same idea &mdash; "how long did this take?" &mdash; directly into the loop that iterates over every registered subsystem, using `RobotController.getFPGATime()` (microsecond-precision, hence the `/ 1_000.0` to convert to milliseconds) around each individual `subsystem.periodic()` call. This means *every* `VirtualSubsystem`, current and future, automatically gets overrun detection for free, without any of them needing to remember to call `LoopTimeUtil.record(...)` themselves.
  </NoteTab>
  <NoteTab title="Why rate-limit the warning to once every 5 seconds?">
`shouldPrintOverrun` only becomes `true` if at least 5,000,000 microseconds (5 real seconds) have passed since the last overrun warning was printed. Without this, a subsystem that's consistently slightly slow than 20ms would spam `DriverStation.reportError(...)` on literally every single 20ms loop &mdash; 50 times a second &mdash; flooding the driver station console and making it useless for spotting *other* problems. Rate-limiting to once every 5 seconds keeps the warning visible without drowning out everything else.
  </NoteTab>
</NoteTabs>

<Note title="Why 20 milliseconds specifically?">
20ms (50Hz) is the length of one full robot loop by default in WPILib. If a single `VirtualSubsystem`'s `periodic()` alone takes longer than the *entire* loop is supposed to take, that's a strong signal something in that specific piece of code is unusually slow &mdash; not just "the whole robot is a little busy this loop," but "this one thing, by itself, is a problem."
</Note>

---

## `LatchedBoolean`: detecting a rising edge

Sometimes you don't care about a boolean's current value &mdash; you care about the exact *moment* it changes from `false` to `true`. Checking `if (condition)` every loop would fire repeatedly for as long as the condition stays true; `LatchedBoolean` fires exactly once, on the transition.

```java
public class LatchedBoolean {
    private boolean mLast = false;

    public boolean update(boolean newValue) {
        boolean ret = newValue && !mLast;
        mLast = newValue;
        return ret;
    }
}
```

<Note title="New term: rising edge">
A "rising edge" is electronics terminology for the exact instant a signal transitions from low (`false`/`0`) to high (`true`/`1`) &mdash; as opposed to a "falling edge" (high to low), or just being high. `mLast && !mLast` type logic (spelled out here as `newValue && !mLast`) is the standard, tiny pattern for detecting a rising edge in code: "the new value is true, *and* the previous value wasn't" &mdash; which can only be true on the exact loop where the transition happens, never before or after.
</Note>

`update(...)` is called once per loop with the latest value of whatever you're watching, and only returns `true` on the single loop where that value first became `true`:

```java
// RobotState.java
private final LatchedBoolean matchStarted = new LatchedBoolean();
private final LatchedBoolean autoStarted = new LatchedBoolean();
private final LatchedBoolean teleopStarted = new LatchedBoolean();
```

---

## `DoublePressTrigger`: detecting two presses in a row

`LatchedBoolean` detects one transition. `DoublePressTrigger` builds a more specialized pattern on top of the same underlying idea: *"only fire if the same button gets pressed twice, within a short window of each other."* This is a common controller binding pattern &mdash; reserving a double-tap for something you don't want to trigger accidentally with a single press.

```java
public class DoublePressTrigger extends Trigger {

    private final EventLoop m_loop = CommandScheduler.getInstance().getDefaultButtonLoop();
    private final double debounce = 0.5; // in seconds
    private int counter;
    private final BooleanSupplier m_condition;

    public DoublePressTrigger(BooleanSupplier condition) {
        super(condition);
        this.m_condition = condition;
    }
```

<NoteTabs>
  <NoteTab title="New term: EventLoop">
An `EventLoop` is WPILib's underlying polling mechanism that every `Trigger` (button bindings, `.onTrue(...)`, `.whileTrue(...)`, etc.) is built on top of &mdash; it's checked once per loop cycle, and runs any callbacks that were bound to it. `CommandScheduler.getInstance().getDefaultButtonLoop()` is the same shared event loop that every controller button binding in the codebase already uses, so `DoublePressTrigger` plugs directly into the exact same polling infrastructure as a normal `.onTrue(...)` binding, rather than inventing a separate polling mechanism of its own.
  </NoteTab>
  <NoteTab title="extends Trigger &mdash; why?">
By extending WPILib's `Trigger` class (the same base class `Boundary.asTrigger(...)` and every controller button use), `DoublePressTrigger` automatically inherits every other `Trigger` composition method &mdash; `.and(...)`, `.or(...)`, `.debounce(...)`, `.onTrue(...)` &mdash; for free. `super(condition)` just wires up the normal single-press behavior; `onDoubleTap(...)` below adds the extra double-press-specific behavior on top.
  </NoteTab>
</NoteTabs>

### `onDoubleTap(command)`: the double-press logic itself

```java
public Trigger onDoubleTap(Command command) {
    requireNonNullParam(command, "command", "onDoubleTap");
    m_loop.bind(
        new Runnable() {
            private boolean m_pressedLast = m_condition.getAsBoolean();
            private double m_pressedLastTime = Timer.getFPGATimestamp();

            @Override
            public void run() {
                boolean pressed = m_condition.getAsBoolean();
                double currentTime = Timer.getFPGATimestamp();

                if (currentTime - m_pressedLastTime > debounce) {
                    counter = 0;
                }
                if (!m_pressedLast && pressed) {
                    m_pressedLastTime = Timer.getFPGATimestamp();
                    counter++;
                }
                if (counter == 2) {
                    counter = 0;
                    CommandScheduler.getInstance().schedule(command);
                }

                m_pressedLast = pressed;
            }
        });
    return this;
}
```

<Note title="Walking through the logic step by step">
Notice `!m_pressedLast && pressed` &mdash; this is exactly the same rising-edge check you just saw in `LatchedBoolean`, spelled out manually here instead of being reused (since `DoublePressTrigger` needs to also track *when* each press happened, which `LatchedBoolean` alone doesn't provide). Each time a rising edge is detected, `counter` increments and `m_pressedLastTime` is refreshed. Every loop, before checking for a new press, the code first checks whether *too much time* has passed since the last press (`currentTime - m_pressedLastTime > debounce`, where `debounce` is `0.5` seconds) &mdash; if so, `counter` resets to `0`, so two presses spaced far apart don't accidentally count as a "double tap." Only when `counter` reaches exactly `2` within that half-second window does the command actually get scheduled, after which `counter` resets back to `0` so the next double-tap can be detected fresh.
</Note>

<NoteTabs>
  <NoteTab title="Why an anonymous Runnable with instance fields, instead of the class's own fields?">
`m_pressedLast` and `m_pressedLastTime` are declared as fields *inside* the anonymous `Runnable`, initialized right where they're declared, rather than as fields on `DoublePressTrigger` itself. This is a subtle but deliberate choice: the anonymous class's fields are initialized exactly once, at the moment `m_loop.bind(...)` is called, capturing the condition's value and current time *at binding time* as the correct starting point &mdash; rather than needing a separate constructor-time initialization step on `DoublePressTrigger` itself that would run before the loop is actually bound.
  </NoteTab>
  <NoteTab title="Method chaining, again">
`onDoubleTap(...)` returns `this` (the `DoublePressTrigger`, which is itself a `Trigger`) at the end, following the same chainable/builder pattern you saw with `Elastic.Notification` and `SwerveDriveController.withLinearTolerance(...)` &mdash; so a binding can be written in one line: `new DoublePressTrigger(controller::getAButton).onDoubleTap(someCommand);`.
  </NoteTab>
</NoteTabs>

---

## `DashboardTrigger`: a legacy Kotlin helper

`DashboardTrigger` is worth knowing about even though it's since been removed from `Rebuilt2026`, because it's a good example of a small `Trigger` built to read a value from a *specific* NetworkTables source, and because seeing occasional Kotlin in an otherwise all-Java codebase is worth a quick explanation.

```kotlin
package org.steelhawks.util

import edu.wpi.first.networktables.NetworkTableInstance
import edu.wpi.first.wpilibj2.command.button.Trigger

class DashboardTrigger(private val entry: String) : Trigger({
    val table = NetworkTableInstance.getDefault().getTable("controls")
    val retrievedEntry = table.getEntry(entry)
    retrievedEntry.getBoolean(false)
})
```

<NoteTabs>
  <NoteTab title="Why Kotlin instead of Java here?">
WPILib's robot code can be written in Java, C++, or Kotlin (Kotlin compiles to the same JVM bytecode as Java, so the two can freely call each other in the same project). `Rebuilt2026` is almost entirely Java, but `DashboardTrigger` shows the project is set up to allow Kotlin where it's convenient &mdash; here, mostly because Kotlin lets you write the whole class, including its constructor logic, in a single compact expression (`Trigger({ ... })` directly in the class declaration) rather than needing a separate constructor body the way Java would.
  </NoteTab>
  <NoteTab title="What does a raw table.getEntry(entry).getBoolean(false) do that LoggedNetworkBoolean (from the tuning page) doesn't?">
`LoggedNetworkBoolean` (used everywhere in `Toggles`) is AdvantageKit-aware &mdash; its value gets captured for log replay, just like `LoggedTunableNumber`. `DashboardTrigger` instead reads directly from a raw NetworkTables entry under a `"controls"` table, with no AdvantageKit logging involved at all. This makes it a quick, lightweight way to read *any* boolean off NetworkTables by name (handy for one-off debugging or a custom dashboard panel writing values under `controls/...`), at the cost of not being replay-safe &mdash; the same trade-off `TunableNumber` has compared to `LoggedTunableNumber` on the tuning page.
  </NoteTab>
</NoteTabs>

---

## Putting it together: a slow-loop debugging session

Here's how these classes actually get used together when something's wrong on the robot &mdash; say, drive team reports the robot "stutters" occasionally during a match:

```text
Open the match log in AdvantageScope
                │
                ▼
   Graph every "LoopTimes/...ms" entry at once
   (one line per LoopTimeUtil.record(...) call site)
                │
                ▼
   One line (say, "LoopTimes/Commandsms") spikes to 40ms
   at the exact moment the stutter happened
                │
                ▼
   That segment covers CommandScheduler.getInstance().run(),
   which runs every subsystem's periodic() one after another
                │
                ▼
   Check each subsystem's own LoopTimeUtil.record("Swerve"),
   record("Turret"), record("PoseLink") entries at that
   same timestamp to narrow down which specific subsystem spiked
                │
                ▼
   Cross-reference BatteryUtil/Devices/... at that timestamp too
   (a sudden current spike on one device can correlate with the
   same moment a mechanism stalled and its control loop slowed down)
```

And separately, at a lower level, `LatchedBoolean` and `DoublePressTrigger` solve a different but related class of problem &mdash; not "how long did this take," but "did this specific thing just happen, exactly once, right now" &mdash; which is why `RobotState` reaches for `LatchedBoolean` to run one-time setup exactly when autonomous begins, and a driver binding might reach for `DoublePressTrigger` to reserve a double-tap for something too important to trigger by accident.

---

<Quiz questions={[
{
prompt: "In LoopTimeUtil, why does record(subsystem) measure time since the last record() or reset() call, rather than the total time since the loop started?",
options: [
"So each named segment's timing reflects just that specific chunk of code, letting you narrow down exactly which segment is slow rather than only knowing the whole loop was slow",
"Because Timer.getFPGATimestamp() can only measure short durations",
"Total loop time is already tracked automatically by WPILib and doesn't need to be duplicated",
"record() is only ever called once per loop, so there's no difference either way"
],
correct: 0,
explanation: "By resetting startTime after every record() call, each named segment's logged duration is just the time since the previous checkpoint. This lets you pinpoint which specific segment (PhoenixUtil, Commands, BatteryUtil, an individual subsystem, etc.) is actually responsible for a loop overrun."
},
{
prompt: "In BatteryUtil.integrateAndLogTotal(), why is the actual elapsed time (now - lastMeasurement) used instead of assuming a fixed 0.02 second loop period?",
options: [
"A loop overrun would make the real elapsed time longer than 20ms; using the actual dt keeps the amp-hour/watt-hour integration accurate even when the loop doesn't run at a perfectly steady 50Hz",
"WPILib requires all Timer calculations to use real timestamps",
"Fixed values cannot be used in floating point division in Java",
"It has no effect on accuracy either way"
],
correct: 0,
explanation: "Numerical integration (current × time, summed over many small slices) is only accurate if the time slice used matches how much time actually passed. If a loop overran to 35ms, assuming a fixed 20ms would undercount the charge used during that slice."
},
{
prompt: "Why does VirtualSubsystem.periodicAll() rate-limit its overrun warning to once every 5 seconds instead of printing every time a subsystem exceeds 20ms?",
options: [
"DriverStation.reportError() can only be called a limited number of times per match",
"A consistently slow subsystem would otherwise spam the driver station console on every single 20ms loop, drowning out other useful messages",
"5 seconds is the maximum length WPILib allows for a warning message",
"Rate-limiting makes the periodic() calls run faster"
],
correct: 1,
explanation: "Without rate-limiting, a subsystem slightly over 20ms every loop would trigger DriverStation.reportError(...) 50 times a second, making the console useless for spotting anything else. Limiting the warning to once every 5 seconds keeps it visible without flooding the driver station."
},
{
prompt: "Why does LatchedBoolean's update(newValue) check `newValue && !mLast` instead of just returning newValue directly?",
options: [
"Returning newValue directly would return true on every single loop the condition stays true, not just the one loop it first became true; the extra !mLast check isolates just the moment of transition (the rising edge)",
"Java booleans cannot be returned directly from a method",
"!mLast is required to satisfy the DoubleSupplier interface",
"There is no difference, both approaches behave identically"
],
correct: 0,
explanation: "newValue && !mLast is only true on the exact loop where the value transitions from false to true. Just returning newValue would keep returning true for as long as the condition remained true, which is wrong for one-time setup logic like 'reset the timer exactly once when autonomous starts.'"
},
{
prompt: "In DoublePressTrigger.onDoubleTap(), why does the code reset counter to 0 if currentTime - m_pressedLastTime > debounce, even before checking for a new press?",
options: [
"So two presses spaced far apart in time (more than the debounce window) don't incorrectly count as a double tap; the counter should only accumulate presses that happen close together",
"To save memory by clearing the counter variable periodically",
"Because EventLoop requires counters to be reset every 0.5 seconds",
"This line has no functional effect on the double-tap detection"
],
correct: 0,
explanation: "Without this check, a single press now and another press 10 seconds later would both increment counter to 2 and incorrectly trigger the double-tap command. Resetting counter whenever too much time has passed since the last press ensures only presses within the debounce window count toward a real double tap."
}
]} />

## Next Steps

You've now covered every utility class in `org.steelhawks.util` &mdash; from math and tuning, through hardware helpers and control, to the timing and logging tools on this page. Now it's time for our next section: Telemetry & NT4