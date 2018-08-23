"use strict";

const vm = require('vm');
const Util = require('rk-utils');
const swig = require('swig-templates');
const _ = Util._;

const ES6TMPL_TOKEN = 'es6';
const SWIG_TOKEN = 'swig';
const INTERPOLATION_PREFIX = '#!';

const PrefixMap = new Map();
PrefixMap.set(ES6TMPL_TOKEN, (strVal, loader, context, variables) => vm.runInContext(Util.quote(strVal, '`'), context));
PrefixMap.set(SWIG_TOKEN, (strVal, loader, context, variables) => swig.render(strVal, { locals: variables }));

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

        /**
         * Whether to interpolate automatically after loading
         * @type {boolean}
         * @public
         */
        this.autoInterpolate = true;
    }

    /**
     * Start loading the config files
     * @param {object} variables - variables
     * @returns {Promise.<object>}
     */
    async load_(variables) {
        this.data = await this.provider.load_();
        if (this.autoInterpolate) this.interpolate(variables);
        
        return this.data;
    }

    /**
     * Reload config and override existing
     * @returns {Promise.<object>}
     */
    async reload_(variables) {
        let oldData = this.data;

        await this.load_(variables);
        
        this.data = _.defaultsDeep(this.data, oldData);
        
        return this.data;
    }

    /**
     * Interpolate the loaded config
     * @param {object} variables - variables
     */
    interpolate(variables) {
        const context = vm.createContext(variables);

        let queue = [ this.data ];

        let interpolateElement = (coll, key, val) => {
            if (typeof val === 'string') {
                coll[key] = this._tryInterpolateStringValue(val, context, variables);
            } else if (_.isPlainObject(val) || _.isArray(val)) {
                queue.push(val);
            }
        };

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

    _tryInterpolateStringValue(strVal, context, variables) {
        if (strVal.startsWith(INTERPOLATION_PREFIX)) {
            let colon = strVal.indexOf(':');
            if (colon > 2) {
                let token = strVal.substring(2, colon);
                let operator = PrefixMap.get(token);
                if (operator) {
                    return operator(strVal.substr(colon+1), this, context, variables)
                }

                throw new Error('Unsupported interpolation method: ' + token);
            }

            throw new Error('Invalid interpolation syntax: ' + strVal);
        }

        return strVal;
    }
}

module.exports = Config;