---
sidebar_position: 3
---

import Quiz from '@site/src/components/Quiz.jsx'


# Basics 103: Methods, Classes, Constructors & Interfaces

In this section we are going to dive deep into a lot of complex topics, so be prepared to cry a bit :). First, we're going to dive into methods.

## Methods
Methods, or functions, are blocks of code that can be run at anytime. They can contain anything from if statements to lines of code that calculate angles. Functions are useful because instead of writing 40 lines each time you want to do the same thing, you can write 40 lines one time and call the function instead. 

So how do we create a function. First, you need something called an access modifier. An access modifier is something that makes a function public or private. With a private function, you cannot access it outside the file, but a public function can be accessed anywhere. So first you need an access modifier, in this case we'll go with `public`. Next we need a data type. For now we'll go with `double`. This means that our function has to have a `return` statement, and it has to be a double that is returned. If your function doesn't return anything, put `void`. This means that your function isn't returning one of the data types and is doing something else.


Here is an example method:

```
public double agePlusValue(int age) {
    return age + 5.4;
}

System.out.println(agePlusValue(5));
```

In this example, we have `public`, our access modifier. Then we have `double`, our return data type. Inside the parenthesis, we have something called a `parameter`. A parameter is something you input when calling a function, and you manipulate parameters inside the function. Parameters are useful because sometimes the value you are returning will change based on the context of where the function is called. We use parameters a lot in our code.

**Best Practice** Use parameters until you get to the last instance of your function (e.i. using the same parameter throughout functions until you really have to put a value)

<Quiz questions={[
{
prompt: "What happens if you define a method with the 'void' keyword?",
options: [
"The method must return a decimal number",
"The method will run but does not send a value back to where it was called",
"The method is private and cannot be seen by other files",
"The method is empty and contains no code"
],
correct: 1,
explanation: "The 'void' keyword specifically tells Java that the method performs an action but does not provide a return value."
},
{
prompt: "Which part of the method signature allows you to pass external data into the function to be manipulated?",
options: [
"The Access Modifier",
"The Return Type",
"The Parameter",
"The Method Name"
],
correct: 2,
explanation: "Parameters act as inputs for a method, allowing it to use different data each time it is called."
},
{
prompt: "If a method is labeled as 'private', where can it be accessed?",
options: [
"Anywhere in the entire project",
"Only within the same file (class) where it was defined",
"Only inside other methods that are public",
"It cannot be accessed at all"
],
correct: 1,
explanation: "Private access modifiers restrict the method's use to the specific file it lives in, keeping the logic hidden from the rest of the program."
}
]} />


## Classes
A class, is a blueprint for an object. For example. What characteristics define the object of a dog. A dog has either thick fur or thin fur. This is an example of what would be in the Dog class. Another one could be color of the dog, size of the dog, etc. These characteristics would go inside of a Class. A class also has methods, which we discussed earlier, and a constructor, which we'll discuss next.

How do we create a class. Well, we start with an access modifier, in this case `public`. Next we need the keyword `class`, followed by the name of your class.

```
public class Dog {
    private String fur_thickness;
    private String color;
    private String name;

    public void bark() {
        System.out.println(name +  " barked");
    }
}
```

The way we structure our classes is we define the characteristics of a class outside of the constructor, and assign values inside the constructor. This method of creating characteristics makes code much more readable. 

We also included a method, which took the characteristic of name and used it in our method.

How do you call a class? well you start by creating a variable, but the data type get's replaced with the name of your class. This is called an object. For example, we have the class (blueprint) for an object, then we create an instance of it by following the process mentioned before, and you now have a "phyiscal" instance of that object. For example: `private Dog mark`

<Quiz questions={[
{
prompt: "If a 'Class' is a blueprint for a Dog, what is the actual, living dog you create in your code called?",
options: [
"A Method",
"An Access Modifier",
"An Object (or Instance)",
"A Constructor"
],
correct: 2,
explanation: "While the class defines what a Dog is, the 'Object' is the actual individual dog (like 'Fido') that exists in the computer's memory."
},
{
prompt: "Why do we define characteristics like 'fur_thickness' and 'name' inside the class but outside of any specific method?",
options: [
"So that all methods in the class can see and use those variables",
"Because Java doesn't allow variables inside methods",
"To make the code run faster",
"Because names must always be private"
],
correct: 0,
explanation: "Variables defined at the class level (fields) represent the state of the object and are accessible to all methods within that class, such as your bark() method."
},
{
prompt: "In the provided Dog class, which keyword tells Java that we are defining a new blueprint rather than a method or a variable?",
options: [
"public",
"class",
"void",
"String"
],
correct: 1,
explanation: "The 'class' keyword is the specific identifier used to declare a new class in Java."
}
]} />

## Constructors
Constructors are a way of declaring that instance that you created. So going back to the dog named mark example, the `public Dog mark` line would be continued by `public Dog mark = new Dog();`. The `new Dog();` is references a constructor. The constructor acts like a package for the class, if the blueprint is the class itself, the constructor is the construction company we call to make the object.

how do we create a constructor:

```
public class Dog {
    private String fur_thickness;
    private String color;
    private String name;

    // constructor here:
    public Dog() {
        fur_thickness = "thick";
        color = "brown";
        name = "hi";
    }
}
```
> the double backslash // is for comments, comments are things you can write but do not get picked up by the code at all.

The constructor takes the blueprint we made and starts to literally build it, before presenting the finished object (instance) when we call it. This is the basics of how we create files in java. Each file contains one class, or a class within a class, and we call those classes in order to reach the methods inside each class. 

<Quiz questions={[
{
prompt: "What is the primary purpose of a constructor in a Java class?",
options: [
"To define the access level (public/private) of the file",
"To initialize the object's state (assign starting values to variables)",
"To delete an object from memory once the program is finished",
"To prevent other classes from seeing the internal methods"
],
correct: 1,
explanation: "The constructor's main job is to set up the object's initial data so it is ready for use the moment it is created."
},
{
prompt: "How can you recognize a constructor in a Java class?",
options: [
"It always starts with the keyword 'new'",
"It must have the exact same name as the Class and no return type",
"It is always named 'init'",
"It must be the very first line of code in the file"
],
correct: 1,
explanation: "In Java, a constructor must match the class name exactly (e.g., public Dog()) and does not use 'void' or any other return type."
},
{
prompt: "In the line 'Dog myDog = new Dog();', which part specifically triggers the constructor?",
options: [
"Dog myDog",
"=",
"new Dog()",
"public class"
],
correct: 2,
explanation: "The 'new' keyword combined with the constructor name is what actually tells Java to allocate memory and run the construction code."
}
]} />


## Interfaces
Think of an Interface as a contract or a standardized plug.

Imagine you are a manufacturer of wall clocks. You don’t care if the clock is shaped like a cat, made of wood, or digital—you just need to make sure that whatever battery the customer puts in fits the slot and provides power.

In this scenario, the "Battery" is the Interface. It defines a set of rules:

It must be a certain size.

It must have a positive and negative end.

It must provide electricity.

Any battery (Duracell, Energizer, or a generic brand) can work in your clock as long as it "implements" those battery rules.

In Programming Terms
An interface tells a Class what to do, but not how to do it. It’s a list of empty methods that a class must fill in if it wants to follow that standard. We not only use interfaces for empty methods, but also use it for data we want to keep track of.

an interface is created like this: `public interface TurretIO {}`, and inside the empty methods would be created like this: `default void randomMethod() {}`. When using an interface with a class, we want to keep track of variables (characteristics) inside of the interface, then use the empty methods to do something. To use an interface within a class we do this: `public class Turret implements TurretIO {}` Then we say this for each of the methods:

```
@Override
public void randomMethod() {
    // do this, do that
}
```
The @Override tag allows us to use that method and change what it does.

<Quiz questions={[
{
prompt: "Which of these best describes an Interface?",
options: [
"A blueprint that fully builds an object",
"A contract that lists actions a class must perform",
"A private variable that stores data",
"A method that only works for Dog classes"
],
correct: 1,
explanation: "An interface defines the 'what' (the actions) but leaves the 'how' (the logic) up to the specific class that implements it."
},
{
prompt: "If a class 'implements' an interface but doesn't write the code for one of the required methods, what happens?",
options: [
"Java will write the code for you automatically",
"The program will run but skip that method",
"The code will fail to compile (it will show an error)",
"The method becomes private"
],
correct: 2,
explanation: "A contract is a promise. If a class says it implements an interface, it MUST provide the code for every method listed in that interface, or the code won't build."
},
{
prompt: "Which keyword is used in Java to connect a Class to an Interface?",
options: [
"extends",
"constructor",
"implements",
"void"
],
correct: 2,
explanation: "We use the 'implements' keyword to tell Java that a class is going to follow the rules of a specific interface."
}
]} />


Practice creating characteristics of a Turret class and implementing interfaces with random methods.


## Imports
When you want to access a class from another file, you need to import it. Usually this happens from a dropdown autocomplete menu,
but you can also manually import it. Imports are important for sharing classes between files. An example of an import would be `import org.steelhawks.util.LoggedTunableNumber`
You don't have to manually import most things unless the dropdown menu doesn't detect it, in which case you might have a syntax problem.

Sometimes, there are multiple classes with the same name, so make sure you import the right thing!



**Once you are done, you have officially completed the basic Java section. CONGRATULATIONS!!!! You now know the very basics of java needed to help you start your robotic programming journey. Be warned, this is just the beginning, if you found any ideas difficult talk to a lead programmer to help you better understand everything. If you are confident in your skills, you may now move onto You may now move on to WPILIB Basics, which includes getting set up, hardware, and some basic programming concepts.**