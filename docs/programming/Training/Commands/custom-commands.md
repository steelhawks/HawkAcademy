---
sidebar_position: 4
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import Caption from '@site/src/components/Caption'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# Custom Commands

In this section, we'll go over creating regular command functions, and then command compositions.

**Command functions** are used throughout our code in order to do specific things, and in this section we'll teach you how we use command functions.

**Command Compositions** are groups of commands that are used in order to perform a complex action.

---

## Command Functions (Factories)

You already know what commands are and how to build them inline. But in real robot code, you almost never write a command directly inside `RobotContainer`. Instead, each subsystem exposes **command factories** -- public methods that build and return a `Command` that is specific to what that subsystem does.

```java
// A command factory lives inside the subsystem class and returns a Command
public Command intake() {
    return Commands.run(() -> runRollers(RollerState.INTAKING), this)
        .until(() -> s_Beam.isTriggered());
}
```

This is just a regular Java method with a return type of `Command`. When `RobotContainer` calls it, it gets back a fully-configured command ready to be scheduled.

### Why they live in the subsystem file

There are two big reasons we put command factories directly inside the subsystem:

**1. Access to private internals.** The command needs to call `io.runRollers(...)`, check `inputs.velocity`, or read a private field. Because the factory lives inside the class, it can reach everything -- no need to make anything public that shouldn't be.

**2. Keeps `RobotContainer` clean.** Instead of building a 15-line command inline in the button binding, `RobotContainer` just calls one method. The button binding stays readable, and all the logic stays in the one file that owns the hardware.

```java
// Without a command factory -- cluttered RobotContainer
m_Controller.leftBumper().whileTrue(
    Commands.run(() -> {
        s_Intake.setDesiredState(Intake.State.INTAKE);
        s_Intake.runRollers(Intake.RollerState.INTAKING);
    }, s_Intake).until(() -> s_Beam.isTriggered())
     .finallyDo((interrupted) -> s_Intake.stopRollers())
);

// With a command factory -- clean RobotContainer
m_Controller.leftBumper().whileTrue(s_Intake.intake());
```

Same behavior, one line vs. six. The factory holds all the complexity inside the subsystem where it belongs.

---

## Intake Subsystem: Building Command Factories Step by Step

Let's walk through building command factories for a real intake subsystem. The `Intake` class controls an arm that extends out (to grab game pieces off the floor) and a set of rollers that pull the piece in.

Here's the state enum and the key methods we'll be working with:

```java
// Inside Intake.java
public class Intake extends SubsystemBase {

    public enum State {
        RETRACTED,   // arm fully tucked in
        HOME,        // arm at a resting position inside the frame
        INTAKE       // arm extended to grab a game piece
    }

    public enum RollerState {
        INTAKING,    // spin rollers inward to grab a piece
        OUTTAKING,   // spin rollers outward to spit a piece back out
        STOPPED
    }

    // Private hardware methods -- the command factories will call these
    private void setDesiredState(State state) { ... }
    private void runRollers(RollerState state) { ... }
    private void stopRollers() { ... }

    // Getter: did the arm reach its goal position?
    public boolean atGoal() { ... }
}
```

<Note title="Public vs. Private">
Notice that <code>setDesiredState</code>, <code>runRollers</code>, and <code>stopRollers</code> are <strong>private</strong>. The rest of the robot doesn't call them directly -- it uses the command factories below, which are <strong>public</strong>. This is encapsulation in practice: the outside world gets clean, safe commands, not raw hardware methods.
</Note>

---

### Some Simple Factories
Here we'll go over some simple factories that are used, and what commands they use:

### `retract()`
The simplest command factory just sets the subsystem's state once and finishes immediately. There's nothing to wait for -- the arm will drive itself to the retracted position inside `periodic()`.

```java
// Inside Intake.java
public Command retract() {
    return Commands.runOnce(() -> setDesiredState(State.RETRACTED), this)
        .withName("Intake.retract");
}
```

`Commands.runOnce` fires the lambda once and immediately reports finished. `this` declares `Intake` as the subsystem requirement so no other command can fight over it.

```java
// In RobotContainer.java
m_Controller.b().onTrue(s_Intake.retract());
```
<!-- ### Factory 1: `retract()` -- a one-shot state change

The simplest command factory just sets the subsystem's state once and finishes immediately. There's nothing to wait for -- the arm will drive itself to the retracted position inside `periodic()`.

```java
// Inside Intake.java
public Command retract() {
    return Commands.runOnce(() -> setDesiredState(State.RETRACTED), this)
        .withName("Intake.retract");
}
```

`Commands.runOnce` fires the lambda once and immediately reports finished. `this` declares `Intake` as the subsystem requirement so no other command can fight over it.

```java
// In RobotContainer.java
m_Controller.b().onTrue(s_Intake.retract());
``` -->

---

###  `extend()`

Sometimes you want to pre-position the arm without immediately spinning the rollers. This is still a one-shot factory, just setting a different state.

```java
// Inside Intake.java
public Command extend() {
    return Commands.runOnce(() -> setDesiredState(State.INTAKE), this)
        .withName("Intake.extend");
}
```

---

###  `runIntake()`

This one simply runs the rollers to intake balls inside.

```java
// Inside Intake.java
public Command runIntake() {
        return Commands.run(
                () -> io.runIntake(constants.intakeSpeed()), this)
            .beforeStarting(() -> isRollersRunning = true)
            .finallyDo(() -> {
                isRollersRunning = false;
                io.stopIntake();
            });
    }
```

A few things to notice:

- We run the intake through the `io` functions
- `isRollersRunning` helps keep track of if we're intaking using a `boolean`
- `.finallyDo(() -> {..})` helps to finish this action by stopping the rollers and setting the boolean to false.

```java
// In RobotContainer.java
m_Controller.leftBumper().whileTrue(s_Intake.runIntake());
```

---

### `outtake()`

Outtaking is a continuous action that runs as long as the button is held. There's no sequence -- just run the rollers until the binding ends.

```java
// Inside Intake.java
public Command outtake() {
    return Commands.run(() -> runRollers(RollerState.OUTTAKING), this)
        .finallyDo((interrupted) -> stopRollers())
        .withName("Intake.outtake");
}
```

`Commands.run` never finishes on its own, so `.whileTrue` is the right binding -- the command runs as long as the button is held and stops the rollers the moment it's released.

```java
// In RobotContainer.java
m_Controller.rightBumper().whileTrue(s_Intake.outtake());
```

---

## Command Compositions

A **command composition** is a command built from other commands. Instead of writing one big command that does everything itself, you compose smaller commands -- including your own command factories -- together to produce complex multi-step behavior.

WPILib gives you four main composition builders, and they are all called on the `Commands` class:

| Composer | What it does |
|---|---|
| `Commands.sequence(a, b, c)` | Runs commands **one at a time**, in order. Starts `b` when `a` finishes, starts `c` when `b` finishes. |
| `Commands.parallel(a, b, c)` | Runs all commands **at the same time**. The whole group finishes when **all** commands finish. |
| `Commands.race(a, b, c)` | Runs all commands at the same time. The group finishes when **any one** command finishes -- the rest are cancelled. |
| `Commands.deadline(main, others...)` | Like `race`, but the group finishes only when the **first** (deadline) command finishes, regardless of the others. |

<Note title="Compositions are commands">
The result of <code>Commands.sequence(...)</code>, <code>Commands.parallel(...)</code>, etc. is itself a <code>Command</code> -- which means you can decorate it with <code>.withTimeout()</code>, <code>.finallyDo()</code>, and so on, just like any other command. You can also nest them: a <code>sequence</code> can contain a <code>parallel</code>, and that <code>parallel</code> can contain other sequences.
</Note>

---

## Shoot Composition: Bringing Multiple Subsystems Together

The most common place for command compositions is a **multi-subsystem action** -- something that coordinates the intake, indexer, flywheel, turret, and vision all at once. The shoot command is the clearest example of this in our codebase.

Because it touches four different subsystems, it doesn't live inside any one of them. Instead it lives in its own file: `commands/ShootingCommands.java`. This is a plain class with `static` factory methods -- no extending anything, just a home for multi-subsystem logic that wouldn't belong in any single subsystem.

Here is the real `shoot()` command from that file:

```java
// commands/ShootingCommands.java
public static Command shoot() {
    return Commands.sequence(

        // ① Tell RobotState we are shooting -- the flywheel reads this in periodic()
        //   to compute and track its target velocity automatically.
        Commands.runOnce(() ->
            RobotState.getInstance().setShootingState(ShootingState.SHOOTING)),

        // ② Reset the beam sensor so the indexer can detect a fresh game piece.
        Commands.runOnce(() -> RobotContainer.s_Indexer.resetBeamState()),

        // ③ Whitelist only the vision tags for our alliance's hub so the turret
        //   doesn't accidentally lock onto the wrong target.
        Commands.runOnce(() -> {
            if (AllianceFlip.shouldFlip()
                && RobotState.getInstance().getAimState().equals(AimState.TO_HUB)
            ) {
                Vision.whitelistTagIds(VisionConstants.RED_TAGS);
            } else {
                Vision.whitelistTagIds(VisionConstants.BLUE_TAGS);
            }
        }),

        // ④ Gate: don't feed until the flywheel is up to speed AND the turret has
        //   finished aiming. The only exception is ferry mode, where we shoot
        //   immediately regardless of turret state.
        Commands.waitUntil(() ->
            (RobotContainer.s_Flywheel.isReadyToShoot()
                && !RobotContainer.s_Turret.isTraversing()
                && RobotContainer.s_Turret.atGoal())
                || RobotState.getInstance().getAimState().equals(AimState.FERRY)),

        // ⑤ Feed the game piece. While the indexer feeds, a parallel branch watches
        //   for an empty hopper and agitates the intake to push more fuel in.
        //   .repeatedly() restarts the whole group every time a piece clears.
        RobotContainer.s_Indexer.feed()
            .alongWith(
                Commands.waitUntil(() -> RobotContainer.s_Indexer.emptyFuel())
                    .andThen(Commands.waitSeconds(0.05))
                    .andThen(RobotContainer.s_Intake.agitate()
                        .onlyIf(() -> !RobotContainer.s_Intake.isRollersRunning())))
            .repeatedly()

    // ⑥ Cleanup: reset shooting state, restore all vision tags, and move the
    //   intake back to INTAKE position -- all guaranteed to run no matter how
    //   the sequence ended.
    ).finallyDo(() -> {
        RobotState.getInstance().setShootingState(ShootingState.NOTHING);
        Vision.whitelistTagIds(VisionConstants.ALL_ALLOWED_TAGS);
        CommandScheduler.getInstance().schedule(
            RobotContainer.s_Intake.setDesiredStateCommand(Intake.State.INTAKE));
    });
}
```

Let's break down each structural decision.

---

### Steps 1-3: three instant setup commands

The first three steps are all `runOnce` -- they each fire once and finish immediately. Together they do three pieces of setup before anything mechanical happens:

- **1 Set `ShootingState.SHOOTING`** -- `RobotState` is a singleton that holds the robot's global aim state. The flywheel's `periodic()` reads this every loop cycle to decide which velocity to target. Setting the state here is what causes the flywheel to start spinning up -- there's no direct `setSpeed()` call. The state machine in `periodic()` handles it.

- **2 Reset the beam sensor** -- The indexer uses a debounced beam sensor to know when a game piece has passed through. Resetting it here gives the sensor a fresh slate so it can correctly detect the next piece being fed.

- **3 Whitelist vision tags** -- The turret uses April Tags to aim. Whitelisting only the tags on our alliance's hub prevents it from accidentally tracking a tag on the opposing alliance's hub, which would result in a wrong-direction shot.

<Note>
All three of these finish in the same loop cycle, so from the robot's perspective they happen simultaneously at the start of the command. The sequence moves straight to the <code>waitUntil</code> gate.
</Note>

---

### Step 4: the readiness gate

```java
Commands.waitUntil(() ->
    (RobotContainer.s_Flywheel.isReadyToShoot()
        && !RobotContainer.s_Turret.isTraversing()
        && RobotContainer.s_Turret.atGoal())
        || RobotState.getInstance().getAimState().equals(AimState.FERRY))
```

This is the most important step. Nothing gets fed until **all three** of these are true simultaneously:

| Condition | What it checks |
|---|---|
| `s_Flywheel.isReadyToShoot()` | Flywheel velocity is within tolerance of its target |
| `!s_Turret.isTraversing()` | Turret isn't in the middle of crossing its dead spot |
| `s_Turret.atGoal()` | Turret angle is settled on the target |

The `|| AimState.FERRY` clause is an escape hatch: in ferry mode (shooting across the field instead of at the hub) the turret doesn't need to aim at an April Tag, so we skip the turret checks entirely.

Separating this gate from the feed keeps each command doing exactly one thing. The `feed()` factory doesn't need to know anything about flywheel speed or turret state -- that's not its job.

---

### Step 5: `.alongWith()` and `.repeatedly()`

```java
RobotContainer.s_Indexer.feed()
    .alongWith(
        Commands.waitUntil(() -> RobotContainer.s_Indexer.emptyFuel())
            .andThen(Commands.waitSeconds(0.05))
            .andThen(RobotContainer.s_Intake.agitate()
                .onlyIf(() -> !RobotContainer.s_Intake.isRollersRunning())))
    .repeatedly()
```

There are two new concepts here: `.alongWith()` and `.repeatedly()`.

**`.alongWith(other)`** runs `other` in parallel with the command it's called on, and the group ends when the **caller** (the left side, `feed()`) ends. This is different from `Commands.parallel()` which waits for all commands to finish. Here, the agitation logic is a side effect -- the group ends when `feed()` is done, not when `agitate()` is done.

The parallel branch itself is a mini-sequence:
1. Wait until the hopper reports empty (the beam sensor sees no fuel passing)
2. Wait 50ms (a small debounce -- avoids false triggers right as the last piece clears)
3. Start agitating the intake to push remaining fuel toward the indexer, but only if the intake rollers aren't already running (e.g. in `shootWhileIntaking`, the rollers are already spinning, so skip this)

**`.repeatedly()`** wraps the entire group in an infinite loop -- when the group finishes, it immediately restarts. This lets the robot feed multiple game pieces one after another without the driver needing to release and re-press the button.

---

### Step 6: `finallyDo` 
```java
.finallyDo(() -> {
    RobotState.getInstance().setShootingState(ShootingState.NOTHING);
    Vision.whitelistTagIds(VisionConstants.ALL_ALLOWED_TAGS);
    CommandScheduler.getInstance().schedule(
        RobotContainer.s_Intake.setDesiredStateCommand(Intake.State.INTAKE));
})
```

`finallyDo` is attached to the outermost sequence, so it runs no matter how the command ended -- normal completion, driver cancel, or interrupt. It does three things:

- Resets `ShootingState` back to `NOTHING` so the flywheel returns to its idle velocity
- Restores the full vision tag whitelist so the turret can track any target again
- Schedules `setDesiredStateCommand(Intake.State.INTAKE)` to move the intake back out -- note it uses `CommandScheduler.getInstance().schedule()` rather than being part of the sequence. This is intentional: scheduling it externally means it can run even if the current command group has already been fully ended

<Note title="Scheduling from finallyDo">
Normally you should not schedule commands from inside another command. Here it's acceptable because <code>setDesiredStateCommand</code> is a trivial <code>runOnce</code> that just sets a state-machine goal -- it doesn't interact with any ongoing command. The alternative would be to return the intake to INTAKE as the last step of the sequence, but that would prevent <code>finallyDo</code> from firing first on cancel.
</Note>
---

<Quiz questions={[
{
prompt: "Why do we define command factories inside the subsystem file rather than building commands inline in RobotContainer?",
options: [
"WPILib requires all commands to be defined in the subsystem class",
"Command factories run faster than inline commands",
"It lets the command access the subsystem's private fields and IO, and keeps RobotContainer clean",
"It prevents the command from needing a subsystem requirement"
],
correct: 2,
explanation: "Command factories live inside the subsystem because they can access private fields and IO methods that shouldn't be exposed outside the class. It also keeps RobotContainer readable — one-line bindings instead of multi-line constructions."
},
{
prompt: "In the intake() factory, why is .finallyDo(() -> stopRollers()) attached to the whole sequence rather than just the last step?",
options: [
"Because finallyDo only works on sequences, not individual commands",
"Because the last step is a waitUntil and it can't have decorators",
"It's just a style preference with no functional difference",
"So the rollers stop no matter which step ended the sequence — timeout, cancel, or beam trigger"
],
correct: 3,
explanation: "finallyDo fires in end(), which is called every time a command stops — normal finish or interrupted. Attaching it to the full sequence guarantees the rollers stop regardless of which step caused the sequence to end."
},
{
prompt: "What does Commands.parallel() do differently from Commands.sequence()?",
options: [
"parallel() runs all commands simultaneously and finishes when ALL of them finish; sequence() runs them one at a time",
"parallel() runs commands one at a time in order; sequence() runs them all at once",
"parallel() cancels all other commands when one finishes; sequence() does not",
"parallel() requires that all commands use the same subsystem"
],
correct: 0,
explanation: "Commands.parallel() runs all its commands at the same time and the group finishes when every command has finished. Commands.sequence() runs them one at a time, starting the next only after the previous one finishes."
},
{
prompt: "In the shoot composition, why does the waitUntil gate check BOTH s_Flywheel.isReadyToShoot() AND s_Turret.atGoal() before feeding?",
options: [
"Feeding before the turret is aimed would score into the wrong hub",
"The indexer motor won't spin unless both conditions are true",
"waitUntil requires multiple conditions to compile",
"The flywheel won't reach speed until the turret stops moving"
],
correct: 0,
explanation: "If you feed before the turret has settled on its target, the game piece exits at the wrong angle and misses. The gate ensures both the flywheel velocity and the turret aim are ready before anything gets fed."
},
{
prompt: "What is the difference between Commands.race() and Commands.parallel()?",
options: [
"race() runs commands sequentially; parallel() runs them simultaneously",
"race() can only take two commands; parallel() can take any number",
"parallel() ends when all commands finish; race() ends when any one command finishes and cancels the rest",
"They are identical — race() is just an alias for parallel()"
],
correct: 2,
explanation: "Commands.parallel() waits for every command in the group to finish before ending. Commands.race() ends as soon as the first command finishes, then cancels all the remaining ones."
},
{
prompt: "In the shoot composition, .repeatedly() is applied to the feed + agitate group. What does this do?",
options: [
"It makes the feed() command run faster by looping its internal logic",
"It prevents the command from being cancelled by a new button press",
"It makes finallyDo run on every repetition instead of just at the end",
"It restarts the whole group automatically each time it finishes, letting the robot shoot multiple pieces without the driver re-pressing the button"
],
correct: 3,
explanation: ".repeatedly() wraps the group in an infinite restart loop. When feed() reports the piece has cleared and the group finishes, .repeatedly() immediately starts it again. This lets the robot continuously feed and shoot all loaded pieces from a single button hold."
}
]} />
