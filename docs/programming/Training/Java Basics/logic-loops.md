---
sidebar_position: 2
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'


# Basics 102 Logic & Loops
Now that you know about variables and print statements, it's time to learn some logic! Let's define what logic is first.

## What is Logic
Logic is when to do something and what to do. **Logical Statements** evaluate a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>condition:</span> is it raining today, and perform <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>an action:</span> bring an umbrella. These kinds of statements help to check certain scenarios in code, and produce a result.

<Quiz questions={[
  {
    prompt: "Which is an example of logic based thought process?",
    options: ["System.out.println(Wassup)", "if the turret is rotated 90 degrees, run the shooter", "double my_age = 32.4", "String hello = This is correct"],
    correct: 1,
    explanation: "B, The only thing close to some form of logic (if statements) is the second option"
  },
]} />


## Comparative Operators
Within logical statements, we evaulate if a condition is true based on comparative operators. This means we check whether something is equal to something else, greater than, less than, and many others.

Here are the operators:
- `==` This simply evaulates whether something is equal to something else
- `!=` This evaulates whether something is **NOT** equal to something else
- `>` and `<` Evaulates whether something is greater than/less than something else
- `≥` and `≤` checks if something is equal to or greater than/equal to or less than something else
- `||` This is the or operator. If  **EITHER** this condition is true **OR** this condition is true then run the action
- `&&` This is the and operator. If **BOTH** this condition is true **AND** this condition is true then run the action



## Types of Logical Statements

In this section you will learn about 2 types of logical statements:
- if statements
- switch cases

These are the most common you'll encounter throughout our code.

### If Statements
An if statement works like this: 

If something is true, perform this action. Seems simple enough right?

Here's how we create an if statement:

```java
int age = 3;
if (age == 5) {
  System.out.println("So old");
} else if (age == 3) {
  System.out.println("WOW");
} else {
  System.out.println("You're not cool");
}
```

Let's break this down:
- `age` is a variable we are evaluating
- `if` is the keyword to symbolize an if statement
- `(age == 5)` is the condition, it checks if age is equal to 5.
- `System.out.println("So old);` is the action. If the condition is true then this gets run
- `else if (age == 3)` is the secondary condition, if the first one is wrong, `else if` checks the second condition and evualtes it.
- `else` This is the fallback. If all conditions are false, anything other condition returns the default output.
<Note>
The double equal sign: `==` is used to check conditions, and is different from assigning values to variables: `=`
</Note>

In This scenario, we go through each statement and evaulate it in the same if block, and this way we don't need 2 separate if statements, and we don't need nested if statements. 

 <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Here's the challenge:</span>

 Create you're own if statement that acts like a bouncer at a club, if you're older than 18, print "permission granted", if not, print "Too young", if anything else, print "Not applicable"

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        // Your code here
        // Produce an if statement given the task above, make sure to include a variable for age

    }
}`}
/>


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

But, what if you have many values that you are comparing one value to, then you don't want a whole list of unreadable if statements. That's where switch statements come in.




### Switch Statements

Think of a switch statement as a more organized way to handle a long list of "if-else" conditions. Imagine you are at a vending machine. You press a button (the input), and the machine looks for the specific snack that matches that button.

How it works
Instead of asking "Is it A? No? Is it B? No? Is it C?" repeatedly, a switch statement takes a single value and jumps straight to the "case" that matches it.

**Switch**: This is the variable you are checking (e.g., the button you pressed).

**Case**: These are the possible options (e.g., A1, B2, C3).

**Break**: This tells the code to stop and "exit" the switch once it finds a match. Without it, the code would keep running into the next case!

**Default**: This is the "fallback" option, like a message saying "Invalid Selection" if you press a button that doesn't exist.

An example would be:

```java
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

The output would be 2 in this case (no pun intended)

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

Now we're going to move away from logical statement and move towards another topic: <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Loops</span>

There are two types of loops we'll learn about:;
-  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>For Loops</span> These are loops that go until a condition is met, and have a continually increasing/decreasing counter
-  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>While Loops</span> These are loops that can go forever, or until a condition is met

Let's start with For Loops


### For Loops

Think of a for loop as a way to complete a task you want to repeat a specific number of times. If you wanted to get all the item inside an  <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Array</span> you would use a **FOR LOOP**


#### The 3 Parts of a For Loop
To make the loop work, you need to tell Java 3 things inside the parentheses:

- Initialization: Where do we start? (e.g., Start at count 1).

- Condition: When do we stop? (e.g., Keep going as long as the count is 10 or less).

- Update: How do we change the count each time? (e.g., Add 1 to the count).

<Note>
The condition usually involves the counter and another item, you will almost never see a condition without the counter
</Note>

Here is an example:
```java
for (int i = 1; i <= 5; i++) {
    System.out.println("Iteration number: " + i);
}
```

In this example:
- `(int i = 1; i <= 5; i++)` is the condition. It contains the counter: `i`, the condition: `i <= 5`, and the update: `i++`
- `System.out.println("Iteration number: " + i);` runs every iteration. Essentially: the code will run once, then update, then run again. This loop continues until the condition is false.

*Why do we have the counter in the condition?*

This helps to break the loop, once the counter passes the item being compared, the loop will end

<Note>
Note the use of semicolons within the for loop, all three parts of the loop have a semicolon after them
</Note>


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
A while loop is like a "repeat until" command. If a for loop is a robot that runs a specific number of laps, a while loop is a robot that keeps scrubbing the floor until the floor is clean.

How it works:

- The computer checks the condition before running the code.

- Check the condition: Is it true?

- Run the code: If yes, do the task inside the braces.

- Repeat: Go back to step 1.


```java
int batteryLevel = 3;

while (batteryLevel > 0) {
    System.out.println("Phone is on. Battery: " + batteryLevel + "%");    
    break; 
}
```
In this example:
- `(batteryLevel > 0)` is the condition. Since we're never modifying battery level this condition is always true
- `System.out.println("Phone is on. Battery: " + batteryLevel + "%");` is what runs after every loop. It's the action
- `break;` This stops the loop after one action. If the `break` wasn't there, this loop would be infinite.

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