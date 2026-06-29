---
sidebar_position: 1
---

# Programming With Commands Introduction

Up until now, you've learned how subsystems represent the robot's hardware. Now it's time to learn how to actually **make things happen** -- that's where commands come in.

This chapter is one of the most important in your training. Commands are the backbone of how every modern FRC robot is programmed.

---

## What You'll Learn

### What Are Commands?
A **command** is a self-contained unit of robot behavior. Any time the robot does something -- spinning a flywheel, extending an arm, following a path -- that action is defined as a command. Commands are structured around a simple question: *What should the robot do, and when should it stop?*

You'll learn how commands are built around four lifecycle methods (`initialize`, `execute`, `isFinished`, `end`) and how the **Command Scheduler** manages them automatically every loop cycle.

### Command Compositions
Commands become truly powerful when you combine them. **Command compositions** let you chain, layer, and sequence commands together to build complex behaviors out of simple pieces.

You'll explore built-in compositions like:
- `Commands.sequence(...)` -- run commands one after another
- `Commands.parallel(...)` -- run commands at the same time
- `Commands.startEnd(...)` -- define a start action and a cleanup action in one line

These tools are how you turn individual mechanisms into coordinated robot routines.

### How Commands Are Used in Our Code
Commands don't live in isolation. You'll see exactly how commands connect to subsystems and get triggered by controller buttons inside `RobotContainer.java`. The code you wrote in the Motors section already used a command -- here, you'll understand exactly what was happening under the hood and how to write your own from scratch.

---

## Why Commands Matter

Without a structured system like this, robot code turns into a tangled mess of `if` statements, flags, and timing logic scattered everywhere. Commands solve this by giving every robot action a **clean, isolated structure** that the scheduler can manage automatically.

This means:
- **No conflicts** -- two parts of your code can't accidentally fight over the same motor
- **No manual timing** -- the scheduler handles when things start and stop
- **Easy to reuse** -- the same command can be triggered by a button during teleop *and* run automatically during autonomous

Every feature you build on this robot will use commands. Mastering this chapter means mastering how the robot thinks.
