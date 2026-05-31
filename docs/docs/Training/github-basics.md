---
sidebar_position: 3
---

# GitHub Basics

GitHub is what we use on a daily basis to share code with each other, it's a place to view, collaborate, and work on projects simultaneously while keeping our code intact.

## What is GitHub?
GitHub is a place where people store they're code, share it, and have people collaborate on it. Code there is usually open source (people can copy it) and is openly shared with other members of the community. Our team uses GitHub to share code with each other and collaborate from separate devices, which is extremely useful with such a large team. 

## Installing Git & GitHub

First, headover to this link **[Install Git](https://git-scm.com/install/)** and choose your operating system, and click download. After installing, you'll need to follow some steps for setup, but we'll go through that later. 

After installing Git, install GitHub Desktop. Go to this link **[GitHub Desktop](https://desktop.github.com/download/)** and install github desktop, then sign-in with your account.

At this point, you should have:

- Git installed and ready to set up
- GitHub Desktop installed
- Signed into GitHub Desktop through your account

## Setup Git
We need to setup some configurations for Git before you continue

### MacOS
Open up the terminal by searching for it in *Apps*, then type these two lines one after another, clicking enter after each line:

- `git config --global user.name "[Your Name]"`
- ` git config --global user.email [Your Personal Email]`


### Windows/Linux
Open up powershell from the *Start Menu*, and type the same two lines one after another, clicking enter after each line:

- `git config --global user.name "[Your Name]"`
- ` git config --global user.email [Your Personal Email]`


## GitHub Basics
Now we will talk about how to use github and when to use github

### How to Use GitHub
First, let's go over some vocab:

- **Repository** A project that is on github. A project can be either public (open to view for everyone), or private, and collaborators can be added to repos (repositories)
-  **commit** is a add-on or change that you make to a repo. A commit is local, which means no one else can see what changes you made to the code. Any changes that are just commits are changes only visible from your device.
-  **push** You put your changes on the repo in github, and make the changes you made visible to all of the people associated with the repo.
- **pull** You recieve the changes that someone pushed. This doesn't happen automatically and you'll see an option to pull whenever you try and push (if new changes are available) A pull will take changes that have been made visible to everyone and update your code with those changes

After a coding session, you should check to make sure your code isn't incorrect or have any issues, then commit your code. When you have completed a big chunk or task, push your code for everyone to see

![Alt text](../../static/img/github-commit.png)

Put a simple summary, just one to two words. You might need a description if you have more than a few words or more than one concept to say, then click commit. After it's commited, you'll see an option to push the code, which will lead to it being in github on the web. **Congratulations, you have learned how to commit and push code!**

### When To Use GitHub

You should use github whenever you...
- After every coding session to keep track of your work
-  create code and codebases (large projects) in order to store your code somewhere safe, and also so that other people can collaborate, push, and improve your current code.
-  Want to show something to the world that people can use in a positive way!


### Best Practices

*So when do you commit, push, or pull to your codebase?*

You should commit whenever you finish your coding session, and push whenever you reached a goal or point, for example, if you're working on a main subsystem file over multiple sessions, then commit each session and push once that file is complete. 

You should pull your repo every time you start working, in order to stop something called merge conflicts, which you will learn about later. But if you forget, it's not the end of the world, as GitHub Desktop handles these conflicts quite well.

## Branching
Let's imagine this scenario: you have some code, and want to work on this expiremental feature, but if somethinges goes wrong all your code could be lost. *What do you do?*

**You create a git branch**

A git branch is essentially a copy of you're current code that you can start working on, and it won't affect your main branch. A git branch is literally a branch off your main code. If anything goes wrong in the branch, delete it, and your original code on the main branch stays the same. 

*Why do we branch?*
- To write out new features
- Write subsystems (rookies)
- Test some extremely experimental design

You'll learn how to branch in homework, but you can also create them through GitHub Desktop.

## Next Steps

Now that you've learned the basics, it's time for some real practice. Head over to **[Git Branching](https://learngitbranching.js.org/)** and practice. Go over Introduction Sequence: 1, 2, 3, and 4. Then Go to Remote:

![Alt text](../../static/img/gitlearn.png)

and go through **EVERYTHING** because this will be very useful and neccessary in the future. This is considered your first homework, so please complete it as soon as possible. 

Remember this is a two way commitment, and you need to put in the work for you to get amazing results, and it starts with going through long and tedious processes to learn.


**After you're done with this section, you can finally learn Java! Please move on to the next section: Basics 101 of Java.**