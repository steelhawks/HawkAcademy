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

All three of these actions can be run by opening the **command palette.** Do either `ctrl + shift + p` or `cmd + shift + p` to open up the command palette, then search `WPILIB` and either build, simulate, or deploy.

For now, try building and simulating your project. We'll use simulate later with autonomous pathing!

Now that you know how to do all of these things, let's move on to File Structure

## File Structure
Now it's time to review the files and folders that make up our project. You should know how to navigate through the basic structure in order to properly program mechanisms

### Folders

Before we talk about any specific files, we'll talk about some important folders. Here are the main important files and what they do:
- `generated` This is where we put files that are not made by us, but by third party software
- `subsystems` This is where we program all our mechanisms for each subsystems
- `commands` This is where we create <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**command compositions**</span> You'll learn about these later. 

### Some Important Files

Some important files include these below:
- `RobotContainer.java` This is where we intialize subsystems and configure the controls of the xbox controller
- `Robot.java` This is the file that starts the robot up, and runs all of the code to get the robot started
- `Main.java` When you run the build, deploy or simulate the program, this is the file that's looked at. We don't touch this file, but it is the one that makes the robot run. 


![Alt text](../../../static/img/robot-robotcontainer.png)
> P.S. It's ok if you don't know what some of the code is in the image. These are relatively advanced concepts, and will definitely be covered. If you're curious about them ask a lead programmer.




## Next Steps

Good Job! You have sucessfully downloaded and installed WPILIB, created your first project, and learned about the file and folder structure and our main files. 

In engineering there are many pieces of unique and special components. We program and utilize these components a lot, so in the next section we'll learn more about the components we use and how we use them as programmers. 