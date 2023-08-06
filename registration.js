const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
const ConfluxWeb = require("conflux-web");

require("dotenv").config();

const app = express();
const port = 3001;
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

app.use(cors());
app.use(bodyParser.json());

app.post("/auth", async (req, res) => {
  try {
    const { signature, wallet, network } = req.body;

    if (!signature || typeof signature !== "string" || !wallet || typeof wallet !== "string" || !network) {
      return res.status(400).json({ error: "Please provide a valid signature, a wallet, and the network." });
    }

    const recoveredAddress = verifySignature(network, signature, wallet);

    if (!recoveredAddress) {
      return res.status(400).json({ error: "Invalid wallet address or network mismatch." });
    }

    const [existingUser] = await pool.query("SELECT id, wallet, conflux_address FROM users WHERE wallet = ?", [wallet]);

    if (existingUser.length === 0) {
      const hashedWallet = await bcrypt.hash(wallet, 10);
      const [result] = await pool.query("INSERT INTO users (wallet, conflux_address) VALUES (?, ?)", [
        hashedWallet,
        recoveredAddress,
      ]);
      const newUserId = result.insertId;
      return res.status(201).json({ message: "Registration successful.", userId: newUserId });
    } else {
      const storedAddress = existingUser[0].conflux_address;
      const isSignatureValid = verifyConfluxSignature(signature, wallet, storedAddress);
      if (!isSignatureValid) {
        return res.status(401).json({ error: "Invalid signature. Please try again with the correct wallet." });
      }
      const userId = existingUser[0].id;
      return res.status(200).json({ message: "Login successful.", userId });
    }

  } catch (err) {
    console.error("Error during authentication:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

function verifySignature(network, signature, wallet) {
  switch (network.toLowerCase()) {
    case "ethereum":
      // To do later
      break;
    case "binance":
      // To do later
      break;
    case "conflux":
      const conflux = new ConfluxWeb.HttpProvider(process.env.CONFLUX_RPC_URL);
      const confluxAccounts = conflux.accounts.sign(wallet, signature);
      return confluxAccounts.address.toLowerCase();
    // Add verification cases for other networks if available
    default:
      return null;
  }
}

// Helper function to verify Conflux signature
function verifyConfluxSignature(signature, wallet, storedAddress) {
  try {
    const conflux = new ConfluxWeb.HttpProvider(process.env.CONFLUX_RPC_URL);
    const confluxAccounts = conflux.accounts.sign(wallet, signature);
    return confluxAccounts.address.toLowerCase() === storedAddress.toLowerCase();
  } catch (error) {
    console.error("Error verifying Conflux signature:", error);
    return false;
  }
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
