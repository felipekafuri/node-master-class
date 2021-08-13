// Create and export configurations variables 

// Container for all the environments 
const environments = {};

// Staging objects 
environments.staging = {
  'httpPort': 3333,
  'httpsPort': 3331,
  'envName': 'staging',
  'hashingSecret': 'superSecretHash'
};

// Production objects
environments.production = {
  'httpPort': 4333,
  'httpsPort': 4334,
  'envName': 'production',
  'hashingSecret': 'superSecretHash'
};

// Determine witch environment was passed on the command line 
const currentEnvironment = 
  typeof (process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : ''; 

// Make sure that the environment exists 
const environmentToExport = typeof (environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

export { environmentToExport };