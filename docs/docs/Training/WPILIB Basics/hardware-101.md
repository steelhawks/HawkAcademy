---
sidebar_position: 3
---


import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'
import Caption from '@site/src/components/Caption'




# Hardware 101
Welcome to <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Hardware 101</span> This section is broken up into two parts. In the first part we'll introduce each component. In the second part we'll explain function and how each component interacts with others. All hardware shown here has it's own documentation, which could be an excellent extra resource if needed.

## Vocab
All vocab will be highlighted in bold, and you can find the definitions here:
- **Brownout** is when the mechanisms draw too much power from the battery, so things don't work properly
- **CANBus** A network of signals (like your wifi) that transmit data to and from motors.
- **IO** Connection points where you can send information out or in.
- **PMW** controls how much power mechanisms/motors get by pulsing power to the mechanism
- **LED's** These are small lightbulbs that are used often in robotics.
- **Main Breaker** A large manual switch that connects or disconnects the battery from the entire robot. Flipping it off cuts all power immediately.
- **Fuse** A small safety device that breaks a circuit if too much current flows through it, protecting components from damage.

## Systemcore

Welcome to our first piece of equipment! The systemcore is the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>brain</span> of our robot. It is the reason any of our code works!

Here's what it can do and what is has:
- Process all our code. It is similar to a mini computer and processes all our code
- Connect to all the other components
- **Brownout** protection
- 5 **CANBus** interfaces
- **IO/PMW** ports
- **LED's**
<Note>
As of Summer 2026 the Systemcore hasn't been released and this section will be updated when more is known
</Note>

This is the basis of the Systemcore. To find specific information look at their spec documentation here: **[Systemcore Docs](https://downloads.limelightvision.io/documents/systemcore_specifications_june15_2025_alpha.pdf)**

<Caption src="/img/systemcore.png" alt="The Systemcore, the brain of the FRC robot" caption="The Systemcore — the central processing unit of the robot." />



Now let's move on to another key component of the robot, <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>The Radio</span>

## Radio

*So what is the radio?* 

The radio is a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Communication Device</span> It connects to your computer via it's own wifi network, and is the middleman between your computer and the systemcore. 

**Here's how to think about it:**

$$Computer\;\xrightarrow{}\; Radio \;\xrightarrow{}\; Systemcore$$

When we run `Deploy` on our code, it sends it to the radio, which then is connected to the systemcore, the systemcore processes all the code and does what it needs to do for the robot to function.
<Note title="WPILIB Actions Refresher">
The `Deploy` feature is one of three features that you can run from the wpilib command palette. If you forgot all about this, visit **Exploring WPILIB VSCode** to jog your memory
</Note>

### Radio Tethering
Radio tethering is when we connect one radio to another, amplifying the distance we are able to stay connected in. When implementing radio tethering, here's how it would look:

$$Computer\;\xrightarrow{}\; Driver\;Station\;Radio\;\xrightarrow{}\; Robot\;Radio\;\xrightarrow{}\; Systemcore$$


<Caption src="/img/radio.png" alt="The Radio" caption="The current Radio that we have in use" />


## PDP/PDH

*So what is the PDP/PDH?*

The PDP (Power Distribution Panel) or PDH (Power Distribution Hub) is the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>heart</span> of the robot's electrical system. Every component that needs power gets it from here.

**Here's how power flows through the robot:**

$$Battery\;\xrightarrow{}\; Breaker\;\xrightarrow{}\; PDP/PDH\;\xrightarrow{}\; Components$$

The battery connects through a **main breaker** into the PDP/PDH, which then distributes power out to motors, the Systemcore, and every other component that needs it. Each output slot has its own **fuse**, so a short in one device won't take down the entire robot.

<Caption src="/img/pdp.png" alt="The Power Distribution Panel/Hub" caption="The PDP/PDH — distributes battery power to all robot components." width="500px"/>

## Motors

Motors are the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>muscles</span> of our robot. They control everything from giant mechanisms to small wheels.

*What does a motor do?*
A motor spins. That's it. A motor is just a device that spins as fast as you want it to, for as long as you want it to.

*What Kind of Motors do we use?* 

We use a variety of motors, mainly from <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>CTRE</span> 

Motors have four wire ports:
- **Ground:** Where power leaves
- **Positive:** Where power enters
- **CAN High:** Signals enter
- **CAN Low:** Signals leave

Some of the most common motors we used are called **Kraken x44** and **Kraken x60**

### Motor Controllers vs. Motors
A motor controller is what we actually program. A motor controller takes the instructions and gives them to the motor so it can spin a certain way. 

Most motors that we use have the motor controller and motor in the same place, not as two separate pieces. 

To visit the CTRE Motors documentation visit this site: **[CTRE DOCS](https://v6.docs.ctr-electronics.com/en/stable/)**

<Caption src="/img/kraken.png" alt="The Power Distribution Panel/Hub" caption="This is one of the motors that we use"/>



## Encoders & Cancoders

*So how does the robot know where anything is?*

Encoders and Cancoders are the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>senses</span> of the robot. Without them, a motor has no idea how far it has spun — it just goes until you tell it to stop.

**Here's how to think about it:**

$$Motor\;Spins\;\xrightarrow{}\; Encoder\;Counts\;\xrightarrow{}\; Code\;Knows\;Position$$

An encoder sits on a motor and counts every rotation. Your code reads that count and uses it to know exactly where a mechanism is — whether that's a turret angle, an arm height, or how far a wheel has traveled.

### Encoder vs. Cancoder

*What's the difference?*

A standard encoder is <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>relative</span> — it starts counting from zero every time the robot powers on. A Cancoder is <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>absolute</span> — it always knows its true position, even after a power cycle.

- **Encoder** — cheap, simple, resets on boot. Fine for things like drive wheels where you only care about distance traveled.
- **Cancoder** — remembers its angle forever. Essential for **Swerve** steering modules, where the robot needs to know which way each wheel is pointing the moment it turns on.

To learn more visit: **[Encoders](https://docs.wpilib.org/en/stable/docs/hardware/sensors/encoders-hardware.html)**

<Caption src="/img/cancoder.png" alt="A Cancoder in its components" caption="A Cancoder — tracks absolute position across power cycles." />

## Pneumatics & Solenoids
Think of pneumatics like a circuit, but instead of electricity flowing through wires, compressed air flows through plastic tubes.

The Compressor: This is the "battery" of the air system. It creates the pressure.

The Air Tank: This stores the air so you don't run out mid-match.

The Solenoid: This is the gatekeeper. It’s an electronic valve that opens or closes when the RoboRIO tells it to, directing air to your cylinders.

The Cylinder (Piston): This is the part that actually moves.

### Solenoids

In WPILIB, you will deal with two main types of solenoids. Choosing the right one in your code depends on which one is physically on your robot:

Single Solenoid
How it works: It has one "coil" (electric trigger). When you turn it on, the piston pushes out. When you turn it off, a spring (or constant air) pushes it back.

In Code: It’s like a light switch. It is either On or Off.

Double Solenoid
How it works: It has two coils. One "pushes" the valve to move the piston out; the other "pushes" it to move the piston back.

The Perk: If the robot loses power, a double solenoid stays in its last position.

In Code: It has three states: Forward, Reverse, or Off (Neutral).



## Vision

*How does the robot see the field?*

Vision cameras are the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>eyes</span> of the robot. They let the robot detect targets on the field and make decisions based on what they see — without any driver input.

**Here's how vision fits into the robot:**

$$Camera\;\xrightarrow{}\; Image\;Data\;\xrightarrow{}\; Processor\;\xrightarrow{}\; Systemcore$$

We use two different camera systems depending on what we need.

### Arducam

An Arducam is a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>lightweight USB camera</span> that streams video to an onboard processor. On its own it's just a camera — the processing happens in software elsewhere. Arducams are small, cheap, and easy to mount anywhere on the robot.

### Limelight

A Limelight is a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>self-contained vision unit</span> — the camera and processor are built into one housing. You plug it in, point it at a target, and it handles all the computation internally before sending results to the Systemcore. Because everything is on-board, Limelights are heavier and generate more heat, but they can handle more processing-intensive tasks like running ML models for object detection.

<Caption src="/img/limelight.png" alt="A Limelight vision camera" caption="The Limelight — an all-in-one camera and vision processor." />

## Quiz
<Quiz questions={[
{
prompt: "Which component acts as the 'brain' of the robot, processing the Java code and controlling mechanisms?",
options: ["The PDP/PDH", "The Systemcore", "The Radio", "The Limelight"],
correct: 1,
explanation: "The Systemcore contains the CPU and handles the processing of your code, similar to how a computer works."
},
{
prompt: "If you need a mechanism to stay in its last position even if the robot loses power, which component should you use?",
options: ["Single Solenoid", "Double Solenoid", "Talon SRX Motor", "Cancoder"],
correct: 1,
explanation: "Double solenoids have two triggers; they will stay in their 'Forward' or 'Reverse' state even if electricity is cut."
},
{
prompt: "What is the primary advantage of a Cancoder over a standard encoder?",
options: ["It is much lighter", "It connects via Wi-Fi", "It remembers its position even after the power is turned off", "It makes the motor spin faster"],
correct: 2,
explanation: "Cancoders provide 'absolute' positioning, meaning the robot always knows the angle of the mechanism (like a Swerve module) immediately upon startup."
},
{
prompt: "What is the difference between Photonvision and Limelight based on the text?",
options: [
"Photonvision is for motors, Limelight is for air",
"Photonvision is a software system often used for April Tags; Limelights are hardware units used for heavy processing like ML models",
"Limelights are lighter and easier to use than Photonvision",
"There is no difference"
],
correct: 1,
explanation: "The text notes that Photonvision is used with Arducams for April Tags, while Limelights are heavier and used for more intensive tasks like Machine Learning object detection."
},
{
prompt: "Which device acts as the 'heart' of the robot, distributing power from the battery to all other components?",
options: ["The Radio", "The Systemcore", "The PDP/PDH", "The Solenoid"],
correct: 2,
explanation: "The Power Distribution Panel (PDP) or Hub (PDH) is responsible for taking the main battery power and sending it out to the rest of the electronics."
}
]} />

## Next Steps

Use the links provided to research more about these components, and you'll learn the connections between them in the next section.

**You can move into Hardware 102. You have finished this section!**