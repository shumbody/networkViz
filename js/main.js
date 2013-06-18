// Copyright 2011 Google Inc. All Rights Reserved.

/**
* @fileoverview Contains functions that control user interaction behavior
* in Network Visualization app. Requires Protovis 3.2 and jQuery.
*
* @author shumbody@google.com (Shum Andrew)
*/

/**
 * TODO (Andrew): Integrate event listeners into InteractionControl class
 */
window.onload = function() {
  nv.init();

  $('#shareURLButton').bind('click', function() {
    var stateVectorString = nv.intControl.saveState();
    var textBox = document.getElementById('shareURLTextBox');
    textBox.value = stateVectorString;
    textBox.style.display = 'inline-block';
  });

  $('#includeNeighbors_checkbox').bind('click', function() {
    var includeNeighbors = document.getElementById('includeNeighbors_checkbox').checked
    nv.filterGroup.getNodeFilter('router', 'nodeName').toggleIncludeNeighbors(includeNeighbors);
  });

  $('#routerNameFilter').keypress(function(event) {
    if (event.which == 13) { // Activates when user hits Enter.
      event.preventDefault();
      return nv.intControl.applyFilter('routerNameFilter');
    }
  });

  $('#utilFilter').slider( {
    from: 0,
    to: 10,
    step: 1,
    smooth: true,
    round: 0,
    dimension: '&nbsp;units',
    skin: 'round_plastic',
    callback: function() {
      return nv.intControl.applyFilter('utilFilter')
    }
  });

  $('#capFilter').slider( {
    from: 0,
    to: 10,
    step: 1,
    smooth: true,
    round: 0,
    dimension: '&nbsp;units',
    skin: 'round_plastic',
    callback: function() {
      return nv.intControl.applyFilter('capFilter')
    }
  });
}
