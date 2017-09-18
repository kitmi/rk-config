"use strict";

const vm = require('vm');
const Util = require('rk-utils');
const swig = require('swig-templates');
const _ = Util._;

const ES6TMPL_PREFIX = '#!es6:';
const SWIG_PREFIX = '#!swig:';

class Config {
    /**
     * The config loader
     * @constructs Config
     * @extends EventEmitter 
     * @example
     *   let fileSource = new JsonConfigProvider('file path', 'base name', 'production');
     *   let config = new Config(fileSource);
     *   config.load()...;
     *
     *   let dbSource = new DbConfigProvider(config.data.dbConnection);
     *   config.provider = dbSource;
     *   config.reload()...;
     */
    constructor(configProvider) {
        /**
         * The config data source provider
         * @type {object}
         * @public
         **/
        this.provider = configProvider;

        /**
         * The config data
         * @type {object}
         * @public
         **/
        this.data = undefined;
    }

    /**
     * Start loading the config files
     * @returns {Promise.<object>}
     */
    load(variables) {
        return this.provider.load().then(cfg => {
            this.data = cfg;

            Config.interpolate(this.data, variables);
            return Promise.resolve(this.data);
        });
    }

    /**
     * Reload config and override existing
     * @returns {Promise.<object>}
     */
    reload(variables) {
        let oldData = this.data;

        return this.load(variables).then(() => {
            this.data = _.defaultsDeep(this.data, oldData);
            return Promise.resolve(this.data);
        });
    }

    /**
     * Check a string whether is an interpolatible template and interpolate it if yes
     * @param {string} strVal
     * @param {object} context
     * @param {object} variables
     * @returns {string}
     */
    static tryInterpolateStringValue(strVal, context, variables) {
        if (_.startsWith(strVal, ES6TMPL_PREFIX)) {
            return vm.runInContext(Util.quote(strVal.substr(ES6TMPL_PREFIX.length), '`'), context);
        } else if (_.startsWith(strVal, SWIG_PREFIX)) {
            return swig.render(strVal.substr(SWIG_PREFIX.length), { locals: variables });
        }

        return strVal;
    }

    /**
     * Interpolate all template strings hived under the object with given variables
     * @param {object} obj
     * @param {object} variables
     */
    static interpolate(obj, variables) {
        const context = vm.createContext(variables);

        let queue = [ obj ];

        function interpolateElement(coll, key, val) {
            if (typeof val === 'string') {
                coll[key] = Config.tryInterpolateStringValue(val, context, variables);
            } else if (_.isPlainObject(val) || _.isArray(val)) {
                queue.push(val);
            }
        }

        let offset = 0;

        while (queue.length > offset) {
            let node = queue[offset];

            if (_.isPlainObject(node)) {
                for (let key in node) {
                    if (node.hasOwnProperty(key)) {
                        interpolateElement(node, key, node[key]);
                    }
                }
            } else if (_.isArray(node)) {
                let l = node.length;
                for (let i = 0; i < l; i++) {
                    interpolateElement(node, i, node[i]);
                }
            } else {
                Util.contract(() => false, 'Unexpected branch');
            }

            offset++;
        }
    }
}

Config.ES6TMPL_PREFIX = ES6TMPL_PREFIX;
Config.SWIG_PREFIX = SWIG_PREFIX;

module.exports = Config;