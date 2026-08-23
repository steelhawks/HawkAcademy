---
sidebar_position: 6
---

import Note from '@site/src/components/Note.jsx'
import NoteTabs, { NoteTab } from '@site/src/components/NoteTabs'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# The Final Piece: The Main Subsystem

Now you've covered the hardware, the interface, and the simulation. It's time to actually program the subsystem logic in `Indexer.java`. When programming any subsystem the main question to ask is:

*What should happen every periodic (loop)?*

When you answer that question, the rest of building out the subsystem becomes very easy.

`Indexer.java` is the last of the four files, and it's the only one that never mentions `TalonFX`, `DCMotorSim`, or anything hardware-specific. It only ever talks to the `IndexerIO` you already wrote &mdash; that's the entire point of building the IO layer first. This page builds a genuinely faithful (if slightly trimmed-down) version of our real `Indexer.java` &mdash; not just the happy-path motor calls, but the jam detection and tuning overrides that make it production code rather than a toy example. Everything you're about to write draws on things you've already been taught: `SubsystemBase` and the IO layer from **Subsystem Introductions**, `Commands.run` / `.finallyDo` / `.until` / `.onlyIf` from **Commands**, and `LoggedTunableNumber` / `BatteryUtil` / `Debouncer` from **Utility Classes**.

<Note title="If any of this feels new">
This page assumes you've already read <strong>Subsystem Introductions</strong>, <strong>Programming With Commands</strong>, and <strong>Utility Classes</strong> in full. If <code>periodic()</code>, decorators like <code>.until()</code>/<code>.onlyIf()</code>, or <code>LoggedTunableNumber</code>/<code>Toggles</code> don't ring a bell, go back and read those first &mdash; this page only walks through <em>applying</em> them to the Indexer, not teaching them from scratch.
</Note>

---

## What This File Needs to Do

Strip it down, and `Indexer.java` needs six things:

1. **Hold onto the IO handle and the auto-logged inputs objects** &mdash; a `SpindexerIOInputsAutoLogged`, a `FeederIOInputsAutoLogged`, and the `IndexerIO io` itself.
2. **Name the output presets it can run at** &mdash; an `IndexerState` enum, the same shape as any other named-output subsystem.
3. **`periodic()`** &mdash; read the hardware through `io`, log it, and report current draw to `BatteryUtil`. The Indexer doesn't converge toward a goal like the intake does; it's the simpler, command-factory-driven kind of subsystem.
4. **Jam detection** &mdash; watch each motor's torque current, and use a `Debouncer` to decide, safely, whether it's actually stalled.
5. **Tuning overrides** &mdash; let drive team run either motor at a raw, live-adjustable voltage from the dashboard, gated behind simple boolean flags (a stand-in for the `Toggles` system from Tuning & Dashboard, which your practice project doesn't have yet).
6. **A small public interface** &mdash; getters for game-piece/jam state, and command factories (`feed()`, `outtake()`) that the rest of the robot actually calls.

---

## 1. State: the `IndexerState` enum

You've already seen this exact enum &mdash; it was shown to you in **Subsystem Introductions** as an example of the "simpler, command-factory-driven" kind of subsystem. Now you're actually going to write it yourself.

The `IndexerState` enum should define two named output presets: one for running the indexer forward, and one for outtaking. Each constant should bundle two `double` fields &mdash; a spindexer output and a feeder output &mdash; so that command factories can look up both values from a single state name. Notice these values aren't *goals* &mdash; there's no position to converge toward. `RUNNING` just means "spindexer and feeder both spin forward," and `OUTTAKING` means "both spin backward, feeder a bit harder." That's why the Indexer never needs a `desiredState` field or a motion profile: `periodic()` doesn't have to work toward anything, a command just tells the IO layer to run at one of these presets directly.

Try writing the `IndexerState` enum yourself, then check your answer.

<SolutionDropdown
  label="Reveal IndexerState"
  explanation="Two constants, each carrying a spindexerOutput and a feederOutput double, with a matching constructor."
  code={`public enum IndexerState {
    RUNNING(1.0, 1.0),
    OUTTAKING(-0.6, -1.0);

    final double spindexerOutput;
    final double feederOutput;

    IndexerState(double spindexerOutput, double feederOutput) {
        this.spindexerOutput = spindexerOutput;
        this.feederOutput = feederOutput;
    }
}`}
/>

---

## 2. Fields and the constructor

Beyond the IO handle, the Indexer needs a handful of `LoggedTunableNumber`s (jam-current thresholds, debounce times) and the `Debouncer`s built from them.

Your fields block should include:
- A `SpindexerIOInputsAutoLogged` and a `FeederIOInputsAutoLogged` (the auto-generated input holders), and a `final IndexerIO io`.
- Four `LoggedTunableNumber` fields: jam-current thresholds and debounce times for each motor.
- Two `Debouncer` fields, one per motor.
- Two `boolean` cache fields (`spindexerStalledCache`, `feederStalledCache`) that `periodic()` will write each loop.
- Three plain `boolean` flags that gate the tuning overrides &mdash; `tuningMode`, `spindexerVoltageOverride`, `feederVoltageOverride` &mdash; all defaulting to `false`. These stand in for the `Toggles.java` dashboard infrastructure from Tuning & Dashboard, which your practice project doesn't have; flip one to `true` in code and redeploy to bench-test a motor.
- Two *nullable* `LoggedTunableNumber` fields for tuning voltages (initialized lazily &mdash; see below).

Your constructor should accept an `IndexerIO`, store it, then initialize the four tunables with reasonable defaults (`55.0 A` / `60.0 A` for jam currents, `0.15 s` / `0.1 s` for debounce times), and immediately use `.get()` on those tunables to construct the two `Debouncer`s with `DebounceType.kRising`.

Give it a try, then check your answer.

<SolutionDropdown
  label="Reveal fields and constructor"
  explanation="The inputs objects, IO handle, tunables, Debouncers, and boolean caches are all declared here; the constructor initializes them in dependency order."
  code={`private final SpindexerIOInputsAutoLogged spindexerInputs = new SpindexerIOInputsAutoLogged();
private final FeederIOInputsAutoLogged feederInputs = new FeederIOInputsAutoLogged();
private final IndexerIO io;

private final LoggedTunableNumber spindexerJamCurrent;
private final LoggedTunableNumber feederJamCurrent;
private final LoggedTunableNumber spindexerStallDebounceTime;
private final LoggedTunableNumber feederStallDebounceTime;

private final Debouncer spindexerStallDebouncer;
private final Debouncer feederStallDebouncer;

private boolean spindexerStalledCache = false;
private boolean feederStalledCache = false;

// Simple code-level flags standing in for a full Toggles.java -- flip to true and redeploy to test
private boolean tuningMode = false;
private boolean spindexerVoltageOverride = false;
private boolean feederVoltageOverride = false;

// Only created the first time tuning mode actually needs them -- see Tuning & Dashboard
private LoggedTunableNumber tuningSpindexerVolts;
private LoggedTunableNumber tuningFeederVolts;

public Indexer(IndexerIO io) {
    this.io = io;

    spindexerJamCurrent = new LoggedTunableNumber("Indexer/Spindexer/JamCurrent", 55.0);
    feederJamCurrent = new LoggedTunableNumber("Indexer/Feeder/JamCurrent", 60.0);
    spindexerStallDebounceTime = new LoggedTunableNumber("Indexer/Spindexer/StallDebounceTime", 0.15);
    feederStallDebounceTime = new LoggedTunableNumber("Indexer/Feeder/StallDebounceTime", 0.1);

    spindexerStallDebouncer =
        new Debouncer(spindexerStallDebounceTime.get(), Debouncer.DebounceType.kRising);
    feederStallDebouncer =
        new Debouncer(feederStallDebounceTime.get(), Debouncer.DebounceType.kRising);
}`}
/>

`SpindexerIOInputsAutoLogged` and `FeederIOInputsAutoLogged` aren't files you wrote &mdash; they're generated automatically from the `@AutoLog` classes inside `IndexerIO.java` by AdvantageKit's annotation processor. If your project doesn't build yet and you can't find these classes, try a clean rebuild; they only appear after `IndexerIO.java` successfully compiles.

The constructor takes an `IndexerIO`, not an `IndexerIOTalonFX` or `IndexerIOSim` specifically. That's the whole payoff of the IO layer: `Indexer` doesn't know or care which one it got.

<Note title="Why build the tunables and Debouncers here instead of as inline field initializers?">
The jam-current and debounce-time <code>LoggedTunableNumber</code>s all need to exist before the <code>Debouncer</code>s that read <code>.get()</code> from them can be constructed, and Java doesn't guarantee the order of plain field initializers the way it guarantees statements inside a constructor run top to bottom. Building them explicitly in the constructor body (the same place our real <code>Indexer.java</code> does it) keeps that dependency order obvious.
</Note>

---

## 3. `periodic()`

Every subsystem's `periodic()` starts the same way: read hardware, log it. Write the opening of `periodic()` &mdash; call `io.updateInputs(...)` passing both inputs objects, then call `Logger.processInputs(...)` twice to log them under `"Indexer/Spindexer"` and `"Indexer/Feeder"` respectively.

Give it a try, then check your answer.

<SolutionDropdown
  label="Reveal periodic() -- read and log"
  explanation="updateInputs populates the inputs structs from the hardware layer; Logger.processInputs pushes every field in those structs to the log."
  code={`@Override
public void periodic() {
    io.updateInputs(spindexerInputs, feederInputs);
    Logger.processInputs("Indexer/Spindexer", spindexerInputs);
    Logger.processInputs("Indexer/Feeder", feederInputs);`}
/>

### Reporting current draw

Recall `BatteryUtil.recordCurrentUsage(...)` from Utility Classes &mdash; any subsystem that draws meaningful current calls it once per loop, adding its own reading into the whole robot's running total. Add two calls: one for the spindexer and one for the feeder, each passing a string name and the relevant `currentAmps` field from that motor's inputs struct.

Try writing those two lines yourself, then check your answer.

<SolutionDropdown
  label="Reveal current reporting"
  explanation="Each call registers that motor's measured current with BatteryUtil so the robot-wide total stays accurate."
  code={`    BatteryUtil.recordCurrentUsage("Spindexer", spindexerInputs.currentAmps);
    BatteryUtil.recordCurrentUsage("Feeder", feederInputs.currentAmps);`}
/>

### Jam detection with `Debouncer`

You've met `Debouncer` twice already &mdash; confirming a swerve heading was stable before reporting "aligned," and filtering brief jerk spikes out of collision detection. The idea's identical here: a torque-current reading spiking above a threshold for a single 20ms loop doesn't necessarily mean a jam (a game piece transferring between wheels can do that too), but current that *stays* elevated does.

For each motor, call `.calculate(...)` on its `Debouncer`, passing a boolean expression that compares the motor's `torqueCurrentAmps` input against the corresponding `LoggedTunableNumber` threshold. Write the result into the matching boolean cache field.

Give it a try, then check your answer.

<SolutionDropdown
  label="Reveal jam detection"
  explanation="Each Debouncer.calculate() call advances the debounce timer and returns true only once the condition has held for the full configured window."
  code={`    spindexerStalledCache = spindexerStallDebouncer.calculate(
        spindexerInputs.torqueCurrentAmps >= spindexerJamCurrent.get());
    feederStalledCache = feederStallDebouncer.calculate(
        feederInputs.torqueCurrentAmps >= feederJamCurrent.get());`}
/>

<NoteTabs>
  <NoteTab title="Why cache the result in a field instead of recalculating on demand?">
<code>Debouncer.calculate(...)</code> is stateful &mdash; it needs to be called <em>exactly once per loop</em> to correctly track how long the condition has been true. If <code>isJammed()</code> (below) called <code>.calculate(...)</code> directly every time something asked "are we jammed?", calling it from two different places in the same loop would corrupt its timing. Calculating once in <code>periodic()</code> and caching the boolean result is what lets any number of getters and commands safely ask "are we jammed right now?" as many times as they want in a single loop.
  </NoteTab>
  <NoteTab title="Why DebounceType.kRising specifically?">
<code>kRising</code> only debounces the <em>false &rarr; true</em> transition &mdash; entering "stalled" requires the current to stay high for the full debounce window, but the moment it drops back down, <code>calculate()</code> reports <code>false</code> immediately, with no extra delay. That's the right shape for a safety condition: be cautious about deciding something is jammed, but don't hesitate to declare it clear again.
  </NoteTab>
</NoteTabs>

### Tuning overrides

This is the same idea as `Flywheel`'s `TuningVolts` override from Tuning & Dashboard, just applied to two motors instead of one &mdash; except instead of pulling from a `Toggles.java` you don't have yet, it's gated behind the plain boolean flags you just added. Inside a `tuningMode` guard, check a per-motor override flag for each motor; if it's on, lazily initialize its `LoggedTunableNumber` (if it's still `null`) and immediately call the appropriate `io.run...()` method with the tunable's current value. Close out `periodic()` after both override blocks.

Try writing the tuning override block yourself, then check your answer.

<SolutionDropdown
  label="Reveal tuning overrides"
  explanation="Lazy initialization keeps the dashboard entries from appearing unless tuning mode is actually in use; the null check is what makes that possible."
  code={`    if (tuningMode) {
        if (spindexerVoltageOverride) {
            if (tuningSpindexerVolts == null) {
                tuningSpindexerVolts = new LoggedTunableNumber("Indexer/Spindexer/TuningVolts", 0.0);
            }
            io.runSpindexer(tuningSpindexerVolts.get());
        }
        if (feederVoltageOverride) {
            if (tuningFeederVolts == null) {
                tuningFeederVolts = new LoggedTunableNumber("Indexer/Feeder/TuningVolts", 0.0);
            }
            io.runFeeder(tuningFeederVolts.get());
        }
    }
}`}
/>

<Note title="Recognize the null check?">
This is the same lazy-initialization trick from <code>Flywheel.TuningVolts</code> on the Tuning & Dashboard page: creating a <code>Indexer/Spindexer/TuningVolts</code> dashboard entry unconditionally would clutter the dashboard for every mechanism whether anyone's tuning it or not. Only creating it the first time the override flag actually flips on keeps the dashboard clean.
</Note>

<Note title="Why plain booleans instead of a Toggles.java dashboard entry?">
Our real codebase gates these overrides behind <code>Toggles.java</code> &mdash; a dedicated file of <code>LoggedNetworkBoolean</code>s that let drive team flip settings live from the dashboard without redeploying code. Your practice project doesn't have that infrastructure yet, so <code>tuningMode</code>, <code>spindexerVoltageOverride</code>, and <code>feederVoltageOverride</code> are just plain <code>boolean</code> fields here: flip one to <code>true</code> in the source and redeploy, and the <code>LoggedTunableNumber</code>s underneath are still live-adjustable from the dashboard once the override is active. If you build out a <code>Toggles.java</code> later (see Tuning & Dashboard), swapping these three fields for <code>Toggles.tuningMode.get()</code> and two <code>Toggles.Indexer</code> entries is a drop-in replacement &mdash; the rest of <code>periodic()</code> doesn't change at all.
</Note>

---

## 4. The public interface: getters and command factories

### Getters

The Indexer exposes four read-only booleans. Each should be annotated with `@AutoLogOutput` so AdvantageKit logs it automatically without an explicit `Logger.recordOutput(...)` call:
- `hasGamePiece()` &mdash; returns `feederInputs.beamBroken`.
- `isSpindexerStalled()` &mdash; returns `spindexerStalledCache`.
- `isFeederStalled()` &mdash; returns `feederStalledCache`.
- `isJammed()` &mdash; returns `true` if either cache is `true`.

There is also a private helper `shouldRun()` (also `@AutoLogOutput`) that returns `true` when `tuningMode` is *not* active. This is the guard used by `.onlyIf(...)` in the command factories below.

Try writing all five methods yourself, then check your answer.

<SolutionDropdown
  label="Reveal getters"
  explanation="Each getter reads from a field already computed in periodic() -- no new computation happens here. shouldRun() is private because it's only ever used as a method reference inside this class."
  code={`@AutoLogOutput(key = "Indexer/HasGamePiece")
public boolean hasGamePiece() {
    return feederInputs.beamBroken;
}

@AutoLogOutput(key = "Indexer/SpindexerStalled")
public boolean isSpindexerStalled() {
    return spindexerStalledCache;
}

@AutoLogOutput(key = "Indexer/FeederStalled")
public boolean isFeederStalled() {
    return feederStalledCache;
}

@AutoLogOutput(key = "Indexer/Jammed")
public boolean isJammed() {
    return spindexerStalledCache || feederStalledCache;
}

@AutoLogOutput(key = "Indexer/ShouldRun")
private boolean shouldRun() {
    return !tuningMode;
}`}
/>

`shouldRun()` is a small guard: while a tuning override is actively driving a motor from the dashboard, a command trying to drive that same motor to `RUNNING`/`OUTTAKING` at the same time would just fight it for control. `.onlyIf(this::shouldRun)` (below) is what actually enforces that.

### `feed()` and `outtake()`

Command factories, exactly like `Example 4` from the Commands page &mdash; the subsystem builds and returns the whole `Command`. Both should use `Commands.run(...)`, require `this` subsystem, call `.finallyDo(...)` to stop both motors on end (whether interrupted or not), and chain `.onlyIf(this::shouldRun)` and `.withName(...)`.

`feed()` has one small real-time decision inside its loop body: if `spindexerStalledCache` is `true`, call `io.stopSpindexer()` instead of running it at `RUNNING.spindexerOutput` &mdash; but always keep the feeder running regardless. `outtake()` is simpler: it always drives both motors to their `OUTTAKING` outputs unconditionally.

Try writing both command factories, then check your answer.

<SolutionDropdown
  label="Reveal feed() and outtake()"
  explanation="feed() backs off the spindexer when jammed but keeps the feeder pushing; outtake() drives both motors in reverse at full OUTTAKING output. Both use finallyDo() so motors stop reliably on interruption."
  code={`public Command feed() {
    return Commands.run(() -> {
            io.runFeeder(IndexerState.RUNNING.feederOutput);
            if (!spindexerStalledCache) {
                io.runSpindexer(IndexerState.RUNNING.spindexerOutput);
            } else {
                io.stopSpindexer();
            }
        }, this)
        .finallyDo((interrupted) -> {
            io.stopSpindexer();
            io.stopFeeder();
        })
        .onlyIf(this::shouldRun)
        .withName("Indexer.feed");
}

public Command outtake() {
    return Commands.run(() -> {
            io.runSpindexer(IndexerState.OUTTAKING.spindexerOutput);
            io.runFeeder(IndexerState.OUTTAKING.feederOutput);
        }, this)
        .finallyDo((interrupted) -> {
            io.stopSpindexer();
            io.stopFeeder();
        })
        .onlyIf(this::shouldRun)
        .withName("Indexer.outtake");
}`}
/>

<Note title="Why .finallyDo() instead of a manual stop at the end?">
<code>feed()</code> has no natural ending &mdash; it's meant to run for as long as a button is held (<code>.whileTrue(...)</code>). When the button is released, WPILib <em>interrupts</em> the command rather than letting it "finish." <code>.finallyDo(...)</code> is what guarantees the motors actually get stopped either way, interrupted or not.
</Note>

### Combining them: `feedUntilDetected()`

You already have everything you need to build a command that feeds until a game piece shows up. Using only `feed()` and a decorator you already know, write a method that returns a command which runs `feed()` and ends the moment `hasGamePiece()` returns `true`.

Give it a try, then check your answer.

<SolutionDropdown
  label="Reveal feedUntilDetected()"
  explanation=".until(...) checks the condition every loop; the moment hasGamePiece() returns true, the wrapped command ends and feed()'s finallyDo() cleanup runs automatically."
  code={`public Command feedUntilDetected() {
    return feed().until(this::hasGamePiece)
        .withName("Indexer.feedUntilDetected");
}`}
/>

`feed()` keeps running its loop, `.until(this::hasGamePiece)` checks the beam every loop, and the moment it flips to `true`, the wrapped command ends &mdash; running the `.finallyDo(...)` cleanup you already wrote, so the motors still stop. Nothing new here except composing decorators you already know.

---

You've now built each of those pieces on its own &mdash; time to put them all together into the whole file. Give it a real attempt before scrolling further. If you get stuck, here are a few nudges:

<SolutionDropdown
  label="Hint 1 &rarr; the imports you'll need"
  explanation="Here are all the imports needed"
  code={`edu.wpi.first.math.filter.Debouncer
    edu.wpi.first.wpilibj2.command.Command
    edu.wpi.first.wpilibj2.command.Commands
    edu.wpi.first.wpilibj2.command.SubsystemBase
    org.littletonrobotics.junction.AutoLogOutput
    org.littletonrobotics.junction.Logger
    org.steelhawks.util.BatteryUtil
    org.steelhawks.util.LoggedTunableNumber`}
/>

<SolutionDropdown
  label="Hint 2 &rarr; why doesn't Indexer have a desiredState field like Intake does?"
  explanation="Because the Indexer isn't converging toward a goal -- there's no position or angle to arrive at. It either runs at a preset output or it doesn't. Subsystems like this are driven directly by command factories instead of a state machine loop in periodic(). Forcing a desiredState field onto a mechanism that doesn't need one just adds an unused layer of indirection."
/>

<SolutionDropdown
  label="Hint 3 &rarr; why does feed() check isSpindexerStalled() but not isFeederStalled()?"
  explanation="feed()'s job is to keep pieces moving toward the shooter. If the spindexer stalls, backing it off protects the mechanism (and whatever's jamming it) from being ground against, while the feeder keeps trying. A stalled feeder is a different, more serious problem -- that's exactly what a fuller feedWithJamRecovery() command (mentioned at the end of this page) would react to by reversing briefly and retrying."
/>

---

## The Final Code

Here's the completed subsystem. Compare it against what you wrote &mdash; it's fine if your command names or logging keys differ slightly.

<SolutionDropdown
  label="View Full Solution"
  explanation="The full Indexer implementation, with each of the six pieces labeled."
  code={`
    // subsystems/indexer/Indexer.java
package frc.robot.subsystems.indexer;

import edu.wpi.first.math.filter.Debouncer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import org.littletonrobotics.junction.AutoLogOutput;
import org.littletonrobotics.junction.Logger;
import org.steelhawks.util.BatteryUtil;
import org.steelhawks.util.LoggedTunableNumber;

public class Indexer extends SubsystemBase {

    // 2. STATE: named output presets, not goals to converge toward
    public enum IndexerState {
        RUNNING(1.0, 1.0),
        OUTTAKING(-0.6, -1.0);

        final double spindexerOutput;
        final double feederOutput;

        IndexerState(double spindexerOutput, double feederOutput) {
            this.spindexerOutput = spindexerOutput;
            this.feederOutput = feederOutput;
        }
    }

    // 1. FIELDS: the IO handle and its auto-logged inputs -- never raw motors
    private final SpindexerIOInputsAutoLogged spindexerInputs = new SpindexerIOInputsAutoLogged();
    private final FeederIOInputsAutoLogged feederInputs = new FeederIOInputsAutoLogged();
    private final IndexerIO io;

    // 4. JAM DETECTION: tunable thresholds, Debouncers, and cached results
    private final LoggedTunableNumber spindexerJamCurrent;
    private final LoggedTunableNumber feederJamCurrent;
    private final LoggedTunableNumber spindexerStallDebounceTime;
    private final LoggedTunableNumber feederStallDebounceTime;

    private final Debouncer spindexerStallDebouncer;
    private final Debouncer feederStallDebouncer;

    private boolean spindexerStalledCache = false;
    private boolean feederStalledCache = false;

    // 5. TUNING OVERRIDES: simple boolean flags standing in for a full Toggles.java,
    // plus tunables lazily created only once tuning mode actually needs them
    private boolean tuningMode = false;
    private boolean spindexerVoltageOverride = false;
    private boolean feederVoltageOverride = false;
    private LoggedTunableNumber tuningSpindexerVolts;
    private LoggedTunableNumber tuningFeederVolts;

    public Indexer(IndexerIO io) {
        this.io = io;

        spindexerJamCurrent = new LoggedTunableNumber("Indexer/Spindexer/JamCurrent", 55.0);
        feederJamCurrent = new LoggedTunableNumber("Indexer/Feeder/JamCurrent", 60.0);
        spindexerStallDebounceTime = new LoggedTunableNumber("Indexer/Spindexer/StallDebounceTime", 0.15);
        feederStallDebounceTime = new LoggedTunableNumber("Indexer/Feeder/StallDebounceTime", 0.1);

        spindexerStallDebouncer =
            new Debouncer(spindexerStallDebounceTime.get(), Debouncer.DebounceType.kRising);
        feederStallDebouncer =
            new Debouncer(feederStallDebounceTime.get(), Debouncer.DebounceType.kRising);
    }

    // 3. PERIODIC: read hardware, log it, detect jams, apply tuning overrides
    @Override
    public void periodic() {
        io.updateInputs(spindexerInputs, feederInputs);
        Logger.processInputs("Indexer/Spindexer", spindexerInputs);
        Logger.processInputs("Indexer/Feeder", feederInputs);

        BatteryUtil.recordCurrentUsage("Spindexer", spindexerInputs.currentAmps);
        BatteryUtil.recordCurrentUsage("Feeder", feederInputs.currentAmps);

        spindexerStalledCache = spindexerStallDebouncer.calculate(
            spindexerInputs.torqueCurrentAmps >= spindexerJamCurrent.get());
        feederStalledCache = feederStallDebouncer.calculate(
            feederInputs.torqueCurrentAmps >= feederJamCurrent.get());

        if (tuningMode) {
            if (spindexerVoltageOverride) {
                if (tuningSpindexerVolts == null) {
                    tuningSpindexerVolts = new LoggedTunableNumber("Indexer/Spindexer/TuningVolts", 0.0);
                }
                io.runSpindexer(tuningSpindexerVolts.get());
            }
            if (feederVoltageOverride) {
                if (tuningFeederVolts == null) {
                    tuningFeederVolts = new LoggedTunableNumber("Indexer/Feeder/TuningVolts", 0.0);
                }
                io.runFeeder(tuningFeederVolts.get());
            }
        }
    }

    // 6. PUBLIC INTERFACE: getters, plus command factories
    @AutoLogOutput(key = "Indexer/HasGamePiece")
    public boolean hasGamePiece() {
        return feederInputs.beamBroken;
    }

    @AutoLogOutput(key = "Indexer/SpindexerStalled")
    public boolean isSpindexerStalled() {
        return spindexerStalledCache;
    }

    @AutoLogOutput(key = "Indexer/FeederStalled")
    public boolean isFeederStalled() {
        return feederStalledCache;
    }

    @AutoLogOutput(key = "Indexer/Jammed")
    public boolean isJammed() {
        return spindexerStalledCache || feederStalledCache;
    }

    @AutoLogOutput(key = "Indexer/ShouldRun")
    private boolean shouldRun() {
        return !tuningMode;
    }

    public Command feed() {
        return Commands.run(() -> {
                io.runFeeder(IndexerState.RUNNING.feederOutput);
                if (!spindexerStalledCache) {
                    io.runSpindexer(IndexerState.RUNNING.spindexerOutput);
                } else {
                    io.stopSpindexer();
                }
            }, this)
            .finallyDo((interrupted) -> {
                io.stopSpindexer();
                io.stopFeeder();
            })
            .onlyIf(this::shouldRun)
            .withName("Indexer.feed");
    }

    public Command feedUntilDetected() {
        return feed().until(this::hasGamePiece)
            .withName("Indexer.feedUntilDetected");
    }

    public Command outtake() {
        return Commands.run(() -> {
                io.runSpindexer(IndexerState.OUTTAKING.spindexerOutput);
                io.runFeeder(IndexerState.OUTTAKING.feederOutput);
            }, this)
            .finallyDo((interrupted) -> {
                io.stopSpindexer();
                io.stopFeeder();
            })
            .onlyIf(this::shouldRun)
            .withName("Indexer.outtake");
    }
}
  `}
/>

A few things worth pointing out now that it's in front of you:

- `Indexer.java` never imports anything from `com.ctre.phoenix6` or `edu.wpi.first.wpilibj.simulation` &mdash; the exact same file runs on real hardware or in simulation, because it only ever talks to `IndexerIO`.
- `feed()` and `outtake()` both call two `io` methods inside one lambda, not two separate commands &mdash; the spindexer and feeder always have to start and stop together for the Indexer to make sense, so one `Command` claiming both jobs is correct.
- Jam detection and tuning overrides aren't bolted on as an afterthought &mdash; they live directly inside `periodic()`, right alongside the hardware read, because that's the one place guaranteed to run every single loop regardless of which command (if any) is currently active.
- Our real `Indexer.java` in `Rebuilt2026` goes a bit further still: a dedicated `BeamIO` (rather than a `beamBroken` field on `FeederIOInputs`), a second stall-recovery command (`feedWithJamRecovery()`) that automatically reverses and retries when jammed, and an `agitateSpindexer()` command that shakes a stuck piece loose. Everything past this point is additional behavior layered on top of this exact same skeleton &mdash; four fields, `periodic()`, a handful of command factories &mdash; not a different pattern.

---

## Wiring It Up

Last step: something has to actually construct an `Indexer` and hand it a real `IndexerIO`. In your practice project that's `RobotContainer.java`:

```java
// RobotContainer.java
private final Indexer s_Indexer = new Indexer(
    RobotBase.isReal()
        ? new IndexerIOTalonFX(new CANBus("canivore"))
        : new IndexerIOSim());
```

You've already met `RobotBase.isReal()` back in Telemetry &mdash; `true` when the code is genuinely running on a roboRIO, `false` when it's running in the desktop simulator. That one line is the entire decision point: same `Indexer`, same command factories, different hardware underneath depending on where the code is actually running.

From there, wiring a button is exactly what you'd expect from the Commands page:

```java
m_Controller.rightBumper().whileTrue(s_Indexer.feed());
```

<Note title="Why not new IndexerIO() {} here?">
Remember the third row of that table from Subsystem Introductions &mdash; the empty <code>new IndexerIO() {}</code> implementation exists for replay, or for a robot configuration that doesn't have an Indexer at all. Your practice project only has two robot situations (real hardware or the desktop simulator), so the ternary above only ever needs to choose between <code>IndexerIOTalonFX</code> and <code>IndexerIOSim</code>. Our real codebase's <code>RobotConfig</code> factory handles all three cases &mdash; this is the same idea, just without the extra factory layer.
</Note>

---

## Going Further

This page stopped short of a few things our real `Indexer.java` does, on purpose &mdash; they lean on commands you haven't been taught yet (`Commands.repeatingSequence`, `Commands.either`, `Commands.runEnd`). If you want to push further on your own:

- **`feedWithJamRecovery()`** &mdash; repeats `feed().until(this::isJammed)`, and the moment a jam is detected, briefly runs `outtake()` before trying `feed()` again. It's built from `Commands.repeatingSequence(...)` and `Commands.either(...)`, wrapping a whole recovery loop into one command a driver can bind to a single button.
- **`agitateSpindexer()`** &mdash; alternately runs the spindexer forward and backward for a fraction of a second each, over and over, to shake loose a piece that's stuck without fully reversing the whole mechanism.
- **`resetBeamState()`/`emptyFuel()`** &mdash; uses a *second*, falling-edge `Debouncer` (`Debouncer.DebounceType.kFalling`) on the beam sensor to decide the hopper has been genuinely empty for a sustained stretch, not just that the beam flickered clear for one loop.

Each of those is the same skeleton you just built, with one more decorator or one more `Debouncer` layered on &mdash; not a new pattern to learn.

---

## Next Steps

That's the whole Indexer, start to finish: an interface that named what the hardware can do, a `TalonFX` implementation and a simulated implementation that each satisfied it, and a subsystem class that turned that IO layer into commands the rest of the robot can call &mdash; jam detection, tuning overrides, and all. Every subsystem in our real codebase, no matter how complicated, is built from this same four-file skeleton.

This kind of code works on the real robot, now it's time to make it replayable + simulatable!
