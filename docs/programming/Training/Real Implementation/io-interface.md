---
sidebar_position: 3
---

import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# Writing the IO Interface

Time to fill in the first of your four empty files: `IndexerIO.java`. This is the **contract** &rarr; it names every input the Indexer's hardware can report and every action it can perform, without saying *how* any of that actually happens. `IndexerIOTalonFX` and `IndexerIOSim` will each satisfy this contract in their own way over the next two pages.

<Note title="Need a refresher first?">
If the idea of an IO interface, `@AutoLog`, or the "no-op default method" trick doesn't ring a bell, go back and re-read <strong>The IO Layer</strong> section of <a href="../Robot%20Systems/subsystem-introductions.md">Building a Robot</a> before continuing &mdash; this page assumes you already know *why* we do this, and only walks through *writing* it.
</Note>

---

## What Hardware Does the Indexer Actually Have?

Strip our Indexer down to its physical parts and there are exactly three, and the Indexer actually runs **two separate motors**, not one:

1. **The spindexer motor** &rarr; spins a small rotating carousel inside the Indexer that holds game pieces and rotates ("indexes") them into position, one at a time, the way a revolver's cylinder rotates a new round into place. This is where the name **spindexer** comes from &mdash; *spin* + *indexer*.
2. **The feeder motor** &rarr; a separate motor that grabs whichever piece the spindexer has just rotated into place and pushes it the rest of the way out of the Indexer, toward the shooter.
3. **A beam-break sensor** &rarr; a digital sensor that reads `true` when something is physically blocking it (a game piece passing by on its way out through the feeder).

These two motors nearly always run together &mdash; the spindexer rotates a piece into position while the feeder pushes the previous one out &mdash; but they're still **two independent pieces of hardware**, each with its own speed, voltage, current, and temperature to report. That's why the interface treats them as two separate things rather than one.

---

## What You Need to Build

Rather than handing you the file, here's the spec. Open `IndexerIO.java` and build it yourself using these three pieces:

### 1. Two `@AutoLog` inputs classes

One for each motor: `SpindexerIOInputs` and `FeederIOInputs`. Both need the same shape &rarr; one field per piece of data a motor can report:

| Field | Type | Meaning |
|---|---|---|
| `connected` | `boolean` | Is the motor controller responding on the CAN bus? |
| `positionRad` | `double` | How "far" is the motor spinning |
| `velocityRadPerSec` | `double` | How fast the motor is currently spinning (in radians)|
| `appliedVolts` | `double` | Voltage currently being applied |
| `currentAmps` | `double` | Current being drawn |
| `torqueCurrentAmps` | `double` | How much current is being drawn for torque FOC |
| `tempCelsius` | `double` | Motor temperature |

`FeederIOInputs` needs one extra field the spindexer doesn't have: `beamBroken` (a `boolean`) &rarr; the beam-break sensor sits at the feeder's exit, so its reading naturally belongs on the feeder's inputs class rather than the spindexer's.

Give every field a sensible default value, the same way you'd expect any `@AutoLog` class to.

### 2. A way to refresh those fields

One method that takes **both** inputs objects &mdash; a `SpindexerIOInputs` and a `FeederIOInputs` &mdash; and fills them with the latest hardware readings in a single call. You've seen this method name used in every IO interface so far.

### 3. Four methods to actually run the motors

- A method to spin the spindexer at a given output (a single signed `double`).
- A method to spin the feeder at a given output.
- A method to stop the spindexer.
- A method to stop the feeder.

<Note title="Don't forget: default methods">
Every method in an IO interface needs a `default` keyword and an empty body (`{}`). That's what lets `new IndexerIO() {}` compile as a valid, do-nothing implementation for replay or a robot with no indexer &mdash; the exact same trick you saw in Building a Robot.
</Note>

Give it a real attempt before scrolling further. If you get stuck, here are two nudges:

<SolutionDropdown
  label="Hint 1 &rarr; the import for @AutoLog"
  explanation="@AutoLog comes from AdvantageKit, not WPILib itself: import org.littletonrobotics.junction.AutoLog;. It goes directly above each class you're annotating -- you'll use it twice, once per inputs class."
/>

<SolutionDropdown
  label="Hint 2 &rarr; why separate stop methods instead of one stopAll()?"
  explanation="Because they're independent motors, keep stopSpindexer() and stopFeeder() separate rather than merging them into one method. This matters later: a jam or a partial shutdown might need to stop just one motor while leaving the other running, and a single combined method couldn't express that."
/>

---

## The Final Code

Here's the completed interface. Compare it against what you wrote &mdash; it's fine if your field or method names differ slightly, as long as the shape matches.
<SolutionDropdown
  label="View Full Solution"
  explanation="The full interface with all method names and classes clearly labeled. "
  code={`
    // subsystems/indexer/IndexerIO.java
package frc.robot.subsystems.indexer;

import org.littletonrobotics.junction.AutoLog;

public interface IndexerIO {

    @AutoLog
    class SpindexerIOInputs {
        public boolean connected = false;
        public double positionRad = 0.0;
        public double velocityRadPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double currentAmps = 0.0;
        public double torqueCurrentAmps = 0.0;
        public double tempCelsius = 0.0;
    }

    @AutoLog
    class FeederIOInputs {
        public boolean connected = false;
        public double positionRad = 0.0;
        public double velocityRadPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double currentAmps = 0.0;
        public double torqueCurrentAmps = 0.0;
        public double tempCelsius = 0.0;

        public boolean beamBroken = false;
    }

    /** Updates the sets of loggable inputs for both motors. */
    default void updateInputs(SpindexerIOInputs spindexerInputs, FeederIOInputs feederInputs) {}

    /** Runs the spindexer motor at the given output, [-1, 1] or volts depending on implementation. */
    default void runSpindexer(double output) {}

    /** Runs the feeder motor at the given output, [-1, 1] or volts depending on implementation. */
    default void runFeeder(double output) {}

    /** Stops the spindexer motor. */
    default void stopSpindexer() {}

    /** Stops the feeder motor. */
    default void stopFeeder() {}
}
  `}
/>

A few things worth pointing out now that it's in front of you:

- `SpindexerIOInputs` and `FeederIOInputs` look almost identical, and that's fine &mdash; they're describing two physically identical *kinds* of data (a motor's state) coming from two different, independent motors. Duplicating the shape is simpler than trying to force one shared class to cover both.
- `beamBroken` lives only on `FeederIOInputs`, not `SpindexerIOInputs`, because the sensor is physically mounted at the feeder's exit. Where a field lives should match where the hardware actually is.
- Nothing here mentions `TalonFX`, `DigitalInput`, or any CTRE/WPILib hardware class. That's the entire point &mdash; this file only says *what* the Indexer can know and do, never *how*.
- Every method is `default` with an empty body, so `IndexerIO.java` compiles right now, on its own, with zero implementations written yet.

---

## Next Steps

With the contract written, it's time to satisfy it. In the next page, we'll fill in `IndexerIOTalonFX.java` &rarr; the implementation that talks to two real TalonFX motors and a real beam-break sensor.
