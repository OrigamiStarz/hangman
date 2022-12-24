// create board
const c = document.getElementById("canvas");
const ctx = c.getContext("2d");
let currentBoard = 0;
function addBoard (src) {
    var board = new Image();
    board.src = src;
    board.onload = function() {
        ctx.drawImage(board, 0, 0, c.width, c.height);
    }
}
const boards = ["https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman0.png?v=1671677436206",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman1.png?v=1671677438217",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman2.png?v=1671677440947",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman3.png?v=1671677443981",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman4.png?v=1671677448045",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman5.png?v=1671677451044",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman6.png?v=1671677453415",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman7.png?v=1671677456860",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman8.png?v=1671677459559",
                "https://cdn.glitch.global/eb000a01-f754-41ba-bc78-60048e7461b8/hangman9.png?v=1671677462471"
               ];
addBoard(boards[currentBoard]);

// create letter buttons
const letterContainer = document.getElementById("letterContainer");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (let i=0; i<alphabet.length; i++) {
  let letter = alphabet[i];
  let letterBtn = document.createElement("span");
  letterBtn.classList.add("letterBtn");
  letterBtn.textContent = letter;
  letterBtn.onclick = function() {
    socket.emit("letterClicked",letter);
  }
  $(letterBtn).on("mouseover", function(){
    letterBtn.style.background = "linear-gradient(143deg, rgba(2,0,36,1) 0%, rgba(103,9,121,1) 28%, rgba(8,28,133,1) 66%, rgba(0,212,255,1) 100%)";
    letterBtn.style.transform = "scale(1.1, 1.1) rotate(1turn)";
  }).on("mouseout", function() {
    letterBtn.style.background = "rgba(0,0,0,0.1)";
    letterBtn.style.transform = "scale(1.0, 1.0) rotate(-1turn)";
  });
  letterBtn.id = letter;
  letterContainer.append(letterBtn);
}

// connects to server
const socket = io(); 
// names
const input = document.getElementById("textbox");
const enterBtn = document.getElementById("enterBtn");
const modalTitle = document.getElementById("modalTitle")
const modalContainer = document.getElementById("modalContainer");
const modalXBtn = document.getElementById("modalXBtn");

// user has entered name
function enteredName() {
  socket.emit("join",input.value);
  input.value = "";
  enterBtn.setAttribute("onclick","enteredWord()"); // scuffed way to reset the function lol
  hideModal();
}
// user has entered a word
function enteredWord() {
  modalXBtn.style.display = "none";
  if (input.value != "") {
    socket.emit("setWord",input.value);
    input.value = "";
    hideModal();
  }
}
// successfully joined, 
// show that the player is in the waiting room if their name works
socket.on("waitRoom",function() {
  announce("Please wait for another player to join.");
});

// show/hide modal
function announce(content) {
  modalContainer.style.display = "block";
  modalTitle.textContent = content;
  modalXBtn.style.display = "block";
}
function getInput(content) {
  modalXBtn.style.display = "none";
  modalContainer.style.display = "block";
  modalTitle.textContent = content;
  enterBtn.style.display = "inline";
  input.style.display = "inline";
}
function hideModal() {
  modalContainer.style.display = "none";
  input.style.display = "none";
  enterBtn.style.display = "none";
  modalXBtn.style.display = "none";
}
modalXBtn.onclick = function() {hideModal()};
// allow enter for modal
document.getElementById("textbox").addEventListener("keyup", function(e) {
  if (e.keyCode === 13) {
      enterBtn.click();
  }
});

// start game
const scoreboard = document.getElementById("scoreboard");
socket.on("gameStarts", function(data){
  // announce that game has started
  // announce(`Game has started! ${data[0]} goes first.`)
  // initialize players
  for (let i=0; i<data.length; i++) {
    // player name
    let player = data[i];
    // create a div for the player
    let playerDiv = document.createElement("div");
    playerDiv.classList.add("playerDiv");
    playerDiv.classList.add("row");
    // create a div for the name of the player
    let playerNameDiv = document.createElement("div");
    playerNameDiv.classList.add("col");
    let playerTitle = document.createElement("h1");
    playerTitle.textContent = player;
    playerNameDiv.append(playerTitle);
    // create a div for the score of the player
    let playerScoreDiv = document.createElement("div");
    playerScoreDiv.classList.add("col");
    let playerScore = document.createElement("h1");
    playerScore.textContent = 0;
    playerScoreDiv.append(playerScore);
    // add the name and score divs to the main player div
    playerDiv.append(playerNameDiv);
    playerDiv.append(playerScoreDiv);
    scoreboard.append(playerDiv);
  }
});

// not ur turn to pick a word, so wait
socket.on("wait",function(){
  announce("Waiting on other player to input word.");
});
// hey, it's your turn to pick a word! 
socket.on("getWord", function() {
  getInput("Type in a word/sentence: ");
});
// oh hey, the word is set just now, or maybe the other player just guessed a letter
const wordToGuess = document.getElementById("wordToGuess");
socket.on("setWord", function(data) {
  wordToGuess.textContent = data["string"];
  currentBoard = data["currentBoard"];
  addBoard(boards[currentBoard]);
  if (data["letter"]) {
    document.getElementById(data["letter"]).style.background = "rgba(0,0,0,0.4)";
    document.getElementById(data["letter"]).style.border = "1px grey solid";
    document.getElementById(data["letter"]).style.color = "grey";
  }
  if (data["newRound"]) {
    announce("The word has been selected!");
  }
});
// round ends
socket.on("roundEnd", function(data) {
  // announce word if loss
  let string = "Round ends. ";
  if (data["status"] == "lose") {
    string += `The word was "${data['string']}". `;
  }
  // tell next player to pick a word
  if (data["turn"] == true) {
    getInput(string + "Type in a word/sentence: ");
  }
  else {
    announce(string);
  }
  // update player scoreboard
  for (let i=0; i<scoreboard.children.length;i++) {
    scoreboard.children[i].children[1].children[0].textContent = data["scoreboard"][i];
  }
  // reset letters
  for (let i=0; i<26;i++) {
    document.getElementById(alphabet.substring(i,i+1)).style.background = "rgba(0,0,0,0.1)";
    document.getElementById(alphabet.substring(i,i+1)).style.border = "1px var(--font-color) solid";
    document.getElementById(alphabet.substring(i,i+1)).style.color = "var(--font-color)";
  }
});

// end game if someone disconnects, and disconnect this player
socket.on("endGame", function(){
  announce("Other player has left. Refresh to join a new game.")
  socket.disconnect();
});