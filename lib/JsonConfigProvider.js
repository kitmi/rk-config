"use strict";

const Util = require('rk-utils');
const fs = Util.fs;

class JsonConfigProvider {
    /**
     * JSON file config data source
     * @constructs JsonConfigProvider
     * @param {string} filePath - The path of config file
     */
    constructor(filePath) {
        this.filePath = filePath;

        /**
         * The loaded config
         * @type {object}
         * @public
         */
        this.config = undefined;
    }
    
    /**
     * Start loading the config files
     * @returns {Promise.<object>}
     */
    async load_() {        
        this.config = (await fs.pathExists(this.filePath)) ? (await fs.readJson(this.filePath)) : {};
        return this.config;
    }    

    /**
     * Start saving the config to files
     * @returns {Promise.<*>}
     */
    async save_() {
        await fs.outputJson(this.filePath, this.config, { spaces: 4 });
    }

    /**
     * Update config item by dotted path.
     * @param {string} key - The path of config item, e.g. "item.subItem.key" refers to { item: { subItem: { key: "*" } } }
     * @param {*} value - New value of config item
     * @returns {JsonConfigProvider}
     */
    setItem(key, value) {
        Util.setValueByPath(this.config, key, value);
        return this;
    }

    /**
     * Get config item by dotted path.
     * @param {string} key 
     * @param {*} defaultValue 
     * @returns {*}
     */
    getItem(key, defaultValue) {
        return Util.getValueByPath(this.config, key, defaultValue);
    }
}

module.exports = JsonConfigProvider;