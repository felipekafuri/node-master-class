// Create and export configurations variables 

// Container for all the environments 
const environments = {};

// Staging objects 
environments.staging = {
  'httpPort': 3333,
  'httpsPort': 3331,
  'envName': 'staging',
  'hashingSecret': 'superSecretHash',
  'maxChecks': 5,
  'twilio':{
    'username': 'felipekafuri',
    'password': 'FelipeKafuri1',
    'fromPhone': 'InfoSMS',
  }
};

// Production objects
environments.production = {
  'httpPort': 4333,
  'httpsPort': 4334,
  'envName': 'production',
  'hashingSecret': 'superSecretHash',
  'maxChecks': 5,
  'twilio':{
    'accountSid': 'aab9c3695663f6558dea50f6952f430e-80a37ff4-6159-416b-8054-5c98af41ae34',
    'authToken': 'App aab9c3695663f6558dea50f6952f430e-80a37ff4-6159-416b-8054-5c98af41ae34',
    'fromPhone': '+5562992944121',
  }
};

// Determine witch environment was passed on the command line 
const currentEnvironment = 
  typeof (process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : ''; 

// Make sure that the environment exists 
const environmentToExport = typeof (environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

export { environmentToExport };