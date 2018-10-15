const Utils = require("./utils.js");

// Example userList element
var userList = {
  __12345__: {
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

function Start(Twit, Config) {
  console.log("GameLogic module is ready!");

  const mentionKeywords = {track: Config.twitter.mentionKeywords};
  const stream = Twit.stream("statuses/filter", mentionKeywords);

  stream.on("tweet", newTweet);
  
  stream.on("error", function(error) {
    throw error;
  });
}

function newTweet(tweet) {
  console.log("");
  console.log("--------------------");
  console.log("--New tweet--");
  console.log(tweet.id);
  console.log("Text:", tweet.text);

  checkUser(tweet);

  var text = tweet.text.toLowerCase();

  if (Utils.checkCommand(text, "start")) {
    startGame(tweet, userList[tweet.user.id]);
  } else if (Utils.checkCommand(text, "continue")) {
    playerTurn(tweet, userList[tweet.user.id]);
  } else if (Utils.checkCommand(text, "stop")) {
    stopDealingPlayer(tweet, userList[tweet.user.id]);
  } else if (Utils.checkCommand(text, "rules")) {
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

    var responseText = `My cards are ${Utils.getCardsString(dealerCards)}. Total: ${dealerTotalValue}`;
    responseText += `\n\nYours are ${Utils.getCardsString(playerCards)}. Total: ${playerTotalValue}`;

    if (parseInt(dealerTotalValue) === 21 && dealerTotalValue !== playerTotalValue) {
      responseText += "\n\n\nDealer has 21 Blackjack! Dealer wins!";
      Utils.finishGame(userData, false);
    } else if (parseInt(playerTotalValue) === 21 && dealerTotalValue !== playerTotalValue) {
      responseText += "\n\n\nPlayer has 21 Blackjack! Player wins!";
      Utils.finishGame(userData, true);
    } else if (parseInt(playerTotalValue) === 21 && dealerTotalValue === playerTotalValue) {
      responseText += "\n\n\nBoth player and dealer has 21 Blackjack! It's a tie!";
      Utils.finishGame(userData, false, true);
    }

    console.log(responseText);

    Utils.replyTweet(responseText, tweet, Utils.noop);
  } else {
    console.log("==> Game is already running!");
  }
}

function playerTurn(tweet, userData) {
  if (userData.gameRunning) {
    console.log("==> Player turn");

    var randomCard = Utils.getRandomCards(userData, 1);

    userData.gameStatus.playerCards.push(randomCard);
    var dealerCards = userData.gameStatus.dealerCards;
    var playerCards = userData.gameStatus.playerCards;

    var dealerTotalValue = Utils.getTotalCardValue(dealerCards);
    var playerTotalValue = Utils.getTotalCardValue(playerCards);

    var responseText = `My cards are ${Utils.getCardsString(dealerCards)}. Total: ${dealerTotalValue}`;
    responseText += `\n\nYours are ${Utils.getCardsString(playerCards)}. Total: ${playerTotalValue}`;

    var isDealerTurn = false;

    if (playerTotalValue === 21) {
      responseText += "\n\n\nPlayer has 21 Blackjack! Let's see if dealer can match it.";
      isDealerTurn = true;
    } else if (playerTotalValue > 21) {
      responseText += `\n\n\nPlayer has ${playerTotalValue} points! I am afraid the dealer won this time.`;
      Utils.finishGame(userData, false);
    }

    console.log(responseText);

    Utils.replyTweet(responseText, tweet, function(data) {
      if (isDealerTurn) dealerTurn(data, userData);
    });
  } else {
    console.log("==> Game is not running!");
  }
}

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
        Utils.finishGame(userData, false);
      } else {
        responseText = `Player has decided to stand with ${Utils.getTotalCardValue(userData.gameStatus.playerCards)} points!\n\nPlayer has the same points than dealer! It's a tie!`;
        Utils.finishGame(userData, false, true);
      }
    } else {
      responseText = `Player has decided to stand with ${Utils.getTotalCardValue(userData.gameStatus.playerCards)} points!\n\nStarting dealer turn now!`;
    }

    Utils.replyTweet(responseText, tweet, function(data) {
      dealerTurn(data, userData);
    });
  } else {
    console.log("==> Game is not running!");
  }
}

function dealerTurn(tweet, userData) {
  console.log("==> Dealer turn.");

  var randomCard = Utils.getRandomCards(userData, 1);

  userData.gameStatus.dealerCards.push(randomCard);
  var dealerCards = userData.gameStatus.dealerCards;
  var playerCards = userData.gameStatus.playerCards;

  var dealerTotalValue = Utils.getTotalCardValue(dealerCards);
  var playerTotalValue = Utils.getTotalCardValue(playerCards);

  var responseText = `My cards are ${Utils.getCardsString(dealerCards)}. Total: ${dealerTotalValue}`;
  responseText += `\n\nYours are ${Utils.getCardsString(playerCards)}. Total: ${playerTotalValue}`;

  if (parseInt(dealerTotalValue) > 21) {
    responseText += "\n\n\nThe dealer has more than 21 points. The player won!";
    Utils.finishGame(userData, true);
  } else {
    if (parseInt(dealerTotalValue) > parseInt(playerTotalValue)) {
      responseText += "\n\n\nSince the dealer has more points than the player, the dealer won!";
      Utils.finishGame(userData, false);
    } else if (parseInt(dealerTotalValue) === parseInt(playerTotalValue)) {
      responseText += "\n\n\nSince the dealer has the same points than the player, it's a tie!";
      Utils.finishGame(userData, false, true);
    }
  }

  Utils.replyTweet(responseText, tweet, function(data) {
    if (userData.gameRunning) dealerTurn(data, userData);
  });
}

function rules(tweet) {
  console.log("rules");
  Utils.replyTweet("https://www.bicyclecards.com/how-to-play/blackjack/", tweet, Utils.noop);
}

module.exports = {
  Start: Start
};