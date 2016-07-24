# STILL A WORK IN PROGRESS
--------------------------

# wow-itemstring
Node Module to consume and manipulate World of Warcraft itemstring's


## Purpose

To parse a WoW itemstring such as `item:124321:0:0:0:0:0:0:0:100:62:4:5:1:566:529` into readable data.


## Requirements

* Node version 4.4.7 or higher
* An API key from https://dev.battle.net/


## Usage

```javascript
'use strict';

let ItemString = require('wow-itemstring');

new ItemString(API_KEY, ITEM_STRING)
  .parse()
  .then((item) => {
    // parse() resolves 'this' so you can either capture the object
    // from the return of "new ItemString()" or simply use the resolved item
  }, (error) => {

  });

```

## Return

You can either set a variable to capture the item instance, ie `let item = new ItemString()`
and resolve the data with the parse method before accessing it, or you can manipulate the item
within the parse resolve since the item resolved is "this".

If you want to access many of the helper functions, which is most encouraged, continue to the Functions section.

You also can access the data directly.  The returned object has the structure:

```json
{
  "_apiKey": "The key passed in",
  "_itemString": "The raw item string passed in",
  "_item": "The item string split into friendlier parts",
  "_raw": "The object returned from the battle.net API"
}
```

## Functions

Once resolved, the item has functions to help you quickly get the data you need most.

* getContext - Returns the difficulty context and additional modifiers, ie: Mythic Titanforged
* getLevel - Returns the required level of the item
* getItemLevel - Returns the item level of the item
* getName - Returns the name of the item
* getStats - Returns the stats split into armor, primary and secondary with their friendly names

## Contributions

Please submit PR's if you would like to help fix bugs or enhance the library!
