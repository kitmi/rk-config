# rk-config [deprecated, can be seemlessly replaced by https://github.com/genx-tech/gx-config]
![Build Status](https://travis-ci.org/kitmi/rk-config.svg?branch=master) ![Coverage Status](https://coveralls.io/repos/github/kitmi/rk-config/badge.svg?branch=master)

An environment-aware config system.

## Features

* Multiple data source.
* Deep override.
* Rewrite config.
* Support interpolation: ES6 string template, Javascript value

## Examples

     let fileSource = new JsonConfigProvider('path/to/config.json');
     let config = new ConfigLoader(fileSource);
     await config.load_()...;
  
     let dbSource = new DbConfigProvider(config.data.dbConnection);
     config.provider = dbSource;
     await config.reload_()...;
   
     // same as: let envAwareLoader = new ConfigLoader(
     //    new (EnvAwareConfigProviderF('.json', JsonConfigProvider, 'default'))('config/dir', 'app', 'production')
     // );
     let envAwareLoader = ConfigLoader.createEnvAwareJsonLoader('config/dir', 'app', 'production');
     
     // Loader will load config/dir/app.default.json first, 
     // and then load config/dir/app.production.json, 
     // and finally override the default.
     let cfg = await envAwareLoader.load_(); 

## License

  MIT
