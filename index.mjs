// Dependencies
import { server } from './lib/server.mjs'
// import { workers } from './lib/workers.mjs'

const app = {
  init: () =>{
    server.init()
    // workers.init()
  }
}


app.init()

export { app }
