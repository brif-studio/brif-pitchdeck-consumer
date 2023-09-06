const { createChatCompletion, generateImages } = require('./helpers/openaiHelper')
const axios = require('axios')
const chatMessages = require('./consts/chatMessages.json')
require('dotenv').config()

const generatePitchDeck = async (responses, pitchDeck, userToken) => {
    const headers = {
        'authorization': userToken
    };

    try {
        const pitchDeckInformations = await getPitchDeckInformations(responses);
        const pitchDeckSlides = await generatePitchDeckSlides(pitchDeckInformations.picthDeck, pitchDeckInformations.images, responses);
        console.log(pitchDeckSlides, 'pitchDeckSlides')
        const pitchDeckMeta = {
            "user-id": `${pitchDeck.userId}`,
            "template": "pitch-deck",
            "slides": pitchDeckSlides
        }
        const pitchDeckJson = JSON.stringify(pitchDeckMeta)
        pitchDeck.meta = pitchDeckJson
        pitchDeck.isCreated = true
        console.log(pitchDeck)

        await axios.put(process.env.PITCH_DECK_UPDATE_URL, pitchDeck, { headers }).then((response)=>{
            console.log('PitchDeck generated successfully!')
            console.log(response.data)
        }).catch((error)=>{
            console.log(error)
        });
        console.log("Pitch deck update successful");
    } catch (error) {
        console.error("Error generating pitch deck:", error);
        await axios.delete(process.env.PITCH_DECK_DELETE_URL, { headers: headers, data: { pitchDeckId: pitchDeck.id } }).then((response)=>{
            console.log("Pitch deck deleted!")
            console.log(response.data)
        }).catch((error)=>{
            console.log(error)
        });      
    }
}

const getPitchDeckInformations = async (responses) => {

    let companyAnalyzerMessages = [...chatMessages.companyAnalyzerMessages]
    companyAnalyzerMessages.push({
        "role": "user",
        "content": `${responses.firstQuestion}, ${responses.secondQuestion}, ${responses.thirdQuestion}, ${responses.fourthQuestion}, ${responses.fifthQuestion}, ${responses.sixthQuestion}, ${responses.seventhQuestion}`
    })
    const companyAnalyzer = await createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: companyAnalyzerMessages,
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    let pitchDeckFinalMessages = [...chatMessages.pitchDeckFinalMessages]
    pitchDeckFinalMessages.push({
        "role": "user",
        "content": `${responses.firstQuestion}, ${responses.secondQuestion}, ${responses.thirdQuestion}, ${responses.fourthQuestion}, ${responses.fifthQuestion}, ${responses.sixthQuestion}, ${responses.seventhQuestion}; ${companyAnalyzer}`
    })

    const pitchDeckFinal = await createChatCompletion({
        model: "gpt-3.5-turbo-16k",
        messages: pitchDeckFinalMessages,
        temperature: 1,
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    console.log(pitchDeckFinal, 'pitchDeckFinal')
    const finalResponses = JSON.parse(pitchDeckFinal)

    let dallePromterMessages = [...chatMessages.dallePromterMessages]
    dallePromterMessages.push({
        "role": "user",
        "content": `${companyAnalyzer}, ${finalResponses[0].image}, ${finalResponses[1].image}, ${finalResponses[2].image}, ${finalResponses[3].image}, ${finalResponses[4].image}, ${finalResponses[5].image}, ${finalResponses[6].image}`
    })

    const dalleResponses = await createChatCompletion({
        model: "gpt-3.5-turbo-16k",
        messages: dallePromterMessages,
        temperature: 1,
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    console.log(dalleResponses, 'dalleResponses')
    const dalleFinalResponses = JSON.parse(dalleResponses)

    let images = []
    for (let i = 0; i < dalleFinalResponses.length; i++) {
        let image = await generateImages({
            prompt: `${dalleFinalResponses[i].prompt}`,
            n: 1,
            size: '1024x1024'
        })
        images.push(image)
    }

    return {
        images: images,
        picthDeck: finalResponses
    }
}


const generatePitchDeckSlides = async (answers, images, responses) => {
    const pitchDeckSlides = []
    pitchDeckSlides.push({
        "slide-type": 'introducing',
        "company-details": {
            "text": answers[0].text,
            "name-surname": responses.companyDetails.nameSurname,
            "title": responses.companyDetails.title,
            "email": responses.companyDetails.email,
            "phone-number": responses.companyDetails.phoneNumber,
            "startup-name": responses.companyDetails["startup-name"],
            "date": responses.companyDetails.date
        }
    })
    pitchDeckSlides.push({
        "slide-text": answers[1].text,
        "slide-images": [{
            "image-url": images[1]
        }]
    })
    pitchDeckSlides.push({
        "slide-text": answers[2].text,
        "slide-images": [{
            "image-url": images[2]
        }]
    })
    pitchDeckSlides.push({
        "slide-text": answers[3].text,
        "slide-images": [{
            "image-url": images[3]
        }]
    })
    pitchDeckSlides.push({
        "slide-text": answers[4].text,
        "slide-images": [{
            "image-url": images[4]
        }]
    })
    pitchDeckSlides.push({
        "slide-text": answers[5].text,
        "slide-images": [{
            "image-url": images[5]
        }]
    })
    pitchDeckSlides.push({
        "slide-text": answers[6].text,
        "slide-images": [{
            "image-url": images[6]
        }]
    })
    pitchDeckSlides.push({
        "slide-type": "cost-metrics",
        "slide-text": {
            "text": answers[7].text,
            "unit-transaction": responses.costMetrics.unitTransaction,
            "unit-costs": responses.costMetrics.unitCosts,
            "total-costs": responses.costMetrics.totalCosts,
            "cac": responses.costMetrics.cac
        }
    })
    pitchDeckSlides.push({
        "slide-type": "revenue-metrics",
        "slide-text": {
            "text": answers[8].text,
            "unit-transaction": responses.revenueMetrics.unitTransaction,
            "price": responses.revenueMetrics.price,
            "total-revenue": responses.revenueMetrics.totalRevenue,
            "cltv": responses.revenueMetrics.cltv
        }
    })
    pitchDeckSlides.push({
        "slide-text": answers[9].text,
        "css-code": answers.tenthSlideTextAsCss,
        "time-plan-details": {
            "enterprise-release-date": responses.timePlanDetails.enterpriseReleaseDate,
            "company-release-date": responses.timePlanDetails.companyReleaseDate,
            "first-demo-release-date": responses.timePlanDetails.firstDemoReleaseDate,
            "first-map-release-date": responses.timePlanDetails.firstMapReleaseDate,
            "first-investment-round-date": responses.timePlanDetails.firstInvestmentRoundDate,
            "product-finalized-date": responses.timePlanDetails.productFinalizedDate
        }
    })
    return pitchDeckSlides
}


module.exports.generatePitchDeck = generatePitchDeck