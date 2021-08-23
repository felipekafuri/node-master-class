import http from 'http';
import https from 'https'
import url from 'url';
import { StringDecoder } from 'string_decoder'
import { environmentToExport } from '../config.mjs'
import fs from 'fs'
import { handlers } from './handlers.mjs'
import { helpers } from './helpers.mjs';
import { fileURLToPath } from 'url';
import path from 'path'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helpers.sendTwilioSMS('62992944121', 'Hello!!', (err)=>{
//   console.log(err)
// })

const server = {}


// Instanciante the http server
server.httpServer = http.createServer((request, response) => {
  server.unifiedServer(request, response)
})

// Instanciante the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '..', '/https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '..', '/https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (request, response) => {
  server.unifiedServer(request, response)
})

// all the server logic for both the http and https server
server.unifiedServer = (request, response) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(request.url, true);
  // Get the path from URL 
  const { pathname } = parsedUrl;
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, '')

  // Get the query string ad an object
  const { query: queryStringObject } = parsedUrl

  // Get the http method
  const { method } = request;

  // Get the headers as an object
  const { headers } = request;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  request.on('data', (data) => {
    buffer += decoder.write(data);
  });
  request.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should be handled by
    const chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    }

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler
      statusCode = typeof (statusCode) === 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to empty object
      payload = typeof (payload) === 'object' ? payload : {};

      // Convert payload to a string
      const payloadString = JSON.stringify(payload);

      // Send the response
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(statusCode);
      response.end(payloadString);
    })
  });
}

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
}

server.init = () => {
  server.httpServer.listen(environmentToExport.httpPort, () => {
    console.log(`Server is listening on port ${environmentToExport.httpPort}`);
  })

  // Start the HTTPS server
  // server.httpsServer.listen(environmentToExport.httpsPort, () => {
  //   console.log(`Server is listening on port ${environmentToExport.httpsPort}`);
  // })
}


export { server }