import net from "net";
const assert = require("node:assert");
const { resolve } = require("node:path");
const { before, after, test } = require("node:test");

let redisClient: net.Socket; //Client instance

const ConnectToRedis = () => {
  return new Promise<void>((resolve, reject) => {
    redisClient = net.createConnection({ port: 6379 }, () => {
      resolve();
    });

    redisClient.on("error", (err) => {
      reject(err);
    });
  });
};

before(async () => {
  await ConnectToRedis();
})

after(() => {
  if(redisClient && !redisClient.destroyed) {
    redisClient.end();
  }
});

const onError = (err: string) => {
  reject(err);
};

const sendCommand = (command: string) => {
  return new Promise((resolve, reject) => {
    if (!redisClient || redisClient.destroyed) {
      reject(new Error("Client is not connected"));
      return;
  }

  redisClient.write(command);

  redisClient.once("data", (data) => {
    resolve(data.toString());
    redisClient.removeListener("error", onError);
  });

  redisClient.once("error", onError)
  });
};

test("should Set and GET a value", async () => {
  const setResponse = await sendCommand("set foo bar");
  assert.strictEqual(setResponse, "+OK\r\n");
  
  const getResponse = await sendCommand("get foo");
  assert.strictEqual(getResponse, "$3\r\nbar\r\n");

  const set2Response = await sendCommand("set foo bar");
  assert.strictEqual(set2Response, "+OK\r\n");
});

function reject(err: string) {
  throw new Error("Function not implemented.");
}
