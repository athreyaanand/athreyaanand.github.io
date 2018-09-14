'use strict';

String.prototype.rightChars = function(n){
  if (n <= 0) {
    return '';
  }
  else if (n > this.length) {
    return this;
  }
  else {
    return this.substring(this.length, this.length - n);
  }
};

(function($) {
  var
    options = {
      highlightSpeed    : 20,
      typeSpeed         : 100,
      clearDelay        : 500,
      typeDelay         : 200,
      clearOnHighlight  : true,
      typerDataAttr     : 'data-typer-targets',
      typerInterval     : 2000
    },
    highlight,
    clearText,
    type,
    spanWithColor,
    clearDelay,
    typeDelay,
    clearData,
    isNumber,
    targets,
    getHighlightInterval,
    getTypeInterval,
    typerInterval;

  spanWithColor = function() {
    // if (color === 'rgba(0, 0, 0, 0)') {
    //   color = 'rgb(255, 255, 255)';
    // }

    return $('<span class="highlight"></span>');
      // .css('color', color);
      // .css('background-color', backgroundColor);
  };

  isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };

  clearData = function ($e) {
    $e.removeData([
      'typePosition',
      'highlightPosition',
      'leftStop',
      'rightStop',
      'primaryColor',
      'backgroundColor',
      'text',
      'typing'
    ]);
  };

  type = function ($e) {
    var
      // position = $e.data('typePosition'),
      text = $e.data('text'),
      oldLeft = $e.data('oldLeft'),
      oldRight = $e.data('oldRight');

    // if (!isNumber(position)) {
      // position = $e.data('leftStop');
    // }

    if (!text || text.length === 0) {
      clearData($e);
      return;
    }


    $e.text(
      oldLeft +
      text.charAt(0) +
      oldRight
    ).data({
      oldLeft: oldLeft + text.charAt(0),
      text: text.substring(1)
    });

    // $e.text($e.text() + text.substring(position, position + 1));

    // $e.data('typePosition', position + 1);

    setTimeout(function () {
      type($e);
    }, getTypeInterval());
  };

  clearText = function ($e) {
    $e.find('span').remove();

    setTimeout(function () {
      type($e);
    }, typeDelay());
  };

  highlight = function ($e) {
    var
      position = $e.data('highlightPosition'),
      leftText,
      highlightedText,
      rightText;

    if (!isNumber(position)) {
      position = $e.data('rightStop') + 1;
    }

    if (position <= $e.data('leftStop')) {
      setTimeout(function () {
        clearText($e);
      }, clearDelay());
      return;
    }

    leftText = $e.text().substring(0, position - 1);
    highlightedText = $e.text().substring(position - 1, $e.data('rightStop') + 1);
    rightText = $e.text().substring($e.data('rightStop') + 1);

    $e.html(leftText)
      .append(
        spanWithColor().append(highlightedText)
      )
      .append(rightText);

    $e.data('highlightPosition', position - 1);

    setTimeout(function () {
      return highlight($e);
    }, getHighlightInterval());
  };

  // Create an array
  var createArray = function($e) {
    targets = $.map($e.attr($.typer.options.typerDataAttr).split(';'), function (e) {
      return $.trim(e);
    });
    // console.log(targets);
  };

  // Shuffle array
  var shuffleArray = function shuffle(targets) {
    var m = targets.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

      // Pick a remaining element…
      i = Math.floor(Math.random() * m--);

      // And swap it with the current element.
      t = targets[m];
      targets[m] = targets[i];
      targets[i] = t;
    }
    // console.log("Array: " + targets);
    return targets;

  };
  var arrayIterationCount = 0;


  // typeWithAttribute = function ($e) {
  //  var targets;

  //  if ($e.data('typing')) {
  //    return;
  //  }

  //  try {
  //    targets = JSON.parse($e.attr($.typer.options.typerDataAttr)).targets;
  //    console.log("Targets: " + targets);
  //  } catch (e) {}

  //  if (typeof targets === "undefined") {
  //    targets = $.map($e.attr($.typer.options.typerDataAttr).split(';'), function (e) {
  //      return $.trim(e);
  //    });
  //    console.log("Targets2: " + targets);
  //  }

  //  $e.typeTo(targets[Math.floor(Math.random()*targets.length)]);
  // };

  // Expose our options to the world.
  $.typer = (function () {
    return { options: options };
  })();

  $.extend($.typer, {
    options: options
  });

  //-- Methods to attach to jQuery sets

  $.fn.typer = function() {
    var $elements = $(this);

    return $elements.each(function () {
      var $e = $(this);

      if (typeof $e.attr($.typer.options.typerDataAttr) === 'undefined') {
        return;
      }

      // Create the array from the data tag
      createArray($e);
      // Shuffle the array using Fisher-Yates algorithm
      shuffleArray(targets);

      // Type first item in shuffled array
      $e.typeTo(targets[arrayIterationCount]);
      arrayIterationCount++;

      // Loop through the array
      setInterval(function(){
        $e.typeTo(targets[arrayIterationCount]);
        arrayIterationCount++;
        // Once we're at the end of the array, just go back to the beginning.
        if (arrayIterationCount === targets.length) {
          arrayIterationCount = 0;
        }
      }, typerInterval());

    });
  };

  $.fn.typeTo = function (newString) {
    var
      $e = $(this),
      currentText = $e.text(),
      i = 0,
      j = 0;

    // if (currentText === newString) {
    //  // console.log("Our strings our equal, nothing to type");
    //  return $e;
    // }

    // if (currentText !== $e.html()) {
    //  console.error("Typer does not work on elements with child elements.");
    //  return $e;
    // }

    $e.data('typing', true);

    while (currentText.charAt(i) === newString.charAt(i)) {
      i++;
    }

    while (currentText.rightChars(j) === newString.rightChars(j)) {
      j++;
    }

    newString = newString.substring(i, newString.length - j + 1);

    $e.data({
      oldLeft: currentText.substring(0, i),
      oldRight: currentText.rightChars(j - 1),
      leftStop: i,
      rightStop: currentText.length - j,
      primaryColor: $e.css('color'),
      backgroundColor: $e.css('background-color'),
      text: newString
    });

    highlight($e);

    return $e;
  };

  //-- Helper methods. These can one day be customized further to include things like ranges of delays.

  getHighlightInterval = function () {
    return $.typer.options.highlightSpeed;
  };

  getTypeInterval = function () {
    return $.typer.options.typeSpeed;
  };

  clearDelay = function () {
    return $.typer.options.clearDelay;
  };

  typeDelay = function () {
    return $.typer.options.typeDelay;
  };

  typerInterval = function () {
    return $.typer.options.typerInterval;
  };
})(jQuery);
