require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const tournamentRoutes = require("./routes/tournaments");
const stockRoutes = require("./routes/stocks");
const tradeRoutes = require("./routes/trades");

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const uri = process.env.MONGO_URI;
const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function connectDB() {
  try {
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ Pinged the db. You successfully connected to MongoDB!");
    // stockRoutes.schedulePriceRefresh();
  } catch (err) {
    console.error("❌ Connection failed:", err);
  }
}

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tradeRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/stocks", stockRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});