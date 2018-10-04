"use strict";

const Util = require('rk-utils');
const _ = Util._;
const fs = Util.fs;

const JsonConfigProvider = require('./jsonConfigProvider.js');

class JsConfigProvider extends JsonConfigProvider {
    /**
     * JavaScript file config data source
     * @constructs JsConfigProvider
     * @param {string} configDir - The base directory of config files
     * @param {string} baseName - The basename of the config file
     * @param {string} [envFlag] - Environment flag     
     */
    constructor(configDir, baseName, envFlag) {
        super(configDir, baseName, envFlag, {
            defaultNaming: function (baseName) {
                return baseName + '.default.js';
            },

            envSpecificNaming: function (baseName, envFlag) {
                return baseName + '.' + envFlag + '.js';
            },

            readFile: async function (filePath) {
                return (await fs.pathExists(filePath)) ? Util.load_(filePath) : {};
            },

            writeFile: async function (filePath, content) {
                return fs.outputFile(filePath, 'module.exports = ' + JSON.stringify(content, null, 4) + ';');
            }
        });
    }
}

module.exports = JsConfigProvider;