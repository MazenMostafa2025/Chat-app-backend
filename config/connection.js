const { connect } = require("mongoose");

async function connectDB() {
  connect(process.env.MONGO_URL).then((data) => {
    console.log("connected to mongoose at host " + data.connection.host);
  });
}

module.exports = connectDB;
