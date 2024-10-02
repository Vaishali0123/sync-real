const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const Chats = require("./models/Chatschema");
require("dotenv").config();
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cookieParser());

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    // allowedHeaders: ["my-custom-header"],
    // credentials: true,
  },
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true, //
    });
    console.log("Connection established by socket");
  } catch (err) {
    console.log(err);
  }
};
connectDB();

app.post("/chats", async (req, res) => {
  try {
    const { convId, senderid, receiverid } = req.body;
    const newchat = new Chats({
      convId,
      senderid,
      receiverid,
    });
    await newchat.save();
    res.status(200).json("Chat saved successfully");
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json("Chat not saved", e.message);
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  // Handle incoming messages in specific rooms
  socket.on("joinRoom", (data) => {
    console.log(data, "room");
    socket.join(data.roomId);
  }); // Handle incoming messages in specific rooms

  socket.on("join", (room) => {
    console.log(room, "joined");
    socket.join(room);
    socket.to(room).emit("user-connected", socket.id);
  });

  socket.on("message", ({ room, message, userid, receiver_id }) => {
    console.log({ room, message, userid });

    // io.to(room).emit("receive-message", {
    //   message,
    //   userid,
    //   receiver_id,
    // });
  });

  socket.on("chatMessage", async ({ roomId, data }) => {
    console.log("Message received:", data, roomId);
    socket.to(roomId).emit("receive-message", data);
    // Save the message to the database if necessary
  });

  socket.on("offer", ({ offer, room }) => {
    console.log("offer", offer, room);
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", ({ answer, room }) => {
    console.log("answer", answer, room);
    socket.to(room).emit("answer", answer);
  });

  socket.on("screen-share", ({ room }) => {
    console.log("screen-share");
    socket.to(room).emit("user-screen-share");
  });

  socket.on("ice-candidate", ({ candidate, room }) => {
    console.log("ice-candidate", candidate, room);
    socket.to(room).emit("ice-candidate", candidate);
  });

  socket.on("end-call", (room) => {
    socket.to(room).emit("call-ended"); // Notify other users in the room
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
