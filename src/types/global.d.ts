export {};

declare global {
  type StoreProps = { type: "string"; value: string }
                  | { type: "list"; value: string[] };

  type Command = "COMMAND" | "GET" | "SET" | "DEL"
                          | "EXPIRE" | "TTL"
                          | "INCR" | "DECR"
                          | "LRANGE"
                          | "LPUSH" | "RPUSH"
                          | "LPOP" | "RPOP";

  type aofCommand = "SET" | "DEL" | "EXPIRE"
                          | "INCR" | "DECR"
                          | "LPUSH" | "RPUSH"
                          | "LPOP" | "RPOP";
}
