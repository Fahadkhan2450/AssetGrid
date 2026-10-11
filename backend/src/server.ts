import http from 'http';

import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initSocket } from './websocket/socket.js';

const server = http.createServer(app);

initSocket(server);

connectDatabase()
  .then(() => {
    server.listen(env.port, () => {
      console.log(
        `API running on http://localhost:${env.port}`
      );
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });