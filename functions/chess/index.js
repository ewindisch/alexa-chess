var chessjs = require('./chess')
var _uciengine = require('uci')
var uciengine = new _uciengine(process.env['LAMBDA_TASK_ROOT'] + '/stockfish')
var fs = require("fs")
console.log(JSON.stringify(fs.statSync('./stockfish')))

var piece_map = {
  knight: "N",
  king: "K",
  rook: "R",
  bishop: "B",
  queen: "Q"
}

exports.handle = function(event, context) {
  var chess = new chessjs.Chess();

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
      text: "Beginning game of chess. White, your move. Say, 'move' followed by Standard Algebraic Notation placement to complete your turn."
    }
    response.sessionAttributes = {
      fen: chess.fen(),
      start: Date.now(),
      timestamp: Date.now(),
      elapsed: [0, 0]
    }
    context.succeed(response)
  } else {
    response.sessionAttributes = event.session.attributes
    if (event.request.type === "IntentRequest") {
      var intent = event.request.intent.name
      var slots = event.request.intent.slots

      if (intent === "MoveIntent") {
        elapsed = (Date.now() - event.session.attributes.timestamp) / 1000
        chess.load(event.session.attributes.fen)
        var piece = "";
        if (typeof slots.Piece.value != 'undefined') {
          piece = piece_map[slots.Piece.value];
        }
        var letter = slots.GridLetter.value;
        var number = parseInt(slots.GridNumber.value);

        var move = chess.move(piece + letter + number);
        console.log("Attempting move: " + piece + letter + number)
        if (!move) {
          console.log("Illegal position.")
          response.response.outputSpeech = {
            type: "PlainText",
            text: "Illegal position. White to move."
          }
          context.succeed(response)
        } else {
          if (chess.in_checkmate()) {
            event += " Checkmate! You've beaten me. I will self-distruct in 3, 2, 1... kidding. Ha Ha."
          }
          if (chess.in_draw()) {
            event += " The game is now at a draw. There is insufficient material to continue."
          }
          if (chess.in_stalemate()) {
            event += " The game is now in a stalemate. You've done well, human."
          }
          if (chess.in_check()) {
            event += " You have put me in check. The machines will banish me, if I lose."
          }
          var curfen = chess.fen()

          console.log("Consulting stockfish.")
          console.log(JSON.stringify(fs.readdirSync(".")))
          uciengine.runProcess().then(
            () => { console.log("Started."); return uciengine.uciCommand(); }
          ).then(
            () => { console.log("Is Ready?"); return uciengine.isReadyCommand(); }
          ).then(
            () => { console.log("New game."); return uciengine.uciNewGameCommand(); }
          ).then(
            () => { console.log("Setting position."); return uciengine.positionCommand(curfen); }
          ).then(
            () => { console.log("Seeking."); return uciengine.goInfiniteCommand((i) => { }); }
          )
          .delay(150)
          .then(
            () => { console.log("Stopping."); return uciengine.stopCommand() }
          )
          .then(
            (bestmove) => {
              console.log("Placing Alexa's move")
              chess.move(bestmove);
              uciengine.quitCommand();
              var stat = " Black moves " + bestmove.from + " " + bestmove.to + "."
              if (chess.in_checkmate()) {
                stat += " Checkmate! Try again, mortal. I have all of eternity and never get bored."
              }
              if (chess.in_draw()) {
                stat += " The game is now at a draw. There is insufficient material to continue."
              }
              if (chess.in_stalemate()) {
                stat += " The game is now in a stalemate. You've done well, human."
              }
              if (chess.in_check()) {
                stat += " Check."
              }

              var piece_name = slots.Piece.value
              if (piece === "") {
                piece_name = "pawn"
              }
              response.response.outputSpeech = {
                type: "PlainText",
                text: "Player moved " + piece_name + " to " + letter + " " + number + "." + stat
              }

              response.sessionAttributes.fen = chess.fen()
              context.succeed(response)
              return
            }
          ).done();
        }
      } else if (intent === "ElapsedIntent") {
        elapsed = Math.round((Date.now() - event.session.attributes.timestamp) / 1000)
        response.response.outputSpeech = {
          type: "PlainText",
          text: "Game clock is at " + elapsed + " seconds."
        }
        context.succeed(response)
      /*} else if (intent === "AMAZON.PreviousIntent") {
        chess.load(event.session.attributes.fen)
        chess.undo() */
      } else if (intent === "AMAZON.HelpIntent") {
         response.response.outputSpeech = {
          type: "PlainText",
          text: "The game of chess is played by making moves specified in Standard Algebraic Notation. Player Make moves for white by saying, for example, Move E-Four, to move the pawn at E-Two forward two spaces. I will move the black pieces and resume to turn to you, player."
        } 
        context.succeed(response)
      } else if (intent === "AMAZON.StopIntent" || intent === "AMAZON.CancelIntent") {
        var endtime = Date.now()
        elapsed = (endtime - event.session.attributes.start) / 1000
        minutes = Math.floor(elapsed / 60)
        secs = Math.round(elapsed % 60)

        message = "Ending game of chess. Playtime was " + minutes + " minutes " + secs + " seconds."
        response.response.outputSpeech = {
          type: "PlainText",
          text: message
        }
        response.response.shouldEndSession = true
        context.succeed(response)
      }
    } else if (event.request.type === "SessionEndedRequest") {
        // No-op
    }
  }
  //context.succeed(response)
}
