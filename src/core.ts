const logger = require("./utils/logger")("core")

type Command = "COMMAND" | "GET" | "SET" | "DEL" | "EXPIRE" | "TTL" | "INCR" | "DECR";
type StoreProps = {
  type: "string",
  value: string
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
    } else if ( !parseInt(store[key].value, 10) ){
      return "-ERR value is not an integer or out of range\r\n";
    }

    const value = parseInt(store[key].value, 10);
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
    } else if ( !parseInt(store[key].value, 10) ){
      return "-ERR value is not an integer or out of range\r\n";
    }

    const value = parseInt(store[key].value, 10);
    store[key].value = (value - 1).toString();
    
    return `:${value - 1}\r\n`;
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