const express = require("express");
const app = express();
const http = require("http");
const fs = require("fs");

app.use(express.static("./public"));

const server = http.createServer(app);
const io = require("socket.io")(server, {
  pingInterval: 1000 * 5 * 60,
  pingTimeout: 30 * 60 * 1000 
});

var playerName = {}; // keeps track of user data
var games = {}; // keeps track of what game a user is in

class Game {
  constructor(players) {
    this.players = players;
    this.playerNames = [playerName[players[0]],playerName[players[1]]]
    this.turn = players[0];
    this.scoreboard = [0,0];
    this.round();
    console.log("Game starts!" + this.playerNames);
  }
  round() {
    // tell players that game started
    // tell player to pick word
    // or tell them to wait for other player
    this.string = []; 
    this.currentBoard = 0;
    this.guessedLetters = "";
    this.currentWord = "";
    for (let i=0; i < this.players.length; i++) {
      io.to(this.players[i]).emit("gameStarts",this.playerNames);
      if (this.players[i] == this.turn) {
        io.to(this.players[i]).emit("getWord");
      }
      else {
        io.to(this.players[i]).emit("wait");
      }
    }
  }
  // returns all player nicknames
  getPlayers() {
    return this.playerNames;
  }
  // set the current word if it is the player's turn
  setWord(word, player, letter=null) {
    word = word.toUpperCase();
    if (this.turn == player && this.currentWord == "") {
      // reset board because this is the start of a new round
      this.currentBoard = 0;
      this.guessedLetters = "";
      this.string = [];
      if (word.includes(" ")) {
        for (let i=0; i < word.length; i++) {
          // letter in alphabet becomes _
          if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(word.substring(i,i+1))) {
            this.string.push("_")
          }
          // punctuation/space stays
          else {
            this.string.push(word.substring(i,i+1));
          }
        } // end of for loop
      } // end of includes space if statement
      else {
        for (let i=0; i < word.length; i++) {
          this.string.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(word.substring(i,i+1)) ? "_" : word.substring(i,i+1));
        }
      }
      this.currentWord = word; 
      // update word for all players, yay!
      this.updateAllPlayers("setWord",{"newRound":true,"string":this.string.join(""),"currentBoard":this.currentBoard, "letter": letter});
    }
    // ... no cheating, don't try setting the word when it's not your turn
    // just do nothing ig
  } // end of setWord function
  // player guesses a letter!
  guessLetter(letter,player){
    // yep, it's this person's turn to guess, and they didn't guess that letter yet
    if (player != this.turn && this.currentWord != "" && !(this.guessedLetters.includes(letter))) {
      if (this.currentWord.includes(letter)) {
        // get the index of every letter
        let i = 0;
        while (this.currentWord.indexOf(letter, i) != -1) {
          // console.log(this.currentWord.indexOf(letter, i));
          i = this.currentWord.indexOf(letter, i);
          this.string[i] = letter;
          i++;
        }
      }
      else {
        this.currentBoard += 1;
      }
      this.guessedLetters += letter;
      // send everyone the results
      this.updateAllPlayers("setWord",{"string":this.string.join(""),"currentBoard": this.currentBoard, "letter": letter});
      // check if lose
      if (this.currentBoard == 9) {
        // rip they lost
        if (this.turn == this.players[0]) this.scoreboard[0] += 100;
        else this.scoreboard[1] += 100;
        if (this.turn == this.players[0]) this.turn = this.players[1];
        else this.turn = this.players[0];
        for (let i=0; i < this.players.length; i++) {
          if (this.players[i] == this.turn) {
             io.to(this.players[i]).emit("roundEnd",{"status":"lose","string":this.currentWord,"scoreboard":this.scoreboard,"turn":true});
          }
          else {
             io.to(this.players[i]).emit("roundEnd",{"status":"lose","string":this.currentWord,"scoreboard":this.scoreboard,"turn":false});
          }
        }
        this.currentWord = "";
        this.currentBoard = 0;
      }
      else if (this.string.join("") == this.currentWord){
        // yay they guessed the word and won
        if (this.turn == this.players[0]) this.scoreboard[1] += 100;
        else this.scoreboard[0] += 100;
        if (this.turn == this.players[0]) this.turn = this.players[1];
        else this.turn = this.players[0];
        for (let i=0; i < this.players.length; i++) {
          if (this.players[i] == this.turn) {
             io.to(this.players[i]).emit("roundEnd",{"status":"win","string":this.currentWord,"scoreboard":this.scoreboard,"turn":true});
          }
          else {
             io.to(this.players[i]).emit("roundEnd",{"status":"win","string":this.currentWord,"scoreboard":this.scoreboard,"turn":false});
          }
        }
        this.currentWord = "";
        this.currentBoard = 0;
      }
    }
  } // end of guessLetter function
  updateAllPlayers(message,data) {
    for (let i=0; i<this.players.length;i++) {
      io.to(this.players[i]).emit(message,data);
    }
  }
  // end game 
  endGame() {
    for (let i=0; i<this.players.length; i++) {
      io.to(this.players[i]).emit("endGame");
      delete playerName[this.players[i]];
      delete games[this.players[i]];
    }
    // delete player from playernames and delete game
  }
} // end of Game class

var queue = [];
io.on("connection", function (socket) {
  console.log("NEW CONNECTION!!", socket.id);
  // join a game
  socket.on("join", function (name) {
    // no "" as names
    if (name === "") {
      name = "Player " + (Math.floor(Math.random() * 1000) + 1);
    }
    playerName[socket.id] = (name ? name : "...").substring(0, 16); // it will never default to ... but anyway... 
    // add player to queue
    if (queue.indexOf(socket.id) == -1) {
      queue.push(socket.id);
    } 
    else {
      // disconnect if client double joins
      return socket.disconnect();
    }
    // if there are 2 players, start game
    if (queue.length == 2) {
      let players = queue.splice(0, 2)
      const g = new Game(players); 
      for (let i=0; i<players.length; i++) {
        games[players[i]] = g;
      }
    } // wait room if not 2 players yet 
    else {
      socket.emit("waitRoom");
    }
  });
  socket.on("setWord", function(word) {
    games[socket.id].setWord(word.substring(0,100).trim(),socket.id);
    console.log(word);
  });
  socket.on("letterClicked", function(letter) {
    if (socket.id in games)
      games[socket.id].guessLetter(letter,socket.id);
  });
  socket.on("disconnect", function (reason) {
    console.log("disconnection",  socket.id, reason);
    if (socket.id in games) {
      games[socket.id].endGame();
    }
  });
});

server.listen(process.env.PORT || 3000, "0.0.0.0", function () {
  console.log(
    "Express server listening on port %d in %s mode",
    this.address().port,
    app.settings.env
  );
});
