const amqplib = require('amqplib')
const { generatePitchDeck } = require('./pitchDeckGenerator')
require('dotenv').config()

const publisher = async (socket) => {
    socket.emit('consumer started!')
    try {
        let connection = await amqplib.connect({
            protocol: 'amqp',
            hostname: process.env.RABBITMQ_HOST,
            port: process.env.RABBITMQ_PORT,
            username: process.env.RABBITMQ_USERNAME,
            password: process.env.RABBITMQ_PASSWORD,
            vhost: process.env.RABBITMQ_USERNAME,
            heartbeat: 10
        })

        connection.on('close', async ()=>{
            connection = await amqplib.connect({
                protocol: 'amqp',
                hostname: process.env.RABBITMQ_HOST,
                port: process.env.RABBITMQ_PORT,
                username: process.env.RABBITMQ_USERNAME,
                password: process.env.RABBITMQ_PASSWORD,
                vhost: process.env.RABBITMQ_USERNAME,
                heartbeat: 10
            })
        })

        connection.on('error', (err) => {
            console.log(err)
        })

        connection.on('blocked', (reason) => {
            console.log(reason)
        })


        const channel = await connection.createChannel()
        
        channel.on('close', async ()=>{
            connection = await amqplib.connect({
                protocol: 'amqp',
                hostname: process.env.RABBITMQ_HOST,
                port: process.env.RABBITMQ_PORT,
                username: process.env.RABBITMQ_USERNAME,
                password: process.env.RABBITMQ_PASSWORD,
                vhost: process.env.RABBITMQ_USERNAME,
                heartbeat: 10
            })
        })

        channel.on('error', (err) => {
            console.log(err)
        })

        channel.on('blocked', (reason) => {
            console.log(reason)
        })
        
        
        const exchange = await channel.assertExchange(process.env.EXCHANGE_NAME, 'topic', {
            durable: false
        })

        await channel.assertQueue(process.env.QUEUE_NAME)
        channel.bindQueue(process.env.QUEUE_NAME, exchange.exchange, 'sys.pitchdeck')
        channel.consume(process.env.QUEUE_NAME, async message => {
                console.log(message.fields.routingKey)
                console.log(JSON.parse(message.content.toString()))
                const { responses, pitchDeck, userToken } = JSON.parse(message.content.toString())
                await generatePitchDeck(responses, pitchDeck, userToken)
                socket.emit('pitchDeck updated!');
                channel.ack(message)
        })
    } catch (error) {
        console.log(error)
    }
}

module.exports = publisher