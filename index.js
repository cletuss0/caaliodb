const express = require("express");
const mysql = require("mysql2/promise");
const app = express();
const port = 3001;
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs"); // Require the fs module to read SSL certificates
require("dotenv").config();

const registrationSystem = require("./registration");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

pool.getConnection()
  .then((connection) => {
    console.log('Connected to MySQL database');
    connection.release();
  })
  .catch((err) => {
    console.error('Error connecting to MySQL database: ', err);
    process.exit(1); // Exit the application on a database connection error
  });

app.use(cors());
app.use(bodyParser.json());

app.use("/register", registrationSystem);

// Read the SSL certificate and private key
const sslOptions = {
  key: fs.readFileSync("./cert/private.key"),
  cert: fs.readFileSync("./cert/certificate.crt"),
};

// Create an HTTPS server
const https = require("https");
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(port, () => {
  console.log(`Listening for API Calls on port ${port} over HTTPS`);
});
