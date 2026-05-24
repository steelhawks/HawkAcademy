---
sidebar_position: 1
---

import Quiz from '@site/src/components/Quiz.jsx'

# Basics 101 of Java
Now we start learning a new programming language. The first step is to learn how to go to an IDE, Then we'll learn how to print out statements, and much more! This is where programming will start to get hard, this is where most people quit, but this is also the start of success if you're willing to persevere. 


## Opening an IDE

First, what is an IDE. An Integrated Development Environment is essentially any place where you can code. It could be a desktop application you install, or website online where you code. You'll learn how to setup an IDE and all our tools later, but just know that we use 2 different IDE's, either Visual Studio Code or IntelliJ. Either one works well with java code, but IntelliJ is built for Java development. 

For this lesson, we're going to use the Programiz Java Editor online instead of a desktop IDE. This will help get you familiarized with coding before all the setup. Open [Programiz](https://www.programiz.com/java-programming/online-compiler/) and you should see something like the image below. If you already have it open, you can move on to the next step.

You don't need to create folders or robot classes yet. Programiz gives you a file to work in already, which is perfect for learning the basics first.

![Alt text](@site/static/img/programiz.png)
## Programming Time!
Now we start actually programming stuff such as print statements and variables.

So let's begin. 

### Print Statements

After opening the Programiz Java editor, you'll see some starter code, let's break it down!

The first line is `class Main`, you'll learn about classes later, but for now think of it like the container where you hold all of your file contents. we define a class by typing `class`, and then the name of the class. In this case, it's called Main. The next line is `public static void main(String[] args)`.  This is how we create a method, which you'll also learn later. For now, think of it like the place all your code runs from, if no code is referenced there then no code get's run.


#### Running Your Code
So, now let's run some code! You'll see a line that says something like `System.out.println("Something here");` This is how we display things to a user through pure text. Click the big purple run button in Programiz and see the result, the inside the quotations write whatever you want. Any text that you want to say must be in quotation marks, otherwise there'll be an error `System.out.println(Hello);` isn't correct because there aren't any quotation marks. `System.out.println("Hello Steel Hawks");` is correct. 

![Alt text](@site/static/img/basicscompletecode.png)

That's it! You have written your first program. So what specifically does this do. The semicolon indicates an end to that line. After writing any line of code (with a few exceptions), you must put a semicolon.  The console is where these print statements (what you just did) and error messages get shown. 

 When you want to edit that message, just go back to the code and write whatever you want. Or make multiple print statements. Try it out! If you have any questions, please ask a lead programmer.


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
