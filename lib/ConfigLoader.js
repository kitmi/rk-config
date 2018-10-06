"use strict";

const vm = require('vm');
const Util = require('rk-utils');
const _ = Util._;

const JsonConfigProvider = require('./JsonConfigProvider');
const EnvAwareConfigProviderF = require('./EnvAwareConfigProviderF');
const EnvAwareJsonConfigProvider = EnvAwareConfigProviderF('.json', JsonConfigProvider);

const JS_VALUE_TOKEN = 'jsv';
const JS_TEMPLATE_TOKEN = 'jst';
const PROCESSOR_PREFIX = '#!';

const PrefixMap = new Map();
PrefixMap.set(JS_VALUE_TOKEN, (strVal, variables) => vm.runInNewContext('() => (' + strVal + ')', variables)());
PrefixMap.set(JS_TEMPLATE_TOKEN, (strVal, variables) => vm.runInNewContext(Util.quote(strVal, '`'), variables));

class ConfigLoader {
    /**
     * Create an environment aware JSON config loader
     * @param {string} configDir 
     * @param {string} baseName 
     * @param {string} envFlag 
     */
    static createEnvAwareJsonLoader(configDir, baseName, envFlag) {        
        return new ConfigLoader(new EnvAwareJsonConfigProvider(configDir, baseName, envFlag));
    }

    /**
     * The config loader
     * @constructs ConfigLoader
     * @extends EventEmitter 
     * @example
     *   let fileSource = new JsonConfigProvider('path/to/config.json');
     *   let config = new ConfigLoader(fileSource);
     *   await config.load_()...;
     *
     *   let dbSource = new DbConfigProvider(config.data.dbConnection);
     *   config.provider = dbSource;
     *   await config.reload_()...;
     * 
     *   // same as: let envAwareLoader = new ConfigLoader(
     *   //    new (EnvAwareConfigProviderF('.json', JsonConfigProvider, 'default'))('config/dir', 'app', 'production')
     *   // );
     *   let envAwareLoader = ConfigLoader.createEnvAwareJsonLoader('config/dir', 'app', 'production');
     *   
     *   // Loader will load config/dir/app.default.json first, 
     *   // and then load config/dir/app.production.json, 
     *   // and finally override the default.
     *   let cfg = await envAwareLoader.load_(); 
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
     * Start loading the config files and override existing
     * @param {object} variables - variables
     * @returns {Promise.<object>}
     */
    async load_(variables) {
        let oldData = this.data;

        await this.reload_(variables);
        
        if (oldData) {
            this.data = _.defaultsDeep(this.data, oldData);
        }
        
        return this.data;
    }

    /**
     * Reload config
     * @returns {Promise.<object>}
     */
    async reload_(variables) {
        this.data = await this.provider.load_();
        if (this.autoPostProcess) this.postProcess(variables);
        
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

module.exports = ConfigLoader;