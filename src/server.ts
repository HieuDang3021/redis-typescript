import net from 'net';

const logger = require("./logger")("server");

const server = net.createServer();
const port = 6379;
const host = "127.0.0.1";

server.on( "connection", (socket: any) => {
  logger.log("Client Connected");

  socket.on( "data", (data: { toString: () => string; }) => {
    const req = data.toString();
    logger.log("Request Data\n" + req);

    socket.write("+OK\r\n");
    // socket.write("res: " + req );
  })

  socket.on( "end", () => {
    logger.log("Client Disconnected");
  })
})

server.listen(port, host, () => {
  logger.log(`Server running at ${host}:${port}`)
})