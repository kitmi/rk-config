"use strict";

const Util = require('rk-utils');
const _ = Util._;
const fs = Util.fs;

const FileConfigProvider = require('./fileConfigProvider.js');

class JsConfigProvider extends FileConfigProvider {
    constructor(configDir, baseName, envFlag) {
        super(configDir, baseName, envFlag, {
            defaultNaming: function (baseName) {
                return baseName + '.default.js';
            },

            envSpecificNaming: function (baseName, envFlag) {
                return baseName + '.' + envFlag + '.js';
            },

            readFile: async function (filePath) {
                return await fs.pathExists(filePath) ? Util.load_(filePath) : {};
            },

            writeFile: async function (filePath, content) {
                return fs.outputFile(filePath, content);
            }
        });
    }
}

module.exports = JsConfigProvider;