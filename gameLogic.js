const Utils = require("./utils.js");
var fs = require("fs");

var userList = null;
var Config = null;
var botId = null;

function Start(Twit, conf) {
  console.log("GameLogic module is ready!");

  Twit.get("users/show", {screen_name: "BjackBot"}, function(err, data) {
    console.log("get users/show");
    Config = conf;
    userList = JSON.parse(fs.readFileSync(Config.twitter.userList, "utf8"));

    const mentionKeywords = {track: Config.twitter.mentionKeywords};
    const stream = Twit.stream("statuses/filter", mentionKeywords);

    stream.on("tweet", newTweet);
    
    stream.on("error", function(error) {
      throw error;
    });

    botId = data.id_str;
  });
}

function newTweet(tweet) {
  if (tweet.user.id_str === botId) return;

  console.log("");
  console.log("--------------------");
  console.log("--New tweet--");
  console.log("Tweet ID:", tweet.id);
  console.log("Text:", tweet.text);

  checkUser(tweet);

  var text = tweet.text.toLowerCase();

  if (Utils.checkCommand(text, "help")) {
    help(tweet);
  } else if (Utils.checkCommand(text, "start")) {
    startGame(tweet, userList[tweet.user.id]);
  } else if (Utils.checkCommand(text, "continue")) {
    playerTurn(tweet, userList[tweet.user.id]);
  } else if (Utils.checkCommand(text, "stop")) {
    stopDealingPlayer(tweet, userList[tweet.user.id]);
  } else if (Utils.checkCommand(text, "rules")) {
    rules(tweet);
  } else if (Utils.checkCommand(text, "history")) {
    history(tweet, userList[tweet.user.id]);
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

// Displays help
function help(tweet) {
  console.log("help");
  var textArray = [
    `To start a game: ${getKeywordsFromArray(Config.twitter.commands.startKeywords)}`,
    `\n\nTo ask for another card: ${getKeywordsFromArray(Config.twitter.commands.continueKeywords)}`,
    `\n\nTo stand with your hand: ${getKeywordsFromArray(Config.twitter.commands.stopKeywords)}`,
    `\n\nTo check the rules: ${getKeywordsFromArray(Config.twitter.commands.rulesKeywords)}`,
    `\n\nTo review your record: ${getKeywordsFromArray(Config.twitter.commands.historyKeywords)}`
  ];

  var i = 0;
  helpTweetRenderer(textArray, tweet, i);
}

function helpTweetRenderer(textArray, tweet, i) {
  Utils.replyTweet(textArray[i], tweet, function(data) {
    i++;
    if (textArray[i]) helpTweetRenderer(textArray, data, i);
  });
}

function getKeywordsFromArray(array) {
  var response = "";

  for (var i = 0; i < array.length; i++) {
    response += `${array[i]}, `;
  }

  return response.substr(0, response.length - 2);
}

// Starts a game
function startGame(tweet, userData) {
  if (!userData.gameRunning) {
    console.log("==> Starting game");
    userData.gameRunning = true;
    
    var randomCards = Utils.getRandomCards(userData, 4);

    userData.gameStatus.dealerCards.push(randomCards[0]);
    userData.gameStatus.dealerCards.push(randomCards[1]);
    userData.gameStatus.playerCards.push(randomCards[2]);
    userData.gameStatus.playerCards.push(randomCards[3]);

    var dealerCards = userData.gameStatus.dealerCards;
    var playerCards = userData.gameStatus.playerCards;

    var dealerTotalValue = Utils.getTotalCardValue(userData.gameStatus.dealerCards);
    var playerTotalValue = Utils.getTotalCardValue(userData.gameStatus.playerCards);

    var responseText = `Dealer cards (${dealerTotalValue} points):`;
    responseText += `\n${Utils.getCardsString(dealerCards)}`;
    responseText += `\n\nPlayer cards (${playerTotalValue} points):`;
    responseText += `\n${Utils.getCardsString(playerCards)}`;

    if (parseInt(dealerTotalValue) === 21 && dealerTotalValue !== playerTotalValue) {
      responseText += "\n\n\nDealer has 21 Blackjack! Dealer wins!";
      Utils.finishGame(userList, userData, 1);
    } else if (parseInt(playerTotalValue) === 21 && dealerTotalValue !== playerTotalValue) {
      responseText += "\n\n\nPlayer has 21 Blackjack! Player wins!";
      Utils.finishGame(userList, userData, 0);
    } else if (parseInt(playerTotalValue) === 21 && dealerTotalValue === playerTotalValue) {
      responseText += "\n\n\nBoth player and dealer has 21 Blackjack! It's a tie!";
      Utils.finishGame(userList, userData, 99);
    }

    console.log(responseText);

    Utils.replyTweet(responseText, tweet, Utils.noop);
  } else {
    console.log("==> Game is already running!");
  }
}

// Manages player's turn
function playerTurn(tweet, userData) {
  if (userData.gameRunning) {
    console.log("==> Player turn");

    var randomCard = Utils.getRandomCards(userData, 1);

    userData.gameStatus.playerCards.push(randomCard);
    var dealerCards = userData.gameStatus.dealerCards;
    var playerCards = userData.gameStatus.playerCards;

    var dealerTotalValue = Utils.getTotalCardValue(dealerCards);
    var playerTotalValue = Utils.getTotalCardValue(playerCards);

    var responseText = `Dealer cards (${dealerTotalValue} points):`;
    responseText += `\n${Utils.getCardsString(dealerCards)}`;
    responseText += `\n\nPlayer cards (${playerTotalValue} points):`;
    responseText += `\n${Utils.getCardsString(playerCards)}`;

    var isDealerTurn = false;

    if (parseInt(playerTotalValue) === 21) {
      responseText += "\n\n\nPlayer has 21 Blackjack! Let's see if dealer can match it.";
      isDealerTurn = true;
    } else if (playerTotalValue > 21) {
      responseText += `\n\n\nPlayer has ${playerTotalValue} points! I am afraid the dealer won this time.`;
      Utils.finishGame(userList, userData, 1);
    }

    console.log(responseText);

    Utils.replyTweet(responseText, tweet, function(data) {
      if (isDealerTurn) dealerTurn(data, userData);
    });
  } else {
    console.log("==> Game is not running!");
  }
}

// The player asks to stand
function stopDealingPlayer(tweet, userData) {
  if (userData.gameRunning) {
    console.log("==> Stop dealing Player.");
    var responseText = "";

    var dealerCards = userData.gameStatus.dealerCards;
    var playerCards = userData.gameStatus.playerCards;

    var dealerTotalValue = Utils.getTotalCardValue(dealerCards);
    var playerTotalValue = Utils.getTotalCardValue(playerCards);

    if (parseInt(dealerTotalValue) >= parseInt(playerTotalValue)) {
      if (parseInt(dealerTotalValue) > parseInt(playerTotalValue)) {
        responseText = `Player has decided to stand with ${Utils.getTotalCardValue(userData.gameStatus.playerCards)} points!\n\nPlayer has less points than dealer! Dealer won!`;
        Utils.finishGame(userList, userData, 1);
      } else {
        responseText = `Player has decided to stand with ${Utils.getTotalCardValue(userData.gameStatus.playerCards)} points!\n\nPlayer has the same points than dealer! It's a tie!`;
        Utils.finishGame(userList, userData, 99);
      }
    } else {
      responseText = `Player has decided to stand with ${Utils.getTotalCardValue(userData.gameStatus.playerCards)} points!\n\nStarting dealer turn now!`;
    }

    Utils.replyTweet(responseText, tweet, function(data) {
      if (userData.gameRunning) dealerTurn(data, userData);
    });
  } else {
    console.log("==> Game is not running!");
  }
}

// Manages dealer's turn
function dealerTurn(tweet, userData) {
  console.log("==> Dealer turn.");

  var randomCard = Utils.getRandomCards(userData, 1);

  userData.gameStatus.dealerCards.push(randomCard);
  var dealerCards = userData.gameStatus.dealerCards;
  var playerCards = userData.gameStatus.playerCards;

  var dealerTotalValue = Utils.getTotalCardValue(dealerCards);
  var playerTotalValue = Utils.getTotalCardValue(playerCards);

  var responseText = `Dealer cards (${dealerTotalValue} points):`;
  responseText += `\n${Utils.getCardsString(dealerCards)}`;
  responseText += `\n\nPlayer cards (${playerTotalValue} points):`;
  responseText += `\n${Utils.getCardsString(playerCards)}`;

  if (parseInt(dealerTotalValue) > 21) {
    responseText += "\n\n\nThe dealer has more than 21 points. The player won!";
    Utils.finishGame(userList, userData, 0);
  } else {
    if (parseInt(dealerTotalValue) > parseInt(playerTotalValue)) {
      responseText += "\n\n\nSince the dealer has more points than the player, the dealer won!";
      Utils.finishGame(userList, userData, 1);
    } else if (parseInt(dealerTotalValue) === parseInt(playerTotalValue)) {
      responseText += "\n\n\nSince the dealer has the same points than the player, it's a tie!";
      Utils.finishGame(userList, userData, 99);
    }
  }

  Utils.replyTweet(responseText, tweet, function(data) {
    if (userData.gameRunning) dealerTurn(data, userData);
  });
}

// Displays the rules
function rules(tweet) {
  console.log("rules");
  Utils.replyTweet("https://www.bicyclecards.com/how-to-play/blackjack/", tweet, Utils.noop);
}

// Displays the win-loss record
function history(tweet, userData) {
  console.log("history");
  var responseText = "Until now, this is the win-loss record:";
  responseText += `\n\nWins: ${userData.wins} - Loses: ${userData.loses}`;

  Utils.replyTweet(responseText, tweet, Utils.noop);

  console.log(userList);
}

module.exports = {
  Start: Start
};