var Config = null;
var T = null;

function Initialize(twit, conf, callback) {
  console.log("Utils module is ready!");

  T = twit;
  Config = conf;

  callback(twit, conf);
}

// Comprueba las keywords de los comandos
function checkCommand(text, phase) {
  switch(phase) {
    case "start":
      return checkTextInArray(text, Config.twitter.commands.startKeywords);
    case "continue":
      return checkTextInArray(text, Config.twitter.commands.continueKeywords);
    case "stop":
      return checkTextInArray(text, Config.twitter.commands.stopKeywords);
    case "rules":
      return checkTextInArray(text, Config.twitter.commands.rulesKeywords);
  }
}

function checkTextInArray(text, array) {
  for (var i = 0; i < array.length; i++) {
    if (text.includes(array[i])) {
      return true;
    }
  }

  return false;
}

// Contesta a un tweet
function replyTweet(statusText, tweet, callback) {
  var options = {
    status: `@${tweet.user.screen_name} ${statusText}`,
    in_reply_to_status_id: tweet.id_str
  };
  
  T.post("statuses/update", options, function(err, data, response) {
    callback(data);
  });
}

// Devuelve un numero determinado de cartas aleatorias
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
  var cardRank = Math.floor(Math.random() * Config.twitter.cardRanks.length);
  var cardSuit = Math.floor(Math.random() * Config.twitter.cardSuits.length);

  var card = `${Config.twitter.cardRanks[cardRank]}${Config.twitter.cardSuits[cardSuit]}`;

  if (userData.gameStatus.cardsInGame.includes(card)) {
    card = getRandomCard(userData);
  }

  userData.gameStatus.cardsInGame.push(card);
  return card;
}

// Devuelve un string de una lista de cartas
function getCardsString(cards) {
  var response = "";

  for (var i = 0; i < cards.length; i++) {
    if (i !== cards.length - 1) {
      response += `${cards[i]}${cards.length > 2 && i !== cards.length - 2? " , " : ""}`;
    } else {
      response += ` and ${cards[i]}`;
    }
  }

  return response;
}

// Devuelve el total de valor de las cartas
function getTotalCardValue(cards) {
  var response = "";
  var sums = [];
  var total = 0;
  var aces = 0;

  for (var i = 0; i < cards.length; i++) {
    var value = getCardValue(cards[i]);

    if (value === "1/11") {
      aces++;
    } else {
      console.log(value);
      total += parseInt(value);
    }
  }

  sums[0] = total;
  sums[1] = total;

  for (var j = 0; j < aces; j++) {
    if (sums[0] + 11 <= 21) {
      sums[0] += 11;
    } else {
      sums[0] += 1;
    }

    sums[1] += 1;
  }

  if (sums[0] === sums[1]) {
    response = `${sums[0]}`;
  } else {
    if (sums[0] === 21) {
      response = `${sums[0]}`;
    } else {
      response = `${sums[0]} / ${sums[1]}`;
    }
  }

  return response;
}

function getCardValue(card) {
  var cardRank = card.substr(0, card.length - 1);

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

function finishGame(userData, playerWon, tie) {
  userData.gameRunning = false;
  userData.gameStatus.playerCards = [];
  userData.gameStatus.dealerCards = [];
  userData.gameStatus.cardsInGame = [];

  if (tie) return;
  
  if (playerWon) {
    userData.gameStatus.wins += 1;
  } else {
    userData.gameStatus.loses += 1;
  }
}

function noop() {

}

module.exports = {
  Initialize: Initialize,
  checkCommand: checkCommand,
  finishGame: finishGame,
  getCardsString: getCardsString,
  getRandomCards: getRandomCards,
  getTotalCardValue: getTotalCardValue,
  noop: noop,
  replyTweet: replyTweet
};