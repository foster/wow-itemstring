'use strict';

const https = require('https');

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
const API_HOSTNAME = 'us.api.battle.net';
const API_URL = `https://${API_HOSTNAME}`;
const API_ITEM_PATH = '/wow/item';

const trimTrailingSlash = (path) => path.endsWith('/') ? path.slice(0, -1) : path;

const objectToQueryString = (json) => {
  return Object.keys(json).map((key) => {
    let val = json[key];

    if (typeof val === 'object') {
      val = JSON.stringify(val);
    }
    return encodeURIComponent(key) + '=' + encodeURIComponent(val);
  }).join('&');
};

const buildGetRelativeUrl = (path, params, apiKey) => {
  const queryString = objectToQueryString(Object.assign({}, params || {}, {apikey: apiKey}));
  return trimTrailingSlash(path) + '?' + queryString;
};

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
    this._instanceDifficulty = INSTANCE_DIFFICULTY.find((d) => d.id === Number(parts[12]));
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

    const itemClass = ITEM_CLASSES.find((i) => i.class === this._raw.itemClass);
    itemClass.subClass = itemClass.subclasses.find((s) => s.subclass === this._raw.itemSubClass);

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

    return INVENTORY_TYPES.find((t) => t.id === this._raw.inventoryType);
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

    return ITEM_QUALITIES.find((q) => q.id === this._raw.quality);
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

    for (const stat of this._raw.bonusStats) {
      const detailedStat = BONUS_STATS.find((bs) => bs.id === stat.stat);

      if (detailedStat) {
        stats[(detailedStat.primary) ? 'primary' : 'secondary'].push({
          id: stat.stat,
          amount: stat.amount,
          name: detailedStat.name
        });
      }
    }

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
        query.bl = this._item._bonusIds.map((b) => b.id).join(',');
      }

      const request = https.get({
        hostname: API_HOSTNAME,
        path: buildGetRelativeUrl(
          API_ITEM_PATH + '/' + this._item._itemId + ((this._item._instanceDifficulty) ? `/${this._item._instanceDifficulty.key}` : ''),
          query,
          this._apiKey
        )
      }, res => {
        let buffer = '';
        res.on('error', reject);
        res.on('data', (data) => buffer += data);
        res.on('end', () => {
          try {
            resolve(JSON.parse(buffer));
          }
          catch (e) {
            reject(e);
          }
        });
      });
    })
    .then((result) => {
      if (result.status === 'nok') {
        reject(result);
      }

      this._raw = result;
      return this;
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
