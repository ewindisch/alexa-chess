exports.handler = function(event, context) {
  //event.session.sessionId
  var elapsed = 0
  var response = {
    "version": "1.0",
    response: {
      shouldEndSession: false
    }
  }

  if (event.session.new) {
    response.response.outputSpeech = {
      type: "PlainText",
      text: "Begin."
    }
    response.sessionAttributes = {
      start: Date.now(),
      timestamp: Date.now()
    }
  } else {
    response.sessionAttributes = event.session.attributes
    if (event.request.type === "IntentRequest") {
      var intent = event.request.intent.name
      if (intent === "AMAZON.NextIntent") {
        elapsed = Math.round((Date.now() - event.session.attributes.timestamp) / 1000)
        response.response.outputSpeech = {
          type: "PlainText",
          text: elapsed + " seconds. Go."
        }
        response.sessionAttributes.timestamp = Date.now()
      } else if (intent === "ElapsedIntent") {
        elapsed = Math.round((Date.now() - event.session.attributes.timestamp) / 1000)
        response.response.outputSpeech = {
          type: "PlainText",
          text: elapsed + " seconds."
        }
        response.sessionAttributes.timestamp = response.session.attributes.timestamp
      } else if (intent === "AMAZON.StopIntent" || intent === "AMAZON.CancelIntent") {
        elapsed = (Date.now() - event.session.attributes.start) / 1000
        minutes = Math.floor(elapsed / 60)
        secs = Math.round(elapsed % 60)
        message = "Game lasted " + minutes + " minutes " + secs + " seconds."
        response.response.outputSpeech = {
          type: "PlainText",
          text: message
        }
        response.response.shouldEndSession = true
      }
    } else if (event.request.type === "SessionEndedRequest") {
        // No-op
    }
  }
  context.succeed(response)
}
