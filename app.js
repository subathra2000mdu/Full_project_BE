const express = require('express');
const cors = require("cors");
const authRouter = require("./routers/authrouter");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);

module.exports = app;