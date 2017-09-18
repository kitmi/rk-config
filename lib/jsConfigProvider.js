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

            readFile: function* (filePath) {
                return (yield fs.pathExists(filePath)) ? (yield Util.load(filePath)) : {};
            },

            writeFile: function* (filePath, content) {
                yield fs.outputFile(filePath, content);
            }
        });
    }
}

module.exports = JsConfigProvider;