const app = require("./src/app");
const { config } = require("./src/config");

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Opening Coach backend listening on http://0.0.0.0:${config.port}`);
});
