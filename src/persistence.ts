import fs from "fs";
import path from "path";
import loggerFactory from "./utils/logger";
import config from "./config.json"

const fsp = fs.promises;
const logger = loggerFactory("persistence");

class Persistence{
  DATA_FILE = path.join(__dirname,"data.rdb");
  AOF_FILE = path.join(__dirname,"data.aof");
  store: Record<string, StoreProps>;
  expirationTimes: Record<string, number>;

  constructor() {
    this.store = {};
    this.expirationTimes = {};
  }

  async saveSnapshot() {
    const data = JSON.stringify({
      store: this.store,
      expirationTimes: this.expirationTimes,
    })

    try {
      await fsp.writeFile(this.DATA_FILE, data);
      logger.info(`Saved datastore to file: ${this.DATA_FILE}`)
    } catch (error) {
      logger.error(`Faild to save datastore: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  loadSnapshotSync() {
    if (!fs.existsSync(this.DATA_FILE)) return;

    try {
      const data = fs.readFileSync(this.DATA_FILE).toString();

      if(data) {
        const { store: loadedStore, expirationTimes: loadedExpirationTimes } = JSON.parse(data);

        Object.assign(this.store, loadedStore);
        Object.assign(this.expirationTimes, loadedExpirationTimes);

        logger.info("Data loaded successfully")
      }
    } catch (error) {
      logger.info(`Failed to load datastore: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async appendAof( command: Command, args: string[] ) {
    let aofLog = `${command} ${args.join(" ")}\r\n`;

    try {
      await fsp.appendFile(this.AOF_FILE, aofLog);
      logger.info(`Append to AOF file: ${aofLog.trim()}`)
    } catch (error) {
      logger.error(`Failed to append to AOF file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  replayAofSync(executeCommand: (command: Command, args: string[], replayingFromAof: Boolean) => void) {
    if(!config.appendonly || !fs.existsSync(this.AOF_FILE)){
      return;
    }
    
    try {
      const data = fs.readFileSync(this.AOF_FILE).toString();

      if(!data) return;

      const logs = data.split('\r\n').filter(Boolean);

      logger.info("Replay AOF started...");
      
      for (const logEntry of logs) {
        const [command, ...args] = logEntry.split(" ");
        executeCommand(command as Command, args, true);
      }

      logger.info("Replay AOF completed successfully!");
    } catch (error) {
      logger.error(`Failed to append to AOF file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export default new Persistence();