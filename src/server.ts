import net from 'net';
const { parseCommand, executeCommand } = require('./core');

const logger = require("./utils/logger")("server");

const server = net.createServer();
const port = 6379;
const host = "127.0.0.1";

server.on( "connection", (socket: any) => {
  logger.log("Client Connected");
  
  socket.on( "data", (data: { toString: () => string; }) => {
    let res;
    try {
      const { command, args } = parseCommand(data);
      
      res = executeCommand(command, args);
    } catch (error) { 
      logger.error(error);
      res = "-ERR unknown command\r\n"
    }

    const req = data.toString();

    socket.write(res);
  })

  socket.on( "end", () => {
    logger.log("Client Disconnected");
  })
})

server.listen(port, host, () => {
  logger.log(`Server running at ${host}:${port}`)
})