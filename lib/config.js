"use strict";

const vm = require('vm');
const Util = require('rk-utils');
const swig = require('swig-templates');
const _ = Util._;

const JS_VALUE_TOKEN = 'jsv';
const JS_TEMPLATE_TOKEN = 'jst';
const SWIG_TOKEN = 'swig';
const PROCESSOR_PREFIX = '#!';

const PrefixMap = new Map();
PrefixMap.set(JS_VALUE_TOKEN, (strVal, variables) => vm.runInNewContext('() => (' + strVal + ')', variables)());
PrefixMap.set(JS_TEMPLATE_TOKEN, (strVal, variables) => vm.runInNewContext(Util.quote(strVal, '`'), variables));
PrefixMap.set(SWIG_TOKEN, (strVal, variables) => swig.render(strVal, { locals: variables }));

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
         * Whether to do string post process automatically after loading
         * @type {boolean}
         * @public
         */
        this.autoPostProcess = true;
    }

    /**
     * Start loading the config files
     * @param {object} variables - variables
     * @returns {Promise.<object>}
     */
    async load_(variables) {
        this.data = await this.provider.load_();
        if (this.autoPostProcess) this.postProcess(variables);
        
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
     * PostProcess the loaded config
     * @param {object} variables - variables
     */
    postProcess(variables) {
        let queue = [ this.data ];

        let interpolateElement = (coll, key, val) => {
            if (typeof val === 'string') {
                coll[key] = this._tryProcessStringValue(val, variables);
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
            } else {
                if (!_.isArray(node)) {
                    throw new Error('Unexpected behavior');
                }

                let l = node.length;
                for (let i = 0; i < l; i++) {
                    interpolateElement(node, i, node[i]);
                }
            } 

            offset++;
        }
    }

    _tryProcessStringValue(strVal, variables) {
        if (strVal.startsWith(PROCESSOR_PREFIX)) {
            let colon = strVal.indexOf(':');
            if (colon > 2) {
                let token = strVal.substring(2, colon);
                let operator = PrefixMap.get(token);
                if (operator) {
                    return operator(strVal.substr(colon+1), variables)
                }

                throw new Error('Unsupported interpolation method: ' + token);
            }

            throw new Error('Invalid interpolation syntax: ' + strVal);
        }

        return strVal;
    }
}

module.exports = Config;