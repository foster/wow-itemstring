<a name"1.0.5"></a>
### 1.0.5 (2016-09-24)

#### Bug Fixes
* Added in error handler for nok in success returns of parse
* Added in function to trim trailing slashes in API query to avoid improper nok result


<a name"1.0.4"></a>
### 1.0.4 (2016-07-30)

#### Features
* Added function: populate(itemData).  Returns a promise to be used in place of parse when you have the raw data already on hand.
* Added additional functions: getClass (item class + subclass), getIcon, getInventoryType, getItemString, getQuality, getItemSet, getWeaponInfo, isItemSet and isWeapon
* Added in data stores for inventory types and item classes, and item qualities.  Renamed instance difficulty json to plural for consistency.

#### Breaking Changes
* getContext now returns an object that includes properties for name and hex (color)


<a name"1.0.3"></a>
### 1.0.3 (2016-07-24)

#### Features
* Added functions: getId


<a name"1.0.2"></a>
### 1.0.2 (2016-07-24)

#### Features
* Added functions to the ItemString class for accessing common data
* Updated bonus-stats.json with a "primary" key on some fields as needed

#### Breaking Changes
* Renamed the .json imports to consts, ie instanceDifficulty -> INSTANCE_DIFFICULTY


<a name"1.0.1"></a>
### 1.0.1 (2016-07-23)

#### Bug Fixes
* Added in required packages


<a name"1.0.0"></a>
### 1.0.0 (2016-07-23)

#### Features
* Initial Release

#### Breaking Changes
* No Breaking Changes

#### Bug Fixes
* No bug fixes
