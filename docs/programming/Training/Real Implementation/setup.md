---
sidebar_position: 2
---

import Note from '@site/src/components/Note.jsx'
import Caption from '@site/src/components/Caption'

# Setting Up Your Project

Before we write a single line of subsystem logic, we need somewhere for that logic to live. In this page we'll create a dedicated practice project in WPILib VSCode, install the vendordep our TalonFX code will need, and lay out the Indexer's files in the exact folder shape every real subsystem in our codebase uses. By the end of this page, you'll have four empty files sitting in the right place, ready to be filled in over the next few pages.

---

## Step 1: Create a Fresh Project

For this section, build the Indexer inside its **own small project**, separate from any team repository you already have cloned. This keeps you free to experiment without worrying about breaking real robot code.

1. Open **WPILib VSCode**.
2. Open the command palette (`ctrl+shift+p`, or `cmd+shift+p` on Mac) and run **WPILib: Create a new project**.
3. In the **Template** box choose **Java**, then search for and select **Command Robot**.
4. Select any folder you would like to keep this project in. 
5. Give the project a name (something like `indexer-practice` works fine), and fill in our team number: <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>2601</span>.
6. Double check everything with a lead programmer, then click **Generate Project**.


<Caption src="/img/indexer-setup.png" alt="The WPILIB setup page" caption="If any of these steps feel unfamiliar, go back to Explore WPILIB VSCode in the WPILIB Basics section; it walks through this same screen in more detail." />


---

## Step 2: Install the Vendordeps

Our Indexer will talk to a real **TalonFX** motor controller, which means the project needs CTRE's Phoenix 6 vendordep installed before that code will compile &rarr; the same one you installed back in the Motors page.

1. Open the command palette and run **WPILib: Manage Vendor Libraries**.
2. Choose **Install new libraries (online)**.
3. Search for **Phoenix** (or paste the CTRE Phoenix 6 URL your lead programmer gives you).
4. Hit enter and wait for the install to finish.
5. Search for **AdvantageKit**, and hit install again for all vendordeps to be installed.

<Caption src="/img/vendordeps.png" alt="The Vendordeps installation page" caption="The Vendordeps section of the Motors page covers what a vendordep is and why we need one for CTRE hardware, if you want a refresher.." />
---

## Step 3: Lay Out the Subsystem's Files

Every real subsystem in our codebase lives in its own folder under `subsystems/`, and every one of those folders has the same shape: one IO interface, the implementations that satisfy it, and the subsystem class itself. Let's set that shape up now, before any logic exists.

1. In the file explorer, open `src/main/java/frc/robot/subsystems`.
2. Right-click `subsystems` and create a **New Folder** named `indexer`.
3. Inside `subsystems/indexer`, create four **New Files** by right clicking on indexer, and choosing new class/command:
   - `IndexerIO.java` &rarr; select empty class. This is  the interface describing what the hardware can do
   - `IndexerIOTalonFX.java` &rarr; select empty class. This is the real hardware implementation
   - `IndexerIOSim.java` &rarr; select empty class. This is the the simulated implementation
   - `Indexer.java` &rarr; select new subsystem. This is the subsystem itself

<Caption src="/img/indexer-files.png" alt="The Vendordeps installation page" caption="These four files should be inside the folder indexer, which should be inside the folder subsystems" />
All four files are empty right now &rarr; that's expected. Over the next few pages we'll fill them in one at a time, in this exact order.

<Note title="Why this order?">
<code>IndexerIOTalonFX</code> and <code>IndexerIOSim</code> both implement <code>IndexerIO</code>, so the interface has to exist first. <code>Indexer.java</code> depends on all three, so it's written last. This is the same order you'd naturally build any subsystem in: define the contract, satisfy it, then write the logic that uses it.
</Note>

---

## Step 4: Updating Robot.java
To get that telemetry and logging feature, we need to update **Robot.java** to allow **Logger** to work.

1. Search for *Robot.java* in the file explorer. You can also do  `ctrl+shift+p`, or `cmd+shift+p` on Mac, then search for *Robot.java*
2. Find the line of code below:
```java
public class Robot extends TimedRobot {
```
3. Replace it with this:
```java
public class Robot extends LoggedRobot {
```

Now you're all setup!

<Note title="LoggedRobot vs TimedRobot">
`TimedRobot` is the default for any robot base. It just means the robot functions on a loop (the loop that constantly runs everything on the robot) LoggedRobot is an extension of that. Along with running the loop on the robot, it also allows for logs to be produced, and is the backbone of telemetry data being read and sent out.
</Note>

---

## Step 5: Create the `LoggedTunableNumber` Utility

Later pages in this series lean on `LoggedTunableNumber` &rarr; a small utility class that returns a live value from the dashboard while in tuning mode, and silently falls back to a fixed default the rest of the time. It isn't part of WPILib or AdvantageKit; it's a class our own team wrote, so unlike `TalonFX` or `DCMotorSim`, it doesn't come from a vendordep. Your practice project needs its own copy before any page that uses it will compile.

1. In the file explorer, open `src/main/java`.
2. Right-click `java` and create a **New Folder** chain for `org/steelhawks/util` &rarr; a folder named `org`, containing a folder named `steelhawks`, containing a folder named `util`. This mirrors the exact package our real codebase uses for shared utility classes, kept separate from `frc.robot`, where your subsystem files live.
3. Inside `org/steelhawks/util`, create a new file named `LoggedTunableNumber.java` and paste in the following &mdash; this is the unmodified utility class straight from our real `Rebuilt2026` codebase:

```java
// util/LoggedTunableNumber.java
// Copyright (c) 2025 FRC 6328
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file at
// the root directory of this project.

package org.steelhawks.util;

import org.littletonrobotics.junction.networktables.LoggedNetworkNumber;
import org.steelhawks.Toggles;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.DoubleSupplier;

/**
 * Class for a tunable number. Gets value from dashboard in tuning mode, returns default if not or
 * value not in dashboard.
 */
public class LoggedTunableNumber implements DoubleSupplier {
    private static final String tableKey = "/Tuning";

    private final String key;
    private boolean hasDefault = false;
    private double defaultValue;
    private LoggedNetworkNumber dashboardNumber;
    private Map<Integer, Double> lastHasChangedValues = new HashMap<>();

    /**
     * Create a new LoggedTunableNumber
     *
     * @param dashboardKey Key on dashboard
     */
    public LoggedTunableNumber(String dashboardKey) {
        this.key = tableKey + "/" + dashboardKey;
    }

    /**
     * Create a new LoggedTunableNumber with the default value
     *
     * @param dashboardKey Key on dashboard
     * @param defaultValue Default value
     */
    public LoggedTunableNumber(String dashboardKey, double defaultValue) {
        this(dashboardKey);
        initDefault(defaultValue);
    }

    /**
     * Set the default value of the number. The default value can only be set once.
     *
     * @param defaultValue The default value
     */
    public void initDefault(double defaultValue) {
        if (!hasDefault) {
            hasDefault = true;
            this.defaultValue = defaultValue;
            if (Toggles.tuningMode.get()) {
                dashboardNumber = new LoggedNetworkNumber(key, defaultValue);
            }
        }
    }

    /**
     * Get the current value, from dashboard if available and in tuning mode.
     *
     * @return The current value
     */
    public double get() {
        if (!hasDefault) {
            return 0.0;
        } else {
            if (dashboardNumber == null) {
                dashboardNumber = new LoggedNetworkNumber(key, defaultValue);
            }
            return Toggles.tuningMode.get() ? dashboardNumber.get() : defaultValue;
        }
    }

    /**
     * Checks whether the number has changed since our last check
     *
     * @param id Unique identifier for the caller to avoid conflicts when shared between multiple
     *     objects. Recommended approach is to pass the result of "hashCode()"
     * @return True if the number has changed since the last time this method was called, false
     *     otherwise.
     */
    public boolean hasChanged(int id) {
        double currentValue = get();
        Double lastValue = lastHasChangedValues.get(id);
        if (lastValue == null || currentValue != lastValue) {
            lastHasChangedValues.put(id, currentValue);
            return true;
        }

        return false;
    }

    /**
     * Runs action if any of the tunableNumbers have changed
     *
     * @param id Unique identifier for the caller to avoid conflicts when shared between multiple *
     *     objects. Recommended approach is to pass the result of "hashCode()"
     * @param action Callback to run when any of the tunable numbers have changed. Access tunable
     *     numbers in order inputted in method
     * @param tunableNumbers All tunable numbers to check
     */
    public static void ifChanged(
        int id, Consumer<double[]> action, LoggedTunableNumber... tunableNumbers) {
        boolean anyChanged = false;
        for (LoggedTunableNumber n : tunableNumbers) {
            if (n.hasChanged(id)) anyChanged = true;
        }
        if (anyChanged) {
            double[] values = new double[tunableNumbers.length];
            for (int i = 0; i < tunableNumbers.length; i++) {
                values[i] = tunableNumbers[i].get();
            }
            action.accept(values);
        }
    }

    /** Runs action if any of the tunableNumbers have changed */
    public static void ifChanged(int id, Runnable action, LoggedTunableNumber... tunableNumbers) {
        ifChanged(id, values -> action.run(), tunableNumbers);
    }

    @Override
    public double getAsDouble() {
        return get();
    }
}
```

4. `LoggedTunableNumber` references `Toggles.tuningMode`, so it needs a `Toggles` interface to compile against. One level up from `util` &mdash; directly inside `org/steelhawks` &mdash; create `Toggles.java`:

```java
// Toggles.java
package org.steelhawks;

import org.littletonrobotics.junction.networktables.LoggedNetworkBoolean;

public interface Toggles {
    LoggedNetworkBoolean tuningMode =
        new LoggedNetworkBoolean("Toggles/TuningMode", false);
}
```

<Note title="Why is this Toggles interface so much smaller than the real one?">
Our real <code>Toggles.java</code> in <code>Rebuilt2026</code> is a large interface with a toggle for nearly every mechanism and dashboard override on the robot. <code>LoggedTunableNumber</code> only ever touches one field from it &mdash; <code>tuningMode</code> &mdash; so that's the only piece your practice project actually needs to compile and run correctly. If a later page has you add more overrides of your own, just add more fields to this same interface rather than replacing it.
</Note>

With both files in place, `import org.steelhawks.util.LoggedTunableNumber;` will resolve correctly wherever a later page in this series asks you to use it.

## Next Steps

Your project is ready, your subsystem's files are sitting exactly where they belong, and `LoggedTunableNumber` is ready to import. In the next page, we'll write `IndexerIO.java` &rarr; the interface that defines what our Indexer's hardware can do.
