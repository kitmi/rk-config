"use strict";

const path = require('path');
const Util = require('rk-utils');
const _ = Util._;

/**
 * Environment-aware config provider factory
 * @param {string} EXT - File extension name, e.g. ".json"
 * @param {class} PROVIDER - Config provider class
 * @param {string} [DEFAULT_FLAG="default"] - Default flag
 */
const EnvAwareConfigProviderF = (EXT, PROVIDER, DEFAULT_FLAG = "default") => class {
    /**
     * Environment-aware config provider
     * @constructs EnvAwareConfigProvider
     * @param {string} configDir - The base directory of config files
     * @param {string} baseName - The basename of the config file
     * @param {string} [envFlag="development"] - Environment flag     
     */
    constructor(configDir, baseName, envFlag = "development") {
        /**
         * The raw default config
         * @type {object}
         * @private
         */
        this._defConfigProvider = new PROVIDER(path.join(configDir, baseName + '.' + DEFAULT_FLAG + EXT));

        /**
         * The environment specific config
         * @type {object}
         * @public
         */
        this._envConfigProvider = new PROVIDER(path.join(configDir, baseName + '.' + envFlag + EXT));

        this._envFlag = envFlag;

        /**
         * The loaded config
         * @type {object}
         * @public
         */
        this.config = undefined;
    }
    
    /**
     * Start loading the config files
     * @memberof EnvAwareConfigProvider
     * @returns {Promise.<object>}
     */
    async load_(logger) {        
        let defConfig = await this._defConfigProvider.load_(logger);
        let envConfig = await this._envConfigProvider.load_(logger);
            
        this.config = _.defaults({}, envConfig, defConfig);
        if (logger && !_.isEmpty(envConfig)) {
            logger.log('info', `Configuration is overrided by environment-specific [env=${this._envFlag}] settings.`);
        }

        return this.config;
    }

    /**
     * Start saving the config to files
     * @memberof EnvAwareConfigProvider
     * @returns {Promise.<*>}
     */
    async save_() {        
        await this._envConfigProvider.save_();
    }

    /**
     * Update config item by dotted path.
     * @memberof EnvAwareConfigProvider
     * @param {string} key - The path of config item, e.g. "item.subItem.key" refers to { item: { subItem: { key: "*" } } }
     * @param {*} value - New value of config item
     * @returns {JsonConfigProvider}
     */
    setItem(key, value) {
        Util.setValueByPath(this.config, key, value);
        this._envConfigProvider.setItem(key, value);
        return this;
    }

    /**
     * Get config item by dotted path.
     * @memberof EnvAwareConfigProvider
     * @param {string} key 
     * @param {*} defaultValue 
     * @returns {*}
     */
    getItem(key, defaultValue) {
        return Util.getValueByPath(this.config, key, defaultValue);
    }
};

module.exports = EnvAwareConfigProviderF;