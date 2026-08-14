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


## Next Steps

Your project is ready and your subsystem's files are sitting exactly where they belong. In the next page, we'll write `IndexerIO.java` &rarr; the interface that defines what our Indexer's hardware can do.
