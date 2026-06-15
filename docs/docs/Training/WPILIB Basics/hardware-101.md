---
sidebar_position: 3
---


import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'




# Hardware 101
Welcome to <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Hardware 101</span> This section is broken up into two parts. In the first part we'll introduce each component. In the second part we'll explain function and how each component interacts with others. All hardware shown here has it's own documentation, which could be an excellent extra resource if needed.

## Vocab
All vocab will be highlighted in bold, and you can find the definitions here:
- **Brownout** is when the mechanisms draw too much power from the battery, so things don't work properly
- **CANBus** A network of signals (like your wifi) that transmit data to and from motors
- **IO** Connection points where you can send information out or in.
- **PMW** controls how much power mechanisms/motors get by pulsing power to the mechanism
- **LED's** These are small lightbulbs that are used often in robotics.

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

Now let's move on to another key component of the robot: <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>The Radio</span>

## Radio
The radio is what we use to deploy code on the robot. It broadcasts a wifi signal, and we connect to it's wifi, then we click deploy robot code. When we deploy, the radio connects to the systemcore and then sends the code, which then get's processed. We do something called radio tethering, to learn more about it go to this link: **[FRC Radio Programming](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/radio-programming.html)**. The radio is extremely important in having a succesful robot, and we will talk more about radio tethering in Hardware 102

## PDP/PDH

The PDP or PDH are used for distributing power everywhere. We connect the battery to a breaker that connects to this device, then we use that power to send power out to the rest of the components that we need. This is like the heart, pumping out power to all the components.

## Motors

We use a variety of motors, mainly from this company called CTRE. CTRE produces motors called Kraken's, which we mainly use. We also use talon srx's, which is just another type of motor. These motors run everything on our robot from intake to wheels to turret to how we actually move on the floor. These all come with something called a motor controller, which we program and use to set voltage to the motor. 


## Encoders & Cancoders
What are encoders and cancoders? These are what we use to track the rotation distance of our mechanisms, for example, if a turret rotated 360 degrees, it would have 1 revolution, and 2 pi radians. 

### Encoder vs Cancoder
An encoder doesn't keep track of motor positions when the motor turns off, but a cancoder keeps track of the motor positions of all time, and it provides useful information for things like **Swerve** angle motors.

To learn more about Encoders and Cancoders visit this site: **[Encoders](https://docs.wpilib.org/en/stable/docs/hardware/sensors/encoders-hardware.html)**

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
We use two types of vision, Photonvision and Limelights. Here we'll discuss both.

### Photonvision

Photonvision is a software system used for us to detect these QR-code like things called **april tags**. April tags help us identify key points on the game field, which help us complete the objective of the game. For running photonvision software (which you'll learn how it works later) we use something called **arducams**, which are hooked up to a raspberry pi processor that runs some other software. This is a more complex system, but later on we'll break it down for you.

### Limelight

Last year, we mainly used limelights for advanced vision processing, where we trained an ML model on object detection. Limelights are way heavier, and require a cooler as well. These are mainly for object detection and other processing intensive stuff, whereas photonvision is easier to manipulate.

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

Use the links provided to research more about these components, and you'll learn how we wire them in the next section.

**Now that you've learned the basics, you can move into Hardware 102. You have finished this section**