---
sidebar_position: 1
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Basics 101 of Java
Welcome to your very first programming lesson! This is an exciting time, but we have a lot to cover in this one short document, so let's break down what you are going to cover in this specific lesson:
- Typing your first line, print statements
- Variables & Data types
- A little thing on Arrays

This is a topic-dense lesson, so if you have any questions, pause a moment, ask someone for help (or chatgpt) and continue through. Don't leave this lesson feeling icky about things you learned here, after all these are the *very* basics. This is the foundation for everything else, so try to fully comprehend everything.

## First Line of Code
Before you write your first line of code, *where do you write it?* A google document won't work for us, so let's figure out where we'll code. 


  **Usually**, we'll program in a desktop application (something you download and install), **BUT**, for this lesson we'll use an online tool for coding, which will help us run code without a lot of setup


Head over to the **[Programiz Editor](https://www.programiz.com/java-programming/online-compiler/)** and you should see something like the image below.

![Alt text](@site/static/img/programiz.png)

*What's really happening in this image?* Let's break it down:
- `class Main` this basically says *"I'm the container where all code is going to go"* If you look at the top you'll see `Main.java`. Just to keep in mind: usually the class corresponds to the name of the file.
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


### Variables
Now were going to talk about variables, what are the main types of variables, how to create and use them.

So what are variables. You can think of variables as containers that store values. Just like in algebra, they can be called by a letter, name, or anything at all! They store values of different types, like text, numbers, and many others.

#### Data Types
So what is a data type. A data type is the type of thing we store in a variable. Text and numbers for example, cannot be stored the same way.

| Data Type | Name | Example |
|------|------|------------ |
| Text | String | "Hello World" |
| Number | int | 5 |
| Decimal | double | 5.4 |
| True/False | boolean | false |
> Note that int and double don't have quotation marks, if you put quotations marks around anything (including numbers), they become the String data type. So be careful what data type you use.



#### Arrays
Arrays (lists), is a special type of data that is widely used throughout programming. Essentially, it is list of a certain data type. For example, if you wanted to store a list of grocery items, you would create an array of type String, which would then contain all grocery items. Arrays are useful for storing a lot of the same related data together, just like a normal list. Here's how we create an array

```
String[] grocery_items = {"Banana", "Milk", "Bread", "Bulgogi Beef"};
```

when declaring the type of an array, make sure to add `[]` at the end. 

**Multi Dimensional Arrays**: The grocery list array above is known as a 1d array. In the simplest terms possible, this means that there is only 1 set of `[]`. When you have a 2d or 3d array, you have more brackets, so you're data would look way more complicated. 2d and 3d arrays are pretty complicated, but if you can imagine a 2d or 3d graph, points can be modeled with a 2d or 3d array, which is again just arrays within arrays. an example of a 2d array would be `double[][] random = {{3, 2, 4], [4, 2, 3}};` This kind of array is essentially `[]` within a `[]`, which is considered a multidimensional array.

#### Creating Variables

Let's do a small quiz to see if you can develop your own variable:

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

Now that we got you're concepts down let's actually create a variable. In your Programiz code, create a new variable for your name: `String my_name;`

Then, in our main method (It's that thing that starts with `public static void main(String[] args) {}`), type this: `my_name = "Krish";`

So what exactly makes up a variable. The structure of making a variable is very simple. First you put the data type (String in this case), then you put the name of the variable (my_name). 

**JAVA IS CAPS SENSITIVE SO DON'T PUT ANYTHING IN CAPS THATS NOT SUPPOSED TO BE IN CAPS**

#### Using Variables
We just created a variable called my_name and gave it a value, but how do we actually use that variable.

Well lets think about it, to display something out onto the console, we're going to use `System.out.println();`. Which will always be referenced as print statements. 

I would write this line `System.out.println("Hi my name is " + my_name);` This is called concatenation, where you "add" a variable to something else. Variables are used all over our code base, from calculations to datapoints that we log, variables are a key component of everything we do. To print a variable using a **print statement** concatenate the variable and whatever message you want to send, making sure the variable is outside the quotations. 


## Next Steps
Practice creating variables that define parts of you: Your age, your name, how tall you are (double values) and your favorite thing to eat. Create variables and print statements for these things in Programiz and show them to your lead programmer.

You are officially done with this section! **You may move on to Logic and Loops**
