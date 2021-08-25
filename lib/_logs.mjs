import fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { helpers } from './helpers.mjs'
import zlib from 'zlib'


const _logs = {};

_logs.baseDir = path.join(__dirname, '..', '/.logs')
// Append a string to a file. Create the file does not exists.
_logs.append = (file, str, callback) => {
  // Opening the file for appending
  fs.open(`${_logs.baseDir}/${file}.log`, 'a', (err, fd) => {
    if (!err && fd) {
      // Append to the file and close it
      fs.appendFile(fd, str + '\n', (err) => {
        if (!err) {
          fs.close(fd, (err) => {
            if (!err) {
              callback(false)
            } else {
              callback('Error closing file that was being appended')
            }
          })
        } else {
          callback('Error appending to file')
        }
      })
    } else {
      callback('Could not open file for appending')
    }
  })
}

// List all the logs, and optionally include the compressed logs
_logs.list = (includeCompressedLogs, callback) => {
  fs.readdir(_logs.baseDir, (err, data) => {
    if (!err && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach(fileName => {
        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''))
        }

        // Add on the compressed files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''))
        }
      });
      callback(false, trimmedFileNames)
    } else {
      callback(err, data)
    }
  })
}

// Compress the contents of one .log file into a .gz.b64 file within the same directory

_logs.compress = (logID, newFileId, callback) => {
  const sourceFile = logID + '.log'
  const destFile = newFileId + '.gz.b64'

  // Read the source file
  fs.readFile(`${_logs.baseDir}/${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(`${_logs.baseDir}/${destFile}`, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                if (!err) {
                  // Close the destination file
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      callback(false)
                    } else {
                      callback(err)
                    }

                  })
                } else {
                  callback(err)
                }
              });
            } else {
              callback(err)
            }
          })
        } else {
          callback(err)
        }
      })
    } else {
      callback(err)
    }
  })
}

// Decompress the contents of a .gz.b64 into a string value
_logs.decompress = (fileID, callback) => {
  const fileName = fileID + '.gz.b64';
  fs.readFile(`${_logs.baseDir}/${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress the str
      const inputBuffer = new Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString()
          callback(false, str)
        } else {
          callback(err)
        }
      })
    } else {
      callback(err)
    }
  })
}

// Truncate a log file 
_logs.truncate = (logID, callback) => {
  const fileName = logID + '.log'
  fs.truncate(`${_logs.baseDir}/${fileName}`, 0, (err) => {
    if (!err) {
      callback(false)
    } else {
      callback(err)
    }
  })
}


export { _logs }