---
sidebar_position: 2
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'


# Lists
Welcome to one of the most important lessons in the Java Basics section. In this topic, we'll cover three specific things:
- Arrays
- ArrayLists
- Methods Associated 

Lists are extremely useful in all applications of computer science and programming, not just robotics. Lists are very useful in algorithms and for keeping track of numerous amounts of information all at once.

## Arrays
An array is a specific type of <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Variable</span>, and used like a list.

Arrays (lists) are a special type of data that is widely used throughout programming. Here's what it can do
- Store information like a list
- have a **fixed size** (can't add or remove things)
- you can access each specific item in that array from a **index**


**Example**: A grocery list is an example of an array of strings. Yep, that's right, all arrays have a data type as well! Below is an example of how we would construct a normal variable and an array:

```java
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

```java
double[][] random = {
  {0, 1, 2},
  {3, 2, 4},
  {5, 3, 2},
  {4, 3, 2}
};
```

## ArrayLists
An arraylist is the exact same thing as an array, except it doesn't have a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>fixed size</span>.

### Constructing ArrayLists
To create an arraylist, we do something a little different:

```java
ArrayList<String> groceryItems = new ArrayList<>();

groceryItems.add("Bread");
groceryItems.add("Milk");
```
<Note>
When using the .add() feature, it'll add each item to the **end** of the list.
</Note>

In this example we created an arraylist of the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>String</span> data type, intially this list was empty. We then added two items, and we could add more. This means that we don't have a set unchangable amount of items, unlike arrays.

You don't just have to create empty arraylists. To create an arraylist that has some items to start, we can do this:


```java
ArrayList<String> groceryItems = new ArrayList<>(Arrays.asList("Bread", "Milk", "Avocado"));

groceryItems.add("Sugar");
```

Let's break down each part of both lines:
- `ArrayList<String>` - This is the type of variable, we're basically saying create an Arraylist of data type string
- `groceryItems` - This is the name of the variable that holds the list
- `new ArrayList<>()` - This is what actually creates an arraylist. It's called the <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Constructor</span>. Don't worry about it too much right now, but this is the actual list.
- `Arrays.asList()` - This makes sure all the intial items are in the correct form for arraylists. Usually you'll be creating empty arraylists so don't worry too much about this either. 

### Accessing Elements

Each item in both an array and arraylist can be accessed by an index. An index is simply a pointer to a certain object.

Here's how it works:
- Each element has an index, starting from 0. This means the first item's index is 0, the second item's index is 1, and so on...
- Elements are accessed with `[]`. If you wanted to access the second element (index of 1), then you would do `groceryItems[1]`.
- Indexes can't be changed, but items at indexes can be modified, as you'll learn about in Methods of arrays and arraylists

## Methods
Arrays and arraylists have many methods that you can use to add, remove, and sort them. Here, we'll list out the most common methods and what they do.

### Arrays

| Method | Code | What It Does |
|------|------|------------|
| Modification | `groceryItems[0] = "Milk";` | Accesses the `x` element of the list and modifies it |
| Length | `int size = groceryItems.length;` | Retrieves the number of elements in a list (length of list) | 
| Sort | `Arrays.sort(groceryItems);` | Sorts the array by least to greatest |
| Stringification | `Arrays.toString(groceryItems)` | Simply prints out the text of an array: "[1, 2, 3]" |
| Copying | `Arrays.copy(groceryItems, newLength)` | Copies the array but creates a new **fixed** length |

These are the most common basic ones you'll use for all uses of Arrays.

### ArrayLists

| Method | Code | What It Does |
|------|------|------------|
| Add | `groceryItems.add("Bread");` | Adds an item to the end of a list. You can add items to a specific index by `groceryItems.add("Bread", 3)`, where `3` is the index |
| Remove | `groceryItems.remove("Bread");` or `groceryItems.remove(3);` | Removes an item by name (first occurence of object) **OR** by index | 
| Clear | `groceryItems.clear();` | Clears all items in the array |
| Getting & Setting | `groceryItems.get(1)` & `groceryItems.set(1, "Milk");` | Gets an item based of off index, and sets an item based off of index, then item that will be modified |
| Size | `int size = groceryItems.size();` | Gets the size (number of items) in the arraylist |
| Contains | `groceryItems.contains("Bread");` | Checks to see if item exists within arrayList or not |

Now that you know these methods, go to programiz, create a list and practice manipulating it by trying out all of these methods. Remember, your code will only run if it's in the main function. If you forgot what that was, review <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Basics 101</span> again.

## Quiz
<Quiz questions={[
{
prompt: "What is the primary operational difference between a standard Java array and an ArrayList?",
options: [
"Arrays can only store numbers, while ArrayLists can only store Strings",
"Arrays have a fixed size that cannot change, while ArrayLists can dynamically grow or shrink",
"Arrays can be multi-dimensional, but ArrayLists cannot store multiple elements",
"Arrays start their indexing at 1, while ArrayLists start their indexing at 0"
],
correct: 1,
explanation: "Standard arrays are created with a fixed size that cannot be altered, whereas an ArrayList allows you to add or remove elements on the fly."
},
{
prompt: "If you have an array or ArrayList with 4 elements, what is the index number of the very first element?",
options: [
"1",
"0",
"-1",
"4"
],
correct: 1,
explanation: "In Java programming, list indices are zero-based, meaning the first element is always located at index 0."
},
{
prompt: "Which code snippet correctly demonstrates how to create a multi-dimensional array of doubles?",
options: [
"double random = {0, 1, 2};",
"double[] random = {0, 1, 2};",
"double[][] random = {{0, 1}, {2, 3}};",
"ArrayList<double> random = new ArrayList<>();"
],
correct: 2,
explanation: "Multi-dimensional arrays use multiple sets of square brackets (e.g., double[][]) to represent an array within an array."
},
{
prompt: "When you use the '.add(\"Bread\")' method on an empty ArrayList, where is the new item placed?",
options: [
"At the beginning of the list (index 0)",
"At a random index determined by Java",
"At the end of the list",
"It replaces the constructor definition"
],
correct: 2,
explanation: "By default, calling the .add() method with a single argument appends that item directly to the end of the ArrayList."
},
{
prompt: "How do you find out how many elements are currently inside a standard array versus an ArrayList?",
options: [
"Use '.length' for an array, and '.size()' for an ArrayList",
"Use '.size()' for an array, and '.length' for an ArrayList",
"Use '.length()' for both types of lists",
"Use '.get()' for an array, and '.set()' for an ArrayList"
],
correct: 0,
explanation: "Standard arrays expose a '.length' property to find their fixed capacity, while ArrayLists use the '.size()' method to find the current number of elements."
},
{
prompt: "What is the difference between the '.remove()' parameters for an ArrayList?",
options: [
"It can only remove items if you know their exact memory address",
"It can remove an item either by matching its object name/value OR by targeting its specific index position",
"It can only clear the entire list at once, similar to .clear()",
"It can only remove items from a fixed-size array"
],
correct: 1,
explanation: "The ArrayList .remove() method is overloaded, allowing you to pass in either the specific object you want to delete or the numerical index where it lives."
}
]} />