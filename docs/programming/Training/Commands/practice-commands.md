---
sidebar_position: 5
---

import JavaRunner from '@site/src/components/JavaRunner'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# Practice: Writing Command Factories

Time to write real commands. This page gives you two live coding challenges 
&rarr; one for a Flywheel subsystem, one for an Indexer subsystem. Each one runs in your browser against a real Java compiler.

---

## How the simulator works

WPILib isn't available in a browser, so each challenge includes a small simulation framework at the bottom of the file that mirrors how WPILib commands actually behave. You don't need to read or modify it &rarr; just understand what it gives you:

| Simulator piece | What it maps to in real WPILib |
|---|---|
| `Command` | `edu.wpi.first.wpilibj2.command.Command` |
| `Commands.run(action)` | `Commands.run(() -> ...)` &rarr; loops every tick |
| `Commands.runOnce(action)` | `Commands.runOnce(() -> ...)` &rarr;  fires once, then done |
| `.finallyDo(action)` | `.finallyDo((interrupted) -> ...)` &rarr;  guaranteed cleanup |
| `.until(condition)` | `.until(() -> ...)` &rarr;  ends the command when true |
| `Scheduler.run(cmd, periodic, n)` | The Command Scheduler running for `n` loop cycles |

Each subsystem has a `Sim___` base class at the bottom. It owns private `io_` methods (like `io_setSpeed`, `io_stop`) that represent the hardware layer. Your `Flywheel` / `Indexer` class **extends** the sim class, which gives you access to those methods &rarr;  exactly how real subsystem command factories call `io.*` methods they own.

<Note title="Where to write your code">
Your task is at the <strong>top</strong> of each editor &rarr;  inside the inner class that extends the simulator. The <code>main</code> method and everything below the <strong>DO NOT EDIT</strong> line are already set up for you.
</Note>

---

## IMPORTANT
**2 Major things to note**

**1.** When doing these simulations, some code is modified and won't look like the actual WPILIB code because we are simulating the Commands library, so take the code you write with a grain of salt.

**2.**
If you are unfamiliar with the setup of a subsystem or how everything connects together within a subsystem we **highly** recommend checking out the **Building a Robot**  section &rarr; **[Building a Robot](../Robot%20Systems/subsystem-introductions.md)**


**If you're ready, dive in!**

## Flywheel

### The subsystem

The simulated `Flywheel` has two `io_` methods you can call:

| Method | What it does |
|---|---|
| `io_setSpeed(SHOOT_SPEED)` | Tells the motor to spin up toward the shooting velocity |
| `io_stop()` | Cuts the motor output to zero |

`periodic()` is already implemented &rarr;  every tick, it ramps `currentSpeed` toward `targetSpeed` by 20 units and prints `[Flywheel] speed=N` <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>DON'T TOUCH IT</span>

### Your task

Implement **two command factories** inside the `Flywheel` class:

**`spinUp()`** &rarr; returns a command that:
- Runs `io_setSpeed(SHOOT_SPEED)` continuously every loop cycle
- When the command ends (for any reason &rarr; button released, cancelled), calls `io_stop()`

**`idle()`** &rarr; returns a command that:
- Calls `io_stop()` exactly once and immediately finishes
<Note title="Pay Attention: Comments">
Remeber that a comment is started with `//` and are there for a reason. In these next few pieces of code, read **ALL** comments carefully and follow directions. Reading and being careful & precise is an important part of any programmers job too.
</Note>

### Expected output

When both commands run correctly, the output should be:

```
=== Test 1: spinUp() (runs for 5 ticks) ===
[Flywheel] speed=20
[Flywheel] speed=40
[Flywheel] speed=60
[Flywheel] speed=80
[Flywheel] speed=100
=== Test 2: idle() ===
[Flywheel] speed=80
```

`spinUp()` runs for 5 ticks -- speed climbs 20 per tick. When it ends (time limit hit), `io_stop()` fires and target goes back to 0. `idle()` then fires `io_stop()` once on init, runs one `periodic()` tick while the speed coasts back down from 100, then finishes immediately because `runOnce` is done after one cycle.

### Hints

<SolutionDropdown
  label="Hint 1 &rarr; which command type to use for spinUp()"
  explanation="spinUp() needs to run an action on every loop cycle and never finish on its own &rarr; the external binding (a button hold, or the tick limit in the test) decides when it ends. That's Commands.run(). Attach .finallyDo() to guarantee io_stop() runs when the command ends."
/>

<SolutionDropdown
  label="Hint 2 &rarr; which command type to use for idle()"
  explanation="`idle()` only needs to do one thing once &rarr; call io_stop() &rarr;and then report finished. That's Commands.runOnce(). No finallyDo needed because the action IS the init."
/>

<JavaRunner
  starterCode={`public class Main {

    // ============================================================
    //  YOUR TASK: implement the two command factories below.
    //  Do NOT modify anything below the "DO NOT EDIT" line.
    // ============================================================

    static class Flywheel extends SimFlywheel {

        // TODO 1: return a Command that continuously calls io_setSpeed(SHOOT_SPEED)
        //         and stops the motor (io_stop()) when it ends.
        public Command spinUp() {
            return null; // replace this
        }

        // TODO 2: return a Command that calls io_stop() once and immediately finishes.
        public Command idle() {
            return null; // replace this
        }
    }

    public static void main(String[] args) {
        Flywheel flywheel = new Flywheel();

        System.out.println("=== Test 1: spinUp() (runs for 5 ticks) ===");
        Scheduler.run(flywheel.spinUp(), flywheel::periodic, 5);

        System.out.println("=== Test 2: idle() ===");
        Scheduler.run(flywheel.idle(), flywheel::periodic, 5);
    }

    // ============================================================
    //  DO NOT EDIT BELOW THIS LINE -- simulation framework
    // ============================================================

    @FunctionalInterface interface BooleanConsumer { void accept(boolean b); }

    static class Command {
        Runnable _init    = () -> {};
        Runnable _execute = () -> {};
        java.util.function.BooleanSupplier _done = () -> false;
        BooleanConsumer _end = (b) -> {};

        public Command finallyDo(BooleanConsumer action) {
            BooleanConsumer prev = _end;
            _end = (b) -> { prev.accept(b); action.accept(b); };
            return this;
        }
        public Command until(java.util.function.BooleanSupplier cond) {
            java.util.function.BooleanSupplier prev = _done;
            _done = () -> prev.getAsBoolean() || cond.getAsBoolean();
            return this;
        }
    }

    static class Commands {
        static Command run(Runnable action) {
            Command c = new Command(); c._execute = action; return c;
        }
        static Command runOnce(Runnable action) {
            Command c = new Command(); c._init = action; c._done = () -> true; return c;
        }
    }

    static class Scheduler {
        static void run(Command cmd, Runnable periodic, int maxTicks) {
            if (cmd == null) { System.out.println("(command is null — finish your TODO first!)"); return; }
            cmd._init.run();
            for (int i = 0; i < maxTicks; i++) {
                cmd._execute.run();
                periodic.run();
                if (cmd._done.getAsBoolean()) { cmd._end.accept(false); return; }
            }
            cmd._end.accept(true);
        }
    }

    static class SimFlywheel {
        static final double SHOOT_SPEED = 100.0;
        private double currentSpeed = 0.0;
        private double targetSpeed  = 0.0;

        protected void io_setSpeed(double speed) { targetSpeed = speed; }
        protected void io_stop()                 { targetSpeed = 0.0;  }

        public void periodic() {
            if      (currentSpeed < targetSpeed) currentSpeed = Math.min(targetSpeed, currentSpeed + 20);
            else if (currentSpeed > targetSpeed) currentSpeed = Math.max(targetSpeed, currentSpeed - 20);
            System.out.println("[Flywheel] speed=" + (int) currentSpeed);
        }
    }
}`}
  expectedOutput={`=== Test 1: spinUp() (runs for 5 ticks) ===
[Flywheel] speed=20
[Flywheel] speed=40
[Flywheel] speed=60
[Flywheel] speed=80
[Flywheel] speed=100
=== Test 2: idle() ===
[Flywheel] speed=80`}
/>

<SolutionDropdown
  label="View Solution"
  explanation="spinUp() uses Commands.run() because it needs to continuously call io_setSpeed every loop cycle. finallyDo() guarantees io_stop() fires when the command ends, whether it was cancelled or timed out. idle() uses Commands.runOnce() because it only needs to call io_stop() a single time -- runOnce fires in initialize() and immediately reports finished."
  code={`public Command spinUp() {
    return Commands.run(() -> io_setSpeed(SHOOT_SPEED))
        .finallyDo((interrupted) -> io_stop());
}

public Command idle() {
    return Commands.runOnce(() -> io_stop());
}`}
/>

---

## Indexer

### The subsystem

The simulated `Indexer` has three `io_` methods and one getter:

| Method / Getter | What it does |
|---|---|
| `io_runFeeder()` | Starts the feeder motor (and stops outtaking) |
| `io_runOuttake()` | Starts the outtake motor (and stops feeding) |
| `io_stop()` | Stops both motors and prints `[Indexer] stopped.` |
| `emptyFuel()` | Returns `true` when all 3 game pieces have been fed through |

`periodic()` is already implemented &rarr; when feeding, it counts ticks and prints `[Indexer] piece fed! fuel left: N` every 2 ticks. When outtaking, it prints `[Indexer] outtaking...` each tick.

### Your task

Implement **two command factories** inside the `Indexer` class:

**`feed()`** &rarr; returns a command that:
- Runs `io_runFeeder()` continuously every loop cycle
- Ends automatically when `emptyFuel()` returns `true`
- Always calls `io_stop()` when it ends

**`outtake()`** &rarr; returns a command that:
- Runs `io_runOuttake()` continuously every loop cycle
- Never ends on its own (the binding or tick limit decides)
- Always calls `io_stop()` when it ends

<Note title="Pay Attention Again: Comments">
Remeber that a comment is started with `//` and are there for a reason. In these next few pieces of code, read **ALL** comments carefully and follow directions. Reading and being careful & precise is an important part of any programmers job too.
</Note>

### Expected output

```
=== Test 1: feed() ===
[Indexer] piece fed! fuel left: 2
[Indexer] piece fed! fuel left: 1
[Indexer] piece fed! fuel left: 0
[Indexer] stopped.
=== Test 2: outtake() (runs for 4 ticks) ===
[Indexer] outtaking...
[Indexer] outtaking...
[Indexer] outtaking...
[Indexer] outtaking...
[Indexer] stopped.
```

`feed()` feeds all 3 pieces (2 ticks per piece), then stops itself via `.until()` and calls `io_stop()`. `outtake()` runs for exactly 4 ticks (the test limit), then the Scheduler cancels it and `io_stop()` fires from `finallyDo`.

### Hints

<SolutionDropdown
  label="Hint 1 &rarr; how to make feed() stop itself"
  explanation="feed() needs to end when a condition becomes true &rarr; that's the .until(condition) decorator. Attach it directly to Commands.run(). Then add .finallyDo() after .until() to guarantee cleanup when the command ends (whether it stopped itself via until, or was cancelled)."
/>

<SolutionDropdown
  label="Hint 2 &rarr; the condition for until()"
  explanation="The condition you pass to .until() should be a BooleanSupplier &rarr; a lambda that returns a boolean. You want to stop when the hopper is empty, so the condition is: () -> emptyFuel(). You can also write this::emptyFuel as shorthand."
/>

<JavaRunner
  starterCode={`public class Main {

    // ============================================================
    //  YOUR TASK: implement the two command factories below.
    //  Do NOT modify anything below the "DO NOT EDIT" line.
    // ============================================================

    static class Indexer extends SimIndexer {

        // TODO 1: return a Command that continuously calls io_runFeeder(),
        //         ends when emptyFuel() is true, and always calls io_stop() on end.
        public Command feed() {
            return null; // replace this
        }

        // TODO 2: return a Command that continuously calls io_runOuttake()
        //         and always calls io_stop() when it ends.
        public Command outtake() {
            return null; // replace this
        }
    }

    public static void main(String[] args) {
        Indexer indexer = new Indexer();

        System.out.println("=== Test 1: feed() ===");
        Scheduler.run(indexer.feed(), indexer::periodic, 10);

        System.out.println("=== Test 2: outtake() (runs for 4 ticks) ===");
        Scheduler.run(indexer.outtake(), indexer::periodic, 4);
    }

    // ============================================================
    //  DO NOT EDIT BELOW THIS LINE -- simulation framework
    // ============================================================

    @FunctionalInterface interface BooleanConsumer { void accept(boolean b); }

    static class Command {
        Runnable _init    = () -> {};
        Runnable _execute = () -> {};
        java.util.function.BooleanSupplier _done = () -> false;
        BooleanConsumer _end = (b) -> {};

        public Command finallyDo(BooleanConsumer action) {
            BooleanConsumer prev = _end;
            _end = (b) -> { prev.accept(b); action.accept(b); };
            return this;
        }
        public Command until(java.util.function.BooleanSupplier cond) {
            java.util.function.BooleanSupplier prev = _done;
            _done = () -> prev.getAsBoolean() || cond.getAsBoolean();
            return this;
        }
    }

    static class Commands {
        static Command run(Runnable action) {
            Command c = new Command(); c._execute = action; return c;
        }
        static Command runOnce(Runnable action) {
            Command c = new Command(); c._init = action; c._done = () -> true; return c;
        }
    }

    static class Scheduler {
        static void run(Command cmd, Runnable periodic, int maxTicks) {
            if (cmd == null) { System.out.println("(command is null — finish your TODO first!)"); return; }
            cmd._init.run();
            for (int i = 0; i < maxTicks; i++) {
                cmd._execute.run();
                periodic.run();
                if (cmd._done.getAsBoolean()) { cmd._end.accept(false); return; }
            }
            cmd._end.accept(true);
        }
    }

    static class SimIndexer {
        private int  fuel      = 3;
        private int  feedTimer = 0;
        private boolean feeding   = false;
        private boolean outtaking = false;

        protected void io_runFeeder()  { feeding = true;  outtaking = false; }
        protected void io_runOuttake() { outtaking = true; feeding = false;  }
        protected void io_stop()       { feeding = false; outtaking = false; System.out.println("[Indexer] stopped."); }

        public boolean emptyFuel() { return fuel <= 0; }

        public void periodic() {
            if (feeding && fuel > 0) {
                feedTimer++;
                if (feedTimer >= 2) {
                    fuel--;
                    feedTimer = 0;
                    System.out.println("[Indexer] piece fed! fuel left: " + fuel);
                }
            }
            if (outtaking) {
                System.out.println("[Indexer] outtaking...");
            }
        }
    }
}`}
  expectedOutput={`=== Test 1: feed() ===
[Indexer] piece fed! fuel left: 2
[Indexer] piece fed! fuel left: 1
[Indexer] piece fed! fuel left: 0
[Indexer] stopped.
=== Test 2: outtake() (runs for 4 ticks) ===
[Indexer] outtaking...
[Indexer] outtaking...
[Indexer] outtaking...
[Indexer] outtaking...
[Indexer] stopped.`}
/>

<SolutionDropdown
  label="View Solution"
  explanation="feed() chains .until(this::emptyFuel) onto Commands.run() so it self-terminates when the hopper is empty. finallyDo() fires io_stop() regardless of how it ended. outtake() has no stopping condition of its own &rarr;    it relies on an external cancel (button release, tick limit) &rarr; so there's no .until(), just .finallyDo() for cleanup."
  code={`public Command feed() {
    return Commands.run(() -> io_runFeeder())
        .until(this::emptyFuel)
        .finallyDo((interrupted) -> io_stop());
}

public Command outtake() {
    return Commands.run(() -> io_runOuttake())
        .finallyDo((interrupted) -> io_stop());
}`}
/>


# Next Steps

Now you've completed <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Programming with Commands</span> After you feel comfortable with all content here, you may move onto the next section. 

**Congratulations!**