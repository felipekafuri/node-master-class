import { lib } from './data.mjs'
import { helpers } from './helpers.mjs'
import { environmentToExport } from '../config.mjs'

// Define handlers
const handlers = {}

// Ping handler
handlers.ping = (data = {}, callback) => {
  callback(200, data)
}

// Users handler
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method.toLowerCase())) {
    handlers._users[data.method.toLowerCase()](data, callback)
  } else {
    callback(405)
  }
}

// Container for the users submethods
handlers._users = {
  // data: firstName, lastName, phone, password, tosAgreement
  post: (data, callback) => {
    const { firstName, lastName, phone, password, tosAgreement } = data.payload
    // Check that all required field are filled out
    if (firstName && lastName && (phone && phone.length === 9) && password && tosAgreement) {
      // Make sure that the user doesnt already exists
      lib.read('users', phone, (err, data) => {
        if (err) {
          // Hash the password
          const hashedPassword = helpers.hash(password)

          if (hashedPassword) {
            const user = {
              firstName,
              lastName,
              phone,
              password: hashedPassword,
              tosAgreement
            }

            lib.create('users', phone, user, (err) => {
              if (!err) {
                callback(200, user)
              } else {
                console.log(err)
                callback(500, { error: 'Error: Could not create the new user' })
              }
            })
          } else {
            callback(500, { error: 'Error: Could not hash the users password' })
          }
        } else {
          callback(400, { error: 'Error, user with this phone number already exists' })
        }
      })
    } else {
      callback(400, { error: 'Invalid data was sent' })
    }
  },

  // data: phone
  // TODO Only let authenticated user access their object
  get: (data, callback) => {
    const { phone } = data.queryStringObject
    if (phone && phone.length === 9) {
      const { token } = data.headers

      helpers.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          lib.read('users', phone, (err, data) => {
            if (!err && data) {
              // remove the password before it returned
              delete data.password
              callback(200, data)
            } else {
              callback(404)
            }
          })
        } else {
          callback(403, { error: 'Missing required token in header or token is invalid' })
        }
      })
    } else {
      callback(200, { error: 'Verify the phone' })
    }
  },

  // Users - put
  // data: phone
  // TODO Only let authenticated user access their object
  put: (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload
    if (phone && phone.length === 9) {
      if (firstName || lastName || password) {
        const { token } = data.headers
        helpers.verifyToken(token, phone, (tokenIsValid) => {
          if (tokenIsValid) {
            lib.read('users', phone, (err, data) => {
              if (!err && data) {
                // Update the necessary field
                firstName ? data.firstName = firstName : data.firstName
                lastName ? data.lastName = lastName : data.lastName;
                password ? data.password = helpers.hash(password) : data.password;

                // Update user
                lib.update('users', phone, data, (err, data) => {
                  if (!err) {
                    callback(200, data)
                  } else {
                    callback(500, { error: 'Error: Could not hash the users password' })
                  }
                })
              } else {
                callback(404, { error: 'The specified user does not exists' })
              }
            })
          } else {
            callback(403, { error: 'Missing required token in header or token is invalid' })
          }
        })
      } else {
        callback(400, { error: 'Missing fields to update' })
      }
    } else {
      callback(400, { error: 'Missing required field' })
    }
  },

  // Users - delete
  // data: phone
  delete: (data, callback) => {
    const { phone } = data.queryStringObject
    if (phone && phone.length === 9) {
      const { token } = data.headers
      helpers.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          lib.delete('users', phone, (err, data) => {
            if (!err) {
              callback(200, data)
            } else {
              callback(500, { error: 'Error: Could not delete the user' })
            }
          })
        } else {
          callback(403, { error: 'Missing required token in header or token is invalid' })
        }
      })
    } else {
      callback(400, { error: 'Missing required field' })
    }
  }
};

// Tokens handler
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method.toLowerCase())) {
    handlers._tokens[data.method.toLowerCase()](data, callback)
  } else {
    callback(405)
  }
}

handlers._tokens = {

  // Required data: phone, password
  post: (data, callback) => {
    const { phone, password } = data.payload
    if (phone && phone.length === 9 && password) {
      // Lookup user who matches that phone number
      lib.read('users', phone, (err, data) => {
        if (!err && data) {
          const hashedSentPassword = helpers.hash(password)

          if (hashedSentPassword === data.password) {
            // If valid, create a new token with a random name. Set expiration date to 1 hour from now
            const tokenId = helpers.createRandomString(20)

            const expires = Date.now() + 1000 * 60 * 60

            const token = {
              tokenId,
              expires,
              phone
            }
            // Create token object
            lib.create('tokens', tokenId, token, (err) => {
              if (!err) {
                callback(200, token)
              } else {
                callback(500, { error: 'Could not create the new token' })
              }
            })
          } else {
            callback(400, { error: 'Incorrect password' })
          }
        } else {
          callback(400, { error: 'The specified user does not exists' })
        }
      })
    } else {
      callback(400, { error: 'Missing required fields' })
    }
  },

  //Required data: tokenId
  get: (data, callback) => {
    const { tokenId } = data.queryStringObject
    if (tokenId) {
      lib.read('tokens', tokenId, (err, data) => {
        if (!err && data) {
          // Remove the password before it returned
          callback(200, data)
        } else {
          callback(404)
        }
      })
    }
  },

  // Required data: id, extend
  put: (data, callback) => {
    const { id, extend } = data.payload
    if (id && extend) {
      lib.read('tokens', id, (err, data) => {
        if (!err && data) {
          // check if the token is expired
          if (data.expires > Date.now()) {
            // Set the expiration an hour from now
            data.expires = Date.now() + 1000 * 60 * 60

            // Store the new update

            lib.update('tokens', id, data, (err) => {
              if (!err) {
                callback(200)
              } else {
                callback(500, { error: 'Could not update the token' })
              }
            })
          } else {
            callback(400, { error: 'the token has already expired and cant be extend' })
          }

        } else {
          callback(400, { error: 'Specified token does not exist' })
        }
      })
    } else {
      callback(400, { error: 'Missing required fields' })
    }
  },

  // Required data: id
  delete: (data, callback) => {
    const { id } = data.queryStringObject
    if (id) {
      lib.delete('tokens', id, (err, data) => {
        if (!err) {
          callback(200)
        } else {
          callback(500, { error: 'Could not delete the token' })
        }
      })
    }
  }
};

// Checks handler
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method.toLowerCase())) {
    handlers._checks[data.method.toLowerCase()](data, callback)
  } else {
    callback(405)
  }
}

// Container for all checks methods 
handlers._checks = {
  // Required data: protocol, url, method, successCodes, timeoutSeconds
  post: (data, callback) => {
    // Validate inputs
    const { protocol, url, method, successCodes, timeoutSeconds } = data.payload

    if (protocol && url && method && successCodes && timeoutSeconds) {
      if (['http', 'https'].indexOf(protocol.toLowerCase()) > -1) {
        if (['get', 'post', 'delete', 'put', 'patch'].indexOf(method.toLowerCase()) > -1) {
          if (timeoutSeconds >= 1 && timeoutSeconds <= 5) {
            // Get token from the headers 
            const { token } = data.headers
            // Lookup the user by reading the token
            lib.read('tokens', token, (err, tokenData) => {
              if (!err && tokenData) {
                const userPhone = tokenData.phone

                lib.read('users', userPhone, (err, userData) => {
                  if (!err && userData) {
                    const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []

                    // Verify that the user has less than the number of max checks
                    if (userChecks.length < environmentToExport.maxChecks) {
                      const checkId = helpers.createRandomString(20)

                      // Create the check object, and include the user`s phone
                      const checkObject = {
                        id: checkId,
                        userPhone,
                        protocol,
                        url,
                        method,
                        successCodes,
                        timeoutSeconds
                      }

                      // Save the object to disk
                      lib.create('checks', checkId, checkObject, (err) => {
                        if (!err) {
                          // Add the checkId to the users object
                          userData.checks = userChecks
                          userData.checks.push(checkId)

                          // Update the user object
                          lib.update('users', userPhone, userData, (err) => {
                            if (!err) {
                              callback(200, checkObject)
                            } else {
                              callback(500, { error: 'Could not update the user with the new check' })
                            }
                          })
                        } else {
                          callback(500, { error: 'Could not create the new check' })
                        }
                      })

                    } else {
                      callback(400, { error: 'The user has reached the maximum number of checks' })
                    }
                  } else {
                    callback(403)
                  }
                })
              } else {
                callback(403)
              }
            })
          }
        }
      } else {
        callback(400, { error: 'Missing required fields' })
      }
    }
  },
  // Required data: id
  get: (data, callback) => {
    const { id } = data.queryStringObject
    if (id) {
      //lookup the check 
      lib.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          const { token } = data.headers

          helpers.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Return the check data 
              callback(200, checkData)
            } else {
              callback(403)
            }
          })
        } else {
          callback(404)
        }
      })
    } else {
      callback(200, { error: 'Missing required field' })
    }
  }
}


//Not found handlers 
handlers.notFound = (data, callback) => {
  callback(404)
}

export { handlers }