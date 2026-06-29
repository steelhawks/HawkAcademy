---
sidebar_position: 7
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Motor Configs

In the last section you learned how to create and run a motor. But motors don't always behave perfectly out of the box &rarr; sometimes they spin the wrong direction, draw too much current, or don't stop cleanly. **Motor configurations** (configs) let you fine-tune exactly how a motor behaves before you ever run it.

Think of configs like the settings menu for your motor. You set them up once at the start, apply them, and the motor controller remembers them for every run.

---

## Setting Up a Config Object

All configs live inside a single object of type `TalonFXConfiguration`. Go back into your `Turret.java` file and add this below your motor declaration (outside the constructor):

```java
private TalonFXConfiguration turretConfigs;
```

Then, inside the constructor, initialize it:

```java
turretConfigs = new TalonFXConfiguration();
```

This creates a blank config object with all default settings. You'll customize specific values on it before applying it to the motor.

<Note title="VS Code Can Add Imports For You">
When you type `TalonFXConfiguration`, VS Code will suggest the import automatically in the autocomplete dropdown. Press **Enter** to accept it, or hover over the red underline and choose **Quick Fix > Import**.
</Note>

Your constructor should now look like this:

```java
public Turret() {
    motor = new TalonFX(1);
    turretConfigs = new TalonFXConfiguration(); // blank config, ready to customize
}
```

---

## Available Configurations

Here are the most common configs you'll use and what they actually do.

### Neutral Mode

When a motor isn't being told to move, what should it do &rarr; resist movement, or let things spin freely? That's what **Neutral Mode** controls.

- **Coast** &rarr; the motor lets the mechanism spin freely when unpowered. Like a bike wheel you stop pedaling: it keeps rolling.
- **Brake** &rarr; the motor actively resists movement when unpowered. Like slamming on the brakes: it locks in place.

```java
turretConfigs.MotorOutput.NeutralMode = NeutralModeValue.Brake;
```

<Note title="When to Use Each Mode">
Use **Brake** for mechanisms that need to hold position, like an arm or elevator &rarr; otherwise gravity will pull them down. Use **Coast** for mechanisms like a flywheel that you want to spin down gradually without stressing the motor.
</Note>

---

### Inverted

**Inverted** flips the motor's positive direction. This matters a lot when two motors are mounted facing opposite directions on the same mechanism &rarr; without inversion, they'd fight each other.

```java
turretConfigs.MotorOutput.Inverted = InvertedValue.CounterClockwise_Positive;
```

The two options are:
- `CounterClockwise_Positive` &rarr; counter-clockwise rotation is treated as the positive/forward direction
- `Clockwise_Positive` &rarr; clockwise rotation is treated as the positive/forward direction

<Note>
Whether a motor is inverted depends on how it's physically mounted on the robot. Your lead programmer or the mechanical team will know which direction each motor needs to spin. When in doubt, test at a low speed and see which way it moves!
</Note>

---

### Gear Ratio

Motors spin very fast but with low torque (turning force). Gear ratios let you trade speed for power, or power for speed, by chaining gears of different sizes together.

- A **high gear ratio** (e.g. 10:1) means the motor spins 10 times for every 1 rotation of the mechanism &rarr; you lose speed but gain a lot of torque. Great for heavy lifters.
- A **low gear ratio** (e.g. 2:1) means less mechanical advantage but much faster output. Great for shooter wheels or fast-moving mechanisms.

```java
turretConfigs.Feedback.SensorToMechanismRatio = 10.0; // replace with your actual gear ratio
```

<Note title="Where Does the Ratio Come From?">
The gear ratio comes from the mechanical design of the robot. Your build team will know the ratio &rarr; just ask! You'll need to set this correctly for any position or velocity control to work accurately.
</Note>

---

### Current Limits

Motors are powerful, and if they draw too much current they can cause a **brownout** &rarr; a sudden drop in battery voltage that can make the robot lose control or reboot mid-match. Current limits cap how much power a motor can draw.

You need two lines: one to set the limit value, and one to actually turn the limit on:

```java
turretConfigs.CurrentLimits.SupplyCurrentLimit = 40;       // max current in amps
turretConfigs.CurrentLimits.SupplyCurrentLimitEnable = true; // turn the limit on
```

<Note title="Don't Forget to Enable It">
Setting the limit value alone is not enough &rarr; you must also set `SupplyCurrentLimitEnable = true` or the motor controller will ignore the limit entirely.
</Note>

#### The Three Types of Current

> - **Supply current** &rarr; the current drawn **from the battery to the motor controller**. This is what we limit most often.
> - **Stator current** &rarr; the current actually **flowing through the motor windings**. Slightly different from supply because some energy is lost as heat.
> - **Torque current** &rarr; the current used to generate **rotational force (torque)**. Relevant in advanced closed-loop control.

For most use cases, limiting **Supply current** is enough.

---

### Follower Motors

Some mechanisms use two motors on the same shaft or gearbox &rarr; like a drivetrain side or a double-motor elevator. Rather than writing separate code for each motor, you designate one as the **leader** and the other as a **follower**. The follower automatically mirrors whatever the leader does.

```java
// motor is the leader, motor2 is the follower
motor2.setControl(new Follower(motor.getDeviceID(), false));
```

The second argument (`false`) controls whether the follower should run **inverted** relative to the leader. Set it to `true` if the motors are mounted facing opposite directions.

<Note>
The follower motor still needs to be created with `new TalonFX(id)` &rarr; it just doesn't need its own `set()` calls. The leader handles all of that.
</Note>

---

### PID Slots

**Slots** are storage spaces inside the motor controller for PID values. PID is a control algorithm that makes motors hit precise positions or speeds &rarr; you'll learn about it in depth in the Control Theory section. For now, just know that the motor has three slots (`Slot0`, `Slot1`, `Slot2`) that can each hold a different set of PID values.

```java
turretConfigs.Slot0.kP = 0.1; // Proportional gain -- you'll tune this later
turretConfigs.Slot0.kI = 0.0;
turretConfigs.Slot0.kD = 0.0;
```

We almost always use `Slot0` for basic control. The others exist for mechanisms that need to switch between different control behaviors on the fly.

---

## Applying Configs to the Motor

Setting values on `turretConfigs` doesn't do anything on its own &rarr; you need to **apply** them to the motor. Do this at the end of the constructor, after all your config values are set:

```java
PhoenixUtil.tryUntilOk(5, () -> motor.getConfigurator().apply(turretConfigs));
```

Breaking this down:
- `motor.getConfigurator().apply(turretConfigs)` &rarr; sends the config object to the motor controller over CANBus
- `PhoenixUtil.tryUntilOk(5, ...)` &rarr; safely attempts the apply up to **5 times**, in case the motor controller isn't ready on the first try. If all 5 fail, it stops and logs an error.
- The `() -> ...` is a **lambda** &rarr; a shorthand way of passing a small piece of code as an argument. You learned about these in Java Basics.

<Note title="Always Apply Configs in the Constructor">
Configs should be applied once when the subsystem is first created &rarr; not inside `runMotor()` or other methods that run repeatedly. Applying configs every loop cycle wastes CANBus bandwidth and can slow down the robot.
</Note>

Your completed constructor should look something like this:

```java
public Turret() {
    motor = new TalonFX(1);
    turretConfigs = new TalonFXConfiguration();

    // Neutral mode: hold position when stopped
    turretConfigs.MotorOutput.NeutralMode = NeutralModeValue.Brake;

    // Current limit: cap at 40 amps to prevent brownouts
    turretConfigs.CurrentLimits.SupplyCurrentLimit = 40;
    turretConfigs.CurrentLimits.SupplyCurrentLimitEnable = true;

    // Apply all configs to the motor, retry up to 5 times
    PhoenixUtil.tryUntilOk(5, () -> motor.getConfigurator().apply(turretConfigs));
}
```

---

<Quiz questions={[
{
prompt: "Which data type is used to store motor configurations before applying them?",
options: [
"TalonFX",
"TalonFXConfiguration",
"MotorOutput",
"PhoenixUtil"
],
correct: 1,
explanation: "TalonFXConfiguration is the object that holds all your config settings. You customize it, then apply it to the motor."
},
{
prompt: "What is the difference between Coast mode and Brake mode?",
options: [
"Coast makes the motor spin faster, Brake increases its torque",
"Coast lets the mechanism spin freely when unpowered, Brake actively holds it in place",
"Coast forces counter-clockwise rotation, Brake forces clockwise",
"Coast enables current limits automatically, Brake disables them"
],
correct: 1,
explanation: "Coast leaves the motor free to spin when not commanded, like a freewheeling bike. Brake resists movement, holding the mechanism in place."
},
{
prompt: "Why must you set 'SupplyCurrentLimitEnable = true' when configuring a current limit?",
options: [
"To switch from Stator current to Supply current mode",
"Because the limit value alone won't be enforced, you must also explicitly enable it",
"To prevent the robot from ever experiencing a brownout",
"To allow the motor to draw unlimited power from the battery"
],
correct: 1,
explanation: "Setting the limit value is not enough. The motor controller won't apply the limit unless the enable flag is also set to true."
},
{
prompt: "Which type of current flows directly from the battery to the motor controller?",
options: [
"Stator Current",
"Torque Current",
"Supply Current",
"Follower Current"
],
correct: 2,
explanation: "Supply current is what's drawn from the battery to the motor controller. It's the most common type to limit to protect against brownouts."
},
{
prompt: "In a follower setup, which motor do you call runMotor() on to move the mechanism?",
options: [
"The follower motor only",
"Both motors separately",
"The leader motor &rarr; the follower mirrors it automatically",
"Neither &rarr; follower motors move on their own"
],
correct: 2,
explanation: "You only command the leader. The follower motor copies whatever the leader does, so you never need to call set() on it directly."
},
{
prompt: "Why does the code use 'PhoenixUtil.tryUntilOk(5, ...)' instead of applying configs directly?",
options: [
"It makes the motor spin faster",
"It safely retries the apply up to 5 times in case the motor controller isn't ready, instead of failing silently",
"It clears PID values from Slot1 and Slot2",
"It is the only valid way to create a follower motor"
],
correct: 1,
explanation: "tryUntilOk provides robustness by retrying the operation multiple times. Motor controllers can occasionally miss the first config apply on startup."
}
]} />
