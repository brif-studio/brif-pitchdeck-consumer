const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const publisher = require('./consumer');

let socket = io.on('connection', (socket) => {
        console.log('User Socket Connected');
        socket.on("disconnect", () => console.log(`${socket.id} User disconnected.`));
        socket.on('consumer started!', () => console.log('consumer started!'))
    })

server.listen(3001, () => {
    publisher(socket).then(() => {
        console.log('consumer started!')
    }).catch((err) => {
        console.log(err)
    })
    console.log('Socket server listening on port 3001')
});
