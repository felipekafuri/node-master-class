import http from 'http';
import https from 'https'
import url from 'url';
import { StringDecoder } from 'string_decoder'
import { environmentToExport } from './config.mjs'
import fs from 'fs'
import { lib } from './lib/data.mjs'
import { handlers } from './lib/handlers.mjs'
import { helpers } from './lib/helpers.mjs';

// Instanciante the http server
const httpServer = http.createServer((request, response) => {
  unifiedServer(request, response)
})

// Start the server, and have it listen on port 3333
httpServer.listen(environmentToExport.httpPort, () => {
  console.log(`Server is listening on port ${environmentToExport.httpPort}`);
})

// Instanciante the HTTPS server
const httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (request, response) => {
  unifiedServer(request, response)
})

// Start the HTTPS server
httpsServer.listen(environmentToExport.httpsPort, () => {
  console.log(`Server is listening on port ${environmentToExport.httpsPort}`);
})
// all the server logic for both the http and https server
const unifiedServer = (request, response) => {
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
    const chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens
}