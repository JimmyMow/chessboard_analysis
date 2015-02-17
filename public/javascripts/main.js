window.variationActive = false;
window.chess = new Chess();
window.data = {};
window.counter = 0;
data.tree = [];
data.pathDefault = [{ ply: 0, variation: null }];
data.path = data.pathDefault;
data.pathStr = '';
var ground;

$(document).ready(function() {
  init();

  $('.controls a').on('click', function() {
    whichControl($(this).attr('data-direction'));
  });

  $('.pgn').on('click', '.move', function(e) {
    var path = readPath($(this).attr('data-path'));
    jump(path);
    e.preventDefault();
  });
});

var onMove = function(from, to) {
  var castle = didTheyCastle(from+"-"+to);
  if(castle) {
    chessground.move(castle.from, castle.to);
    chessground.set({
      lastMove: [from, to]
    });
  }
  var move = chess.move({from: from, to: to});
  ground.set({
    turnColor: chessToColor(chess),
    movable: {
      dests: chessToDests(chess)
    }
  });
  data.path = explore(data.path, move.san, chess.fen().split(' ')[0], chess.fen(), { from: from, to: to });
  data.pathStr = writePath(data.path);
  counter = currentPly(data.path);
  displayTree();
  addActive(data.pathStr);
  updateHash(data.pathStr);
};

function updateHash(path) {
  window.location.hash = path[0];
}

function start() {
  chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  chessground.set({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
    lastMove: null,
    turnColor: chessToColor(chess),
    movable: {
      dests: chessToDests(chess)
    }
  });
  data.path = data.pathDefault;
}

function currentPly(path) {
  return path[path.length - 1].ply;
}

function readPath(str) {
  return str.split(',').map(function(step) {
    var s = step.split(':');
    return {
      ply: parseInt(s[0]),
      variation: s[1] ? parseInt(s[1]) : null
    };
  });
}

function writePath(path) {
  return path.map(function(step) {
    return step.variation ? step.ply + ':' + step.variation : step.ply;
  }).join(',');
}

function withPly(path, ply) {
  var p2 = path.slice(0);
  var last = p2.length - 1;
  p2[last] = copy(p2[last], {ply: ply});
  return p2;
}

function withVariation(path, index) {
  var p2 = path.slice(0);
  var last = p2.length - 1;
  var ply = p2[last].ply;
  p2[last] = copy(p2[last], {
    ply: ply,
    variation: index
  });
  p2.push({
    ply: ply,
    variation: null
  });
  return p2;
}

function withVariation(path, index) {
  var p2 = path.slice(0);
  var last = p2.length - 1;
  var ply = p2[last].ply;
  p2[last] = copy(p2[last], {
    ply: ply,
    variation: index
  });
  p2.push({
    ply: ply,
    variation: null
  });
  return p2;
}

function explore(path, san, boardFen, gameFen, fromToObj) {
  var nextPath = withPly(path, currentPly(data.path) + 1);
  var tree = data.tree;
  var curMove = null;
  var nb;
  nextPath.forEach(function(step) {
    for (i = 0, nb = tree.length; i < nb; i++) {
      var move = tree[i];
      if (step.ply == move.ply) {
        if (step.variation) {
          tree = move.variations[step.variation - 1];
          break;
        } else curMove = move;
      } else if (step.ply < move.ply) break;
    }
  });
  if (curMove) {
    if (curMove.san == san) return nextPath;
    for (var i = 0; i < curMove.variations.length; i++) {
      if (curMove.variations[i][0].san == san) {
        return withVariation(nextPath, i + 1);
      }
    }
    curMove.variations.push([{
      ply: curMove.ply,
      san: san,
      boardFen: boardFen,
      gameFen: gameFen,
      from: fromToObj.from,
      to: fromToObj.to,
      comments: [],
      variations: []
    }]);
    return withVariation(nextPath, curMove.variations.length);
  }
  tree.push({
    ply: currentPly(nextPath),
    san: san,
    boardFen: boardFen,
    gameFen: gameFen,
    from: fromToObj.from,
    to: fromToObj.to,
    comments: [],
    variations: []
  });
  return nextPath;
}

function reposition(move) {
  chess.load(move.gameFen);
  chessground.set({
    fen: move.boardFen,
    turnColor: chessToColor(chess),
    lastMove: [move.from, move.to],
    movable: {
      dests: chessToDests(chess)
    }
  });
}

function canGoForward() {
  var tree = data.tree;
  var ok = false;
  data.path.forEach(function(step) {
    for (i = 0, nb = tree.length; i < nb; i++) {
      var move = tree[i];
      if (step.ply === move.ply && step.variation) {
        tree = move.variations[step.variation - 1];
        break;
      } else ok = step.ply < move.ply;
    }
  });
  return ok;
}

function next() {
  if (!canGoForward()) return;
  var p = data.path;
  p[p.length - 1].ply++;
  jump(p);
}

function prev() {
  var p = data.path;
  var len = p.length;
  if (len === 1) {
    if (p[0].ply === 0) return;
    p[0].ply--;
  } else {
    if (p[len - 1].ply > p[len - 2].ply) p[len - 1].ply--;
    else {
      p.pop();
      p[len - 2].variation = null;
      if (p[len - 2].ply > 1) p[len - 2].ply--;
    }
  }
  jump(p);
}

function jump(path) {
  data.path = path;
  data.pathStr = writePath(path);
  if (window.history.replaceState)
    window.history.replaceState(null, null, '#' + path[0].ply);
  var ply = path[path.length - 1].ply;
  if (ply < 1) return start();
  var moves = moveList(path).slice(0, ply);
  var lastMove = moves[moves.length - 1];
  reposition(lastMove);
  addActive(data.pathStr);
}

function addActive(path) {
  $('.move').removeClass('active');
  $("a[data-path='" + data.pathStr +"']").addClass('active');
}

function moveList(path) {
  var tree = data.tree;
  var moves = [];
  path.forEach(function(step) {
    for (var i = 0, nb = tree.length; i < nb; i++) {
      var move = tree[i];
      if (step.ply == move.ply && step.variation) {
        tree = move.variations[step.variation - 1];
        break;
      } else if (step.ply >= move.ply) moves.push({ san: move.san, boardFen: move.boardFen, gameFen: move.gameFen, from: move.from, to: move.to });
      else break;
    }
  });
  return moves;
}

// ----------------------------------------------------------------------------------------

function plyToTurn(ply) {
  return Math.floor((ply - 1) / 2) + 1;
}

function copy(obj, newValues) {
  var k, c = {};
  for (k in obj) {
    c[k] = obj[k];
  }
  for (k in newValues) {
    c[k] = newValues[k];
  }
  return c;
}

function chessToDests(chess) {
  var dests = {};
  chess.SQUARES.forEach(function(square) {
    var ms = chess.moves({square: square, verbose: true});
    if (ms.length) {
      dests[square] = ms.map(function(m) { return m.to; });
    }
  });
  return dests;
}

function chessToColor(chess) {
  return (chess.turn() == "w") ? "white" : "black";
}

function didTheyCastle(fromTo) {
  switch (fromTo) {
    case "e1-g1":
      return { from: "h1", to: "f1" };
    break;
    case "e8-g8":
      return { from: "h8", to: "f8" };
    break;
    case "e1-c1":
      return { from: "a1", to: "d1" };
    break;
    case "e8-c8":
      return { from: "a8", to: "d8" };
    break;
    default:
      return false;
    break;
  }
}

function whichControl(direction) {
  switch (direction) {
    case 'first':
      start();
      return;
    break;
    case 'prev':
      prev();
      return;
    break;
    case 'next':
      next();
      return;
    break;
    case 'last':
      jump([{ ply: data.tree.length, variation: null }]);
      return;
    break;
  }
}

function updatePgn(history) {
  $('.pgn').empty();
  var turn_count = 1;
  for( var i = 0; i < history.length; i = i + 2 ) {
    // Get turn data
    var turnNum = turn_count;
    var whitesMove = history[i];
    var blacksMove = history[i + 1];
    // Build turn HTML
    var newTurn = buildTurnHtml(turnNum, whitesMove, blacksMove);
    // Append HTML to PGN
    $('.pgn').append(newTurn);
    $('.pgn')[0].scrollTop = $('.pgn')[0].scrollHeight;
    // Bump upp turn counter
    turn_count += 1;
  }
}

function buildTurnHtml(index, whiteMove, blackMove) {
  var result;
  var blackIndex = (parseInt(index) * 2);
  var whiteIndex = blackIndex - 1;
  var indexSpan = "<span class='index'>" + index + "</span>";
  var whiteMoveLink = "<a href=#" + whiteIndex + " data-path=" + whiteIndex + " class='move'>" + whiteMove + "</a>";
  var blackMoveLink = "<a href=#" + blackIndex + " data-path=" + blackIndex + " class='move'>" + blackMove + "</a>";

  if (blackMove) {
    result = "<div class='turn'>" + indexSpan + whiteMoveLink + blackMoveLink + "</div>";
  } else {
    result = "<div class='turn'>" + indexSpan + whiteMoveLink + "</div>";
  }
  return result;
}

function init() {
  ground = Chessground(document.getElementById('ground1'), {
    turnColor: 'white',
    orientation: 'white',
    coordinates: false,
    animation: {
      enabled: true,
      duration: 200
    },
    movable: {
      free: false,
      color: 'both',
      dests: chessToDests(chess),
      events: {
        after: onMove
      }
    }
  });
  window.chessground = ground;
}

// ---------------------------- Render PGN view --------------------------------------
function displayTree() {
  var tree = renderTree(data.tree);
  return m.render(document.getElementById('pgn'), tree);
}

var emptyMove = m('em.move.empty', '...');

function renderTree(tree) {
  var turns = [];
  for (i = 0, nb = tree.length; i < nb; i += 2) turns.push({
    turn: Math.floor(i / 2) + 1,
    white: tree[i],
    black: tree[i + 1]
  });
  var path = data.pathDefault;
  return turns.map(function(turn) {
    return renderTurn(turn, path);
  });
}

function renderTurn(turn, path) {
  var index = renderIndex(turn.turn);
  var wPath = turn.white ? withPly(path, turn.white.ply) : null;
  var wMove = wPath ? renderMove(turn.white, wPath) : null;
  var wMeta = renderMeta(turn.white, wPath);
  var bPath = turn.black ? withPly(path, turn.black.ply) : null;
  var bMove = bPath ? renderMove(turn.black, bPath) : null;
  var bMeta = renderMeta(turn.black, bPath);

  if (wMove) {
    if (wMeta) return [
      renderTurnDiv([index, wMove, emptyMove]),
      wMeta,
      bMove ? [
        renderTurnDiv([index, emptyMove, bMove]),
        bMeta
      ] : null,
    ];
    return [
      renderTurnDiv([index, wMove, bMove]),
      bMeta
    ];
  }
  return [
    renderTurnDiv([index, emptyMove, bMove]),
    bMeta
  ];
}

function renderIndex(txt) {
  return {
    tag: 'span',
    attrs: {
      class: 'index'
    },
    children: [txt]
  };
}

function renderMove(move, path) {
  if (!move) return emptyMove;
  var pathStr = writePath(path);
  return {
    tag: 'a',
    attrs: {
      class: 'move' + (pathStr === data.pathStr ? ' active' : ''),
      'data-path': pathStr,
      'href': '#' + path[0].ply
    },
    children: [
      move.eval ? renderEvalTag(renderEval(move.eval)) : (
        move.mate ? renderEvalTag('#' + move.mate) : null
      ),
      move.san
    ]
  };
}

function renderMeta(move, path) {
  if (!move || !move.variations.length) return;
  var children = [];
  var border = children.length === 0;
  if (move.variations.length) move.variations.forEach(function(variation, i) {
    children.push(renderVariation(variation, withVariation(path, i + 1), border));
    border = false;
  });
  return children;
}

function renderTurnDiv(children) {
  return {
    tag: 'div',
    attrs: {
      class: 'turn',
    },
    children: children
  };
}

function renderVariation(variation, path, border) {
  var attrClass = 'variation' + (border ? ' border' : '');
  return m('div', {
    class: 'variation' + (border ? ' border' : '')
  }, renderVariationContent(variation, path));
  // return { tag: 'div', class: attrClass, content: renderVariationContent(variation, path) };
}

function renderVariationContent(variation, path) {
  var turns = [];
  if (variation[0].ply % 2 === 0) {
    variation = variation.slice(0);
    var move = variation.shift();
    turns.push({
      turn: plyToTurn(move.ply),
      black: move
    });
  }
  for (i = 0, nb = variation.length; i < nb; i += 2) turns.push({
    turn: plyToTurn(variation[i].ply),
    white: variation[i],
    black: variation[i + 1]
  });
  return turns.map(function(turn) {
    return renderVariationTurn(turn, path);
  });
}

function renderVariationTurn(turn, path) {
  var wPath = turn.white ? withPly(path, turn.white.ply) : null;
  var wMove = wPath ? renderMove(turn.white, wPath) : null;
  var wMeta = renderVariationMeta(turn.white, wPath);
  var bPath = turn.black ? withPly(path, turn.black.ply) : null;
  var bMove = bPath ? renderMove(turn.black, bPath) : null;
  var bMeta = renderVariationMeta(turn.black, bPath);
  if (wMove) {
    if (wMeta) return [
      renderIndex(turn.turn + '.'),
      wMove,
      wMeta,
      bMove ? [
        bMove,
        bMeta
      ] : null
    ];
    return [renderIndex(turn.turn + '.'), wMove, (bMove ? [' ', bMove, bMeta] : '')];
  }
  return [renderIndex(turn.turn + '...'), bMove, bMeta];
}

function renderVariationMeta(move, path) {
  if (!move || !move.variations.length) return;
  return move.variations.map(function(variation, i) {
    return renderVariationNested(variation, withVariation(path, i + 1));
  });
}

function renderVariationNested(variation, path) {
  return m('span.variation', [
    '(',
    renderVariationContent(variation, path),
    ')'
  ]);
  return { tag: 'span', attrs: {class: 'variation'}, content: renderVariationContent(variation, path) };
}
