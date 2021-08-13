import crypto from 'crypto'
import { environmentToExport } from '../config.mjs'
import {lib} from './data.mjs'

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
  }
}

export { helpers }