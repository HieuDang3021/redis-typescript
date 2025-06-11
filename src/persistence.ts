import fs from "fs";
import path from "path";
import loggerFactory from "./utils/logger";

const fsp = fs.promises;
const logger = loggerFactory("persistence");

class Persistence{
  DATA_FILE = path.join(__dirname,"data.rdb");
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
      logger.error(`Faild to save datastore: ${error}`)
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
      logger.info(`Failed to load datastore: ${error}`)
    }
  }

}

export default new Persistence();