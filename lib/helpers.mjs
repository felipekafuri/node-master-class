import crypto from 'crypto'
import { environmentToExport } from '../config.mjs'
import { lib } from './data.mjs'
import { stringify } from 'querystring'
import https from 'https'

const helpers = {
  // Generate a hash for the given string
  hash: (string) => {
    return crypto.createHash('sha256', environmentToExport.hashingSecret).update(string).digest('hex')
  },

  parseJsonToObject: (string) => {
    // Parse a JSON string to an object in all cases, without throwing
    try {
      const obj = JSON.parse(string)
      return obj
    } catch (e) {
      return {}
    }
  },

  createRandomString(size) {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

    let randomString = ''

    for (let i = 0; i < size; i++) {
      randomString += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
    }

    return randomString
  },

  verifyToken(id, phone, callback) {
    lib.read('tokens', id, (err, data) => {
      if (!err && data) {
        if (data.phone === phone && data.expires > Date.now()) {
          callback(true)
        } else {
          callback(false)
        }
      } else {
        callback(false)
      }
    })
  },

  // Send an SMS message via Twilio
  sendTwilioSMS: (phone, msg, callback) => {
    phone = typeof (phone) === 'string' ? phone.trim() : false
    msg = typeof (msg) === 'string' && msg.length > 0 && msg.length <= 1600 ? msg.trim() : false
    if (phone && msg) {
      // Configure the request payload 
      const payload = {
        messages: [
          {
            from: environmentToExport.twilio.fromPhone,
            destinations: [{ to: phone }],
            text: msg
          }
        ]

      }

      // Stringify the payload
      const stringPayload = stringify(payload)

      // Configure the request details
      const requestDetail = {
        'method': 'GET',
        'hostname': 'nzpdyj.api.infobip.com',
        'path': `/sms/1/text/query?username=${environmentToExport.twilio.username}&password=${environmentToExport.twilio.password}&from=${environmentToExport.twilio.fromPhone}&to=${phone}&text=Seu%20pet%20foi%20encontrado%20com%20sucesso!!!`,
        'headers': {
          'Accept': 'application/json'
        },
        'maxRedirects': 20
      };

      // Instantiate the request object
      const req = https.request(requestDetail, (res) => {
        // Grab the status of the sent request
        const status = res.statusCode
        const chunks = []
        res.on("data", function (chunk) {
          chunks.push(chunk);
        });
        // Callback successfully if the request went through
        if (status === 200 || status === 201) {
          res.on("end", function (chunk) {
            var body = Buffer.concat(chunks);
          });
          callback(false)
        } else {
          callback('Status Code returned was ' + status)
        }
      });

      // Bind to the error event so it doesn't get thrown
      req.on('error', (e) => {
        callback(e)
      })

      // // Add the payload to the request
      req.write(stringPayload)

      // // End the req
      req.end();

    } else {
      callback('Given parameters were missing or invalid')
    }
  }
}

export { helpers }