const config = require('config');

var alertsConfig = config.get('alerts');
console.log('alerts:  ' + JSON.stringify(alertsConfig));

