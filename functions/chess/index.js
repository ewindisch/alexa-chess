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
      text: "Begin player 1."
    }
    response.sessionAttributes = {
      start: Date.now(),
      timestamp: Date.now(),
      player: 0,
      elapsed: [0, 0]
    }
  } else {
    response.sessionAttributes = event.session.attributes
    if (event.request.type === "IntentRequest") {
      var intent = event.request.intent.name
      var player = parseInt(event.session.attributes.player)

      if (intent === "AMAZON.NextIntent") {
        elapsed = (Date.now() - event.session.attributes.timestamp) / 1000
        response.sessionAttributes.player = (player)?0:1
        response.response.outputSpeech = {
          type: "PlainText",
          text: Math.round(elapsed) + " seconds. Go player " + (response.sessionAttributes.player + 1)
        }
        response.sessionAttributes.timestamp = Date.now()
        response.sessionAttributes.elapsed[player] = (event.session.attributes.elapsed[player] + elapsed)
      } else if (intent === "ElapsedIntent") {
        elapsed = Math.round((Date.now() - event.session.attributes.timestamp) / 1000)
        response.response.outputSpeech = {
          type: "PlainText",
          text: elapsed + " seconds for player " + (player + 1)
        }
        response.sessionAttributes.timestamp = response.session.attributes.timestamp
      } else if (intent === "AMAZON.StopIntent" || intent === "AMAZON.CancelIntent") {
        var endtime = Date.now()
        elapsed = (endtime - event.session.attributes.start) / 1000
        minutes = Math.floor(elapsed / 60)
        secs = Math.round(elapsed % 60)
        p1elapsed = event.session.attributes.elapsed[0]
        p1min = Math.floor(p1elapsed / 60)
        p1sec = Math.round(p1elapsed % 60)
        p2elapsed = event.session.attributes.elapsed[1]
        p2min = Math.floor(p2elapsed / 60)
        p2sec = Math.round(p2elapsed % 60)

        gamemin = p1min + p2min
        gamesec = p1sec + p2sec

        message = "Game was played for " + minutes + " minutes " + secs + " seconds, for a total game time of " + gamemin + " minutes and " + gamesec + " seconds. Player one was clocked at " + p1min + " minutes " + p1sec + " seconds, while player two was clocked at " + p2min + " minutes " + p2sec + " seconds."
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
