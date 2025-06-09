import net from "net";
const {buildRedisCommand} = require("../utils/utils");
const assert = require("node:assert");
const { before, after, test } = require("node:test");

let redisClient: net.Socket; //Client instance

// Establish connection to the redis server
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

// Send command to the redis server
const sendCommand = (command: string): Promise<string> => {
  
  return new Promise<string>((resolve, reject) => {
    
    if (!redisClient || redisClient.destroyed) {
      reject(new Error("Client is not connected"));
      return;
    }

    //rebuild command in the correct format 
    let sendCommand = buildRedisCommand(command);

    redisClient.write(sendCommand);

    redisClient.once("data", (data) => {
      resolve(data.toString());
      redisClient.removeListener("error", onError);
    });

    redisClient.once("error", onError)
  });
};

function reject(err: string) {
  throw new Error("Function not implemented.");
}

//TEST CASE-----------------------------------------------

test("should warn unknown command", async () => {
  const unknownResponse = await sendCommand("unknown command");
  assert.strictEqual(unknownResponse, "-ERR unknown command\r\n");
})

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
  assert.strictEqual(getResponse, "$-1\r\n");
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
  assert.strictEqual(getResponse, "$-1\r\n");
});

test("should not Expire non-existent key", async () => {
  const expireWrongResponse = await sendCommand("expire foo 1000");
  assert.strictEqual(expireWrongResponse, ":0\r\n");
});

test("should Expire in correct format", async () => {
  await sendCommand("set foo bar");

  const expireWrongResponse = await sendCommand("expire foo one");
  assert.strictEqual(expireWrongResponse, "-ERR wrong argument type (should be number)\r\n");
});

test("should return correct TTL for a key and error cases", async () => {
  await sendCommand("set fooT expT");
  const expireResponse = await sendCommand("expire fooT 5");
  assert.strictEqual(expireResponse, ":1\r\n");
  
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const getResponse = await sendCommand("TTL fooT");
  const match = getResponse.match(/^:(\d+)\r\n$/);
  const ttlValue = parseInt(match ? match[1] : "null");

  assert.ok(ttlValue <= 3, "expected ttl value tobe lest or equal to 3");

  const errorResponse = await sendCommand("ttl");
  assert.strictEqual(errorResponse, "-ERR wrong number of arguments for 'TTL' command\r\n");
});

test("should INCR a key and error case", async () => {
  await sendCommand("set fooIncr 5");
  
  const response1 = await sendCommand("incr fooIncr");
  assert.strictEqual(response1, ":6\r\n");
  
  const getResponse1 = await sendCommand("get fooIncr");
  assert.strictEqual(getResponse1, "$1\r\n6\r\n");
  
  const response2 = await sendCommand("incr");
  assert.strictEqual(response2, "-ERR wrong number of arguments for 'INCR' command\r\n");
  
  await sendCommand("set fooInvalidI invalid");
  
  const errorResponse = await sendCommand("incr fooInvalidI");
  assert.strictEqual(errorResponse, "-ERR value is not an integer or out of range\r\n");
});

test("should DECR a key and error case", async () => {
  await sendCommand("set fooDecr 5");
  
  const response1 = await sendCommand("decr fooDecr");
  assert.strictEqual(response1, ":4\r\n");
  
  const getResponse1 = await sendCommand("get fooDecr");
  assert.strictEqual(getResponse1, "$1\r\n4\r\n");
  
  const response2 = await sendCommand("decr");
  assert.strictEqual(response2, "-ERR wrong number of arguments for 'DECR' command\r\n");
  
  await sendCommand("set fooInvalidD invalid");
  
  const errorResponse = await sendCommand("decr fooInvalidD");
  assert.strictEqual(errorResponse, "-ERR value is not an integer or out of range\r\n");
});