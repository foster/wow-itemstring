'use strict';

let fetch = require('node-fetch');
let _ = require('lodash');

const BONUS_STATS = require('./static/bonus-stats.json').bonusStats;
const INVENTORY_TYPES = require('./static/inventory-types.json').types;
const ITEM_CLASSES = require('./static/item-classes.json').classes;
const ITEM_QUALITIES = require('./static/item-qualities.json').qualities;

// TODO: Populate the rest of the keys
const INSTANCE_DIFFICULTY = require('./static/instance-difficulties.json').instanceDifficulties;

// Bonus Stats from: https://gist.github.com/Mischanix/d8f7a5f67d1b012987db#file-sample_18764-json
// Instance difficulty from: http://wowprogramming.com/docs/api/GetInstanceInfo

const ITEM_UNRESOLVED = {
  error: 400,
  errorMessage: 'This function is only available after parse() has finished resolving'
};

// TODO: Make this an env/conf variable
const API_URL = 'https://us.api.battle.net';
const API_ITEM_PATH = '/wow/item';

function trimTrailingSlash(path) {
  return (_.endsWith(path, '/')) ? path.substring(0, path.length - 1): path;
}

function buildGetUrl(path, params, apiKey) {
  return API_URL + trimTrailingSlash(path) + '?' + objectToQueryString(Object.assign({}, params || {}, {apikey: apiKey}));
}

function objectToQueryString(json) {
  return Object.keys(json).map((key) => {
    let val = json[key];

    if (val.constructor.toString().indexOf('Object') !== -1) {
      val = JSON.stringify(val);
    }
    return encodeURIComponent(key) + '=' + encodeURIComponent(val);
  }).join('&');
}

function parseFetchResponse(response) {
  //if (response.status >= 400) {
  //  throw new Error("Bad response from server");
  //}
  return response.json();
}

class Item {
  constructor(itemString) {
    let parts = itemString.split(':');

    this._type = parts[0];
    this._itemId = Number(parts[1]);
    this._enchant = Number(parts[2]);
    this._gems = [Number(parts[3]), Number(parts[4]), Number(parts[5]), Number(parts[6])];
    this._suffixId = Number(parts[7]);
    this._uniqueId = Number(parts[8]);
    this._level = Number(parts[9]);
    this._specializationId = Number(parts[10]);
    this._upgradeId = Number(parts[11]);
    this._instanceDifficulty = _.find(INSTANCE_DIFFICULTY, {id: Number(parts[12])});
    this._numBonusIds = Number(parts[13]);
    this._bonusIds = [];

    for (let i = 14; i < 14 + this._numBonusIds; i++) {
      this._bonusIds.push({
        id: Number(parts[i]),
        name: ''
      });
    }

    this._upgradeValue = Number(parts[14 + this._numBonusIds]);
  }

  get bonusIds() {
    return this._bonusIds;
  }

  get itemId() {
    return this._itemId;
  }

  get instanceDifficulty() {
    return this._instanceDifficulty;
  }
}

class ItemString {
  constructor(apiKey, itemString) {
    this._apiKey = apiKey;
    this._itemString = itemString;
    this._item = null;
    this._raw = {};
  }

  /*
   * Returns the item class of the item
   */
  getClass() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    let itemClass = _.find(ITEM_CLASSES, {class: this._raw.itemClass});
    itemClass.subClass = _.find(itemClass.subclasses, {subclass: this._raw.itemSubClass});

    delete itemClass.subclasses;

    return itemClass;
  }

  /*
   * Returns the difficulty context and additional modifiers, ie: Mythic Titanforged
   */
  getContext() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return {
      name: this._raw.nameDescription.trim(),
      hex: this._raw.nameDescriptionColor
    };
  }

  /*
   * Returns the item icon
   */
  getIcon() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return this._raw.icon;
  }

  /*
   * Returns the item id
   */
  getId() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return this._raw.id;
  }

  /*
   * Returns the item inventory type
   */
  getInventoryType() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return _.find(INVENTORY_TYPES, {id: this._raw.inventoryType});
  }

  /*
   * Returns the item level of the item
   */
  getItemLevel() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return this._raw.itemLevel;
  }

  /*
   * Returns the item string originally passed in
   */
  getItemString() {
    return this._itemString;
  }

  /*
   * Returns the required level of the item
   */
  getLevel() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return this._raw.requiredLevel;
  }

  /*
   * Returns the name of the item
   */
  getName() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return this._raw.name;
  }

  /*
   * Returns the item quality
   */
  getQuality() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return _.find(ITEM_QUALITIES, {id: this._raw.quality});
  }

  /*
   * Returns the stats split into primary and secondary with their friendly names
   */
  getStats() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    let stats = {
      armor: this._raw.armor,
      primary: [],
      secondary: []
    };

    _.forEach(this._raw.bonusStats, (stat) => {
      let detailedStat = _.find(BONUS_STATS, {id: stat.stat});

      if (detailedStat) {
        stats[(detailedStat.primary) ? 'primary' : 'secondary'].push({
          id: stat.stat,
          amount: stat.amount,
          name: detailedStat.name
        });
      }
    });

    return stats;
  }

  /*
   * Returns information on the item set
   */
  getItemSet() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    if (!this.isItemSet()) {
      return {};
    }

    return {
      id: this._raw.itemSet.id,
      name: this._raw.itemSet.name,
      bonuses: this._raw.itemSet.setBonuses
    };
  }

  /*
   * Returns the weaponInfo property
   */
  getWeaponInfo() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return this._raw.weaponInfo;
  }

  /*
   * Returns true if itemSet property exists and has data
   */
  isItemSet() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return (this._raw.itemSet && this._raw.itemSet.id);
  }

  /*
   * Returns true if weaponInfo property exists and has data
   */
  isWeapon() {
    if (!this._ensureParsed()) {
      return ITEM_UNRESOLVED;
    }

    return (this._raw.weaponInfo && this._raw.weaponInfo.damage);
  }

  parse() {
    return new Promise((resolve, reject) => {
      this._item = new Item(this._itemString);

      let query = {
        locale: 'en_US'
      };

      if (this._item._bonusIds.length > 0) {
        query.bl = _.map(this._item._bonusIds, 'id').join(',');
      }

      fetch(
        buildGetUrl(
          API_ITEM_PATH + '/' + this._item._itemId + ((this._item._instanceDifficulty) ? `/${this._item._instanceDifficulty.key}` : ''),
          query,
          this._apiKey
        )
      )
      .then(parseFetchResponse)
      .then((result) => {
        if (result.status === 'nok') {
          reject(result);
        }

        this._raw = result;
        resolve(this);
      }, (error) => {
        reject(error);
      });
    });
  }

  // Skip looking up from the API because we're passing in an existing item and need t
  populate(previousItem) {
    if (!previousItem) {
      return this.parse();
    }

    return new Promise((resolve, reject) => {
      this._itemString = previousItem._itemString;
      this._item = previousItem._item;
      this._raw = previousItem._raw;

      resolve(this);
    });
  }

  _ensureParsed() {
    if (this._raw && this._raw.id) {
      return true;
    }

    return false;
  }
}

module.exports = ItemString;
