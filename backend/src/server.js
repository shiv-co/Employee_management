const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { setIo } = require('./utils/socket');

const startServer = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: true,
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      socket.on('join', (userId) => {
        if (userId) {
          socket.join(String(userId));
        }
      });
    });

    setIo(io);

    server.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Server startup failed', error);
    process.exit(1);
  }
};

startServer();
