---
sidebar_position: 1
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import Caption from '@site/src/components/Caption'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# What Are Commands?

In WPILib, a **Command** is a reusable, self-contained action that the robot can perform. Every time the robot does something &rarr; spin a motor, move an arm, shoot a ball, that action is wrapped in a command.

Commands answer one question: **"What should the robot do, and when should it stop?"**

---

## The Problem Commands Solve

Imagine you're writing code to run a shooter wheel. Without commands, you'd have to manually track:
- When did the button get pressed?
- Is the wheel still spinning?
- When should it stop?
- What happens if a second button is pressed while it's running?

This gets messy fast. Commands give you a clean, structured way to define any action so the robot can manage all of that for you automatically.

---

## The Four Phases of a Command

Every command in WPILib has four lifecycle methods that run at specific times:

| Method | When it runs | What it's for |
|---|---|---|
| `initialize()` | Once, when the command starts | Setup &rarr; reset a sensor, start a timer |
| `execute()` | Every loop cycle (~50x per second) while running | The main action &rarr; spin the motor, move the arm |
| `isFinished()` | Every loop cycle, checked after `execute()` | Return `true` when the command should stop |
| `end(boolean interrupted)` | Once, when the command stops | Cleanup &rarr; stop the motor, reset state |

<Note title="The Loop">
The robot's main loop runs about 50 times per second. Every cycle, the Command Scheduler calls `execute()` and checks `isFinished()` on every active command. When `isFinished()` returns `true`, the scheduler calls `end()` and removes the command.
</Note>

Here's what that looks like in a simple example &rarr; a command that runs a shooter wheel until a button is released:

```
initialize()  →  start spinning
execute()     →  keep spinning (called ~50x/sec)
isFinished()  →  return false until button is released
end()         →  stop the motor
```

---

## Commands and Subsystems

A command almost always **requires** a subsystem. This is how WPILib prevents two commands from trying to control the same mechanism at the same time.

<Caption src="/img/subsystem.png" alt="Diagram showing a subsystem connected to a command" caption="A subsystem represents the hardware. A command represents the action performed on that hardware." />

For example:
- A **Turret** subsystem owns the turret motor
- A **RunTurret** command requires the Turret subsystem and spins it
- If a second command also tries to require Turret, the scheduler automatically **cancels** the first one

<Note title="One Subsystem, One Command at a Time">
A subsystem can only be used by one command at a time. This is a safety feature &rarr; it prevents two parts of your code from fighting over the same motor simultaneously.
</Note>

---

## The Command Scheduler

The **Command Scheduler** is WPILib's built-in manager that runs in the background every loop cycle. You never create it yourself &rarr; it's always running. It:

1. Checks which commands have been triggered (by buttons, autonomously, or by other commands)
2. Calls `execute()` on every currently running command
3. Checks `isFinished()` on each &rarr; if `true`, calls `end()` and removes it
4. Resolves conflicts when two commands want the same subsystem

You don't interact with the scheduler directly very often. Instead, you tell it what to do by **binding commands to triggers** in `RobotContainer.java`.

---

## Types of Commands

WPILib gives you several built-in command types so you don't always have to write a full class from scratch.

### `InstantCommand`
Runs `initialize()` once and immediately finishes. Good for toggling something or setting a value.

```java
new InstantCommand(() -> s_Turret.stop())
```

### `RunCommand`
Runs `execute()` on a loop and never finishes on its own. Good for things that run as long as a button is held.

```java
new RunCommand(() -> s_Turret.runMotor(0.5), s_Turret)
```

### `Commands.startEnd(...)`
A shorthand that runs one action on start and another on end. This is what you used in the Motors section to bind the B button:

```java
Commands.startEnd(
    () -> s_Turret.runMotor(0.2),  // runs on initialize
    () -> s_Turret.stop(),         // runs on end
    s_Turret                       // subsystem requirement
)
```

<Note>
`Commands.startEnd` is just a convenience wrapper &rarr; it creates a command that calls the first lambda in `initialize()`, loops with an empty `execute()`, never finishes on its own (`isFinished()` always returns `false`), and calls the second lambda in `end()`. The trigger (like `whileTrue`) is what decides when it ends.
</Note>

### `Commands.sequence(...)`
Runs multiple commands one after another, waiting for each to finish before starting the next. Common in autonomous routines.

```java
Commands.sequence(
    new RunTurretCommand(s_Turret),
    new WaitCommand(2.0),
    new InstantCommand(() -> s_Turret.stop())
)
```

### `Commands.parallel(...)`
Runs multiple commands at the same time. They all run simultaneously until all finish.

---

## How Commands Get Triggered

Commands are started by **triggers**. The most common triggers are controller buttons, which you bind in `RobotContainer.java`:

```java
// While B is held → run the command. When released → end it.
m_Controller.b().whileTrue(myCommand);

// When A is pressed once → run the command until it finishes on its own.
m_Controller.a().onTrue(myCommand);
```

| Trigger Method | Behavior |
|---|---|
| `.whileTrue(cmd)` | Starts when pressed, cancels when released |
| `.onTrue(cmd)` | Starts once when first pressed, runs until `isFinished()` |
| `.toggleOnTrue(cmd)` | First press starts it, second press cancels it |

<Caption src="/img/robot-robotcontainer.png" alt="RobotContainer wiring subsystems to commands" caption="RobotContainer is where subsystems are created and commands are bound to controller triggers." />

---

## Putting It Together

Here's how all the pieces connect:

1. A **Subsystem** owns the hardware (motors, sensors)
2. A **Command** defines an action using that hardware
3. A **Trigger** (like a button) starts the command
4. The **Command Scheduler** manages running, checking, and stopping commands automatically

<SolutionDropdown
  label="See how the B button binding from Motors connects to all four phases"
  explanation="When you wrote this in RobotContainer: m_Controller.b().whileTrue(Commands.startEnd(() -> s_Turret.runMotor(0.2), () -> s_Turret.stop(), s_Turret)) — here's what actually happens under the hood:"
  code={`// initialize() → called once when B is pressed
() -> s_Turret.runMotor(0.2)

// execute() → empty, motor keeps spinning from initialize

// isFinished() → always false; whileTrue() handles cancellation when button is released

// end(interrupted) → called when B is released
() -> s_Turret.stop()`}
/>

---

<Quiz questions={[
{
prompt: "Which Command lifecycle method is called repeatedly ~50 times per second while the command is running?",
options: [
"initialize()",
"end()",
"isFinished()",
"execute()"
],
correct: 3,
explanation: "execute() is called every loop cycle while the command is active. It's where the main ongoing action lives, like keeping a motor spinning."
},
{
prompt: "What happens if a second command tries to require the same subsystem that an already-running command is using?",
options: [
"Both commands run simultaneously on the same subsystem",
"The second command is ignored and never starts",
"The first command is cancelled and the second command starts",
"The robot throws an error and crashes"
],
correct: 2,
explanation: "The Command Scheduler enforces that only one command can use a subsystem at a time. If a new command requires a subsystem already in use, the current command is cancelled first."
},
{
prompt: "What does 'isFinished()' returning true tell the Command Scheduler?",
options: [
"To call initialize() again",
"To stop calling execute() and call end() to clean up",
"To pause the command until a button is pressed",
"To switch to a different subsystem"
],
correct: 1,
explanation: "When isFinished() returns true, the scheduler knows the command is done. It calls end() for cleanup and removes the command from the active list."
},
{
prompt: "Which built-in command type runs one action at start and a different action when it ends, and is used in the Motors section?",
options: [
"InstantCommand",
"RunCommand",
"Commands.startEnd",
"Commands.sequence"
],
correct: 2,
explanation: "Commands.startEnd takes two lambdas — one for initialize() and one for end() — and runs the first on start and the second when the command finishes or is cancelled."
},
{
prompt: "What is the purpose of declaring a subsystem as a requirement in a command?",
options: [
"It makes the command run faster",
"It tells the scheduler which subsystem's motors to import",
"It prevents two commands from controlling the same hardware at the same time",
"It automatically applies motor configs to the subsystem"
],
correct: 2,
explanation: "Subsystem requirements are a safety mechanism. The scheduler uses them to ensure only one command controls a piece of hardware at any given time."
}
]} />
