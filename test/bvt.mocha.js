'use strict';

/**
 * Module dependencies.
 */

const should = require('should');
const assert = require('assert');
const path = require('path');
const ConfigLoader = require('../lib/ConfigLoader.js');
const JsonConfigProvider = require('../lib/JsonConfigProvider.js');
const JsConfigProvider = require('../lib/JsConfigProvider.js');
const EnvAwareConfigProviderF = require('../lib/EnvAwareConfigProviderF.js');
const EnvAwareJsonConfigProvider = EnvAwareConfigProviderF('.json', JsonConfigProvider, 'default'); 
const EnvAwareJsConfigProvider = EnvAwareConfigProviderF('.js', JsConfigProvider, 'default'); 

const cfgDir = path.resolve(__dirname, './data');

describe('bvt', function () {
    describe('json config', function () {
        it('load config', function (done) {
            let config = ConfigLoader.createEnvAwareJsonLoader(cfgDir, 'test', 'production');

            config.load_().then(cfg => {
                cfg.should.have.keys('key1');
                cfg['key1'].should.have.keys('key1_1', 'key1_3');
                cfg['key1']['key1_1'].should.be.eql({ key1_1_2: 'value1_1_2_override', key1_1_1: 'value1_1_1' });                
                cfg['key1']['key1_3'].should.equal("original2");

                done();
            }).catch(done);
        });

        it('reload config', function (done) {
            let config = new ConfigLoader(new EnvAwareJsonConfigProvider(cfgDir, 'test'));

            config.load_().then(jsonDevCfg => {
                jsonDevCfg.should.have.keys('key1', 'key1_4');
                jsonDevCfg.key1.should.have.keys('key1_1', 'key1_2');
                jsonDevCfg.key1.key1_2.should.equal('original1');

                config.provider = new EnvAwareJsConfigProvider(cfgDir, 'test');
                return config.load_();
            }).then(cfg => {

                cfg.should.have.keys('key1', 'key1_3');
                cfg['key1'].should.have.keys('key1_1', 'key1_2');
                cfg['key1']['key1_1'].should.be.eql({ key1_1_2: 'value1_1_2', key1_1_1: 'value1_1_1' });
                cfg['key1']['key1_2'].should.equal("value1_2");
                cfg['key1_3'].should.equal("reloaded for dev");
                cfg['key1_4'].should.equal("new value for dev");

                done();

            }).catch(done);
        });

        it('interpolated config', function (done) {
            let config = new ConfigLoader(new EnvAwareJsonConfigProvider(cfgDir, 'test-itpl'));

            config.load_({ name: 'Bob', place: 'Sydney', value1: 10, value2: 20 }).then(cfg => {

                cfg.should.have.keys('key', 'key2');
                cfg['key'].should.be.exactly('Hello Bob, welcome to Sydney!');
                cfg['key2'].should.have.keys('array', 'object');
                cfg['key2']['array'][0].should.equal('value1: 10');
                cfg['key2']['array'][1].should.equal('value2: 20');
                cfg['key2']['array'][2].should.equal('sum: 30');
                cfg['key2']['object'].should.have.keys('non', 'itpl');
                cfg['key2']['object']['non'].should.equal('nothing');                
                cfg['key2']['jsv1'].should.be.exactly(200);
                cfg['key2']['jsv2'].should.equal('Bob Sydney');

                done();

            }).catch(done);
        });

        it('rewrite config', function (done) {
            let config = new ConfigLoader(new EnvAwareJsonConfigProvider(cfgDir, 'test', 'production'));

            config.load_().then(cfg => {                
                config.provider.setItem('key9.key10', 'newly added');

                return config.provider.save_();
            }).then(() => config.reload_()).then(cfg2 => {
                cfg2.should.have.keys('key1');
                cfg2['key1'].should.have.keys('key1_1', 'key1_3');
                cfg2['key1']['key1_1'].should.be.eql({ key1_1_2: 'value1_1_2_override', key1_1_1: 'value1_1_1' });
                
                let value = config.provider.getItem('key9.key10')
                value.should.equal("newly added");
                
                delete config.providnpmer._envConfigProvider.config.key9;
                value = config.provider._envConfigProvider.getItem('key9.key10');
                should.not.exist(value);

                return config.provider.save_();
            }).then(() => done()).catch(done);
        });

        it('rewrite js', function (done) {
            let config = new ConfigLoader(new EnvAwareJsConfigProvider(cfgDir, 'test'));

            config.load_().then(cfg => {                
                cfg['key1_3'].should.equal("reloaded for dev");
                config.provider.setItem('key1_3', 'modified');                

                return config.provider.save_();
            }).then(() => config.reload_()).then(cfg2 => {                
                cfg2['key1_3'].should.equal("modified");                
                config.provider.setItem('key1_3', "reloaded for dev");
                return config.provider.save_();
            }).then(() => done()).catch(done);

        });
    });

});
