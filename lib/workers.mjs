// Deps
import { fileURLToPath } from 'url';
import path from 'path'
import https from 'https'
import http from 'http'
const __filename = fileURLToPath(import.meta.url);
import { lib } from './data.mjs'
const __dirname = path.dirname(__filename);
import url from 'url'
import { helpers } from './helpers.mjs'


const workers = {
  init: () => {
    // Execute all the checks immediately 
    workers.gatherAllChecks()
    // Call the loop so the checks will execute on their own
    workers.loop()
  },

  loop: () => {
    setTimeInterval(() => {
      workers.gatherAllChecks()
    }, 1000 * 60)
  },

  gatherAllChecks: () => {
    // Get all the checks that exists in the system
    lib.list('checks', (err, checks) => {
      if (!err && checks && checks.length > 0) {
        checks.forEach(check => {
          // Read in the check data
          lib.read('checks', check, (err, originalCheckData) => {
            if (!err && originalCheckData) {
              // Pass the data to the check validator, and let that function continue or log error
              workers.validateCheckData(originalCheckData)
            } else {
              console.log('Error: reading one of the check data')
            }
          })
        })
      } else {
        console.log('Error: Could not find any checks to process')
      }
    })
  },

  validateCheckData: (originalCheckData) => {
    originalCheckData = typeof (originalCheckData) === 'object' && originalCheckData !== null ? originalCheckData : {}
    originalCheckData.id = typeof (originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id : false
    originalCheckData.phone = typeof (originalCheckData.phone) === 'string' && originalCheckData.phone.trim().length === 9 ? originalCheckData.phone : false
    originalCheckData.protocol = typeof (originalCheckData.protocol) === 'object' && ['https', 'http'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
    originalCheckData.url = typeof (originalCheckData.url) === 'string' && originalCheckData.url.trim().length === 0 ? originalCheckData.url : false
    originalCheckData.method = typeof (originalCheckData.method) === 'string' && ['get', 'post', 'delte', 'put'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
    originalCheckData.successCode = typeof (originalCheckData.successCode) === 'object' && originalCheckData.successCode instanceof Array && originalCheckData.sucessCode.length > 0 ? originalCheckData.successCode : false
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 ? originalCheckData.timeoutSeconds : false

    // Set the keys that may not be set if the workers have never seen this checks before
    originalCheckData.state = originalCheckData.state = typeof (originalCheckData.state) === 'object' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked >= 0 ? originalCheckData.timeoutSeconds : false


  }
}

export { workers }