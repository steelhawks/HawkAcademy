---
sidebar_position: 1
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Basics 101 of Java
Welcome to your very first programming lesson! This is an exciting time, but we have a lot to cover in this one short document. Let's break down what you will cover in this specific lesson:
- Typing your first line, print statements
- Variables & Data types

This is a topic-dense lesson, so if you have any questions, pause a moment, ask someone for help (or chatgpt) and continue through. Don't leave this lesson feeling icky about things you learned here, after all these are the *very* basics. This is the foundation for everything else, so try to fully comprehend everything.

## First Line of Code
Before you write your first line of code, *where do you write it?* A google document won't work for us, so let's figure out where we'll code. 


**Usually**, we'll program in a desktop application (something you download and install), **BUT**, for this lesson we'll use an online tool for coding, which will help us run code without a lot of setup


Head over to the **[Programiz Editor](https://www.programiz.com/java-programming/online-compiler/)** and you should see something like the image below.

![Alt text](@site/static/img/programiz.png)

*What's really happening in this image?* Let's break it down:
- `class Main` this basically says *"I'm the container where all code is going to go"* If you look at the top you'll see `Main.java`.
:::tip
The class name usually corresponds to the name of the file. Main.java is the file name, Main is the class name
:::
- `public static void main(String[] args) {` This is the **Main Function**.  If the class is where all the code goes, anything inside of the curly braces here `{}` is what actaully runs. If you have code outside the main function it won't run. *In robot code, we don't see this main function very often*
- `System.out.println("start small. Ship something");` We call this a **Print Statement**. It will display whatever is in the quotation marks into the **Console**.
<Note>
IMPORTANT: If there is no semicolon after every line (almost every line), Java will throw an error, so please make sure you put semicolons everywhere
</Note>

### Creating Your Own Print Statements

First let's run our code. Click the big purple run button, and you should see a message in the console, just like below:

![Alt text](@site/static/img/basicscompletecode.png)

Now let's change the text in the quotation marks. After you finish changing it to be whatever you want, click run again and see the new text appear on the screen.

Congratulations! You created you're own print statements!

   <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>*HERE'S A CHALLENGE*</span> Create multiple print statements, each telling something different about you. Remember everything displayed should be in quotation marks.  **YOU MUST HAVE SEMICOLONS**


## Operators
These are the arithmetic operators in Java, you should know them as they will pop up in later lessons and can be used with <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**VARIABLES**</span>, which is your next topic

Here are the operators:
- `+` adding variables or numbers, concatenation
- `-` subtracting variables or numbers
- `*` multiplying numbers or variables
- `/` dividing variables and numbers
- `%` finding the remainder of a division problem

Now let's jump into variables!

## Variables


### Variables
You've touched your first line of code! Now, lets get a bit more complicated with something called <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**Variables**</span>


*So what are variables?*

 You can think of variables as containers that store values. Just like in algebra, we say it's x or y or z, and we assign a value to it. <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>In Programming</span> we assign letters, names, or anything at all! They store values of different types, like text, numbers, and many others.

### Data Types
Each variable has an assigned data type to it, which **cannot** change unless there is no predefined data type

*But what is a data type?*

A data type is the classification of what we store in a variable. Text and numbers for example, cannot be stored in the same data type.

| Data Type | Name | Example |
|------|------|------------ |
| Text | String | "Hello World" |
| Integer | int | 5 |
| Decimal | double | 5.4 |
| Truth value | boolean | false |
<Note>
Most data types besides Strings don't have quotation marks, if you put quotations marks around anything (including numbers), they become the String data type. So be careful what data type you use.
</Note>


These are your basic data types, and we use them in almost **every** programming language in some way or form. You'll learn about the robot specific data types/units in WPILIB Basics!

#### Creating Variables

Let's do a small quiz to see if you can pick the right data type for each variable:

<Quiz questions={[
  {
    prompt: "For a variable of Name, what data type would you use?",
    options: ["String", "double", "int", "boolean"],
    correct: 0,
    explanation: "A string would be perfect to represent a piece of text, such as your name"
  },
  {
    prompt: "For a variable of Age, what data type would you use: ",
    options: ["double", "float", "int", "boolean"],
    correct: 2,
    explanation: "For age, double is not good because 5.4 isn't and age, and float is not a datatype, so int is the correct choice"
  }
]} />

Now that you got that down, let's see if you can create your own data type!

<span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**Here's the challenge:**</span> Create separate variables in the editor for your name, age, and a list of your favorite things,
then print out all three of those in separate print statements.

### Concatenation
Contatenation is the process of combining variables or text + variables. We do this very simply by *adding* these variables to text. Here's an example:

```
String name = "Steel Hawks";
System.out.println("My name is " + name);
```

In this example we added a string to text (also a string), but you can add anything to anything else within a print statement, You **cannot** add a string to int or double in a variable.

## Next Steps
There is no challenge or assignment this time :( 
syou have to learn about arrays first :)


You are officially done with this section! **You may move on to Arrays**
