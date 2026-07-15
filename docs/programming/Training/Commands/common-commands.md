--- 
sidebar_position: 3
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import Caption from '@site/src/components/Caption'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# Common Commands & Constructing Them

In this section we'll cover two major things:
- The most common commands in our code, and what they do
- How to create these commands and use them in code that you write

The previous page introduced the four lifecycle phases of a command (`initialize`, `execute`, `isFinished`, `end`) and the built-in types at a high level. This page is where you actually learn to write them -- with real examples tied to the subsystems you already know.

---

## `InstantCommand`

### What it does

`InstantCommand` runs its action **once** (in `initialize()`) and then **immediately finishes**. It has no `execute()` loop and `isFinished()` always returns `true` on the first check.

Use it whenever you just need to flip a switch, toggle a state, or call a single method -- and you don't need to wait for anything.

### How to create one

```java
new InstantCommand(() -> s_Intake.setDesiredState(Intake.State.INTAKE), s_Intake)
```

The constructor takes:
1. A `Runnable` (a lambda with no return value) that is your action
2. One or more subsystem requirements (optional but strongly recommended)

### Subsystem examples

**Toggling the intake state from RobotContainer:**
```java
// When the driver taps the left bumper, extend the intake immediately
m_Controller.leftBumper().onTrue(
    new InstantCommand(() -> s_Intake.setDesiredState(Intake.State.INTAKE), s_Intake)
);

// When released, retract it
m_Controller.leftBumper().onFalse(
    new InstantCommand(() -> s_Intake.setDesiredState(Intake.State.RETRACTED), s_Intake)
);
```

**Resetting an elevator encoder:**
```java
// Driver presses a button to zero the elevator encoder (useful after homing)
m_Controller.start().onTrue(
    new InstantCommand(() -> s_Elevator.resetEncoder(), s_Elevator)
);
```

**Inside a subsystem as a command factory:**
```java
// Inside Intake.java -- returns a command that sets the intake state
public Command intakeCommand() {
    return new InstantCommand(() -> setDesiredState(State.INTAKE), this);
}
```

<Note title="InstantCommand vs. Commands.runOnce">
`new InstantCommand(() -> action())` and `Commands.runOnce(() -> action())` do **exactly the same thing** -- they're two syntaxes for the same behavior. `Commands.runOnce` is the more modern, preferred style in newer WPILib versions, but you'll see both in robot code.
</Note>

---

## `Commands.runOnce()`

### What it does

`Commands.runOnce()` is the factory-style equivalent of `InstantCommand`. It runs a single action once and finishes immediately. It's cleaner for inline use because you don't need to type `new`.

### How to create one

```java
Commands.runOnce(() -> s_Flywheel.setSpeed(FlywheelState.SHOOTING), s_Flywheel)
```

### Subsystem examples

**Commanding the flywheel to spin up:**
```java
m_Controller.rightBumper().onTrue(
    Commands.runOnce(() -> s_Flywheel.setDesiredState(Flywheel.State.SHOOTING), s_Flywheel)
);
```

**Stopping the flywheel:**
```java
m_Controller.rightBumper().onFalse(
    Commands.runOnce(() -> s_Flywheel.setDesiredState(Flywheel.State.IDLE), s_Flywheel)
);
```

**Inside a subsystem as a command factory:**
```java
// Inside Indexer.java -- a command factory that queues a single feed pulse
public Command feedOnce() {
    return Commands.runOnce(() -> io.runFeeder(IndexerState.RUNNING.feederOutput), this);
}
```

<Note>
`Commands.runOnce` does <strong>not</strong> continuously run the action. If you need something to run repeatedly (like holding a motor at a speed), use <code>Commands.run()</code> instead.
</Note>

---

## `Commands.run()`

### What it does

`Commands.run()` runs its action **every loop cycle** (in `execute()`) and **never finishes on its own** -- `isFinished()` always returns `false`. The trigger binding (like `.whileTrue()`) decides when it ends.

Use it for continuous actions: holding a motor at a speed, tracking a target, or running a control loop while a button is held.

### How to create one

```java
Commands.run(() -> s_Turret.runMotor(0.5), s_Turret)
```

### Subsystem examples

**Running the intake rollers while a button is held:**
```java
m_Controller.leftTrigger().whileTrue(
    Commands.run(() -> s_Intake.runRollers(Intake.RollerState.INTAKING), s_Intake)
);
```

**Continuously tracking a vision target with the turret:**
```java
m_Controller.rightTrigger().whileTrue(
    Commands.run(() -> s_Turret.trackTarget(s_Vision.getTargetAngle()), s_Turret)
);
```

**Default command -- running the drivetrain from joystick inputs:**

Most subsystems have a **default command** -- a command that runs whenever no other command is using the subsystem. The drivetrain almost always has one bound to the driver's joysticks:

```java
// In RobotContainer, set the swerve drive's default command
s_Swerve.setDefaultCommand(
    Commands.run(
        () -> s_Swerve.drive(
            m_Controller.getLeftY(),
            m_Controller.getLeftX(),
            m_Controller.getRightX()
        ),
        s_Swerve
    )
);
```

<Note title="Default Commands and Commands.run()">
Default commands are almost always built with <code>Commands.run()</code> because the mechanism needs to keep doing something (respond to joystick input, hold position) until something higher-priority takes over. When that higher-priority command ends, the default command automatically resumes.
</Note>

---

## `RunCommand`

### What it does

`RunCommand` is the class-based equivalent of `Commands.run()`. It loops its action in `execute()` and never finishes on its own. In practice, `Commands.run(...)` is preferred for inline use -- but you may see `RunCommand` in older code or when subclassing for more control.

### How to create one

```java
new RunCommand(() -> s_Turret.runMotor(0.5), s_Turret)
```

### Subsystem example

```java
// Older style -- functionally identical to Commands.run()
m_Controller.b().whileTrue(
    new RunCommand(() -> s_Turret.runMotor(0.3), s_Turret)
);
```

<Note>
<code>new RunCommand(...)</code> and <code>Commands.run(...)</code> are functionally identical. The <code>Commands</code> factory style is preferred in modern WPILib code because it's more readable and composable. You'll still see <code>RunCommand</code> in older codebases or when you specifically need to subclass it.
</Note>

---

## `Commands.waitUntil()`

### What it does

`Commands.waitUntil()` does nothing -- it just waits, looping every cycle -- until a condition (a `BooleanSupplier`) becomes `true`. Then it finishes.

It's almost always used inside a **sequence** to pause until a mechanism reaches its target before the next step begins.

### How to create one

```java
Commands.waitUntil(() -> s_Intake.atGoal())
```

### Subsystem examples

**Waiting for the intake to reach its extended position before running rollers:**
```java
Commands.sequence(
    new InstantCommand(() -> s_Intake.setDesiredState(Intake.State.INTAKE), s_Intake),
    Commands.waitUntil(() -> s_Intake.atGoal()),   // wait until the arm is out
    Commands.runOnce(() -> s_Intake.runRollers(Intake.RollerState.INTAKING), s_Intake)
)
```

**Waiting for the flywheel to reach shooting speed before feeding:**
```java
Commands.sequence(
    Commands.runOnce(() -> s_Flywheel.setDesiredState(Flywheel.State.SHOOTING), s_Flywheel),
    Commands.waitUntil(() -> s_Flywheel.atSpeed()),    // don't shoot until up to speed
    Commands.runOnce(() -> s_Indexer.runFeeder(1.0), s_Indexer)
)
```

**Waiting for the elevator to reach a safe height before extending the arm:**
```java
Commands.sequence(
    Commands.runOnce(() -> s_Elevator.setGoal(Elevator.Goal.HIGH), s_Elevator),
    Commands.waitUntil(() -> s_Elevator.atGoal()),
    Commands.runOnce(() -> s_Arm.setDesiredState(Arm.State.EXTENDED), s_Arm)
)
```

<Note title="Timeouts as a safety net">
<code>Commands.waitUntil()</code> will wait forever if the condition never becomes true -- which can be dangerous on a real robot. It's good practice to add a timeout using the <code>.withTimeout(seconds)</code> decorator, described below, so the robot doesn't get stuck.

```java
Commands.waitUntil(() -> s_Flywheel.atSpeed()).withTimeout(3.0)
```
</Note>

---

## Command Decorators

This is where commands get really powerful. WPILib lets you chain **decorators** onto any command to modify its behavior -- without changing the original command at all. You call them directly on the command object.

### `.alongWith(Command command)`
This simply runs two commands together, just like the name suggests. Essentially: "Do this command along with this command"

```java
driver.rightTrigger()
            .whileTrue(
                s_Intake.runIntake().alongWith(s_Intake.setDesiredStateCommand(Intake.State.INTAKE)));
```

### `.withTimeout(double seconds)`

Ends the command after a set time, even if `isFinished()` hasn't returned `true`. Essential for preventing the robot from getting stuck.

```java
// Run the intake rollers for at most 2 seconds
Commands.run(() -> s_Intake.runRollers(Intake.RollerState.INTAKING), s_Intake)
    .withTimeout(2.0)
```

```java
// Wait for the flywheel to reach speed, but give up after 3 seconds
Commands.waitUntil(() -> s_Flywheel.atSpeed())
    .withTimeout(3.0)
```

---

### `.finallyDo(BooleanConsumer action)`

Runs a cleanup action when the command ends, **regardless of whether it finished normally or was interrupted**. This is the equivalent of writing code in `end(boolean interrupted)`.

The boolean passed to the lambda is `true` if the command was interrupted, `false` if it finished normally.

```java
// Run the flywheel, and always stop it when done (no matter what)
Commands.run(() -> s_Flywheel.spinUp(), s_Flywheel)
    .finallyDo((interrupted) -> s_Flywheel.setDesiredState(Flywheel.State.IDLE))
```

```java
// Run the indexer feeder and always stop it, logging whether it was interrupted
Commands.run(() -> s_Indexer.runFeeder(1.0), s_Indexer)
    .finallyDo((interrupted) -> {
        s_Indexer.stopFeeder();
        if (interrupted) System.out.println("Feeder was interrupted!");
    })
```

<Note>
<code>.finallyDo()</code> is the cleaner replacement for wrapping a command in a <code>try/finally</code> pattern. It's especially important for motor-powered mechanisms: you almost always want a guarantee that the motor stops when a command ends, even if the robot's code is interrupted mid-action.
</Note>

---

### `.andThen(Command... next)`

Sequences this command with one or more follow-up commands. When this command finishes, the next one starts automatically. This is a concise alternative to `Commands.sequence()`.

```java
// First set the intake out, then run the rollers after it arrives
new InstantCommand(() -> s_Intake.setDesiredState(Intake.State.INTAKE), s_Intake)
    .andThen(Commands.waitUntil(() -> s_Intake.atGoal()))
    .andThen(Commands.run(() -> s_Intake.runRollers(Intake.RollerState.INTAKING), s_Intake))
```

---

### `.until(BooleanSupplier condition)`

Runs the command until a condition becomes `true`, then ends it. A shorthand for combining a looping command with a `waitUntil`.

```java
// Run the feeder rollers until a beam sensor detects a game piece
Commands.run(() -> s_Indexer.runFeeder(1.0), s_Indexer)
    .until(() -> s_Beam.isTriggered())
```

```java
// Keep running the intake until we have a game piece loaded
Commands.run(() -> s_Intake.runRollers(Intake.RollerState.INTAKING), s_Intake)
    .until(() -> s_Beam.isTriggered())
```

---

### `.unless(BooleanSupplier condition)`

Skips the command entirely if the condition is `true` when the command is scheduled. If the condition is `false`, it runs normally. Useful for guards.

```java
// Only feed if we actually have a game piece -- skip if the beam is clear
s_Indexer.feed()
    .unless(() -> !s_Beam.isTriggered())
```

```java
// Only raise the elevator if it isn't already at its goal
Commands.runOnce(() -> s_Elevator.setGoal(Elevator.Goal.HIGH), s_Elevator)
    .unless(() -> s_Elevator.atGoal())
```

---

### `.onlyIf(BooleanSupplier condition)`

The opposite of `.unless()` -- only runs the command if the condition is `true`. A named alias that makes intent clearer.

```java
// Only spin up the flywheel if we have a target locked
Commands.runOnce(() -> s_Flywheel.setDesiredState(Flywheel.State.SHOOTING), s_Flywheel)
    .onlyIf(() -> s_Vision.hasTarget())
```

---

### `.withName(String name)`

Tags the command with a name that shows up in AdvantageScope and the SmartDashboard. Helpful for debugging.

```java
Commands.run(() -> s_Swerve.drive(0.5, 0, 0), s_Swerve)
    .withTimeout(2.0)
    .withName("DriveForward2Sec")
```

---

## Putting It Together: Realistic Full Examples

These examples combine multiple command types and decorators to produce real robot behaviors.

### Example 1 -- Intake Sequence (Auton)

Extend the intake, wait for it to reach position, then run the rollers until a game piece is loaded. Stop everything when done.

```java
Commands.sequence(
    // 1. Set the state machine goal
    Commands.runOnce(() -> s_Intake.setDesiredState(Intake.State.INTAKE), s_Intake),
    // 2. Wait for the arm to physically arrive (with a timeout safety net)
    Commands.waitUntil(() -> s_Intake.atGoal()).withTimeout(2.0),
    // 3. Spin rollers until the beam sensor sees a game piece
    Commands.run(() -> s_Intake.runRollers(Intake.RollerState.INTAKING), s_Intake)
        .until(() -> s_Beam.isTriggered())
        .withTimeout(3.0)
        .finallyDo((interrupted) -> s_Intake.stopRollers()),
    // 4. Retract the intake
    Commands.runOnce(() -> s_Intake.setDesiredState(Intake.State.RETRACTED), s_Intake)
)
```

---

### Example 2 -- Shoot Sequence (Teleop Button)

Spin up the flywheel, wait for it to reach target speed, feed the game piece, then return to idle. All triggered by a single button press.

```java
m_Controller.rightBumper().onTrue(
    Commands.sequence(
        Commands.runOnce(() -> s_Flywheel.setDesiredState(Flywheel.State.SHOOTING), s_Flywheel),
        Commands.waitUntil(() -> s_Flywheel.atSpeed()).withTimeout(2.0),
        Commands.runOnce(() -> s_Indexer.runFeeder(IndexerState.RUNNING.feederOutput), s_Indexer)
    )
    .finallyDo((interrupted) -> {
        s_Flywheel.setDesiredState(Flywheel.State.IDLE);
        s_Indexer.stopFeeder();
    })
);
```

---

### Example 3 -- Conditional Elevator Movement

Move the elevator to a high goal, but only if the arm is in its safe retracted position first.

```java
m_Controller.povUp().onTrue(
    Commands.sequence(
        // Guard: only continue if the arm is safe to move around
        Commands.runOnce(() -> s_Arm.setDesiredState(Arm.State.RETRACTED), s_Arm)
            .onlyIf(() -> !s_Arm.isRetracted()),
        Commands.waitUntil(() -> s_Arm.isRetracted()).withTimeout(1.5),
        // Now it's safe to move the elevator
        Commands.runOnce(() -> s_Elevator.setGoal(Elevator.Goal.HIGH), s_Elevator)
    )
);
```

---

### Example 4 -- Subsystem Command Factory

This is how command factories typically look inside a subsystem. The subsystem builds and returns the whole command, and `RobotContainer` just calls it.

```java
// Inside Indexer.java
public Command feed() {
    return Commands.run(() -> {
            io.runSpindexer(IndexerState.RUNNING.spindexerOutput);
            io.runFeeder(IndexerState.RUNNING.feederOutput);
        }, this)
        .until(() -> !shouldRun())
        .finallyDo((interrupted) -> {
            io.stopSpindexer();
            io.stopFeeder();
        })
        .withName("Indexer.feed");
}

// In RobotContainer.java -- clean, one line
m_Controller.rightBumper().whileTrue(s_Indexer.feed());
```

<Note title="Command Factories: the preferred pattern">
Keeping command logic inside the subsystem (as a factory method) is our preferred style. It keeps <code>RobotContainer</code> readable -- it just wires buttons to subsystem commands rather than holding the entire command construction inline. The subsystem also has access to all of its own private fields and IO, making complex behaviors easier to write correctly.
</Note>

---

## Quick Reference Table

| Command / Decorator | Finishes on its own? | Best used for |
|---|---|---|
| `new InstantCommand(...)` | Yes, immediately | One-shot actions, state changes |
| `Commands.runOnce(...)` | Yes, immediately | Same as above (preferred modern style) |
| `Commands.run(...)` | Never | Continuous looping actions |
| `new RunCommand(...)` | Never | Same as above (older style) |
| `Commands.waitUntil(...)` | When condition is `true` | Pausing inside sequences |
| `.withTimeout(s)` | After `s` seconds | Any command that might get stuck |
| `.finallyDo(action)` | N/A (decorator) | Guaranteed cleanup on end or interrupt |
| `.andThen(cmd)` | After all commands finish | Simple inline sequences |
| `.until(condition)` | When condition is `true` | Stopping a looping command on a signal |
| `.unless(condition)` | N/A (may not start) | Guarding a command against running |
| `.onlyIf(condition)` | N/A (may not start) | Running a command only when safe |

---

<Quiz questions={[
{
prompt: "What is the key difference between Commands.runOnce() and Commands.run()?",
options: [
"runOnce() requires a subsystem; run() does not",
"runOnce() executes its action once and finishes immediately; run() loops the action every cycle and never finishes on its own",
"run() can only be used inside a sequence",
"runOnce() can take multiple lambdas; run() can only take one"
],
correct: 1,
explanation: "Commands.runOnce() is for one-shot actions — it runs the lambda once in initialize() and is done. Commands.run() loops the lambda in execute() every cycle and relies on a trigger or decorator to end it."
},
{
prompt: "You want to spin up the flywheel and then wait until it reaches target speed before feeding. Which command type lets you pause the sequence until a condition is met?",
options: [
"Commands.runOnce()",
"new InstantCommand()",
"Commands.waitUntil()",
"Commands.run()"
],
correct: 2,
explanation: "Commands.waitUntil(() -> s_Flywheel.atSpeed()) sits in the sequence and does nothing until the condition becomes true, then finishes so the sequence can move on."
},
{
prompt: "Which decorator guarantees that a cleanup action (like stopping a motor) runs when a command ends — whether it finished normally OR was interrupted?",
options: [
".withTimeout()",
".until()",
".onlyIf()",
".finallyDo()"
],
correct: 3,
explanation: ".finallyDo() runs its action in the command's end() method, which is always called regardless of how the command stopped. It receives a boolean indicating whether the command was interrupted."
},
{
prompt: "What is a command factory, and why do we prefer using them?",
options: [
"A factory that mass-produces hardware subsystems",
"A method inside a subsystem that builds and returns a ready-to-use Command, keeping RobotContainer clean and the command logic close to the subsystem it controls",
"A static class that holds all commands for the whole robot",
"A WPILib class you extend to build custom commands"
],
correct: 1,
explanation: "A command factory is just a method (like feed() or intakeCommand()) that lives inside the subsystem and returns a Command. RobotContainer then calls it in one line. This keeps complexity inside the subsystem where the private fields and IO are accessible."
},
{
prompt: "You want to run the indexer feeder rollers, but ONLY if the beam sensor already detects a game piece. Which decorator makes the command skip itself if the condition is false?",
options: [
".withTimeout()",
".until()",
".onlyIf()",
".andThen()"
],
correct: 2,
explanation: ".onlyIf(() -> s_Beam.isTriggered()) will skip the command entirely if the beam isn't triggered when the command is scheduled. .unless() is the inverse — it skips if the condition IS true."
},
{
prompt: "A RunCommand and Commands.run() produce the same behavior. Which is the preferred modern style?",
options: [
"new RunCommand() because it gives more control",
"Commands.run() because it is more readable and composable",
"They are interchangeable and there is no preference",
"new RunCommand() because Commands.run() was deprecated"
],
correct: 1,
explanation: "Commands.run() is the preferred factory-style syntax in modern WPILib. It reads more naturally, chains decorators cleanly, and avoids the `new` keyword boilerplate. RunCommand still works and appears in older code."
}
]} />
