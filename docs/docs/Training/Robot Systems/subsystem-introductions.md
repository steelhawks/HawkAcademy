---
sidebar_position: 1
title: Subsystem Introductions
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Subsystem Introductions

Welcome to **Building a Robot**. Up to now you've learned Java and the WPILib basics — how to talk to a single motor, how to apply a motor config. This section is about the next step: how we take all those individual pieces of hardware and turn them into an organized robot program.

The very first idea you need is the **subsystem**. Almost everything else in our codebase hangs off of it, so we're going to take our time here. By the end of this page you should be able to answer two questions:

1. **What is a subsystem?**
2. **What has to be inside every subsystem we write?**

Everything below is grounded in our actual robot code, the `Rebuilt2026` repository — every file path we cite is a real file you can open and read.

<Note title="Where this fits">
This page just explains what a subsystem <em>is</em> and what goes in one. The pages after it in <strong>Building a Robot</strong> — <strong>State Machines</strong>, <strong>Commands</strong>, and <strong>Writing Your Own Subsystems</strong> — build directly on this. Read this one first.
</Note>

## What is a subsystem?

A **subsystem** is the code for **one mechanism on the robot**.

Look at a physical robot and point at the parts that move on their own:

- the **drivetrain** (the wheels that drive it around)
- the **intake** (the rollers and arm that grab game pieces)
- the **elevator** (the stage that goes up and down)
- the **flywheel** (the spinning wheels that shoot)

Each one of those is a subsystem. In our code, each gets its own folder under
`src/main/java/org/steelhawks/subsystems/`. If you list that folder in `Rebuilt2026` you'll see exactly this:

```
subsystems/
├── swerve/        ← the drivetrain
├── intake/        ← grabs fuel off the floor
├── indexer/       ← moves fuel through the robot
├── superstructure/ ← turret, flywheel, hood (the shooter)
├── vision/        ← cameras (PhotonVision)
├── beam/          ← a sensor that detects game pieces
└── led/           ← the status lights
```

Here's the mental model to hold onto:

> **The subsystems _are_ the robot.** They own the hardware (the motors, sensors, encoders) **and** the logic that decides what that hardware should do. Everything else in the program — the buttons on the controller, the autonomous routine — just *tells the subsystems what to do.* The subsystems are what actually do it.

So when a driver presses a button to run the intake, the button doesn't talk to the motor directly. It tells the **Intake subsystem** "go to your intaking state," and the Intake subsystem is the thing that knows how to actually spin the right motors at the right speed.

<Note title="New term: mechanism">
A <strong>mechanism</strong> is any single moving system on the robot — one job, usually its own set of motors and sensors. "One mechanism = one subsystem" is the rule of thumb. The intake is a mechanism. The shooter is a mechanism. The whole robot is <em>not</em> one mechanism, so the whole robot is not one subsystem.
</Note>

## Why do we bother with subsystems?

You *could* imagine throwing every motor for the whole robot into one giant file. We don't, for two big reasons.

### Reason 1: Encapsulation (hiding the messy parts)

**Encapsulation** means hiding the complicated inner workings of something behind a small, clean set of controls. You already use encapsulation every day: a car has a steering wheel and pedals. You don't reach into the engine to turn — you turn the wheel, and the messy engine stuff is *hidden* behind that simple control.

A subsystem does the same thing for a mechanism. Open our intake, `subsystems/intake/Intake.java`, and you'll find it's **almost 400 lines long** — trapezoid motion profiles, current-based homing, stall detection, feedforward math. That's the "engine." But the rest of the robot never has to touch any of that. It only sees a handful of simple controls, like:

```java
// From subsystems/intake/Intake.java — the clean "outside" of the intake
public void setDesiredState(State state) { ... }   // "go here"
public boolean atGoal() { ... }                     // "are you there yet?"
public Command runIntake() { ... }                  // "spin the rollers"
```

All the scary math is **hidden** inside. The rest of the program only sees those few clean methods. That's encapsulation, and it's the main reason subsystems exist.

### Reason 2: One thing controls a mechanism at a time

Imagine two parts of the code both try to drive the same intake motor in the same instant — one says "spin forward," the other says "spin backward." The motor gets contradictory orders and the robot does something random and possibly dangerous.

To prevent that fight, WPILib enforces a rule:

> **Only one command can use a subsystem at a time.**

A **command** is a small task that uses a subsystem (we cover these fully on the **Commands** page, next in this section). Because a subsystem can only be claimed by one command at a time, two things can never fight over the same motor. If a new command grabs the intake, the old one is automatically stopped first. This rule is the whole reason a subsystem is its own object — it's the unit of "who's allowed to control this hardware right now."

<Note title="Takeaway">
Subsystems exist to (1) <strong>hide</strong> messy hardware logic behind a clean interface, and (2) guarantee that <strong>one and only one</strong> thing controls a mechanism at any moment.
</Note>

## What goes in every subsystem?

Now the practical part. Every subsystem we write has the same skeleton. We'll go through each piece, then look at a real one end to end.

### 1. It extends `SubsystemBase`

Every subsystem is a class that **extends `SubsystemBase`** (a WPILib class). Extending it is what makes WPILib treat the class as a subsystem — it's how the "one command at a time" rule and the automatic `periodic()` call (more on that below) get wired up for you.

```java
// subsystems/indexer/Indexer.java
public class Indexer extends SubsystemBase {
    ...
}
```

<Note title="Reminder from Java Basics">
<code>extends</code> means "inherits from." By extending <code>SubsystemBase</code>, our class gets all of WPILib's subsystem behavior for free, and we just add the parts specific to <em>our</em> mechanism.
</Note>

### 2. The hardware lives behind an IO layer

This is the part that looks different from a basic WPILib tutorial, so read carefully.

A subsystem doesn't talk to its motors directly. Instead it talks to an **IO layer** — short for input/output. The IO layer is the boundary between "our logic" and "the actual hardware."

We do this because of **AdvantageKit**, the logging library we use. (You met AdvantageKit's viewer, AdvantageScope, back in Robot Code Basics.) AdvantageKit can record every input the robot saw and *replay* it later on a laptop to debug a match — but only if all the hardware reads/writes go through one well-defined door. The IO layer is that door.

It has two parts:

**(a) An IO _interface_** that lists what the hardware can do. For the indexer that's `subsystems/indexer/IndexerIO.java`:

```java
// subsystems/indexer/IndexerIO.java
public interface IndexerIO {

    @AutoLog
    class FeederIOInputs {
        public boolean connected = false;
        public double velocityRadPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double currentAmps = 0.0;
        public double tempCelsius = 0.0;
    }

    default void updateInputs(SpindexerIOInputs spindexerInputs, FeederIOInputs feederInputs) {}
    default void runSpindexer(double output) {}
    default void runFeeder(double output) {}
    default void stopSpindexer() {}
    default void stopFeeder() {}
}
```

Two things to notice:

- The `@AutoLog` annotation on the `...Inputs` class tells AdvantageKit "automatically log every field in here." That's how the indexer's motor velocity, voltage, current, and temperature all show up in AdvantageScope without us writing logging code by hand. (`@AutoLog` generates a helper class — you'll see `FeederIOInputsAutoLogged` used in the subsystem — but you never write that class yourself.)
- The methods (`runFeeder`, `stopSpindexer`, …) are the *actions* the hardware can perform. The interface only names them; it doesn't say how they're done.

**(b) One or more _implementations_** that actually do those actions. The same interface gets implemented several different ways, and the robot picks one at startup depending on where it's running:

| Implementation | File | Used when |
|---|---|---|
| Real hardware | `IndexerIOTalonFX.java` | Running on the actual robot (talks to real TalonFX motors) |
| Simulation | `IndexerIOSim.java` | Running on a laptop with no robot attached |
| No-op (empty) | `new IndexerIO() {}` | Replay, or a robot that doesn't have this mechanism |

The "no-op" version is interesting: because every method in the interface is a `default` method with an empty body, you can write `new IndexerIO() {}` and get a fully valid IO object that simply does nothing. That's how a robot configuration that has no indexer still compiles and runs.

<Note title="Why this matters to a rookie">
The subsystem class (e.g. <code>Indexer</code>) only ever holds an <code>IndexerIO</code> — it never knows or cares whether that's a real motor or a simulated one. That's encapsulation again, one level deeper: the same exact logic runs on the real robot and in simulation, just with a different IO plugged in.
</Note>

### 3. State — the enum and the "desired state" field

This is the heart of how **we** write robots. We are a **state-machine team**: instead of scattering "if button pressed, spin motor" logic everywhere, each subsystem keeps track of *what it is currently trying to be*, and its logic just works toward that.

A **state** is a named situation the mechanism can be in. We list the possible states in a Java `enum`. Here is the intake's, from `subsystems/intake/Intake.java`:

```java
// subsystems/intake/Intake.java
public enum State {
    RETRACTED(RETRACTED_POS),
    CENTER_OF_MOTION((RETRACTED_POS + HOME_POS) / 2.0),
    HOME(HOME_POS),
    INTAKE(0.3);

    private final double positionMeters;

    State(double positionMeters) {
        this.positionMeters = positionMeters;
    }

    public double getPosition() {
        return positionMeters;
    }
}
```

Each state carries the data that defines it — here, the rack position in meters that the intake should go to. `INTAKE` means "extend to 0.3 m to grab a piece," `HOME` means "tucked in," and so on.

The subsystem then holds a field for **which state it's currently trying to reach**:

```java
// subsystems/intake/Intake.java
private State desiredGoal = State.HOME;   // start tucked in
```

And it exposes a clean method to change that goal:

```java
// subsystems/intake/Intake.java
public void setDesiredState(State state) {
    inputs.goal = MathUtil.clamp(state.getPosition(), MIN_EXTENSION, MAX_EXTENSION_FROM_FRAME);
    goal = new TrapezoidProfile.State(inputs.goal, 0.0);
    desiredGoal = state;
}
```

So the rest of the robot never says "set the intake motor to 0.3 meters." It says `setDesiredState(State.INTAKE)` — a goal, not a raw command. The subsystem figures out the rest. That single idea is the whole reason we call ourselves a state-machine team, and the **State Machines** page (next) goes much deeper into it.

<Note title="New term: enum">
An <code>enum</code> ("enumeration") is a Java type with a fixed list of named values. <code>State.HOME</code>, <code>State.INTAKE</code>, <code>State.CENTER_OF_MOTION</code>, <code>State.RETRACTED</code> — those are the only intake states that can exist, so it's impossible to set the intake to a state that doesn't make sense. Enums are perfect for state machines.
</Note>

### 4. `periodic()` — the heartbeat that acts on the state

Setting a desired state doesn't move anything by itself. The actual work happens in a special method called **`periodic()`**.

WPILib calls every subsystem's `periodic()` method automatically, **once every 20 milliseconds** (50 times a second) — for as long as the robot is on. In our code that 20 ms loop time is even a named constant, `Constants.UPDATE_LOOP_DT = 0.020`. Think of `periodic()` as the mechanism's heartbeat.

Every subsystem's `periodic()` does the same two jobs:

1. **Read and log the hardware** through the IO layer.
2. **Act on the current state** — nudge the mechanism toward its goal.

Here is the top of the indexer's `periodic()`, the part that does job #1:

```java
// subsystems/indexer/Indexer.java
@Override
public void periodic() {
    io.updateInputs(spindexerInputs, feederInputs);   // read the hardware
    beamIO.updateInputs(beamInputs);
    Logger.processInputs("Indexer/Spindexer/Inputs", spindexerInputs);  // log it
    Logger.processInputs("Indexer/Feeder/Inputs", feederInputs);
    ...
}
```

`io.updateInputs(...)` fills the `...Inputs` objects with the latest sensor readings, and `Logger.processInputs(...)` hands them to AdvantageKit so they show up in AdvantageScope (and can be replayed). **Every one of our subsystems starts its `periodic()` with these two lines** — it's the most consistent pattern in the whole codebase.

For job #2, the intake's `periodic()` looks at its `goal` and runs a motion profile toward it every loop. That math is advanced (it belongs to the **control theory** material, not here), but the shape is simple: *read inputs → log them → move toward the desired state.*

<Note title="Two ways things get logged">
<strong><code>@AutoLog</code> inputs</strong> are sensor readings coming <em>in</em> (velocity, current, temperature) — logged automatically. <strong><code>Logger.recordOutput("...", value)</code></strong> is for decisions we compute and want to see, like the intake's <code>"Intake/IsHomed"</code> flag. You'll see both all over our subsystems.
</Note>

### 5. A small public interface — everything else is private

We follow **encapsulation** strictly: a subsystem exposes only the few methods the rest of the robot needs, and marks **everything else `private`**.

Look at the indexer again. Its internal helpers — debouncers, jam-current thresholds, the `shouldRun()` check — are all `private`. Only a small, deliberate set of methods is `public`:

```java
// subsystems/indexer/Indexer.java — the public "controls" of the indexer
public boolean isJammed() { ... }      // a getter: ask about its state
public Command feed() { ... }          // a command factory: "feed a game piece"
public Command outtake() { ... }       // a command factory: "spit it back out"
```

Those public methods fall into three buckets, and almost every subsystem we have follows the same three:

- **State setters** — change what the subsystem is trying to do (`setDesiredState`).
- **State getters** — ask about the subsystem (`atGoal`, `isJammed`).
- **Command factories** — methods that return a `Command`, like `feed()`. A *command factory* is just a method that hands back a ready-to-use task for that subsystem. (Commands get their own page — that's where we explain `Command` fully.)

If a method isn't one of those three things, it's `private`. When in doubt, make it private — you can always open it up later.

### 6. Constants come from the `Constants` file — never magic numbers

A **magic number** is a bare value like `35.0` sitting in the code with no name, where you can't tell what it means or where it came from. We don't do that. Hardware values — motor CAN IDs, gear ratios, current limits, setpoints — live in one place: `SubsystemConstants.java`.

Each subsystem has a matching `record` of its constants. The intake's is:

```java
// SubsystemConstants.java
public record IntakeConstants(
    int leftId, int rightId, int intakeId,         // motor CAN IDs
    double kS, double kG, double kA, double kP, double kI, double kD,  // control gains
    double maxVelocityMetersPerSec, double maxAccelMetersPerSecSq,
    double currentHomingThreshold,
    double velocityStallingThreshold,
    double intakeSpeed, double outtakeSpeed,
    double positionTwistingThreshold
) { ... }
```

and the real values for our competition robot are filled in once, in `SubsystemConstants.OmegaBot.INTAKE`:

```java
// SubsystemConstants.java
new IntakeConstants(
    1, 2, 3,          // left, right, and roller motor IDs
    5.0, 0.0, 0.0,    // kS, kG, kA
    200.0, 0.0, 0.0,  // kP, kI, kD
    3.0, 5.0,         // max velocity, max accel
    35.0, 0.05,       // homing current threshold, stall velocity threshold
    0.9, -1.0,        // intake speed, outtake speed
    0.8);             // twisting threshold
```

The `Intake` class receives this in its constructor and reads `constants.intakeSpeed()`, `constants.kP()`, and so on. Because the numbers live in one record, a different robot (we have several) can plug in different values without touching the intake logic at all.

## Anatomy of a real subsystem: the Indexer

Let's put every piece together by walking through one real, complete subsystem: the **indexer** (the mechanism that moves fuel through the robot toward the shooter). Open `subsystems/indexer/Indexer.java` and follow along — here it is with the six pieces labeled.

```java
// subsystems/indexer/Indexer.java
public class Indexer extends SubsystemBase {          // ① extends SubsystemBase

    // ③ STATE: the named situations this mechanism can be in
    public enum IndexerState {
        RUNNING(1.0, 1.0),
        OUTTAKING(-0.6, -1.0);

        final double spindexerOutput;
        final double feederOutput;
        IndexerState(double s, double f) { spindexerOutput = s; feederOutput = f; }
    }

    // ② IO LAYER: hardware handles + auto-logged inputs (never raw motors)
    private final SpindexerIOInputsAutoLogged spindexerInputs = new SpindexerIOInputsAutoLogged();
    private final FeederIOInputsAutoLogged   feederInputs     = new FeederIOInputsAutoLogged();
    private final IndexerIO io;

    // ⑥ CONSTANTS: passed in, not hard-coded
    public Indexer(IndexerIO io, BeamIO beamIO, SubsystemConstants.IndexerConstants constants) {
        this.io = io;
        ...
    }

    @Override
    public void periodic() {                          // ④ heartbeat, every 20 ms
        io.updateInputs(spindexerInputs, feederInputs);          // read hardware
        Logger.processInputs("Indexer/Feeder/Inputs", feederInputs);  // log it
        ...                                                       // then act on state
    }

    // ⑤ SMALL PUBLIC INTERFACE: getters + command factories, nothing else
    @AutoLogOutput(key = "Indexer/Jammed")
    public boolean isJammed() { ... }                 // a getter

    public Command feed() { ... }                     // a command factory

    private boolean shouldRun() { ... }               // ← private: an internal detail
}
```

Read top to bottom, every subsystem we write is that same shape:

1. **`extends SubsystemBase`** — it's a subsystem.
2. **IO layer** — `IndexerIO io` plus the `@AutoLog` input objects; no raw motors in sight.
3. **State** — the `IndexerState` enum naming what it can do.
4. **`periodic()`** — reads + logs the hardware every 20 ms, then acts on state.
5. **Small public interface** — a getter (`isJammed`) and command factories (`feed`); `shouldRun` is private.
6. **Constants** — handed in through the constructor, never typed inline.

### How it gets created (wiring)

You might be wondering who actually builds the `Indexer` object and hands it a real `IndexerIO`. That happens at startup. In `RobotContainer.java` (the file that owns all the subsystems) there's one field per subsystem:

```java
// RobotContainer.java
public static Indexer s_Indexer = null;
...
s_Indexer = config.createIndexer().orElse(null);
```

and the `config` decides which IO implementation to plug in based on which robot is running. On the real competition robot:

```java
// RobotConfig.java — real-hardware factory
public Indexer createIndexer(IndexerConstants c) {
    return new Indexer(new IndexerIOTalonFX(...), new BeamIOCANRange(...), c);
}
```

…while the simulation factory builds the very same `Indexer` with `new IndexerIOSim()` instead, and a robot without an indexer uses the empty `new IndexerIO() {}`. Same subsystem, different IO. That's the payoff of the IO layer.

## See state machines in action (try it)

You don't have a robot in front of you, so here's a tiny stand-in you can actually run. It's plain Java — no WPILib — but it mirrors exactly the pattern above: a `State` enum, a private "desired state" field, a clean `setDesiredState()` setter, and a `periodic()` that acts on the state. Press **▶ Run** and read the output, then try changing the `setDesiredState(...)` calls in `main`.

<JavaRunner
  starterCode={`public class Main {

    // A miniature "subsystem" — same shape as our real Intake.
    static class MiniIntake {

        // ③ STATE: the named situations, each carrying its target position.
        enum State {
            HOME(0.0),
            INTAKE(0.3);

            final double positionMeters;
            State(double positionMeters) { this.positionMeters = positionMeters; }
        }

        // The "desired state" field — what we are trying to be right now.
        private State desiredState = State.HOME;
        private double currentPosition = 0.0;   // pretend this is the motor's position

        // ⑤ Small public interface: one setter...
        public void setDesiredState(State state) {
            this.desiredState = state;
        }
        // ...and one getter.
        public boolean atGoal() {
            return Math.abs(currentPosition - desiredState.positionMeters) < 0.01;
        }

        // ④ periodic(): runs every loop, nudges us toward the desired state.
        public void periodic() {
            double goal = desiredState.positionMeters;
            currentPosition += (goal - currentPosition) * 0.5;  // move halfway there
            System.out.printf("desired=%s  position=%.3f  atGoal=%b%n",
                desiredState, currentPosition, atGoal());
        }
    }

    public static void main(String[] args) {
        MiniIntake intake = new MiniIntake();

        // Tell it WHERE to be — not how to get there. Try changing this!
        intake.setDesiredState(MiniIntake.State.INTAKE);

        // Simulate the 20ms heartbeat running a few times.
        for (int i = 0; i < 5; i++) {
            intake.periodic();
        }
    }
}`}
/>

Notice that `main` never touches `currentPosition` — it only sets a *goal* and lets `periodic()` do the work. That's the state-machine pattern you'll use in every subsystem.

## What is *not* a subsystem's job

It's just as important to know what to keep **out** of a subsystem. A subsystem owns its hardware and the logic to reach a state — and nothing else.

- **Deciding *when* to do something** is not the subsystem's job. "When the driver presses A, intake a piece" lives in a **command** and in the button bindings (in `RobotContainer`), not inside `Intake`. The subsystem just exposes `setDesiredState` and waits to be told.
- **Sequencing several mechanisms together** (intake, then index, then shoot) is the job of **commands** and **state machines**, which coordinate multiple subsystems. A single subsystem never reaches into another to boss it around.
- **Driving a path across the field** — trajectories, "drive to this point and rotate" — is **autonomous** logic. The drivetrain subsystem knows how to *follow* a chassis speed; it does not know what path to drive. That choice lives in the auton routines under `commands/autos/`.

If you keep finding yourself writing "when *X* happens, do *Y*" inside a subsystem, that's a sign the logic belongs in a command instead.

Here's the path through the rest of **Building a Robot**, in order:

1. **Subsystem Introductions** — this page. *What a subsystem is and what's in one.*
2. **State Machines** — how subsystems use states to decide behavior (the `desiredState` idea, taken much further).
3. **Commands** — the small tasks that *tell* subsystems what to do, and the "one command per subsystem" rule.
4. **Writing Your Own Subsystems** — you build one from scratch, using everything above.

## Check yourself

<Quiz questions={[
{
prompt: "What is a subsystem, in one sentence?",
options: [
"The entire robot program in a single file",
"The code for one mechanism on the robot — its hardware plus the logic that runs it",
"A list of the buttons on the driver's controller",
"The autonomous routine that drives a path"
],
correct: 1,
explanation: "A subsystem is one mechanism (intake, elevator, drivetrain…): it owns that mechanism's hardware and the logic that runs it. Everything else just tells subsystems what to do."
},
{
prompt: "WPILib enforces that only one command can use a subsystem at a time. Why is that rule useful?",
options: [
"It makes the robot code compile faster",
"It lets two commands share a motor evenly",
"It stops two pieces of code from giving the same motor contradictory orders at once",
"It is required to log data with AdvantageKit"
],
correct: 2,
explanation: "If two commands controlled one motor simultaneously they could send opposite commands. The one-command-per-subsystem rule guarantees only one thing controls a mechanism at any instant."
},
{
prompt: "In our code a subsystem talks to an IO interface (like IndexerIO) instead of the motors directly. What does that let us do?",
options: [
"Run the exact same subsystem logic on the real robot and in simulation by swapping the IO implementation",
"Skip writing a constructor",
"Avoid using SubsystemBase",
"Make every field public"
],
correct: 0,
explanation: "The subsystem only holds an IndexerIO. Plug in IndexerIOTalonFX for real hardware, IndexerIOSim for simulation, or an empty `new IndexerIO(){}` for a robot without that mechanism — the logic above it never changes. AdvantageKit also uses this boundary to log and replay inputs."
},
{
prompt: "How often does WPILib call a subsystem's periodic() method?",
options: [
"Once, when the robot turns on",
"Only when a button is pressed",
"Every 20 milliseconds (50 times a second), the whole time the robot is on",
"Once per match"
],
correct: 2,
explanation: "periodic() is the subsystem's heartbeat — it runs every 20 ms (Constants.UPDATE_LOOP_DT = 0.020). That's where we read & log the hardware and act on the current state."
},
{
prompt: "We are a state-machine team. What does the `desiredState` (or `desiredGoal`) field in a subsystem represent?",
options: [
"The exact voltage to send to the motor",
"What situation the mechanism is currently trying to reach, which periodic() then works toward",
"A log file name",
"The CAN ID of the motor"
],
correct: 1,
explanation: "Instead of commanding raw motor values, the rest of the robot sets a goal state (like State.INTAKE). The subsystem stores that in desiredState and its periodic() drives the hardware toward it."
},
{
prompt: "Which of these does NOT belong inside a subsystem?",
options: [
"The IO handle and its @AutoLog inputs",
"An enum of the states the mechanism can be in",
"The decision of which field path to drive during autonomous",
"A periodic() that reads inputs and acts on the current state"
],
correct: 2,
explanation: "Choosing an autonomous path is auton/command logic (commands/autos/), not a subsystem's job. A subsystem owns its hardware, its states, and its periodic() — but it doesn't decide when or what the overall robot strategy is."
}
]} />

<Note title="Where to go next">
You now know what a subsystem is and the six pieces every one of ours contains. Next up in <strong>Building a Robot</strong> is <strong>State Machines</strong>, which takes the <code>desiredState</code> idea you just met and turns it into the way we structure a whole robot's behavior.
</Note>
