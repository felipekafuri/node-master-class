// Storing and editinng data


import fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { helpers } from './helpers.mjs'


const lib = {}

lib.baseDir = path.join(__dirname, '..', '.data')

// Create file
lib.create = (dir, fileName, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${fileName}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string 
      const stringData = JSON.stringify(data)
      // Write the data to the file
      fs.writeFile(fileDescriptor, stringData, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false)
            } else {
              callback('Error closing new file')
            }
          })
        } else {
          callback('Error writing to new file')
        }
      })

    } else {
      callback('Could not create new file, it may already exist')
    }
  })
}

// Read data from a file 
lib.read = (dir, fileName, callback) => {
  fs.readFile(`${lib.baseDir}/${dir}/${fileName}.json`, 'utf8', (err, data) => {
    if (!err && data) {
      callback(false, helpers.parseJsonToObject(data))
    } else {
      callback('Error could not read file')
    }
  })
}

// Update existing file
lib.update = (dir, fileName, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${fileName}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data)

      // Truncate the file
      fs.ftruncate(fileDescriptor, (err) => {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, (err) => {
            if (!err) {
              fs.close(fileDescriptor, (err, data) => {
                if (!err) {
                  callback(false)
                } else {
                  callback('Error closing file')
                }
              })
            } else {
              callback('Error writing to existing file')
            }
          })
        } else {
          callback('Error truncating file')
        }
      })
    } else {
      callback('Error could not open the file for updating, it may not exist yet')
    }
  })
}

lib.delete = (dir,fileName, callback) => {
  // Unlink then file
  fs.unlink(`${lib.baseDir}/${dir}/${fileName}.json`, (err) => {
    if(!err){
      callback(false)
    }else{  
      callback('Error deleting file')
    }
  })
} 

export { lib }