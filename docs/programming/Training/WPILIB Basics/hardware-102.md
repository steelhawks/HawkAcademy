---
sidebar_position: 4
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'
import Caption from '@site/src/components/Caption'


# Hardware 102
In this section we'll cover 2 major connections between hardware:
- **Daisy Chain Wiring:** The way we wire motors and mechanisms to each other
- **Radio Tethering:** Connecting Radios together

## Daisy Chain Wiring

First lets define some vocab:

**can wires**: wires that send signals to tell motors on what to do, and send back data.  and allow us to access electrical data. There are two wires that we talk about for can wires: **can low** and **can high**.

**CANBus** a canbus is a network of signals that we create for a mechanism or connected group of mechanisms. This allows us to access signals and electrical data from a motor and use it to determine many things.

Now, imagine you are setting up a string of old-school Christmas lights. If one bulb isn't plugged into the next, the whole string won't light up. Daisy chaining is essentially the same concept, but for data.

In robotics, we use a "highway" for data called the CANBus. Instead of running a separate pair of wires from the brain (Systemcore) to every single motor, we connect them in a long, continuous chain.

The Anatomy of the Chain
Every device on the CANBus (like a Kraken motor or a Cancoder) has a pair (one green and one blue) of wires:

How It Works
The Start: You start with two CAN wires (one Yellow, one Green) coming out of the Systemcore.

The Link: You plug those into the first motor. Then, you take another set of wires from that same motor and "daisy chain" them into the next motor.

The Flow: The data flows through the CAN High and CAN Low wires like a single path. The message for Motor #5 travels through Motors #1, #2, #3, and #4 to get there.

The End: At the very end of the chain, you need a "Terminating Resistor" (usually built into the PDP/PDH) to stop the data signals from bouncing back like an echo.

Why do we do it?
Less Mess: You don't have 50 wires tangled at the center of the robot.

Efficiency: All devices share the same "bus," so they can all hear what the brain is saying at the same time.

## Radio Tethering

If you don't remember what radio tethering is, please visit **Hardware 101** 

To achieve radio tethering connect the radio to your computer using an **Ethernet Cable** then go to this website: `http://radio.local/`

After that follow these instructions:

<Caption src="/img/tethering.png" alt="Description of Radio Tethering" caption="How to program the radio" />

**OR**

Visit this site: **[FRC RADIO PROGRAMMING](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/radio-programming.html)**

## Quiz Time

<Quiz questions={[
{
prompt: "In a CANBus daisy chain, why is a 'Terminating Resistor' required at the end of the line?",
options: [
"To provide extra power to the last motor",
"To prevent data signals from 'echoing' or bouncing back and causing interference",
"To change the color of the CAN wires",
"To act as a backup battery for the Systemcore"
],
correct: 1,
explanation: "Without a resistor at the end of the chain, the electrical signals hit the end of the wire and bounce back, which creates 'noise' that confuses the data flow."
},
{
prompt: "What is the primary benefit of Radio Tethering as described in the text?",
options: [
"It allows the robot to fly",
"It recharges the battery faster",
"It provides a stronger signal and better communication between the computer and robot",
"It replaces the need for CAN wires entirely"
],
correct: 2,
explanation: "Radio tethering uses a dedicated link between a radio on the robot and a radio near the computer to ensure a stable, high-quality connection for deploying code and receiving data."
},
{
prompt: "If a CAN High wire (Yellow) breaks halfway through a daisy chain, what happens to the devices located AFTER the break?",
options: [
"They continue to work normally",
"They switch to using the Green wire only",
"They lose connection because the data path is interrupted",
"They start spinning at maximum speed"
],
correct: 2,
explanation: "Because daisy chaining is a single continuous path, any break in the chain prevents data from reaching any subsequent devices."
},
{
prompt: "How many wires are typically involved in a standard CAN connection for a single device?",
options: [
"One (just Yellow)",
"Two (Yellow for High, Green for Low)",
"Four (two pairs for 'in' and 'out' signals)",
"Three (Red, Black, and White)"
],
correct: 2,
explanation: "Every CAN device uses two wires: CAN High (Yellow) and CAN Low (Green) to send and receive differential signals."
}
]} />


## Next Steps

Go to our electrical subteam throughout build season and observe what their doing. Take notes, and make sure when you program you understand what each piece of hardware does and how wiring works.

**You have completed this section, move on to the next section**