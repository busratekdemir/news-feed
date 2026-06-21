const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const newsRoutes = require("./routes/news.routes");
const { syncNewsCache } = require("./services/news.service");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "DT Cloud News Feed API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/news", newsRoutes);

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://localhost:${PORT}`);

  if (process.env.NEWS_SYNC_ON_START === "true") {
    syncNewsCache()
      .then((result) => {
        console.log("News cache sync finished:", result.usage);
      })
      .catch((error) => {
        console.error("News cache sync failed:", error.message);
      });
  }
});

server.on("error", (error) => {
  console.error("Server error:", error);
});
