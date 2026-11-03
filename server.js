const http = require("http");
const fs = require("fs");
const express = require("express");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws"); // this would export only WebSocketServer and WebSocket from the ws module
// require() is for importing modules

const app = express();
const PORT = 3000;

let idArray = []

const rooms = new Map(); // btw map is dictionary btw

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
})

app.get("/game.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "game.html"));
})
// createServer() takes in a function as a parameter, as long as the function itself has:
// req (request)
// res (response)
// as parameters. here they use a lambda rather than making a traditional function
const server = http.createServer(app)

const wss = new WebSocketServer({ server }); // creates a WebSocketServer around the http server
// wss allows for a clean two directional connection and communication, much faster than just http

// .on is sort of like a listener that listens for the event stated in its first parameter
wss.on("connection", (ws) => { // listens for a connection
    const requestID = { type: "REQUEST_CLIENT_ID" }

    ws.send(JSON.stringify(requestID));

    ws.on("message", (rawData) => { // listens for a message
        try {
            const data = JSON.parse(rawData);

            switch (data.type) {
                case "RETURN_CLIENT_ID":
                    const { id } = data.payload
                    ws.clientId = id
                    idArray.push(id)
                    break;
                case "UPDATE_POSITION":
                    for (const client of wss.clients) {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(data)); // sends the data to every other client APART from the person who sent it
                        }
                    }
                    break;
                case "CREATE_ROOM":
                    const roomId = makeID();
                    const { clientId } = data.payload;
                    const roomArray = [clientId];
                    rooms.set(roomId, roomArray);

                    const returnRoomId = {
                        type: "RETURN_ROOM_ID",
                        payload: { id: roomId }
                    }

                    ws.send(JSON.stringify(returnRoomId));
            }
        } catch (error) {
            console.log("Failed to parse incoming message:", error);
        }
    });

    ws.on("close", () => {
        idArray.splice(ws.clientId, 1);
        const deleteDisconnectedID = {
            type: "DELETE_DISCONNECTED_ID",
            payload: { deleteID: ws.clientId }
        }

        for (const client of wss.clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(deleteDisconnectedID));
            }
        }
    })
});

function makeID() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 4; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

server.listen(process.env.PORT || 3000);