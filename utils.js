const Config        = require("./config.js");

function checkKeywords(text, phase) {
  switch(phase) {
    case "start":
      return checkTextInArray(text, Config.twitter.startKeywords);
    case "continue":
      return checkTextInArray(text, Config.twitter.continueKeywords);
    case "stop":
      return checkTextInArray(text, Config.twitter.stopKeywords);
    case "rules":
      return checkTextInArray(text, Config.twitter.rulesKeywords);
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

module.exports = {
  checkKeywords: checkKeywords
};