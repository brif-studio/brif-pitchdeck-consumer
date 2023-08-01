const amqplib = require('amqplib')
const { generatePitchDeck } = require('./pitchDeckGenerator')
require('dotenv').config()

const publisher = async () => {
    try {
        const connection = await amqplib.connect(process.env.RABBITMQ_CONNECTION_URL)
        const channel = await connection.createChannel()
        const exchange = await channel.assertExchange(process.env.EXCHANGE_NAME, 'topic', {
            durable: false
        })

        await channel.assertQueue(process.env.QUEUE_NAME, {
            exclusive: true
        })
        channel.bindQueue(process.env.QUEUE_NAME, exchange.exchange, 'sys.#')
        channel.consume(process.env.QUEUE_NAME, async message => {
                console.log(message.fields.routingKey)
                console.log(JSON.parse(message.content.toString()))
                const { responses, pitchDeck, userToken } = JSON.parse(message.content.toString())
                await generatePitchDeck(responses, pitchDeck, userToken)
                channel.ack(message)
        })
    } catch (error) {
        console.log(error)
    }
}

publisher()