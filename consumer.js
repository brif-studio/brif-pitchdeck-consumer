const amqplib = require('amqplib')
const { generatePitchDeck } = require('./pitchDeckGenerator')
const io = require('./socket')
require('dotenv').config()

const publisher = async () => {
    try {
        const connection = await amqplib.connect({
            protocol: 'amqp',
            hostname: process.env.RABBITMQ_HOST,
            port: process.env.RABBITMQ_PORT,
            username: process.env.RABBITMQ_USERNAME,
            password: process.env.RABBITMQ_PASSWORD,
            vhost: process.env.RABBITMQ_USERNAME,
            heartbeat: 10
        })
        const channel = await connection.createChannel()
        const exchange = await channel.assertExchange(process.env.EXCHANGE_NAME, 'topic', {
            durable: false
        })

        await channel.assertQueue(process.env.QUEUE_NAME)
        channel.bindQueue(process.env.QUEUE_NAME, exchange.exchange, 'sys.#')
        channel.consume(process.env.QUEUE_NAME, async message => {
                console.log(message.fields.routingKey)
                console.log(JSON.parse(message.content.toString()))
                const { responses, pitchDeck, userToken } = JSON.parse(message.content.toString())
                await generatePitchDeck(responses, pitchDeck, userToken)
                io.socket.emit('pitchDeck updated!')
                channel.ack(message)
        })
    } catch (error) {
        console.log(error)
    }
}

publisher()