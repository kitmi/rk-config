'use strict';

/**
 * Module dependencies.
 */

const should = require('should');
const assert = require('assert');
const path = require('path');
const { Config, JsonConfigProvider, JsConfigProvider } = require('../index.js');

const cfgDir = path.resolve(__dirname, './data');

describe('bvt', function () {
    describe('json config', function () {
        it('load config', function (done) {
            let config = new Config(new JsonConfigProvider(cfgDir, 'test', 'production'));

            config.load().then(cfg => {
                cfg.should.have.keys('key1');
                cfg['key1'].should.have.keys('key1_1', 'key1_2', 'key1_3');
                cfg['key1']['key1_1'].should.be.eql({ key1_1_2: 'value1_1_2_override', key1_1_1: 'value1_1_1' });
                cfg['key1']['key1_2'].should.equal("original1");
                cfg['key1']['key1_3'].should.equal("original2");

                done();
            }).catch(done);
        });

        it('reload config', function (done) {
            let config = new Config(new JsonConfigProvider(cfgDir, 'test'));

            config.load().then(jsonDevCfg => {
                jsonDevCfg.should.have.keys('key1');
                jsonDevCfg.key1.should.have.keys('key1_1', 'key1_2', 'key1_4');
                jsonDevCfg.key1.key1_2.should.equal('original1');

                config.provider = new JsConfigProvider(cfgDir, 'test');
                return config.reload();
            }).then(cfg => {

                cfg.should.have.keys('key1');
                cfg['key1'].should.have.keys('key1_1', 'key1_2', 'key1_3');
                cfg['key1']['key1_1'].should.be.eql({ key1_1_2: 'value1_1_2', key1_1_1: 'value1_1_1' });
                cfg['key1']['key1_2'].should.equal("value1_2");
                cfg['key1']['key1_3'].should.equal("reloaded for dev");
                cfg['key1']['key1_4'].should.equal("new value for dev");

                done();

            }).catch(done);
        });

        it('interpolated config', function (done) {
            let config = new Config(new JsonConfigProvider(cfgDir, 'test-itpl'));

            config.load({ name: 'Bob', place: 'Sydney', value1: 10, value2: 20 }).then(cfg => {

                cfg.should.have.keys('key', 'key2');
                cfg['key'].should.be.exactly('Hello Bob, welcome to Sydney!');
                cfg['key2'].should.have.keys('array', 'object');
                cfg['key2']['array'][0].should.equal('value1: 10');
                cfg['key2']['array'][1].should.equal('value2: 20');
                cfg['key2']['array'][2].should.equal('sum: 30');
                cfg['key2']['object'].should.have.keys('non', 'itpl', 'swig');
                cfg['key2']['object']['non'].should.equal('nothing');
                cfg['key2']['object']['swig'].should.equal('10');

                done();

            }).catch(done);
        });

        it('rewrite config', function (done) {
            let config = new Config(new JsonConfigProvider(cfgDir, 'test', 'production'));

            config.load().then(cfg => {
                config.provider.defConfig.key1.key1_2 = 'modified1';
                config.provider.esConfig.key1.key1_3 = 'modified2';

                return config.provider.save();
            }).then(() => config.load()).then(cfg2 => {
                cfg2.should.have.keys('key1');
                cfg2['key1'].should.have.keys('key1_1', 'key1_2', 'key1_3');
                cfg2['key1']['key1_1'].should.be.eql({ key1_1_2: 'value1_1_2_override', key1_1_1: 'value1_1_1' });
                cfg2['key1']['key1_2'].should.equal("modified1");
                cfg2['key1']['key1_3'].should.equal("modified2");

                config.provider.defConfig.key1.key1_2 = 'original1';
                config.provider.esConfig.key1.key1_3 = 'original2';
                return config.provider.save();
            }).then(() => done()).catch(done);

        });
    });

});
