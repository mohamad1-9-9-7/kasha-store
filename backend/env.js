const path = require("path");
const os = require("os");
const fs = require("fs");

const localEnv = path.join(os.homedir(), ".kashkha", "backend.env");
if (fs.existsSync(localEnv)) {
  require("dotenv").config({ path: localEnv, quiet: true });
} else {
  require("dotenv").config({ quiet: true });
}
