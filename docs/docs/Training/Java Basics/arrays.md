---
sidebar_position: 2
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'


# Lists
This topic is so big it couldn't fit into Basics 101! In this topic, we'll cover three specific things:
- Arrays
- ArrayLists
- Methods Associated 

## Arrays
An array is a specific type of <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Variable</span>, and used like a list.

Arrays (lists) are a special type of data that is widely used throughout programming. Here's what it can do
- Store information like a list
- have a **fixed size** (can't add or remove things)
- you can access each specific item in that array from a **index**


**Example**: A grocery list is an example of an array of strings. Yep, that's right, all arrays have a data type as well! Below is an example of how we would construct a normal variable and an array

```
String name = "Steel Hawks"; // normal variable
String[] grocery_items = {"Banana", "Milk", "Bread", "Bulgogi Beef"}; // array
```
<Note>
// is used to represent a single line comment, anything you write as a comment isn't looked at when you click run, and you can type whatever you want in there. For multiline comments, use /* */
</Note>

### Multi-Dimensional Arrays
This might be a bit hard to visualize, so ask a lead programmer to help you if you need it.

**What is a multi dimensional array?*

Put simply a multi dimensional array is <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>An array within an array</span>. It's essentially a list within a list, and can be used for many purposes. Here's an example below:

```
double[][] random = {
  {0, 1, 2},
  {3, 2, 4},
  {5, 3, 2},
  {4, 3, 2}
};
```

## ArrayLists
An arraylist is the exact same thing as an array, except it doesn't have a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>fixed size</span>.