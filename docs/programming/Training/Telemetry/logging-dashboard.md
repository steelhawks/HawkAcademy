---
sidebar_position: 4
title: How We Log & Use the Dashboard
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import NoteTabs, { NoteTab } from '@site/src/components/NoteTabs'

# How We Log & Use the Dashboard

You now know that NetworkTables is the shared key/value system that carries data between the robot and everything else on the network. But almost nothing in `Rebuilt2026` talks to raw NetworkTables directly &mdash; instead, nearly every subsystem talks to a single class: **AdvantageKit's `Logger`**. This page covers how `Logger` decides where data actually goes, and how that data ends up in front of a human, either live on **Elastic** or after the fact in **AdvantageScope**.

---

## `Logger` One Call Site, Many Destinations

Every logging call in the codebase, whether it's a manual `Logger.recordOutput(...)` or an automatic `@AutoLog`/`@AutoLogOutput` field, goes through the exact same object: AdvantageKit's `Logger`. Code that wants to log something never needs to know *where* that data ends up &mdash; to a `.wpilog` file, over NetworkTables, both, or neither. That decision is made in exactly one place, at startup, in `Robot.java`.

```java
// Robot.java
public class Robot extends LoggedRobot {
```

<Note title="New term: LoggedRobot">
`LoggedRobot` is AdvantageKit's drop-in replacement for WPILib's normal `TimedRobot` base class. It automatically calls `Logger.periodicAfterUser()` at the right point in every loop, which is what actually flushes each loop's recorded values out to whichever data receivers were configured &mdash; you don't have to call anything yourself to make logging "happen" each loop.
</Note>

---

## Recording Metadata Once, at Startup

Before any per-loop data gets logged, `Robot.java`'s constructor records a batch of **metadata** &mdash; information that describes *this specific build* of the code, not any single moment while it's running:

```java
// Robot.java
Logger.recordMetadata("ProjectName", BuildConstants.MAVEN_NAME);
Logger.recordMetadata("BuildDate", BuildConstants.BUILD_DATE);
Logger.recordMetadata("GitSHA", BuildConstants.GIT_SHA);
Logger.recordMetadata("GitDate", BuildConstants.GIT_DATE);
Logger.recordMetadata("GitBranch", BuildConstants.GIT_BRANCH);
switch (BuildConstants.DIRTY) {
    case 0 -> Logger.recordMetadata("GitDirty", "All changes committed");
    case 1 -> Logger.recordMetadata("GitDirty", "Uncommitted changes");
    default -> Logger.recordMetadata("GitDirty", "Unknown");
}
```

`BuildConstants` isn't hand-written &mdash; it's generated automatically by a Gradle plugin every time the code is built, by reading the current git commit hash, branch, and whether there are any uncommitted changes at build time.

<Note title="Why bother logging git metadata at all?">
Every match log ends up permanently stamped with the exact commit it was running &mdash; down to whether the working tree was clean or "dirty" (had uncommitted changes) at build time. Months later, if a log from week 3 looks strange, `GitSHA` tells you *exactly* which version of the code produced it, so you can check out that same commit and reproduce the behavior instead of guessing.
</Note>

Right after the git metadata, `Robot.java` also records which specific robot and mode the code thinks it's running as:

```java
// Robot.java
Logger.recordMetadata("Robot", Constants.ROBOT_NAME);
Logger.recordMetadata("Robot Mode", Constants.getMode().toString());
Logger.recordMetadata("Robot Type", Constants.getRobot().toString());
```

---

## The Three Modes: `REAL`, `SIM`, `REPLAY`

Immediately after metadata, `Robot.java` decides *where* the rest of this run's logging output will actually go, based on `Constants.getMode()`:

```java
// Constants.java
public enum Mode {
    REAL,
    SIM,
    REPLAY
}

public static Mode getMode() {
    return switch (ROBOT_TYPE) {
        case ALPHABOT, OMEGABOT, CHASSIS, LAST_YEAR, TEST_BOARD ->
            RobotBase.isReal() ? Mode.REAL : Mode.REPLAY;
        case SIMBOT -> Mode.SIM;
    };
}
```

<Note title="Reading this switch expression">
If the selected robot type is an actual physical robot (`ALPHABOT`, `CHASSIS`, etc.) and the code is genuinely running on a roboRIO (`RobotBase.isReal()`), the mode is `REAL`. If that same robot type is instead being run through `simulateJava` on a desktop, there's no real hardware to read from &mdash; so instead of pretending, the code assumes you're replaying a previously recorded log (`REPLAY`). `SIMBOT` is a separate, dedicated robot type built entirely for WPILib's physics simulation, which always reports `SIM` regardless of `RobotBase.isReal()`.
</Note>

Each mode wires up a completely different set of **data receivers** &mdash; the objects that `Logger` actually hands recorded values to:

```java
// Robot.java
switch (Constants.getMode()) {
    case REAL -> {
        // Running on a real robot, log to a USB stick ("/U/logs")
        Logger.addDataReceiver(new WPILOGWriter("/home/lvuser/logs"));
        if (!DriverStation.isFMSAttached()) {
            Logger.addDataReceiver(new NT4Publisher());
        }
        new PowerDistribution(
            Constants.POWER_DISTRIBUTION_CAN_ID, Constants.PD_MODULE_TYPE);
    }
    case SIM -> // Running a physics simulator, log to NT
        Logger.addDataReceiver(new NT4Publisher());
    case REPLAY -> {
        // Replaying a log, set up replay source
        setUseTiming(false); // Run as fast as possible
        String logPath = LogFileUtil.findReplayLog();
        Logger.setReplaySource(new WPILOGReader(logPath));
        Logger.addDataReceiver(new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_sim")));
    }
}

Logger.start();
```

<NoteTabs>
  <NoteTab title="REAL: WPILOGWriter + NT4Publisher (unless FMS-attached)">
On a real robot, every value gets written to a `.wpilog` file on the roboRIO's onboard storage at `/home/lvuser/logs` &mdash; this happens *every* match, win or lose, with no extra setup. A second receiver, `NT4Publisher`, additionally streams the same data live over NetworkTables, but only `if (!DriverStation.isFMSAttached())` &mdash; meaning during an actual FMS-connected match, NT streaming is skipped entirely, and only the local `.wpilog` file is written. During practice or pit testing (no FMS), both happen at once: you get a live dashboard *and* a saved log.
  </NoteTab>
  <NoteTab title="SIM: NT4Publisher only">
There's no roboRIO filesystem to write a `.wpilog` to when running WPILib's simulator on a desktop, so `SIM` mode only adds an `NT4Publisher` &mdash; everything gets streamed live over NetworkTables so Elastic or AdvantageScope (in its live-NT mode) can display it as the simulation runs, but nothing is saved to disk automatically.
  </NoteTab>
  <NoteTab title="REPLAY: WPILOGReader in, WPILOGWriter out">
This is the mode that makes "debug a match after the fact" possible. `LogFileUtil.findReplayLog()` locates a previously recorded `.wpilog` file, `Logger.setReplaySource(...)` tells AdvantageKit to feed *that* file's recorded inputs back into the robot code instead of real hardware, and `setUseTiming(false)` lets the whole replay run as fast as the CPU allows rather than waiting for real 20ms loops. Critically, a *second* `WPILOGWriter` (writing to a `_sim`-suffixed file) is still attached &mdash; so any new values computed only during replay (say, from a piece of code you added *after* the original match) get saved to their own file, without overwriting the original recording.
  </NoteTab>
</NoteTabs>

<Note title="Why is this the whole reason replay works at all?">
Because `Logger.recordOutput(...)`, `@AutoLog`, and `@AutoLogOutput` never talk directly to a data receiver &mdash; they only ever talk to `Logger` &mdash; the exact same subsystem code runs unmodified whether it's REAL, SIM, or REPLAY. In replay, a subsystem's `periodic()` reads back the *same* sensor values that were recorded during the actual match (fed in by `WPILOGReader`), so if you add a new `Logger.recordOutput(...)` call after the fact, replaying the old log produces that new output as if it had been there all along.
</Note>

---

## From `Logger` to a Human: Elastic and AdvantageScope

Once `Logger.start()` has been called, two very different tools end up consuming the data it produces:

### Elastic &mdash; the live dashboard

[Elastic](https://github.com/Gold872/elastic-dashboard) is the dashboard software our drive team looks at during a match or practice, connected over the `NT4Publisher` receiver. Its entire layout &mdash; which widgets show up, where, and which NetworkTables topic each one is bound to &mdash; is defined once in a checked-in `elastic-layout.json` file, not built by hand every time Elastic opens:

```json
// elastic-layout.json
{
  "title": "Toggles",
  "topic": "Toggles/TuningMode"
}
```

The real layout defines two tabs, **Teleoperated** and **Autonomous**, with the Teleoperated tab containing widgets like:

- A **Toggles** list bound to `Toggles/DebugMode`, `Toggles/TuningMode`, `Toggles/LUT`, and friends
- An **Enabled Subsystems** list and a **Vision** camera-enable list
- A **Field** widget bound to `/SmartDashboard/Field`, showing the robot's pose and trajectories
- An **Alerts** container bound to `/SmartDashboard/Alerts`
- An **Auto Chooser** and a **CommandScheduler** view

`Robot.java` can also switch which tab is currently in front of the driver, straight from robot code:

```java
// Robot.java
Elastic.selectTab("Teleoperated");
```

<Note title="Elastic is a live-only view">
Elastic only ever shows *current* NetworkTables values &mdash; it has no concept of scrubbing backward in time. That's a deliberate trade-off: during a match, drive team needs to see "what is true right now," not sift through history. Reviewing what happened earlier in a match is exactly what AdvantageScope is for.
</Note>

### AdvantageScope &mdash; the replay & live viewer

AdvantageScope is AdvantageKit's own viewer, and it can do both jobs Elastic can't do at once:

- **Live mode**: connect to the same `NT4Publisher` stream Elastic uses, for real-time graphs, 3D field views, and mechanism visualizations while the robot runs.
- **Replay mode**: open a `.wpilog` file directly (the same file `WPILOGWriter` wrote to `/home/lvuser/logs` during a match) and scrub through the *entire* match, frame by frame, after the fact.

<Note title="Why do both Elastic and AdvantageScope exist, instead of just one?">
They're built for two different jobs happening at two different times. Elastic is optimized for what drive team needs *during* a match &mdash; simple, glanceable widgets, laid out once and reused every match. AdvantageScope is optimized for what a programmer needs *afterward* &mdash; deep graphs of every logged value, 3D replays of a mechanism's motion, and the ability to compare two different logs side by side. Both are just reading the same underlying data `Logger` already recorded; they simply present it differently, for different audiences.
</Note>

---

## What Actually Flows Through `Logger`

Everything you saw on the "What is Telemetry" page ends up going through this exact pipeline. A quick recap of the mechanisms, now that you know where they lead:

| Mechanism | What it looks like | Where it ends up |
|---|---|---|
| `@AutoLog` on an IO inputs class | `public interface ModuleIO { @AutoLog class ModuleIOInputs { ... } }` | Every field, automatically, every loop |
| `@AutoLogOutput` on a field or method | `@AutoLogOutput private final Trigger nearHubTrigger;` | That single field/method's value, automatically |
| Manual `Logger.recordOutput(...)` | `Logger.recordOutput("AimState/CurrentMode", mode.name());` | Exactly what you tell it to, when you tell it to |

```java
// ModuleIO.java
@AutoLog
class ModuleIOInputs {
    public boolean driveConnected = false;
    public double drivePositionRad = 0.0;
    public double driveVelocityRadPerSec = 0.0;
    // ...
}
```

```java
// RobotState.java
@AutoLogOutput(key = "RobotState/PoseEstimation/PoseEstimation")
public Pose2d getEstimatedPose() {
    return poseEstimator.getEstimatedPosition();
}
```

```java
// LoopTimeUtil.java
Logger.recordOutput("LoopTimes/" + subsystem + "ms", (now - startTime) * 1000.0);
```

All three of these &mdash; whether the value comes from a plain field, an annotated getter, or a hand-written call &mdash; are handed to the *same* `Logger`, which is why swapping `REAL` for `REPLAY` doesn't require touching a single one of these call sites.

---

## Putting It All Together

```text
Robot code
   │
   ├─ @AutoLog IO inputs           ─┐
   ├─ @AutoLogOutput fields/methods ├──►  Logger  ──►  Logger.start() flushes every loop
   └─ Logger.recordOutput(...)     ─┘        │
                                              │  (destination decided once, by Constants.getMode())
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                  REAL: WPILOGWriter    SIM: NT4Publisher     REPLAY: WPILOGReader (in)
                  → /home/lvuser/logs   → NetworkTables       + WPILOGWriter (out, "_sim")
                  + NT4Publisher
                    (unless FMS)
                        │                     │
                        ▼                     ▼
                 Elastic (live, during the match)         AdvantageScope
                                                     (live NT, or scrubbing a saved .wpilog)
```

No matter which mode is active, the same subsystem code, the same `@AutoLog`/`@AutoLogOutput`/`recordOutput` calls, and the same `Logger` are doing the work &mdash; only the destination changes.

---

<Quiz questions={[
{
prompt: "Why does subsystem code never need to know whether it's logging to a .wpilog file, NetworkTables, both, or neither?",
options: [
"Because every logging call (@AutoLog, @AutoLogOutput, Logger.recordOutput) goes through the same Logger object, and the actual destinations (data receivers) are configured once, in Robot.java, based on the current mode",
"Because logging calls are removed entirely from competition builds",
"Because WPILib automatically deletes duplicate logging calls",
"Because @AutoLog and Logger.recordOutput use two completely separate, unrelated systems"
],
correct: 0,
explanation: "All logging calls funnel through AdvantageKit's Logger. The actual destinations (WPILOGWriter, NT4Publisher, etc.) are only decided once, in Robot.java's mode switch — subsystem code stays identical no matter which destinations are active."
},
{
prompt: "According to Constants.getMode(), what determines whether a physical robot type like ALPHABOT reports REAL or REPLAY mode?",
options: [
"Whether DriverStation.isFMSAttached() returns true",
"Whether RobotBase.isReal() is true — if the code is genuinely running on a roboRIO it's REAL, otherwise (running through the desktop simulator) it's assumed to be REPLAY",
"Whether the robot has a Limelight connected",
"Whether Toggles.debugMode is enabled"
],
correct: 1,
explanation: "getMode() checks RobotBase.isReal() for any non-SIMBOT robot type. If it's genuinely running on real hardware, that's REAL mode; if that same robot type is being run on a desktop (no real hardware to read from), it's assumed to be a REPLAY session instead."
},
{
prompt: "In REAL mode, why does Robot.java only add an NT4Publisher data receiver `if (!DriverStation.isFMSAttached())`?",
options: [
"NT4Publisher only works during autonomous",
"During an actual FMS-connected match, NetworkTables streaming is skipped and only the local WPILOGWriter keeps recording, while practice/pit sessions (no FMS) get both a live NT stream and a saved log at once",
"FMS blocks all NetworkTables traffic automatically, making the check redundant",
"WPILOGWriter cannot run at the same time as NT4Publisher under any circumstance"
],
correct: 1,
explanation: "The isFMSAttached() check means real competition matches only write to the onboard .wpilog file, while practice sessions without FMS also get a live NT4Publisher stream for dashboards to display in real time."
},
{
prompt: "What makes REPLAY mode able to reproduce a new Logger.recordOutput(...) call that didn't exist in the code during the original match?",
options: [
"AdvantageScope invents plausible values for anything that wasn't originally recorded",
"WPILOGReader feeds the original match's recorded sensor inputs back into the exact same subsystem code, so any new logging call added afterward runs against real data and produces meaningful output during replay",
"REPLAY mode ignores all new code changes and only shows the original log unmodified",
"Replay mode requires deleting and rewriting the original .wpilog file"
],
correct: 1,
explanation: "Because subsystem code stays identical across modes, replaying an old log through WPILOGReader re-runs that same code with the original match's real inputs — so a Logger.recordOutput(...) call added after the fact still produces valid output, since the underlying sensor data being fed in is real."
},
{
prompt: "Why do both Elastic and AdvantageScope exist, if they're both ultimately just displaying data that Logger already recorded?",
options: [
"They serve two different audiences at two different times — Elastic is a simple, glanceable live-only view built for drive team during a match, while AdvantageScope is a deeper live-or-replay viewer built for programmers debugging after the fact",
"Elastic is only used in SIM mode and AdvantageScope is only used in REAL mode",
"AdvantageScope cannot connect to NetworkTables, only Elastic can",
"They are actually the exact same program under two different names"
],
correct: 0,
explanation: "Elastic is optimized for what drive team needs live during a match: simple widgets on a fixed layout. AdvantageScope is optimized for what a programmer needs afterward: deep graphs, 3D replays, and the ability to scrub through an entire saved log. Both just present the same underlying Logger data differently, for different audiences."
}
]} />

## Next Steps

You've now seen the full pipeline: telemetry gets generated by subsystem code, carried across the network by NetworkTables, routed to the right destination by AdvantageKit's `Logger`, and finally displayed by Elastic (live) or AdvantageScope (live or replay). Next, we'll look at where these pieces actually show up together throughout the rest of the codebase, tying this section back to the subsystems you've already studied.
