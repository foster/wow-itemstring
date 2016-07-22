# wow-itemstring
Node Module to consume and manipulate World of Warcraft itemstring's


## Purpose

To parse a WoW itemstring such as `item:124321:0:0:0:0:0:0:0:100:62:4:5:1:566:529` into readable data.


## Requirements

* Node version 4.4.7 or higher
* An API key from https://dev.battle.net/


## Usage

```javascript
let ItemString = require('wow-itemstring');

new ItemString(API_KEY, ITEM_STRING)
  .parse()
  .then((item) => {

  }, (error) => {

  });

```

## Contributions

Please submit PR's if you would like to help fix bugs or enhance the library!
