const Utils         = require("./utils.js");
const Twit          = require("twit");
const Config        = require("./config.js");
const T = new Twit({
  consumer_key:         Config.twitter.auth.consumer_key,
  consumer_secret:      Config.twitter.auth.consumer_secret,
  access_token:         Config.twitter.auth.access_token_key,
  access_token_secret:  Config.twitter.auth.access_token_secret,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            false,     // optional - requires SSL certificates to be valid.
});

const cardsRoute = "./resources/cards";
const cardRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const cardSuits = ["♣","♦","♥","♠"];

const mentionKeywords = {track: Config.twitter.mentionKeywords};
const stream = T.stream("statuses/filter", mentionKeywords);

// Example userList element
var userList = {
  12345: {
    gameRunning: true,
    gameStatus: {
      cardsInGame: ["AD","6C","JC","10S"],
      dealerCards: ["AD","JC"],
      playerCards: ["6C","10S"]
    },
    wins: 19,
    loses: 15
  }
};

stream.on("tweet", newTweet);

stream.on("error", function(error) {
  throw error;
});

function Start() {
  console.log("Twitter bot is ready!");
}

function newTweet(tweet) {
  console.log("");
  console.log("--------------------");
  console.log("--New tweet--");
  console.log(tweet.id);
  console.log("Text:", tweet.text);

  checkUser(tweet);

  var text = tweet.text.toLowerCase();

  if (Utils.checkKeywords(text, "start")) {
    startGame(tweet, userList[tweet.user.id]);
  } else if (Utils.checkKeywords(text, "continue")) {
    continueGame(tweet, userList[tweet.user.id]);
  } else if (Utils.checkKeywords(text, "stop")) {
    endGame(tweet, userList[tweet.user.id]);
  } else if (Utils.checkKeywords(text, "rules")) {
    rules(tweet);
  }
  console.log("--------------------");
}

function checkUser(tweet) {
  if (userList[tweet.user.id] === undefined) {
    userList[tweet.user.id] = {
      gameRunning: false,
      gameStatus: {
        cardsInGame: [],
        dealerCards: [],
        playerCards: []
      },
      wins: 0,
      loses: 0
    };
  }
}

function startGame(tweet, userData) {
  console.log("startGame");
  if (userData.gameRunning) {
    console.log("==> Game is already running!");
  } else {
    userData.gameRunning = true;
    console.log("==> Starting game");
    
    var randomCards = getRandomCards(userData, 4);

    userData.gameStatus.dealerCards.push(randomCards[0]);
    userData.gameStatus.dealerCards.push(randomCards[1]);
    userData.gameStatus.playerCards.push(randomCards[2]);
    userData.gameStatus.playerCards.push(randomCards[3]);

    var responseText = `My cards are ${randomCards[0]} and ${randomCards[1]}. Total: ${getTotalCardValue([randomCards[0], randomCards[1]])}`;
    responseText += `\n\nYours are ${randomCards[2]} and ${randomCards[3]}. Total: ${getTotalCardValue([randomCards[2], randomCards[3]])}`;

    replyTweet(responseText, tweet);
  }
}

function continueGame(tweet, userData) {
  console.log("continueGame");
  if (userData.gameRunning) {
    console.log("==> Continuing game");
  } else {
    console.log("==> Game is not running!");
  }
}

function endGame(tweet, userData) {
  console.log("endGame");
  if (userData.gameRunning) {
    userData.gameRunning = false;
    console.log("==> End game.");
  } else {
    console.log("==> Game is not running!");
  }
}

function rules(tweet) {
  console.log("rules");
  replyTweet("https://www.bicyclecards.com/how-to-play/blackjack/", tweet);
}

function getRandomCards(userData, numberOfTimes) {
  if (!numberOfTimes) numberOfTimes = 1;
  var cardsArray = [];

  if (numberOfTimes === 1) {
    return getRandomCard(userData);
  } else {
    for (var i = 0; i < numberOfTimes; i++) {
      cardsArray.push(getRandomCard(userData));
    }

    return cardsArray;
  }
}

function getRandomCard(userData) {
  var cardRank = Math.floor(Math.random() * cardRanks.length);
  var cardSuit = Math.floor(Math.random() * cardSuits.length);

  var card = `${cardRanks[cardRank]}${cardSuits[cardSuit]}`;

  if (userData.gameStatus.cardsInGame.includes(card)) {
    card = getRandomCard(userData);
  }

  userData.gameStatus.cardsInGame.push(card);
  return card;
}

function getTotalCardValue(cards) {

}

function getCardValue(card) {
  var cardRank = card.substr(0,card.length - 1);

  switch(cardRank) {
    case "A":
      return "1/11";
    case "J":
    case "Q":
    case "K":
      return "10";
    default:
      return cardRank;
  }
}

// repplies to tweet with tweetId
function replyTweet(statusText, tweet) {
  var options = {
    status: `@${tweet.user.screen_name} ${statusText}`,
    in_reply_to_status_id: tweet.id_str
  };
  
  T.post("statuses/update", options, function(err, data, response) {
    //
  });
}

module.exports = {
  Start: Start
};