---
sidebar_position: 2
---

import Quiz from '@site/src/components/Quiz.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'


# Basics 102 Logic & Loops
Now that you know about variables and print statements, it's time to learn some logic. With logical conditions you can control when and why things happen, which help when programming something complex.

## Logic
Within this idea of logic, we have two main ways of creating logic. The first is an if statement, which is basically if condition is true then run some code. A switch statement is a little more complex. A switch statement works off of a state, in which something can be this or that, and based on what state it's in a specific block of code will run.

<Quiz questions={[
  {
    prompt: "Which is an example of logic based thought process?",
    options: ["System.out.println(Wassup)", "if the turret is rotated 90 degrees, run the shooter", "double my_age = 32.4", "String hello = This is correct"],
    correct: 1,
    explanation: "B, The only thing close to some form of logic (if statements) is the second option"
  },
]} />

### If Statements
an if statement is constructed like this:

```
int age = 5;
if (age == 5) {
  System.out.println("It worked");
} else {
  System.out.println("It didn't work");
}
```

Let's break it down. First, inside the parenthesis we have a statement that has to be equal to true for the code to run. In this example, we state that age == 5 inside the parenthesis. The computer then evaulates that statement, and returns a true or false. **Double equal signs means debating whether a statement is true or false!!!** Now, if this statement was false, it would default back to the else statement. You can also modify the else statement. for instance:


```
int age = 3;
if (age == 5) {
  System.out.println("So old");
} else if (age == 3) {
  System.out.println("WOW");
} else {
  System.out.println("You're not cool");
}
```

In This scenario, we go through each statement and evaulate it in the same if block, and this way we don't need 2 separate if statements, and we don't need nested if statements. 

But, what if you have many values that you are comparing one value to, then you don't want a whole list of unreadable if statements. That's where switch statements come in.

<Quiz questions={[
  {
    prompt: "In an 'if statement', what determines whether the code inside the curly braces actually runs?",
    options: ["Whether the condition inside the parentheses is true", "How many lines of code are written", "If there is a semicolon at the end of the line", "The name of the variable"],
    correct: 0,
    explanation: "An if statement only executes its code block if the boolean condition evaluates to true."
  },
  {
    "prompt": "Which of the following scenarios best represents the logic of an 'if statement' in real life?",
    "options": [
      "Reading every page of a book from start to finish", 
      "Only bringing an umbrella if the weather forecast predicts rain", 
      "Pressing a button on a vending machine to get a specific snack", 
      "Setting an alarm to go off at the same time every single morning"
    ],
    "correct": 1,
    "explanation": "An 'if statement' represents conditional logic where an action is only taken if a specific requirement (the condition) is met."
  },
  {
    "prompt": "In the code 'if (score > 50) { pass = true; }', what is the 'condition' being checked?",
    "options": [
      "pass = true", 
      "50", 
      "score > 50", 
      "pass"
    ],
    "correct": 2,
    "explanation": "The condition is the expression inside the parentheses that must evaluate to true or false for the code block to execute."
  }
]}
 />


### Switch Statements

Think of a switch statement as a more organized way to handle a long list of "if-else" conditions. Imagine you are at a vending machine. You press a button (the input), and the machine looks for the specific snack that matches that button.

How it works
Instead of asking "Is it A? No? Is it B? No? Is it C?" repeatedly, a switch statement takes a single value and jumps straight to the "case" that matches it.

**Switch**: This is the variable you are checking (e.g., the button you pressed).

**Case**: These are the possible options (e.g., A1, B2, C3).

**Break**: This tells the code to stop and "exit" the switch once it finds a match. Without it, the code would keep running into the next case!

**Default**: This is the "fallback" option, like a message saying "Invalid Selection" if you press a button that doesn't exist.

An example would be:

```
int month = 2;
String monthName;

switch (month) {
    case 1:
        monthName = "January";
        break;
    case 2:
        monthName = "February";
        break;
    case 3:
        monthName = "March";
        break;
    default:
        monthName = "Invalid month";
        break;
}

System.out.println(monthName);
```

Where the output would be February because month = 2.

<Quiz questions={[
  {
  prompt: "What happens if you forget to put a 'break' statement at the end of a case in Java?",
  options: [
  "The program will crash with a syntax error",
  "The switch statement will restart from the beginning",
  "The code will 'fall through' and execute the next case's code",
  "The default case will run immediately"
  ],
  correct: 2,
  explanation: "Without a break, Java continues executing the code in the following cases until it hits a break or the end of the switch block."
  },
  {
  prompt: "Which of these data types is NOT allowed as a switch expression in Java?",
  options: ["int", "String", "double", "char"],
  correct: 2,
  explanation: "Java switch statements work with byte, short, char, int, Enums, and Strings. Floating-point numbers like double and float are not supported."
  },
  {
  prompt: "What is the purpose of the 'default' case in a switch statement?",
  options: [
  "It is the first code that runs when the switch starts",
  "It acts as a fallback if none of the specific cases match",
  "It is required by Java and the code won't compile without it",
  "It handles all true/false logic"
  ],
  correct: 1,
  explanation: "The default case is optional and executes only if none of the defined 'case' values match the input variable."
  }
]} />


## Loops

Next up, we have loops. We now step away from if..then.. blocks and move towards blocks of code that loop, either continually until a condition is met, or until it goes through every part of a set.


### For Loops

Think of a `for` loop as a way to automate a task you want to repeat a specific number of times. If you were told to write "I will not talk in class" 100 times on a chalkboard, a for loop is the robot you'd build to do it for you.

The Three Parts of a for Loop
To make the loop work, you need to tell Java three things inside the parentheses:

Initialization: Where do we start? (e.g., Start at count 1).

Condition: When do we stop? (e.g., Keep going as long as the count is 10 or less).

Update: How do we change the count each time? (e.g., Add 1 to the count).

Here is an example:
```
for (int i = 1; i <= 5; i++) {
    System.out.println("Iteration number: " + i);
}
```

We can clearly see that we have a counter that runs through 5 times and constantly updates. In our real code, we use this for vision and loop through targets. Numbers, lists, and combinations of items are all things that we use for loops for!.

<Quiz questions={[
{
prompt: "What is the primary purpose of the 'Update' expression (like i++) in a for loop?",
options: [
"To define the starting value of the loop",
"To make sure the condition eventually becomes false so the loop stops",
"To tell the computer which variable to print",
"To skip the next iteration of the loop"
],
correct: 1,
explanation: "The update expression changes the loop variable. Without it, the variable would never change, and you would likely end up with an 'infinite loop'."
},
{
prompt: "How many times will the code inside this loop run? \nfor (int i = 0; i < 3; i++) { ... }",
options: ["2 times", "3 times", "4 times", "Infinite times"],
correct: 1,
explanation: "The loop runs for i = 0, i = 1, and i = 2. When i becomes 3, the condition '3 < 3' is false, so it stops."
},
{
prompt: "Which part of the for loop is executed only ONCE?",
options: [
"The Condition",
"The Update",
"The Initialization",
"The Body (code inside curly braces)"
],
correct: 2,
explanation: "The initialization (e.g., int i = 0) happens only at the very beginning when the loop first starts."
}
]} />

Next up we have While Loops, which are a bit simpler to understand.

### While Loops
A while loop is like a "repeat until" command. If a for loop is a robot that runs a specific number of laps, a while loop is a robot that keeps scrubbing the floor until the floor is clean. You don't necessarily know how many "scrubs" it will take; you just know it needs to keep going as long as the condition is true.

How it works
The computer checks the condition before running the code.

Check the condition: Is it true?

Run the code: If yes, do the task inside the braces.

Repeat: Go back to step 1.
```
int batteryLevel = 3;

while (batteryLevel > 0) {
    System.out.println("Phone is on. Battery: " + batteryLevel + "%");    
    batteryLevel--; 
}

System.out.println("Phone shut down.");
```

You can also remove the `batteryLevel--`and the loop will run forever.

<Quiz questions={[
{
prompt: "What happens if the condition in a while loop is FALSE the very first time it is checked?",
options: [
"The code inside the loop runs exactly once",
"The program crashes",
"The code inside the loop never runs at all",
"The loop runs forever"
],
correct: 2,
explanation: "Because the condition is checked at the top, if it's false initially, the computer skips the loop entirely."
},
{
prompt: "Which of the following is the biggest risk when writing a while loop?",
options: [
"Using too much memory for variables",
"Creating an 'infinite loop' if the condition never becomes false",
"The loop running too fast for the CPU",
"Java only allows 10 iterations per while loop"
],
correct: 1,
explanation: "If you forget to update the variable (like forgetting batteryLevel--), the condition stays true forever, causing the program to hang."
},
{
prompt: "When is a 'while' loop usually preferred over a 'for' loop?",
options: [
"When you want the code to be faster",
"When you know exactly how many times to repeat (e.g., 10 times)",
"When you don't know in advance how many times the loop needs to run",
"When you are only working with String variables"
],
correct: 2,
explanation: "While loops are great for situations where the end depends on a dynamic condition (like waiting for a user to type 'exit') rather than a fixed count."
}
]} />


## Next Steps

If you understand everything, we have a slightly difficult question for you. Use what you've learned so far to solve this problem:

We are trying to find the **sum of a geometric series** where each term is **3× the previous term**, the first term is **2**, and there are **12 terms total**.

**Hint:** You'll need a loop and a running total. Think about how the term changes each iteration.

**Hint:** If you do not know what a Geometric Series is you may find this [resource](https://mathbitsnotebook.com/Algebra2/Sequences/SSGeometric.html) helpful.

When your code is correct, the output should be a single line: `Sum: 531440`

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        // Your code here
        // Print a single line in the format: Sum: <number>

    }
}`}
  expectedOutput="Sum: 531440"
/>

<details>
  <summary>💡 See the solution</summary>

  This is a **geometric series** — first term `2`, ratio `3`, 12 terms. A `for` loop that multiplies by 3 each iteration works perfectly:

```java
int term = 2;
int last = 12;
int sum = 0;

for (int i = 1; i <= last; i++) {
    sum += term;
    term *= 3;
}

System.out.println("Sum: " + sum);
```

  Each iteration adds the current term to the running total, then triples it. After 12 terms the sum is **531440**.
</details>

This problem and others like it are just simple examples of how much math and science translate into programming, so if you love those subjects you're in the right place!


**You are done with this section and may move on to the next!**