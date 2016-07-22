'use strict';

let fetch = require('node-fetch');
let _ = require('lodash');
let bonusStats = require('./static/bonus-stats.json').bonusStats;

// TODO: Populate the rest of the keys
let instanceDifficulty = require('./static/instance-difficulty.json').instanceDifficulty;

// Bonus Stats from: https://gist.github.com/Mischanix/d8f7a5f67d1b012987db#file-sample_18764-json
// Instance difficulty from: http://wowprogramming.com/docs/api/GetInstanceInfo

// TODO: Make this an env/conf variable
const API_URL = 'https://us.api.battle.net';
const API_ITEM_PATH = '/wow/item';

function buildGetUrl(path, params, apiKey) {
  return API_URL + path + '?' + objectToQueryString(Object.assign({}, params || {}, {apikey: apiKey}));
}

function objectToQueryString(json) {
  return Object.keys(json).map((key) => {
    let val = json[key];

    if (val.constructor.toString().indexOf('Object') != -1) {
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
    this._instanceDifficulty = _.find(instanceDifficulty, {id: Number(parts[12])});
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

  parse() {
    return new Promise((resolve, reject) => {
      this._item = new Item(this._itemString);

      let query = {
        locale: 'en_US'
      };

      if (this._item.bonusIds.length > 0) {
        query.bl = _.map(this._item.bonusIds, 'id').join(',');
      }

      fetch(
        buildGetUrl(
          API_ITEM_PATH + '/' + this._item.itemId + '/' + this._item.instanceDifficulty.key,
          query,
          this._apiKey
        )
      )
      .then(parseFetchResponse)
      .then((itemResult) => {
        this._raw = itemResult;
        resolve(this);
      }, (error) => {
        reject(error);
      });
    });
  }
}

module.exports = ItemString;
