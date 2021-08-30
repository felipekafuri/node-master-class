// Deps
import { fileURLToPath } from 'url';
import https from 'https'
import http from 'http'
import { lib } from './data.mjs'
import url from 'url'
import { helpers } from './helpers.mjs'
import { _logs } from './_logs.mjs'
import util from 'util'
const debug = util.debuglog('workers')

const workers = {
  init: () => {
    // Send to console, in yellow
    // debug('\x1b[33m%s\x1b[0m', 'Background workers are running');


    // Execute all the checks immediately 
    workers.gatherAllChecks()
    // Call the loop so the checks will execute on their own
    workers.loop()
  },

  rotateLogs: () => {
    // Looping through all the files
    _logs.list(false, (err, logs) => {
      if (!err && logs.length > 0) {
        logs.forEach(log => {
          // compress the data to a different file
          const logID = log.replace('.log', '');
          const newFileId = logID + '-' + Date.now();
          _logs.compress(logID, newFileId, (err) => {
            if (!err) {
              // Truncate the log
              _logs.truncate(logID, (err) => {
                if (!err) {
                  debug('Success truncating log file')
                } else {
                  debug('Error truncating log file')
                }
              })
            } else {
              debug('Error compressing one of the log file')
            }
          })

        })
      } else {
        debug('Error: could not find any logs to rotate')
      }

    })
  },

  logRotationLoop: () => {
    setInterval(() => {
      workers.rotateLogs()
    }, 1000 * 60 * 60 * 24)
  },

  loop: () => {
    setInterval(() => {
      workers.gatherAllChecks()
    }, 1000 * 60),

      // Compress all the logs immediatly
      workers.rotateLogs()

    // Call the compression loop so logs will be compress later on 
    workers.logRotationLoop()
  },

  gatherAllChecks: () => {
    // Get all the checks
    lib.list('checks', function (err, checks) {
      if (!err && checks && checks.length > 0) {
        checks.forEach(function (check) {
          // Read in the check data
          lib.read('checks', check.slice(0, 20), function (err, originalCheckData) {
            if (!err && originalCheckData) {
              // Pass it to the check validator, and let that function continue the function or log the error(s) as needed
              workers.validateCheckData(originalCheckData);
            } else {
              debug("Error reading one of the check's data: ", err);
            }
          });
        });
      } else {
        debug('Error: Could not find any checks to process');
      }
    });
  },

  performCheck: (originalCheckData) => {

    // Prepare the initial check outcome
    var checkOutcome = {
      'error': false,
      'responseCode': false
    };

    // Mark that the outcome has not been sent yet
    var outcomeSent = false;

    // Parse the hostname and path out of the originalCheckData
    var parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // Using path not pathname because we want the query string

    // Construct the request
    var requestDetails = {
      'protocol': originalCheckData.protocol + ':',
      'hostname': hostName,
      'method': originalCheckData.method.toUpperCase(),
      'path': path,
      'timeout': originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object (using either the http or https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function (res) {
      // Grab the status of the sent request
      var status = res.statusCode;

      // Update the checkOutcome and pass the data along
      checkOutcome.responseCode = status;
      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function (e) {
      // Update the checkOutcome and pass the data along
      checkOutcome.error = { 'error': true, 'value': e };
      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    // Bind to the timeout event
    req.on('timeout', function () {
      // Update the checkOutcome and pass the data along
      checkOutcome.error = { 'error': true, 'value': 'timeout' };
      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    // End the request
    req.end();
  },

  alertUserToStatusChange: (newCheckData) => {
    const msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state
    helpers.sendTwilioSMS(`62${newCheckData.userPhone}`, msg, (err) => {
      if (!err) {
        debug('Success: User was alerted to a status change in their check', msg)
      } else {
        debug('Error: Could not send sms alert to user')
      }
    })
  },
  processCheckOutcome: (originalCheckData, checkOutcome) => {
    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode ? 'up' : 'down'

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

    // Update the check data
    const newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = Date.now()

    workers.logs(originalCheckData, checkOutcome, state, alertWarranted, newCheckData.lastChecked)

    // Save the updated to disk 
    lib.update('checks', newCheckData.id, newCheckData, (err) => {
      if (!err) {
        // Send the check
        if (alertWarranted) {
          workers.alertUserToStatusChange(newCheckData)
        } else {
          debug('No alert needed')
        }
      } else {
        debug('Error trying to save updated to one of the checks')
      }
    })
  },

  validateCheckData: (originalCheckData) => {
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 9 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
    // Set the keys that may not be set if the workers have never seen this checks before
    originalCheckData.state = originalCheckData.state = typeof (originalCheckData.state) === 'object' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked >= 0 ? originalCheckData.timeoutSeconds : false
    if (originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.successCodes && originalCheckData.url && originalCheckData.method && originalCheckData.timeoutSeconds) {
      workers.performCheck(originalCheckData)

    } else {
      debug('Error one of the checks are not properly formatted')
    }

    // Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
    workers.performCheck(originalCheckData)
  },

  logs: (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    // Form then log data 
    const logData = {
      check: originalCheckData,
      outcome: checkOutcome,
      state,
      alert: alertWarranted,
      time: timeOfCheck
    }

    // Convert to string
    const logString = JSON.stringify(logData)

    // Save the log to the database
    const logFileName = originalCheckData.id

    // Append the log string to the log file
    _logs.append(logFileName, logString, (err) => {
      if (!err) {
        debug('Log saved to file')
      } else {
        debug('Loggin to file failed')
      }
    })

  }
}

export { workers }