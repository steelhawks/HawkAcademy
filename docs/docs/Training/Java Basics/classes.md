---
sidebar_position: 4
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Basics 103: Classes & Constructors

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
Constructors are what we run when you create a new object from a class. For example, when you create a new dog from the `Dog` class above, a constructor runs to actually "create" that dog. A code example is provided below:

```
Dog rufus = new Dog();
```
In this example we create a variable with name of `rufus`, data type of `Dog` and we set it equal to `new Dog();`. this just means it's running the constructor for a new object.

**IMPORTANT**: `Dog();` is the constructor, not the entire line.

**ANOTHER WAY**

```
Dog rufus;

/* inside the constructor code */
rufus = new Dog();
```
> /* */ are comments, comments are things you can write but do not get picked up by the code at all

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
> the double backslash // is also for comments

In this example, we label each property of the dog in the constructor, and we learned that the constructor gets run when a new object is created, so it creates a dog with those properties.

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
An interface tells a class what it must be able to do, but not how it should do it. Think of it like a checklist of required methods. Any class that implements that interface must write code for those methods.

An interface is created like this: `public interface TurretIO {}`. Inside the interface, we would list required methods like this: `void randomMethod();`. To use an interface with a class we do this: `public class Turret implements TurretIO {}`. Then the class writes the actual code for each required method:
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



**Once you are done, you have officially completed the basic Java section. CONGRATULATIONS!!!! You now know the very basics of java needed to help you start your robotic programming journey. Be warned, this is just the beginning, if you found any ideas difficult talk to a lead programmer to help you better understand everything. If you are confident in your skills, you may now move onto WPILIB Basics, which includes getting set up, hardware, and some basic programming concepts.**
