---
sidebar_position: 4
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Basics 103: Classes, Constructors & Interfaces
In this section we'll learn about classes, a major part of all code, and constructors. This topic is a bit dense so read carefully and ask questions when needed.

## Classes

*What is a class?*

A class is a blueprint for an object. *What does this mean?* This means, a class defines the characteristics of something.

For example: What characteristics define the object of a dog. 
- Name
- Fur type (thick or thin)
- Color (light or dark)
- Size (big or small)
- Type of dog (maybe it's a dalmation)

These characteristics are all listed in a class.



How do we create a class. Well, we start with an access modifier, in this case `public`. Next we need the keyword `class`, followed by the name of your class. 
<Note>
Most classes start with public, we rarely have private classes in our code and they aren't really applicable
</Note>

```java
public class Dog {
    // characteristics
    private String fur_thickness;
    private String color;
    private String name;

    // some method here
    public void bark() {
        System.out.println(name +  " barked");
    }
}
```
:::note
remember `//` is used to note comments, which don't get run by the code
:::

Let's break this down:
- `public class Dog` is the class name, which is `Dog`
- `private String fur_thickness;` is a variable, with a data type of string. It represents a characteristic. Notice we don't assign any value to the variable, we do that later in something called the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>**constructor**</span>
- `public void bark() {}` is a method within the function, relating to what a dog does. These are action functions, and we don't have a return statement.

Now the main question is: *How does one create a new Dog?*

How do you create an object (instance) based off of the blueprint (class). Here's an example:

```java
public Dog rufus = new Dog();
```

Here's what each part means:
- `public` is an access modifier, meaning any file can access rufus
- `Dog` is the data type. Whatever class we want to create an object off, we use the class name as a data type
- `rufus` is the name of the dog
- `new Dog();` this essentially just means we're creating a new object.

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
Constructors are a bit of a complex topic. <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>A constructor is a *packager*</span> It assigns the characteristic's values and packages it all up. 

Here's an example:
- We define a Dog, and give it blank characteristics
- A constructor gives the dog specific qualities
- We call a new dog off that type, with the qualities that the constructor packaged

Remember this example:

```java
public Dog rufus = new Dog();
```

We said that `new Dog();` creates a new dog, but `Dog();` is actually the constructor being called.

<span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Think about this:</span> if `public Dog rufus` is a variable, and it's value is `new Dog();`, then you could assign the value of the variable later. It's something we do often.

Here's an example of a constructor

```java
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
<Note>
Notice how the constructor has the same name as the class, and looks like a method without the return type
</Note>

In the constructor we assign values for all of the specific characteristics we have. Sometimes we want them to be specific to each dog, so we make them parameters. Here's an example below:

```java
public class Dog {
    private String fur_thickness;
    private String color;
    private String name;

    public Dog(String thickness, String color, String name) {
        this.fur_thickness = thickness;
        this.color = color;
        this.name = name;
    }
}
```
Let's explain:
- `String thickness, String color, String name` are parameters, when you create a new Dog (object), you specify these qualities, and this constructor packages these values.

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

An interface is created like this: `public interface TurretIO {}`. 

Inside the interface, we would list required methods like this: `void randomMethod();`.


 To use an interface with a class we do this: `public class Turret implements TurretIO {}`. Then the class writes the actual code for each required method:
 
```java
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
When you want to access a class from another file, you need to **import it** Usually this happens from a dropdown autocomplete menu,
but you can also manually import it.


An example of an import would be `import org.steelhawks.util.LoggedTunableNumber`

Sometimes, there are multiple classes with the same name, so make sure you import the right thing!

## Next Steps
**You have now completed all Java Basics lessons**

Please move on to WPILIB Basics, where you'll learn to setup WPILIB and work on robot code
