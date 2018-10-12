const Twitter       = require("twitter");
const Config        = require("./config.js");
const client        = new Twitter(Config.twitter.auth);

var userList = {};
var tweetsAlreadyReaded = [];

// Example userList element
// "12345": {
//   "gameRunning": true,
//   "wins": 19,
//   "loses": 15
// }

function Start() {
  console.log("Twitter bot is ready!");

  setInterval(GetMentions, 2000);
}

function GetMentions() {
  makeGet("statuses/mentions_timeline", {}).then(function(data) {
    for (var i = 0; i < data.length; i++) {
      checkCommand(data[i]);
    }
  });

  console.log("");
  console.log("--------------------");
  console.log(userList);
  console.log("--------------------");
}

function checkCommand(tweet) {
  for (var i = 0; i < tweetsAlreadyReaded.length; i++) {
    if (tweetsAlreadyReaded[i] === tweet.id) return; 
  }

  console.log("");
  console.log("--------------------");
  console.log("--New tweet--");
  console.log(tweet.id);
  tweetsAlreadyReaded.push(tweet.id);

  checkUser(tweet);

  if (tweet.text.toLowerCase().includes("start")) {
    startGame(userList[tweet.user.id]);
  } else if (tweet.text.toLowerCase().includes("continue")) {
    continueGame(userList[tweet.user.id]);
  } else if (tweet.text.toLowerCase().includes("stop")) {
    endGame(userList[tweet.user.id]);
  }
  console.log("--------------------");
}

function checkUser(tweet) {
  if (userList[tweet.user.id] === undefined) {
    userList[tweet.user.id] = {
      "gameRunning": false,
      "wins": 0,
      "loses": 0,
      "gameStatus": {}
    };
  }
}

function startGame(userData) {
  console.log("startGame");
  if (userData.gameRunning) {
    console.log("==> Game is already running!");
  } else {
    userData.gameRunning = true;
    console.log("==> Starting game");
  }
}

function continueGame(userData) {
  console.log("continueGame");
  if (userData.gameRunning) {
    console.log("==> Continuing game");
  } else {
    console.log("==> Game is not running!");
  }
}

function endGame(userData) {
  console.log("endGame");
  if (userData.gameRunning) {
    userData.gameRunning = false;
    console.log("==> End game.");
  } else {
    console.log("==> Game is not running!");
  }
}

/**
 * (Utility function) Send a GET request to the Twitter API
 * @param String endpoint  e.g. "account/settings"
 * @param Object params    Params object to send
 * @return Promise         Rejects if response is error
 */
function makeGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    client.get(endpoint, params, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports = {
  Start: Start
};