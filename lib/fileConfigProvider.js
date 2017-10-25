"use strict";

const path = require('path');
const Util = require('rk-utils');
const _ = Util._;
const fs = Util.fs;

class FileConfigProvider {
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

        this._readFile = opts.readFile || function* (filePath) {
                return (yield fs.pathExists(filePath)) ? (yield fs.readJson(filePath)) : {};
            };

        let writeOptions = { spaces: 4 };

        this._writeFile = opts.writeFile || function* (filePath, content) {
                yield fs.outputJson(filePath, content, writeOptions);
            };

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
    load() {
        let defaultCfgPath = path.join(this._configDir, this._defaultNaming(this._baseName));
        let envCfgPath = path.join(this._configDir, this._envSpecificNaming(this._baseName, this._envFlag));
        let self = this;
        
        function* readFiles() {
            self.defConfig = yield self._readFile(defaultCfgPath);
            self.esConfig = yield self._readFile(envCfgPath);
            
            return _.defaultsDeep({}, self.esConfig, self.defConfig);
        }
        
        return Util.co(readFiles);
    }

    /**
     * Start saving the config to files
     * @returns {*}
     */
    save() {
        let defaultCfgPath = path.join(this._configDir, this._defaultNaming(this._baseName));
        let envCfgPath = path.join(this._configDir, this._envSpecificNaming(this._baseName, this._envFlag));
        let self = this;

        function* writeFiles() {
            yield self._writeFile(defaultCfgPath, self.defConfig);
            yield self._writeFile(envCfgPath, self.esConfig);
        }

        return Util.co(writeFiles);
    }
}

module.exports = FileConfigProvider;