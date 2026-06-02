---
sidebar_position: 3
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'


# Basics 103: Methods
These groups of topic are going to be broken up into two parts. In this part, we're going to be covering two <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**MAJOR**</span> code structures. These code structures are used constantly, so aim to be fluent at these.



## Methods
Methods, or functions, are <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>blocks of code that can be run anytime</span>  They can contain anything from if statements to lines of code that calculate angles.

Functions are useful because instead of writing 40 lines each time you want to do the same thing, you can write 40 lines one time and call the function instead (1 line to call a function)

*What does a function compose of?*

When creating a function, you need 3 (sometimes 4) things:
- access modifier: `public` or `private`. This either hides the function from other files, or allows other files to call the same function
- return type: `double`, `int` or any other data type. This means that the output of the function **MUST** be that said data type
- A name: Every function must have a name, and this is how we call the function
- **OPTIONAL** parameters: A parameter is essentially something that the function takes in. If a function does the same thing with multiple values, you add a parameter and enter whatever value you need as the parameter


Here is an example method:

```
public double agePlusValue(int age) {
    return age + 5.4;
}

```
Let's break down this function:
- `public` this is the access modifier. This means any other file can call this file
- `double` This is the return type. This means that the function must return a double
-  `agePlusValue` is the name of the function
- `int age` this is the parameter. it is a variable that's used within the function but isn't clearly defined or assigned a value. **Note all parameters go inside `()`**

To call a function: `agePlusValue(5)`

*Now what's in the function?*
In the function we have something called a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**return statement**</span> (the `return` keyword notes a return statement)

When a function has a return type, we need a return statement, and the return statement must return the data type.

#### No Return Type
some functions do something, but don't need to return anything, such as functions that do **actions** instead of **calculations**. These functions that do actions don't need a return type, so what do we put instead. 

We use the `void` keyword. So a function with <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**no return statement**</span> looks like this: `public void agePlusValue(int age)`

### Shorthand Functions
Sometimes, a function is only called once in the entire code, and we don't need a name or separate block of code for this function. This function is called a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**lambda function**</span>

A lambda function is created like this:

 ```
 () -> {
    System.out.println("Hello this is a lambda function");
 }
``` 
<Note>
See there isn't any return type in a lambda function, and all parameters go in `()`
</Note>


<span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**IMPORTANT**</span>: Almost all functions you see will be in a class, and within the Steel Hawks programming team we always write functions inside of classes.


<span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**HERE'S THE CHALLENGE:**</span> Everyone should know the quadratic formula, Create a function that takes **a, b, c** and outputs the **corresponding x values** for the zeroes of the equation.

Here's a resource to the formula: **[Quadratic Formula](https://en.wikipedia.org/wiki/Quadratic_formula)**

Some things you'll need to know and do:
- to square anything use `Math.pow(variable, number to be squared by)`
- to square root anything use `Math.sqrt(variable)`
- the part of the formula that is under the square root is called the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**discriminant**</span>
- the return type should be String. we want a statement that includes the two roots
- The new method should be static, so `public static String whateverFunctionName`
- The return statement should be `The roots are x1 and x2`

Assume that for this challenge the discriminant is greater than 0, so you'll get real values

<JavaRunner
  starterCode={`public class Main {
    public static void main(String[] args) {
        // call the quadratic function like shown below
        // System.out.println(quadratic(1, 0, 0)); this is just x^2

    }

    // create a new function here, and name it quadratic
}`}
/>

<details>
  <summary>💡 See the solution</summary>

 This is the function that should be called

```java
public static String quadratic(double a, double b, double c) {
    double b_squared = Math.pow(b, 2);
    double discriminant = Math.sqrt(b_squared - (4*a*c));

    double numerator1 = -b + discriminant;
    double numerator2 = -b - discriminant;

    double x1 = numerator1 / (2 * a);
    double x2 = numerator2 / (2 * a);

    String statement = "The roots are " + x1 + " and " + x2;
    return statement;

}
```

  After creating this function, call it in the main function by doing `System.out.println(quadratic(1, 0, 0));`
</details>

## Next Steps
This group of topics is too big for one lesson, so we've split it into 3. In the next section, we'll talk about **Classes & Constructors**.

<span style={{color: '#8f0f0f', fontWeight: 'bold', fontSize: '30px'}}>**You may move on to the next section!**</span>