import net from "net";
import { resolve } from "path";
const {buildRedisCommand} = require("./utils");
const assert = require("node:assert");
// const { resolve } = require("node:path");
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

  let sendCommand = buildRedisCommand(command);

  redisClient.write(sendCommand);

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

});

test("GET should return $-1 for a non-existent key", async () => {
  const getResponse = await sendCommand("get foo1");
  assert.strictEqual(getResponse, "$-1\r\n");
});

test("should DEL a value", async () => {
  const delResponse = await sendCommand("del foo");
  assert.strictEqual(delResponse, ":1\r\n");

  const getResponse = await sendCommand("get foo");
  assert.strictEqual(getResponse, ":1\r\n");
});

test("DEL should return :0 for a non-existent key", async () => {
  const delNonExistResponse = await sendCommand("del bar");
  assert.strictEqual(delNonExistResponse, ":0\r\n");
});

test("should Exipre a key", async () => {
  await sendCommand("set fooExp barExp")
  const expireResponse = await sendCommand("expire fooExp 1");
  assert.strictEqual(expireResponse, ":1\r\n");

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const getResponse = await sendCommand("get fooExp");
  assert.strictEqual(getResponse, ":1\r\n");
});

function reject(err: string) {
  throw new Error("Function not implemented.");
}
