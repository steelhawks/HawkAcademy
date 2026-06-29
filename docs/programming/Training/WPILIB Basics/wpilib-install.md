---
sidebar_position: 1
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'


# Get Set Up

Install WPILIB and NI Tools and learn all about them


## Install WPILIB
We can't use regular Java to program robots. we use something called WPILIB, which helps control robot parts and allows us to code full robot capabilities. 

*How do we get WPILIB?*

 Head over to this link: **[WPILIB Dowload Page](https://docs.wpilib.org/en/latest/docs/zero-to-robot/step-2/wpilib-setup.html])** and look for a big blue button that says **Download For Windows/MacOS/Linux**

 ![Alt text](../../../static/img/wpilibinstall.png)


 After Going through the installation prompts (**MAKE SURE TO CLICK INSTALL VSCODE**) you will be able to open WPILIB VSCode. 
 
 Think of VSCode as that programiz code editor, but on your desktop instead of in your browser. It has many more features, and can do much more than just help you code

 
 If you're unsure of anything during the installation process, don't be afraid to reach out to a lead programmer to help you. Asking for help is always better than making a mistake that costs you valuable time.

### Windows

Go to the start menu and search for WPILIB VSCode, it should appear if installation was successful. If it appears, Click on it, if not reach out to a lead programmer to figure out why it didn't, or to help with installation. 

### MacOs

Use this Shortcut: `cmd + space` in order to open up the search bar, then search for WPILIB VSCode 2026. Again, if it shows up then click on it, if not then ask a lead programmer for help. 


## NI Game Tools

We use more than WPILIB to help us code. there are many types of software out there that enable us to track data, and also help with actually configuring and driving the robot.

### Download NI Game Tools

**IN THE 2027 WPILIB VERSIONS THE FOLLOWING CHANGES ARE MADE:**
- The Roborio is gone and Systemcore is the replacement
- The  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>*FIRST* Driverstation</span> is coming out, no driverstation from NI Tools

To download these tools, head over to this website: **[NI Game Tools](https://www.ni.com/en/support/downloads/drivers/download.frc-game-tools.html#581857)**. Once you're there, you will have to login to download the game tools. Since the new 2027 season, robot code can be run from both Windows and Mac, as well as Linux. However, during competition, only a windows computer can be used. 
<Note>
Note that in the new build season these instructions might change, so for now you can skip over NI tools. Downloading WPILIB is a must though
</Note>

You will have to create an account. Then you will be redirected back to that page, and you will be able to download the tools. After downloading all of them and accepting any agreements, you may proceed to the next section.


![Alt text](../../../static/img/nitools.png)

## Next Steps

Now you have a  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**Development Environment**</span> setup and you are ready to learn robot code! First, let's go over the main points about WPILIB VSCode.