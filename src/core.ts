const logger = require("./utils/logger")("core")

type Command = "COMMAND" | "GET" | "SET" | "DEL" 
                          | "EXPIRE" | "TTL" 
                          | "INCR" | "DECR"  
                          | "LRANGE" 
                          | "LPUSH" | "RPUSH"
                          | "LPOP" | "RPOP";
type StoreProps = {
  type: "string";
  value: string
} | {
  type: "list";
  value: string[]
};

const store: Record<string, StoreProps> = {};
const expirationTimes: Record<string, number> = {};

const isExpire = (key: string) => {
  return expirationTimes[key] && expirationTimes[key] < Date.now();
}

const checkExpire = (key: string) => {
  if(isExpire(key)){
    delete store[key];
    delete expirationTimes[key];

    return true;
  }

  return false;
}

function getValidList(key: string): string[] | null {
  if (
    checkExpire(key) ||
    !store[key] ||
    store[key].type !== "list" ||
    (store[key].value as string[]).length === 0
  ) {
    return null;
  }
  return store[key].value as string[];
}


const commandHandlers: Record<Command, (args: string[]) => void> = {
  SET: (args) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'SET' command\r\n";
    }

    const [ key, value ] = args;
    store[key] = { type: "string", value };

    return "+OK\r\n";
  },
  GET: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'GET' command\r\n";
    }

    const [ key ] = args;
    if ( checkExpire(key) || !store[key] || store[key].type !== "string" ) {
      return "$-1\r\n";
    }

    const value = store[key].value;

    return `$${value.length}\r\n${value}\r\n`;
  },
  DEL: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'DEL' command\r\n";
    }

    const [ key ] = args;

    if(store[key]) {
      delete store[key];
      delete expirationTimes[key];

      return ":1\r\n";
    } else {
      return ":0\r\n";
    }
    
  },
  EXPIRE: (args) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'DEL' command\r\n";
    } else if( !Number(args[1]) ) {
      return "-ERR wrong argument type (should be number)\r\n";
    }

    const [key, seconds] = args;

    if (!store[key]) {
      return ":0\r\n";
    }

    expirationTimes[key] = Date.now() + Number(seconds) * 1000;

    return ":1\r\n";
  },
  TTL: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'TTL' command\r\n";
    }
    
    const [key] = args;
    
    if (!store[key]) {
      return ":-2\r\n";
    }
    
    if (!expirationTimes[key]) {
      return ":-1\r\n";
    }
    
    const ttl = Math.floor((expirationTimes[key] - Date.now()) / 1000);
    
    return ttl > 0 ? `:${ttl}\r\n` : ":-2\r\n";
  },
  INCR: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'INCR' command\r\n";
    }

    const [key] = args;

    if (!store[key]) {
      return ":0\r\n";
    } else if ( !parseInt(store[key].value as string, 10) ){
      return "-ERR value is not an integer or out of range\r\n";
    }

    const value = parseInt(store[key].value as string, 10);
    store[key].value = (value + 1).toString();
    
    return `:${value + 1}\r\n`;
  },
  DECR: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'DECR' command\r\n";
    }
    
    const [key] = args;
    
    if (!store[key]) {
      return ":0\r\n";
    } else if ( !parseInt(store[key].value as string, 10) ){
      return "-ERR value is not an integer or out of range\r\n";
    }
    
    const value = parseInt(store[key].value as string, 10);
    store[key].value = (value - 1).toString();
    
    return `:${value - 1}\r\n`;
  },
  LRANGE: (args) => {
    if (args.length < 3) {
      return "-ERR wrong number of arguments for 'LRANGE' command\r\n";
    }

    const [key, start, stop] = args;

    if(checkExpire(key) || !store[key] || store[key].type !== "list") {
      return "$-1\r\n"
    };

    const list = store[key].value;
    const startIndex = parseInt(start, 10);
    const stopIndex = parseInt(stop, 10);
    const range = list.slice(startIndex, stopIndex + 1);

    let res = `*${range.length}\r\n`;

    range.forEach((value) => {
      res += `$${value.length}\r\n${value}\r\n`
    })

    return res;
  },
  LPUSH: (args) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'LPUSH' command\r\n";
    }
    
    const [key, ...values] = args;
    
    if (!store[key]) {
      store[key] = { type : "list", value: []};
    }
    
    if (store[key].type !== "list") {
      return "-ERR wrong type of key\r\n"
    }
    
    store[key].value.unshift(...values);
    
    return `:${store[key].value.length}\r\n`;
  },
  RPUSH: (args) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'RPUSH' command\r\n";
    }
    
    const [key, ...values] = args;
    
    if (!store[key]) {
      store[key] = { type : "list", value: []};
    }
    
    if (store[key].type !== "list") {
      return "-ERR wrong type of key\r\n"
    }
    
    store[key].value.push(...values);
    
    return `:${store[key].value.length}\r\n`;
  },
  LPOP: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'LPOP' command\r\n";
    }

    const [key] = args;

    if (checkExpire(key) || !store[key] || store[key].type !== "list" || store[key].value.length === 0) {
      return "$-1\r\n";
    }

    const value = (store[key].value as string[]).shift();

    if (typeof value !== "string") {
      return "$-1\r\n";
    }

    return `$${value.length}\r\n${value}\r\n`
  },
  RPOP: (args) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'RPOP' command\r\n";
    }

    const [key] = args;

    if (checkExpire(key) || !store[key] || store[key].type !== "list" || store[key].value.length === 0) {
      return "$-1\r\n";
    }

    const value = (store[key].value as string[]).pop();

    if (typeof value !== "string") {
      return "$-1\r\n";
    }

    return `$${value.length}\r\n${value}\r\n`
  },
  COMMAND: () => "+OK\r\n",
}

const executeCommand = (command: Command, args: string[]) => {
  logger.log(`Recieved ${command} ${args}`);

  const handler = commandHandlers[command];

  if(!handler) {
    return "-ERR unknown command\r\n";
  }

  return handler(args);
}

const parseCommand = (data: string) => {
  const lines = data.toString().split("\r\n").filter((line) => !!line);
  const command = lines[2].toUpperCase();
  const args = lines.slice(4).filter((_,index) => index%2 == 0);

  return { command, args };
};

export = {
  parseCommand,
  executeCommand,
};