const { error } = require("console");

type LogProps = {
  mode: keyof Pick<typeof console, "log" | "error" | "warn" | "debug">,
  message: string,
}

const debugNamespaces = ( process.env.DEBUG || "*")
  .split(",")
  .map((ns) => ns.trim());

const logger = (namespace: string) => {

  const log = ({mode, message}: LogProps) => {
    const logMessage = `${new Date().toISOString()} ${mode} [${namespace}]: ${message}`;

    if(mode === "error"){
      console.error('\x1b[31m%s\x1b[0m', logMessage);
      return;
    }

    if (debugNamespaces.includes("*") || debugNamespaces.includes(namespace)){
      (console[mode] as (...args: any[]) => void)(logMessage);
    }
  };

  return {
    log: (message: string) => log({ mode: "log", message }),
    error: (message: string) => log({ mode: "error", message }),
    warn: (message: string) => log({ mode: "warn", message }),
    debug: (message: string) => log({ mode: "debug", message }),
  }
}

export = logger;