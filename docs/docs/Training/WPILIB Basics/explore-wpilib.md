---
sidebar_position: 2
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'


# Explore WPILIB VSCode
In this section we'll get you familiarized with WPILIB VSCode. Here are the main points we'll cover:
- How to create a new project
- Running, simulating, and deploying your new project
- Basic File Structure
- Vendordeps

*Ready?*

Let's dive in!

## Creating A New Project

To open up vscode go to the start menu and search for it. On a mac press `cmd + space` to search for it. After opening it up you should see something like the image below:

![Alt text](../../../static/img/wpilib-icon.png)

click the little icon of WPILIB on the top right corner, and type in Create New Project, then click enter.

Alternatively, you can do `ctrl + shift + p` or `cmd + shift + p` on mac and type `WPILIB Create new project`, then click enter.

After you do that you should be on a page similar to this:

![Alt text](../../../static/img/create-project.png)

Here's how you fill it out:
- Choose the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Template</span>  box
- Choose  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Java</span>
- Search for  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Command Robot</span>. This is most common, but we use something a little bit different called  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Logged Robot</span>  
- You'll need to select a project name, and then fill out our team number: <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>2601</span>

After all the information is correct, check with a lead programmer and then click **Generate Project**

## Running Your Project
We can do three things with our project:
- `Build` this allows us to make sure there are no syntax errors
- `Simulate` This allows us to simulate real robot code ona virtual robot, where we can test mechanisms, autonomous routines, or trajectories
- `Deploy` This allows us to send our code to the real robot and have our code running on the real robot
<Note>
Syntax means structure of language. Just like normal languages, Java has grammar. `Build` checks if your grammar is wrong
</Note>

All three of these actions can be run by opening the command palette. Do either `ctrl + shift + p` or `cmd + shift + p` to open up the command palette, then search `WPILIB` and either build, simulate, or deploy.

For now, try building and simulating your project. We'll use simulate later with autonomous pathing!

## File Structure
Now it's time to review the files and folders that make up our project. You should know how to navigate through the basic structure in order to properly program mechanisms

### RobotContainer.java and Robot.java

RobotContainer.java is where we **Initialize** our subsystems and configure our controllers. **A subsystem is a specific part of our robot**, such a robot arm, our wheels and driving system (called the drivetrain), and any other mechanisms we want. For example, last year we had a rotating shooter. This is an example of a subsystem that we would be programming.

Robot.java is our main robot loop. This means that every 20 milliseconds, we are monitoring the robot. We also  **Initialize** our robot container. These things are a necessity for our robot to run. Robot.java isn't touched that much, and we mainly do all of our configurations in RobotContainer.java.

![Alt text](../../../static/img/robot-robotcontainer.png)
> P.S. It's ok if you don't know what some of the code is in the image. These are relatively advanced concepts, and will definitely be covered. If you're curious about them ask a lead programmer.


### Subsystems

This is where we will create our subsystems (big parts of the robot), we usually have a folder for each subsystem, which consists of five files you will dive into later. These five files allow for us to have immense control over the mechanisms and create a boilerplate pattern based way to program each subsystem, making this easy peasy. Each subsystem would look something like this:


![Alt text](../../../static/img/subsystem.png)



### Commands

We will cover commands in depth later too, but they are a way of basically telling a robot what do specifically, and are capable of being modified to create a combination of commands, which streamline effiency. Don't worry about this folder too much yet.


## Next Steps

Good Job! You have sucessfully downloaded and installed WPILIB, created your first project, and learned about subsystems and our main files. Now it's time to delve into actual programming, but before that you have 1 more topic to complete: hardware. We use specialized hardware in robotics, and it's important to know what each component does.  You can now move onto the next section **Hardware 101**