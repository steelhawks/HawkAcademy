---
sidebar_position: 6
---

import Quiz from '@site/src/components/Quiz.jsx' 
import Caption from '@site/src/components/Caption'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'

# Motors

Motors are the muscles of your robot. Every mechanism that moves: spinning a shooter wheel, raising an elevator, or rotating a turret, is powered by a motor. In this section, you'll learn how to set up and control a motor in code from scratch.

Before we can write motor code, we need to understand a few concepts: **how motors communicate with the robot**, **what libraries we need**, and **what a motor controller actually is**.

---

## What is a Motor Controller?

A **motor** converts electrical energy into rotational motion. But the robot's main computer (the roboRIO or SystemCore) can't directly power a motor &rarr; the current would be way too high. Instead, it talks to a **motor controller**, which is a separate piece of hardware that:

1. Receives low-power control signals from the robot computer
2. Delivers the high-power current needed to actually spin the motor

On our team, we use motors and motor controllers made by **CTRE** (Cross The Road Electronics). The most common ones you'll see are:
- <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Kraken x60</span> &rarr; a high-performance brushless motor with a built-in controller
- <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>TalonFX</span> &rarr; the motor controller class used to control Kraken motors (and older Falcon 500s) in code

When you write `TalonFX` in your code, you're talking to that motor controller.

---

## The CANBus

All motor controllers on the robot communicate over a shared network called the **CANBus** (Controller Area Network). Think of it like a group chat &rarr; every device is on the same line, and each device has a unique **Device ID** (a number, usually between 0 and 62) so messages reach the right motor.

When you write `new TalonFX(1)`, you're saying: *"Connect to the TalonFX motor controller with Device ID 1 on the CANBus."*

You can view and change device IDs using **Phoenix Tuner X**, a desktop app made by CTRE. More on that in the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Hawk Stack</span>  section.

<Note title="Every Device ID Must Be Unique">
If two devices on the CANBus share the same ID, the robot won't know which one to talk to and unexpected behavior will occur. Always check Phoenix Tuner X to confirm IDs before running code.
</Note>


## Vendordeps

### Code Libraries
Code libraries are essentially giant pieces of code that are packaged for a big purpose. Imagine you want to use code to draw an image. Normal code won't allow you to, but there are libraries that give you the ability to draw images. 

WPILib gives you the core tools to program a robot, but it doesn't know about hardware from specific vendors like CTRE out of the box. To unlock CTRE-specific classes like `TalonFX`, you need to install a **vendor dependency** (vendordep) &rarr; essentially a code library that adds support for that vendor's hardware.
<Note>
CTRE is the company that produces our motor hardware, so they are the **vendor**, and their vendordep is what we use to program their motors. 
</Note>

### How to Install Vendordeps

1. Open your project in VS Code
2. Press **Ctrl+Shift+P** (or **Cmd+Shift+P** on Mac) to open the command palette
3. Type `WPILib: Manage Vendor Libraries` and select it
4. Choose **Install new libraries (online)**
5. Paste in the CTRE Phoenix 6 URL (your lead programmer will have this), or search for **Phoenix**
6. Hit enter and wait about a minute for the installation to complete

Once installed, you'll be able to import and use `TalonFX` and other CTRE classes in your code.

![Vendordeps installation screen](../../../static/img/vendordeps.png)

<Note title="Per-Project Reminder">
Vendordeps are saved per-project. If you clone a new robot project, you may need to re-install them before CTRE classes like TalonFX will be recognized.
</Note>


## Creating a Motor in Code

Now that vendordeps are installed, let's write code to control a motor. We'll create a brand new Java file called `Turret.java` to represent a turret mechanism &rarr; but the same pattern applies to any mechanism you build.

### Step 1: Create the File

In VS Code, navigate to your project's `src/main/java/frc/robot` folder in the file explorer on the left. Right-click the folder and select **New Command**, then name it `Turret.java`.

<Note>
It's common practice to keep each mechanism or subsystem in its own folder. This keeps your code organized and easy to navigate as the robot grows more complex.
</Note>

### Step 2: Set Up the Class

Open your new `Turret.java` file. It will be empty. Start by declaring the package at the very top &rarr; this tells Java where this file lives in the project:

### Step 3: Declare the Motor Variable

Inside the class (but **outside** any method), declare your motor variable:

```java
private TalonFX motor;
```

<Note title="VS Code Can Add Imports For You">
When you type `TalonFX`, VS Code will often suggest the import automatically in the autocomplete dropdown &rarr; just press **Enter** to accept it. If it doesn't appear, hover over the red underline on `TalonFX` and select **Quick Fix > Import 'TalonFX' (com.ctre.phoenix6.hardware)**. You rarely need to type imports by hand!
</Note>

Breaking this down:
- `private` &rarr; only this class can access this motor (good encapsulation)
- `TalonFX` &rarr; the type, telling Java this variable represents a TalonFX motor controller
- `motor` &rarr; the variable name (depending on the subsystem it will be named more descriptively)

At this point, the variable exists but doesn't point to anything yet. You need to **initialize** it in the constructor.

### Step 4: Add a Constructor and Initialize the Motor

A constructor is a special method that runs once when an object is created. Add one inside the class:

```java
public Turret() {
    motor = new TalonFX(1);
}
```

This creates a new `TalonFX` object connected to the motor with **Device ID 1** on the CANBus. The `new` keyword tells Java to actually create the object and allocate memory for it.

<Note title="Why declare outside but initialize inside?">
Declaring the variable at the class level means **every method in the class can access it**. If you declared it inside the constructor, it would disappear as soon as the constructor finished running, and your `runMotor()` method wouldn't be able to find it.
</Note>

Your file should now look like this:

```java
package frc.robot;

import com.ctre.phoenix6.hardware.TalonFX;

public class Turret {

    private TalonFX motor; // declared here -- accessible everywhere in the class

    public Turret() { // constructor -- runs once when a Turret object is created
        motor = new TalonFX(1); // connects to motor with Device ID 1 on CANBus
    }
}
```

<Quiz questions={[
{
prompt: "What is the primary purpose of installing 'vendordeps' in your robotics project?",
options: [
"To update the operating system of the robot",
"To provide libraries that allow the code to understand and control specific hardware mechanisms",
"To increase the processing speed of the Systemcore",
"To connect the robot to Wi-Fi"
],
correct: 1,
explanation: "Vendordeps are libraries that provide the necessary code to help the robot communicate with and control hardware like CTRE motors."
},
{
prompt: "Where should you declare a new motor variable (like 'private TalonFX s_motor') within your Java class?",
options: [
"Inside the constructor",
"Outside the constructor, at the class level",
"Inside the main method",
"Inside the motor's method"
],
correct: 1,
explanation: "Defining the variable outside the constructor ensures it is a field of the class, meaning it is accessible to all methods within that class."
},
{
prompt: "In the line 's_motor = new TalonFX(1);', what does the number '1' represent?",
options: [
"The motor's voltage",
"The device ID assigned to that specific motor on the CANBus",
"The number of motors connected",
"The speed limit of the motor"
],
correct: 1,
explanation: "Each motor on the CANBus needs a unique device ID (found via Phoenix Tuner X) so the software knows exactly which motor to send commands to."
}
]} />

---

## Running a Motor

Now let's add methods to `Turret.java` to actually control the motor. All of these go **inside the class, but outside the constructor**.

### The `runMotor` Method

Add this method below the constructor:

```java
public void runMotor(double output) {
    motor.set(output);
}
```

- `s_motor.set(output)` tells the motor controller to run at a percentage of its maximum speed
- `output` is a value between **-1.0 and 1.0**:
  - `1.0` = full speed forward
  - `-1.0` = full speed in reverse
  - `0.5` = half speed forward
  - `0.0` = stopped

We pass `output` as a parameter so the caller can decide how fast to run the motor depending on the situation.

<Note title="Never Hardcode Motor Speeds in Production">
Hardcoding a value like `s_motor.set(0.5)` directly inside your method makes it impossible to tune without changing the code. Passing `output` as a parameter &rarr; or using a constant &rarr; keeps your code flexible and easier to adjust.
</Note>

### The `stop` Method

Now try writing the `stop` method yourself before looking at the solution below!

**Hint:** There are two ways to stop a motor:
1. Call `motor.set(0)` to set speed to zero
2. Call `sotor.stopMotor()` which is a cleaner built-in method that also disables the output

**DON'T CHEAT &rarr; try it yourself first!**

<details>
  <summary>💡 See the full solution</summary>

  Here is the complete `Turret.java` file from top to bottom:

```java
package frc.robot;

import com.ctre.phoenix6.hardware.TalonFX;

public class Turret {

    private TalonFX motor;

    public Turret() { // constructor
        motor = new TalonFX(1);
    }

    public void runMotor(double output) {
        // output is between -1.0 (full reverse) and 1.0 (full forward)
        motor.set(output);
    }

    public void stop() {
        motor.stopMotor(); // cleanly stops the motor output
    }
}
```

Refer to the explanations above for any questions, or reach out to a lead or the head programmer.
</details>

---

## Hooking It Up in RobotContainer

`Turret.java` defines how the motor works, but the robot doesn't know to use it yet. You need to wire it up in `RobotContainer.java`, which already exists in your project under `src/main/java/frc/robot/`. This file is the central place where subsystems are created and controller buttons are bound to actions.

Open `RobotContainer.java` and follow the steps below.

### Step 1: Import Turret

At the top of `RobotContainer.java`, add an import so Java can find your new class:

```java
import frc.robot.Turret;
```

### Step 2: Declare the Turret

**Outside** the constructor, declare a field for your turret:

```java
private final Turret s_Turret;
```

The `final` keyword means this reference won't be reassigned after it's created &rarr; a good practice for subsystems.

### Step 3: Initialize the Turret

**Inside** the constructor, create the turret object:

```java
s_Turret = new Turret();
```

This calls the constructor you wrote in `Turret.java`, which sets up the motor.

### Step 4: Bind a Button

Still inside the constructor, bind the **B button** on the controller to run your motor:

```java
m_Controller.b().whileTrue(
    Commands.startEnd(
        () -> s_Turret.runMotor(0.2),  // runs when button is held
        () -> s_Turret.stop(),         // runs when button is released
        s_Turret                       // the subsystem this command requires
    )
);
```

You'll also need this import at the top of `RobotContainer.java` if it isn't there already:

```java
import edu.wpi.first.wpilibj2.command.Commands;
```

**What this does:**
- While you hold the **B button**, the motor runs at **20% speed** (`0.2`)
- The moment you release the button, `stop()` is called and the motor halts
- `s_Turret` is listed as a requirement so the command scheduler knows this command is using that subsystem

<Note>
If VS Code shows a red underline on any class name, hover over it and select **Quick Fix > Import ...** to let VS Code add the import for you automatically.
</Note>

Once your code compiles cleanly, find a lead programmer to deploy and test it on the test board!

## Next Steps

Motors are the foundation of almost everything we build. Every subsystem &rarr; shooters, elevators, intakes, climbers &rarr; uses motors at its core. Start thinking about how the speed and direction of a motor translates into real-world movement.

When you're ready, move on to **[Motor Configs](./configs.md)** to learn how to fine-tune your motors with settings like current limits, output ranges, and neutral modes.
