"use strict";

const path = require('path');
const Util = require('rk-utils');
const _ = Util._;
const fs = Util.fs;

class JsonConfigProvider {
    /**
     * JSON file config data source
     * @constructs JsonConfigProvider
     * @param {string} configDir - The base directory of config files
     * @param {string} baseName - The basename of the config file
     * @param {string} [envFlag] - Environment flag
     * @param {object} [opts] - Extra options
     * @property {function} [opts.defaultNaming] - Naming convention of default config file
     * @property {function} [opts.envSpecificNaming] - Naming convention of env-specific config file
     * @property {generator} [opts.readFile] - Customized read file generator function
     * @property {generator} [opts.writeFile] - Customized write file generator function
     */
    constructor(configDir, baseName, envFlag, opts) {
        this._configDir = configDir;
        this._baseName = baseName;

        if (typeof envFlag === 'object' && typeof opts === 'undefined') {
            opts = envFlag;
            envFlag = undefined;
        }

        this._envFlag = envFlag || process.env.NODE_ENV || 'development';

        opts || (opts = {});

        this._defaultNaming = opts.defaultNaming || function (baseName) {
            return baseName + '.default.json';
        };

        this._envSpecificNaming = opts.envSpecificNaming || function (baseName, envFlag) {
            return baseName + '.' + envFlag + '.json';
        };

        this._readFile_ = opts.readFile || (async (filePath) => {
                return (await fs.pathExists(filePath)) ? fs.readJson(filePath) : {};
            });

        let writeOptions = { spaces: 4 };

        this._writeFile_ = opts.writeFile || (async (filePath, content) => {
                await fs.outputJson(filePath, content, writeOptions);
            });

        /**
         * The raw default config
         * @type {object}
         * @public
         */
        this.defConfig = undefined;

        /**
         * The raw environment specific config
         * @type {object}
         * @public
         */
        this.esConfig = undefined;
    }
    
    /**
     * Start loading the config files
     * @returns {Promise}
     */
    async load_() {
        let defaultCfgPath = path.join(this._configDir, this._defaultNaming(this._baseName));
        let envCfgPath = path.join(this._configDir, this._envSpecificNaming(this._baseName, this._envFlag));
        
        this.defConfig = await this._readFile_(defaultCfgPath);
        this.esConfig = await this._readFile_(envCfgPath);
            
        return _.defaultsDeep({}, this.esConfig, this.defConfig);
    }

    /**
     * Update config item.
     * @param {string} key - The path of config item, e.g. "item.subItem.key" refers to { item: { subItem: { key: "*" } } }
     * @param {*} value - New value of config item
     */
    updateItem(key, value) {
        Util.setValueByPath(this.esConfig, key, value);
    }

    /**
     * Start saving the config to files
     * @returns {*}
     */
    async save_() {
        let defaultCfgPath = path.join(this._configDir, this._defaultNaming(this._baseName));
        let envCfgPath = path.join(this._configDir, this._envSpecificNaming(this._baseName, this._envFlag));

        await this._writeFile_(defaultCfgPath, this.defConfig);
        await this._writeFile_(envCfgPath, this.esConfig);
    }
}

module.exports = JsonConfigProvider;