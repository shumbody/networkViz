// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Contains classes to be used with
 * Network Visualization app. Requires Protovis 3.2.
 * @author shumbody@google.com (Shum Andrew)
 */

/**
 * The top-level network visualization namespace.
 */
window.nv = window.nv || {};

/**
 * Dictionary representing the order hierarchy of network layers.
 */
nv.layerOrder = {
  'router': 0,
  'router_pop': 1, // For cross links between layers
  'pop_router': 1,
  'pop': 2,
  'router_metro': 2,
  'metro_router': 2,
  'pop_metro': 3,
  'metro_pop': 3,
  'metro': 4,
};

/**
 * An instance of NodesTree. Holds hierarchy information about the nodes.
 */
nv.nodesTree = new NodesTree(new Node(nodes_tree, null));

/**
 * An array of JS objects, each holding information about the
 * properties of a node in the network.
 */
nv.nodesList = nodes_list;

/**
 * Total number of nodes.
 */
nv.numNodes = nodes_list.length;

/**
 * An array of JS objects, each holding information about the
 * properties of a link in the network.
 */
nv.linksList = links_list;

/**
 * Total number of links, including cross-links which get added dynamically.
 */
nv.numLinks = links_list.length;

/**
 * A set of JS objects, each holding information about a crosslink,
 * links between nodes from differing layers.
 */
nv.crossLinksDict = {};

/**
 * Function to initialize Protovis objects (i.e. links, nodes)
 * necessary for network viz to work. Also initializes filters.
 */
nv.init = function() {
  /**
   * An instance of FilterGroup. Acts as a controller for the filters.
   */
  nv.filterGroup = new FilterGroup();

  /**
   * An instance of Visual. Acts as a controller for visual displays
   * and interactions.
   * @type {Visual} An instance of Visual class.
   */
  nv.visControl = new Visual();

  nv.intControl = new InteractionControl;

  /**
   * Initialize the Protovis parent panel.
   */
  nv.vis = new pv.Panel()
                 .width(document.body.clientWidth)
                 .height(document.body.clientHeight)
                 .fillStyle('#dcdcdc')
                 .event('mousedown', pv.Behavior.pan())
                 .event('click',
                 function() {
                   return nv.visControl.linkHighlightOff();
                 })
                 .event('mousewheel', pv.Behavior.zoom(2));

  /**
   * Embed the Protovis network module.
   */
  nv.network = nv.vis.add(pv.Layout.Network)
                 .def('active', false)
                 .nodes(nv.nodesList)
                 .links(nv.linksList);

  /**
   * Initialize our filters.
   */
  nv.filterGroup.addLinkFilter(new qFilter('utilFilter',
      'utilization', 'router',
      0, 10, 'bps', Filter.FilterElements.LINK, 'Router Link Utilization' ));
  nv.filterGroup.addLinkFilter(new qFilter('capFilter',
      'capacity', 'router',
      0, 10, 'bps', Filter.FilterElements.LINK, 'Router Link Capacity'));
  nv.filterGroup.addNodeFilter(new rFilter('routerNameFilter',
      'nodeName', 'router', Filter.FilterElements.NODE, 'Router Hostname'));

  nv.initLinks(); // initialize links
  nv.initNodes(); // initialize nodes

  nv.visControl.setCurrentLayer('metro'); // show only the metro layer nodes
  nv.visControl.renderLinks(); // show only links whose end nodes are visible
  nv.vis.render(); // render the display
};

/**
 * Initializes the nodes.
 */
nv.initNodes = function() {
  nv.visControl.initNodeProperties();
  nv.network.node.add(pv.Dot)
      .size(function(d) {return nv.visControl.getNodeSize(d)})
      .left(function(d) {return d.x})
      .bottom(function(d) {return d.y})
      .fillStyle(function(d) {return nv.visControl.getNodeColor(d)})
      .strokeStyle(function(d) {return nv.visControl.getNodeBorder(d)})
      .lineWidth(function(d) {return d.hover ? 4 : 1})
      .visible(function(d) {return d.show})
      .event('mousedown', pv.Behavior.drag())
      .event('mouseup', function(d) {return nv.visControl.setNodePosition(d)})
      .event('drag', nv.network)
      .event('mouseover',
      function(d) {
        document.body.style.cursor = 'pointer';
        d.hover = true;
        nv.vis.render();
      })
      .event('mouseout',
      function(d) {
        document.body.style.cursor = 'default';
        d.hover = false;
        nv.vis.render();
      })
      .event('click', function(d) {return nv.visControl.displayNodeInfo(d)})
      .event('dblclick', function(d) {return nv.visControl.explodeNode(d)})
      .anchor('right')
      .add(pv.Label)
      .textStyle('#333')
      .textShadow('0.1em 0.1em 0.1em #fff')
      .font(
      function(d) {
              return 'bold ' + nv.visControl.getNodeFont(d) + ' helvetica';
      })
      .text(function(d) {return nv.visControl.formatNodeName(d.nodeName)});
};

/**
 * Initializes the links.
 */
nv.initLinks = function() {
  nv.visControl.initLinkProperties();
  nv.network.link.add(pv.Line)
      .strokeStyle(function(d, p) {return nv.visControl.getLinkColor(p)})
      .interpolate('polar')
      .eccentricity(0.95)
      .lineWidth(function(d, p) {return nv.visControl.getLinkThickness(p)})
      .event('mouseover',
        function(d,p) {
          document.body.style.cursor = 'pointer';
          p.hover = true;
          nv.vis.render();
      })
      .event('mouseout',
        function(d,p) {
          document.body.style.cursor = 'default';
          p.hover = false;
          nv.vis.render();
      })
      .event('click',
      function(d,p) {
        return nv.visControl.linkHighlightOn(p);
      })
      .add(pv.Dot)
      .data(
      function(l) {
        /**
         * We have to place the arrows at the midpoint of each edge. The edges
         * follow an elliptical path that can be determined from the coordinates
         * of the two end nodes and the eccentricity.
         */
        var r_sq = Math.pow(l.targetNode.y - l.sourceNode.y,
                            2) + Math.pow(l.targetNode.x - l.sourceNode.x, 2);
        var r = Math.sqrt(r_sq);
        var s_x = l.sourceNode.x;
        var s_y = l.sourceNode.y;
        var t_x = l.targetNode.x;
        var t_y = l.targetNode.y;
        var theta = Math.atan2(t_y - s_y, t_x - s_x);
        var b = Math.sqrt(1 - Math.pow(0.95, 2)) * r * 0.5;
        return [{
                x: t_x - 0.5 * r * Math.cos(theta) + 0.08 * b * Math.sin(theta),
                y: t_y - 0.5 * r * Math.sin(theta) - 0.08 * b * Math.cos(theta)
                }];
      })
      .angle(
      function(n, l) {
        return Math.atan2(l.targetNode.y - l.sourceNode.y,
            l.targetNode.x - l.sourceNode.x) - Math.PI / 2;
      })
      .shape('triangle')
      .fillStyle('#eee')
      .size(8);
};


/**
 * Node class that encapsulates hierarchical information about nodes
 * and their aggregation layers.
 * @param {object} obj A JSON object representing the node tree.
 * @param {Node} parent The parent of the current node.
 * @extends {NetworkViz} inherits data structures
 * @constructor
 */
function Node(obj, parent) {

    /**
     * The index of the corresponding node in nv.nodesList.
     * @type {number}
     */
    this.index = obj.index;

    /**
     * The name of this node.
     * @type {string}
     */
    this.nodeName = obj.nodeName.split('_').pop();

    /**
     * Whether or not the node has been filtered out.
     * @type {boolean}
     */
    this.filtered = obj.filtered;

    /**
     * The filter that filtered out the node. Labeled by
     * filterLayer_filterAttribute. Null otherwise.
     * @type {string}
     */
    this.filteredBy = obj.filteredBy;

    /**
     * The parent of this node.
     * @type {Node}
     */
    this.parent = parent;

    /**
     * Dictionary of node's children. Key is the shortened node name (without
     * names of parent nodes) and value is the associated Node instance.
     * @type {object}
     */
    this.children = {};

    /**
     * The number of children.
     * @type {number}
     */
    this.numChildren = 0;

    if (obj.hasOwnProperty('children')) {
      for (var each in obj.children) {
        this.numChildren++;
        this.children[obj.children[each].nodeName.split('_').pop()] =
            new Node(obj.children[each], this);
      }
    } else {
      this.children = null;
      return;
    }
}


/**
 * Determines if tree node's children are all filtered out.
 * @return {boolean} Whether or not the node has at least one child
 * that isn't filtered out.
*/
Node.prototype.areChildrenFilteredOut = function() {
  for (var each in this.children) {
    if (!this.children[each].filtered) {
      return false;
    }
  }
  return true;
};


/**
 * Marks a tree node as filtered.
*/
Node.prototype.filterOut = function() {
  if (!this.filtered) {
    this.filtered = true;
  }
};


/**
 * Marks a tree node as unfiltered.
*/
Node.prototype.filterIn = function() {
  if (this.filtered) {
    this.filtered = false;
  }
};


/**
 * Gets corresponding node from nv.nodesList.
 * The node list element contains node properties such as lat/long, etc.
 * @return {Object} A JS object within nv.nodesList that holds information
 * about the corresponding tree node in nv.nodesTree.
*/
Node.prototype.getListElt = function() {
  return nv.nodesList[this.index];
};


/**
 * Gets a specific node property.
 * @param {string} property A string specificying the node property.
 * @return {number|string} The value of the requested property.
*/
Node.prototype.getProperty = function(property) {
  if (this.index >= 0 && this.getListElt().hasOwnProperty(property)) {
    return this.getListElt()[property];
  }
};


/**
 * Determines if node has the specific node property.
 * @param {string} property A string specificying the node property.
 * @return {boolean} Whether or not the node has the property.
*/
Node.prototype.hasProperty = function(property) {
  return this.getListElt().hasOwnProperty(property);
};


/**
 * Determines if tree node has children.
 * @return {boolean} Whether or not the node has children nodes.
*/
Node.prototype.hasChildren = function() {
  return this.children != null;
};


/**
 * Labels the node with the filter that filtered it.
 * @param {Filter} filter Instance of Filter class.
*/
Node.prototype.markNode = function(filter) {
  this.filteredBy = filter.label;
};


/**
 * Unlabels the node, allowing any filter to act on it.
*/
Node.prototype.unmarkNode = function() {
  this.filteredBy = null;
};


/**
 * Node tree class that encapsulates hierarchical information about nodes
 * and their aggregation layers, as well as methods to perform filtering.
 * @constructor
 * @param {Node} root The root of the NodesTree.
 * @extends {NetworkViz} inherits data structures
 */
function NodesTree(root) {

  /**
   * The root of the nodes tree.
   * @type {Node}
   */
  this.root = root;
}


/**
 * Determines if a link's children are filtered out.
 * @param {object} link A JS object within nv.linksList holding link
 * information.
 * @return {bool} Whether or not a link has at least one child link not filtered
 * out.
*/
NodesTree.prototype.areLinkChildrenFilteredOut = function(link) {
  var linkChildren = this.getLinkChildren(link);

  for (var i = 0; i < linkChildren.length; i++) {
    if (!linkChildren[i].filtered) {
      return false
    }
  }

  return true;
};


/**
 * Filters in a node and its children.
 * @param {Node} node The node being filtered on.
 * @param {Filter} filter The filter being used to filter the node.
 * @see Filter#filterNodes
*/
NodesTree.prototype.filterInRecursive = function(node, filter) {
  if (node.hasChildren()) {
    for (var each in node.children) {
      if (node.children[each].filteredBy == filter.label) {
        node.children[each].filterIn();
        node.children[each].unmarkNode();
        this.filterInRecursive(node.children[each], filter);
      }
    }
  }
};


/**
 * Filters out a node and its children.
 * @see #filterInRecursive
*/
NodesTree.prototype.filterOutRecursive = function(node, filter) {
  if (node.hasChildren()) {
    for (var each in node.children) {
      if (node.children[each].filteredBy == null) {
        node.children[each].filterOut();
        node.children[each].markNode(filter);
        this.filterOutRecursive(node.children[each], filter);
      }
    }
  }
};


/**
 * Gets the children of a link.
 * For a link between any two nodes src and trg, its child links are those that
 * connect src or any child of src with trg or any child of trg, except the
 * links that connect src with trg.
 * @param {object} link A link within nv.linksList.
 * @return {array} An array of all the children links.
*/
NodesTree.prototype.getLinkChildren = function(link) {
  var linkChildren = [];
  var sourceNodeChildren = this.getNodeByIndex(link.source).children;
  var targetNodeChildren = this.getNodeByIndex(link.target).children;
  var linkType = link.type;

  /*
   * Here we hash the indices of all the children nodes of the target node as
   * well as the target node itself.
   */
  var targetNodeIndices = {};
  targetNodeIndices[link.target] = 1;
  for (var each in targetNodeChildren) {
    targetNodeIndices[targetNodeChildren[each].index] = 1;
  }

  var sourceNodeIndices = [link.source];
  for (var each in sourceNodeChildren) {
    sourceNodeIndices.push(sourceNodeChildren[each].index);
  }

  for (var i = 0; i < sourceNodeIndices.length; i++) {
    var source = sourceNodeIndices[i];

    /**
     * Now enumerate all children links by iterating over all neighbors of all
     * children of the source node and checking if their indices exist in the
     * hash table we created above.
     */
    for (var target in nv.nodesList[source].neighbors) {
      var childLink = nv.linksList[nv.nodesList[source].neighbors[target]];
      var childType = childLink.type;

      if (targetNodeIndices.hasOwnProperty(target) && childType != linkType ) {
        linkChildren.push(childLink);
      }
    }
  }
  return linkChildren;
};


/**
 * Gets a tree node by its corresponding index in the nodes list.
 * @param {number} nodeIndex The index of the desired node in the nodes list.
 * @return {Node} The corresponding tree node.
*/
NodesTree.prototype.getNodeByIndex = function(nodeIndex) {
  return this.getNodeByName(nv.nodesList[nodeIndex].nodeName);
};


/**
 * Gets a tree node by node name.
 * @param {string} nodeName The node name of the desired node.
 * @return {Node} The corresponding tree node.
*/
NodesTree.prototype.getNodeByName = function(nodeName) {
  var address_array = nodeName.split('_');

  switch (address_array.length)
  {
    case 1:
      return this.root.children[address_array[0]];

    case 2:
      return this.root.children[address_array[0]]
                      .children[address_array[1]];

    case 3:
      return this.root.children[address_array[0]]
                      .children[address_array[1]]
                      .children[address_array[2]];

    default:
      alert('Incorrect nodeName');
      break;
  }
};


/**
 * Gets the root of the tree.
 * @return {Node} The root node.
*/
NodesTree.prototype.get_Root = function() {
  return this.root;
};


/**
 * Prints out all tree nodes in the tree to the console.
*/
NodesTree.prototype.printOutNodes = function() {
  this.printOutNodes_(this.root);
};


/**
 * Helper function for printing out all tree nodes in the tree.
 * @param {Node} node A tree node.
 * @private
*/
NodesTree.prototype.printOutNodes_ = function(node) {
  console.log(node.nodeName + ', filtered: ' + node.filtered);
  if (node.children != null) {
    for (var each in node.children) {
      this.printOutNodes_(node.children[each]);
    }
  }
};


/**
 * Filter class that handles the filtering algorithm for nodes and links
 * @constructor
 * @extends {NetworkViz} inherits data structures
 */
function Filter() {

  /**
   * The div element id associated with this filter.
   * @type {string}
   */
  this.id;

  /**
   * The attribute on which this filter is filtering.
   * @type {string}
   */
  this.attribute;

  /**
   * The layer on which this filter is filterin.
   * @type {string}
   */
  this.layer;
}


/**
 * Filtering algorithm for nodes. First sorts the nodes list elements in order
 * of ascending layer hierarchy, and produces a sub-array of the nodes list
 * elements by removing nodes whose layer order is lower than that of the
 * layer we want to filter on.
 *
 * Iterating over this sub-array, for each node that belongs to the layer we
 * want to filter on, check if that node is valid. We use a labeling system
 * to avoid filter concurrency issues. Invalid, unlabeled nodes and their
 * children get filtered out and labeled with the filter that filtered it out.
 * From there, these nodes can not get filtered out again unless we use the
 * same filter (the labels match). Likewise, we can only filter in nodes using
 * the same filter that filtered them out, and when we do so, we set the
 * labels back to null (unlabeling the nodes) so that other filters may
 * operate on them.
 *
 * The scheme described above maintains the condition that at least one child
 * must be filtered in in order for its parent to be filtered in. We make sure
 * this condition also holds for nodes whose layer order is higher than that of
 * the layer we want to filter on, filtering out and labeling nodes whose
 * children are all filtered out, and filtering in and unlabeling nodes whose
 * children are not all filtered out.
 */
Filter.prototype.filterNodes = function() {
  var filter_layer = this.layer;
  var sub_array = nv.filterGroup.getSubArrayOfSortedNodes(filter_layer);
  var l = sub_array.length;

  for (var i = 0; i < l; i++) {
    var node = nv.nodesTree.getNodeByName(sub_array[i].nodeName);

    if (sub_array[i].type == filter_layer) {
      if (!node.filtered && !this.isNodeInbound(node) &&
          node.filteredBy == null) {

        node.filterOut();
        node.markNode(this);

        if (node.hasChildren()) {
          nv.nodesTree.filterOutRecursive(node, this);
        }

      } else if (node.filtered && this.isNodeInbound(node) &&
                 node.filteredBy == this.label) {

        node.filterIn();
        node.unmarkNode();

        if (node.hasChildren()) {
          nv.nodesTree.filterInRecursive(node, this);
        }
      }
    } else {

      if (!node.filtered && node.areChildrenFilteredOut()) {

        node.filterOut();
        node.markNode(this);

      } else if (node.filtered && !node.areChildrenFilteredOut()) {

        node.filterIn();
        node.unmarkNode();

      }
    }
  }
};

/** @enum {string}
 * Types of filters. Quant means filter that uses a quantitative metric
 * Regex means filter that uses a regex pattern.
 */
Filter.FilterTypes = {
  QUANT: 'quant',
  REGEX: 'regex'
};

/** @enum {string}
 * Elements to filter. Can be link or node.
 */
Filter.FilterElements = {
  LINK: 'link',
  NODE: 'node'
};


/**
 * Filters links using the same algorithm for filtering nodes.
 * Currently filters only router links.
 */
Filter.prototype.filterLinks = function() {
  var filter_layer = this.layer;
  var sub_array = nv.filterGroup.getSubArrayOfSortedLinks(filter_layer);
  var l = sub_array.length;

  for (var i = 0; i < l; i++) {
    var link = sub_array[i];

    if (link.type == filter_layer) {
      if (!link.filtered && !this.isLinkInbound(link) &&
          link.filteredBy == null) {
        link.filtered = true;
        link.filteredBy = this.label;
      } else if (link.filtered && this.isLinkInbound(link) &&
               link.filteredBy == this.label) {
        link.filtered = false;
        link.filteredBy = null;
      }
    } else {
      if (!link.filtered && nv.nodesTree.areLinkChildrenFilteredOut(link)) {
        link.filtered = true;
        link.filteredBy = this.label;
      } else if (link.filtered &&
                 !nv.nodesTree.areLinkChildrenFilteredOut(link)) {
        link.filtered = false;
        link.filteredBy = null;
      }
    }
  }
};


/**
 * Determines if a node is valid according to some metric.
 * @param {Node} node A tree node.
 * @return {boolean} Whether or not the node is valid according to some metric.
 */
Filter.prototype.isNodeInbound = function(node) {
  var attribute = node.getProperty(this.attribute);
  return this.isInbound(attribute);
};


/**
 * Determines if a link is valid according to some metric.
 * @param {Object} link A JS object within nv.linksList
 * holding link information.
 * @return {boolean} Whether or not a link is valid according to some metric.
 */
Filter.prototype.isLinkInbound = function(link) {
  var attribute = link[this.attribute];
  return this.isInbound(attribute);
};


/**
 * Subclass of Filter class for filtering using quantitative metric.
 * @param {string} id Unique name for filter.
 * @param {string} attribute The attribute/property we want to filter on.
 * @param {string} layer The layer we want to filter on.
 * @param {number} lower Lower bound.
 * @param {number} upper Upper bound.
 * @param {string} units The dimensions of the attribute.
 * @param {boolean} filterNodes Indicates whether we filter nodes or links.
 * @param {string} displayName The name to display as a label for this filter.
 * @extends {Filter}
 */
qFilter.prototype = new Filter();

/**
 * Use qFilter constructor for qFilter.
 */
qFilter.prototype.constructor = qFilter;
function qFilter(id, attribute, layer, lower, upper,
    units, filterElement, displayName)
{
  this.filterType = Filter.FilterTypes.QUANT;
  this.id = id; // The DOM id
  this.attribute = attribute;
  this.layer = layer;
  this.lower = lower; // Lower bound of the filtering range.
  this.upper = upper; // Upper bound of the filtering range.
  this.units = units;
  this.filterElement = filterElement;
  this.displayName = displayName;

  /** The filter label.
   * @type {string}
   */
  this.label = this.layer + '_' + this.attribute;
}


/**
 * Determines if value is within the bounds of the qFilter.
 * @param {number} attribute Represents a quantitative attribute.
 * @return {boolean} Whether or not value is within bounds of the qFilter.
 */
qFilter.prototype.isInbound = function(attribute) {
  if (attribute > this.upper || attribute < this.lower) {
    return false;
  } else {
    return true;
  }
};


/**
 * Updates the bounds of the qFilter. User interacts with slider
 * to use this method.
 * @param {number} new_lower The new lowerbound.
 * @param {number} new_upper The new upperbound.
 */
qFilter.prototype.updateBounds = function(new_lower, new_upper) {
  this.lower = new_lower;
  this.upper = new_upper;
};


/**
 * Subclass of Filter class for filtering using regex metric.
 * @extends {Filter}
 * @see {qFilter}
 */
rFilter.prototype = new Filter();

/**
 * Use rFilter constructor for rFilter.
 */
rFilter.prototype.constructor = rFilter;
function rFilter(id, attribute, layer, filterElement, displayName) {
  this.filterType = Filter.FilterTypes.REGEX;
  this.id = id;
  this.attribute = attribute;
  this.layer = layer;
  this.pattern = ''; // The regex pattern we're matching against.
  this.filterElement = filterElement;
  this.displayName = displayName;

  /** The filter label.
   * @type {string}
   */
  this.label = this.layer + '_' + this.attribute;
}


/**
 * Determines if value is valid according to the regex pattern.
 * @param {string} attribute Represents a regex-filterable attribute.
 * @return {boolean} Whether or not value is valid according to regex pattern.
 */
rFilter.prototype.isInbound = function(attribute) {
  var re;
  try {
    re = new RegExp(this.pattern);
  } catch (e) {
    console.log(e);
  }
  return re.test(attribute);
};


/**
 * Alternate method for determining if node is valid under rFilter.
 * Node is valid if either its attribute matches pattern, or one of
 * its neighbors matches the pattern.
 * @param {Node} node A tree node.
 * @return {boolean} Whether or not value is valid according to regex pattern or
 * has a neighbor whose value is valid according to regex pattern.
 */
rFilter.prototype.isNodeInboundIncludeNeighbors = function(node) {
  var attribute = node.getProperty(this.attribute);
  var nodeValid = this.isInbound(attribute);

  if (nodeValid) {
    return true;
  } else {
    var neighbors = node.getListElt().neighbors;
    for (each in neighbors) {
      attribute = nv.nodesList[each][this.attribute];
      var neighborValid = this.isInbound(attribute);
      if (neighborValid == true) {
        return true;
      }
    }
    return false;
  }
};


/**
 * Toggles between the two methods for determining if node is valid under
 * rFilter. Users can call this function using "Include neighbors" checkbox.
 * @param {boolean} bool Whether or not we want to include neighbors of valid
 * nodes.
*/
rFilter.prototype.toggleIncludeNeighbors = function(bool) {
  if (bool == true) {
    this.isNodeInbound = this.isNodeInboundIncludeNeighbors;
  } else {
    this.isNodeInbound = Filter.prototype.isNodeInbound;
  }
};


/**
 * Updates the regex pattern of the rFilter. User interacts with text input
 * to use this method.
 * @param {string} new_pattern The regex pattern being matched against.
 */
rFilter.prototype.updatePattern = function(new_pattern) {
  this.pattern = new_pattern;
};


/**
 * Class that organizes filters and allows user to control filtering.
 * @constructor
 * @extends {NetworkViz}
 */
function FilterGroup() {
  this.node_filters = {'metro' : {}, 'pop': {}, 'router': {}};
  this.link_filters = {'metro' : {}, 'pop': {}, 'router': {}};
  this.layer_sorted_nodes =
      nv.nodesList
        .concat().sort(FilterGroup.sortByLayerFunction); //router -> metro
  this.layer_sorted_links =
      nv.linksList
        .concat().sort(FilterGroup.sortByLayerFunction); //router -> metro
  this.layerSortedLinksLength = this.layer_sorted_links.length;
};


/**
* @private Helper function to be used in ascending layer-order sorting.
* @param {object} a A JS Object within nv.nodesList holding node
* information.
* @param {object} b Another JS Object within nv.nodesList holding node
* information.
* @return {number} Below zero, sort a before b. Above 0, sort a after b.
* Equal zero, do not change surrent sort order.
*/
FilterGroup.sortByLayerFunction = function(a, b) {
    return (nv.layerOrder[a.type] - nv.layerOrder[b.type]);
};


/**
 * Inserts a new node filter into the filter group.
 * @param {Filter} filter Instance of Filter to be added to node filter set.
 */
FilterGroup.prototype.addNodeFilter = function(filter) {
  this.node_filters[filter.layer][filter.attribute] =
      {filter: filter, active: false};
};


/**
 * Inserts a new link filter into the filter group.
 * @param {Filter} filter Instance of Filter to be added to link filter set.
 */
FilterGroup.prototype.addLinkFilter = function(filter) {
  this.link_filters[filter.layer][filter.attribute] =
      {filter: filter, active: false};
};


/**
 * Calls node filtering method to filter on a layer / attribute.
 * @param {string} layer Name of layer to be filtered on.
 * @param {string} attribute Name of attribute to be filtered on.
 * @param {string} input What the filter is comparing against to check for
 * validity.
 * or regex pattern.
 */
FilterGroup.prototype.filterNodes = function(layer, attribute, input) {
  var cur_filter = this.getNodeFilter(layer,attribute);
  var isActive = this.isNodeFilterActive(layer,attribute);

  if (cur_filter.filterType == Filter.FilterTypes.QUANT) {
    var vals = input.split(';');
    var lower = vals[0];
    var upper = vals[1];
    cur_filter.updateBounds(lower, upper);
  } else {
    cur_filter.updatePattern(input);
  }

  //if (isActive) {
    cur_filter.filterNodes();
  //}
};


/**
 * Calls link filtering method to filter on a layer / attribute.
 * @see #filterNodes
 */
FilterGroup.prototype.filterLinks = function(layer, attribute, input) {
  var cur_filter = this.getLinkFilter(layer,attribute);
  var isActive = this.isLinkFilterActive(layer,attribute);

  if (cur_filter.filterType == Filter.FilterTypes.QUANT) {
    var vals = input.split(';');
    var lower = vals[0];
    var upper = vals[1];
    cur_filter.updateBounds(lower, upper);
  }
  else {
    cur_filter.updatePattern(input);
  }

  //if (isActive) {
    cur_filter.filterLinks();
  //}
};


/**
 * Gets a node filter from node filter dictionary.
 * @param {string} layer Layer that filter acts on.
 * @param {string} attribute Attribute/property that filter acts on.
 * @return {Filter} The desired filter.
 */
FilterGroup.prototype.getNodeFilter = function(layer, attribute) {
  return this.node_filters[layer][attribute].filter;
};


/**
 * Gets a link filter from link filter dictionary.
 * @see #getNodeFilter
 * @return {Filter} The desired filter.
*/
FilterGroup.prototype.getLinkFilter = function(layer, attribute) {
  return this.link_filters[layer][attribute].filter;
};


/**
 * Gets sub-array of a layer-sorted list, removing elements whose layer-order
 * is lower than that of desired layer. To be used in conjunction
 * with filtering algorithm.
 * @param {array} array The nodes or links list array.
 * @param {string} layer The layer of the first element in the
 * resulting sub-array.
 * @return {array} The resulting sub-array.
 * @see Filter.filterNodes
*/
FilterGroup.prototype.getSubArray = function(array, layer) {
  var l = array.length;
  for (var i = 0; i < l; i++) {
    if (array[i].type == layer) {
      return array.slice(i);
    }
  }
};


/**
 * Indicates whether a node filter is active.
 * @param {string} layer Layer the filter acts on.
 * @param {string} attribute Attribute/property the filter acts on.
 * @return {boolean} Whether the filter is active.
 */
FilterGroup.prototype.isNodeFilterActive = function(layer,attribute) {
  return this.node_filters[layer][attribute].active;
};


/**
 * Indicates whether a link filter is active.
 * @param {string} layer Layer the filter acts on.
 * @param {string} attribute Attribute/property the filter acts on.
 * @return {boolean} Whether the filter is active.
 */
FilterGroup.prototype.isLinkFilterActive = function(layer,attribute) {
  return this.link_filters[layer][attribute].active;
}


/**
 * Gets sub-array of layer-sorted nodes list.
 * @param {string} layer The layer of the first node in the resulting sub-array.
 * @return {array} The resulting sub-array.
 * @see #getSubArray
*/
FilterGroup.prototype.getSubArrayOfSortedNodes = function(layer) {
  return this.getSubArray(this.layer_sorted_nodes, layer);
};


/**
 * Gets sub-array of layer-sorted links list.
 * @param {string} layer The layer of the first link in the resulting sub-array.
 * @return {array} The resulting sub-array.
 * @see #getSubArray
*/
FilterGroup.prototype.getSubArrayOfSortedLinks = function(layer) {
  /**
   * We resort the layer-sorted list of links every time we add new
   * cross links.
   */
  if (nv.numLinks > this.layerSortedLinksLength) {
    this.layer_sorted_links =
        nv.linksList.concat().sort(FilterGroup.sortByLayerFunction);
    this.layerSortedLinksLength = nv.numLinks;
  }

  return this.getSubArray(this.layer_sorted_links, layer);
};


/**
 * Sets a node filter to be active.
 * @param {string} layer Layer that filter acts on.
 * @param {string} attribute Attribute/property that filter acts on.
 * @param {boolean} active Whether we want the filter to be active.
 */
FilterGroup.prototype.setNodeFilterActivity = function(layer,
                                                       attribute, active) {
  this.node_filters[layer][attribute].active = active;
};


/**
 * Sets a link filter to be active.
 * @param {string} layer Layer that filter acts on.
 * @param {string} attribute Attribute/property that filter acts on.
 * @param {boolean} active Whether we want the filter to be active.
 */
FilterGroup.prototype.setLinkFilterActivity = function(layer,
                                                       attribute, active) {
  this.link_filters[layer][attribute].active = active;
};


/**
 * Class that controls everything that is visually displayed to the user.
 * @constructor
 * @extends {NetworkViz} inherits data structures
 */
function Visual() {
  this.currentLayer; // The current layer that is being displayed.
  this.newCrossLinks = []; // Holds new cross links as nodes are exploded.
  this.layerPropertyMap = {
    'metro': {
      color: '#E33422',
      dimColor:'#D1C4C2',
      border: '#962216',
      dimBorder: '#C4B1AF',
      size: 400,
      fontsize: '16px'},
    'pop': {
      color: '#FFEC9E',
      dimColor: '#EBE6D3',
      border: '#F0AD41',
      dimBorder: '#DED5B4',
      size: 100,
      fontsize: '14px'},
    'router': {
      color: '#5B88B5',
      dimColor: '#C7CCD1',
      border: '#164B80',
      dimBorder: '#A3AEB8',
      size: 10,
      fontsize: '14px'
    }
  };
  this.colorscales = {
    '#E33422': pv.Scale.linear(0, 10).range('white', '#E33422'),
    '#FFEC9E': pv.Scale.linear(0, 10).range('white', '#FFEC9E'),
    '#5B88B5': pv.Scale.linear(0, 10).range('white', '#5B88B5'),
    'tricolor': pv.Scale.linear(0, 5, 10).range('red', 'yellow', 'green')
  };
}


/**
 * Helper function for building cross links between two nodes of different
 * layer hierarchy. Hashes cross links into nv.crossLinksDict. Called by
 * #buildUpCrosslinks and #buildDownCrosslinks.
 * @param {number} mainIndex Index of node element in node list (the one
 * that was clicked).
 * @param {number} neighborIndex Index of node element in node list
 * (one of the neighboring nodes).
 * @private
*/
Visual.prototype.buildCrosslinks_ = function(mainIndex, neighborIndex) {
  var crossLink1 = {};
  crossLink1.source = mainIndex;
  crossLink1.target = parseInt(neighborIndex);

  var type1 = nv.nodesList[crossLink1.source].type;
  var type2 = nv.nodesList[crossLink1.target].type;
  crossLink1.type = type1 + '_' + type2;
  crossLink1.filtered = false;
  crossLink1.filteredBy = null;
  crossLink1.dim = false;
  crossLink1.hover = false;
  nv.nodesList[crossLink1.source].neighbors[crossLink1.target] = nv.numLinks;
  nv.numLinks++; // Update the links count.

  var crossLink2 = jQuery.extend(true, {}, crossLink1);
  crossLink2.source = parseInt(neighborIndex);
  crossLink2.target = mainIndex;
  nv.nodesList[crossLink2.source].neighbors[crossLink2.target] = nv.numLinks;
  nv.numLinks++;
  /**
   * Insert new cross links.
   */
  this.newCrossLinks.push(crossLink1);
  this.newCrossLinks.push(crossLink2);

  /**
   * Keep track of cross links we've inserted.
   */
  var cl_key1 = mainIndex + '_' + neighborIndex;
  var cl_key2 = neighborIndex + '_' + mainIndex;
  nv.crossLinksDict[cl_key1] = crossLink1;
  nv.crossLinksDict[cl_key2] = crossLink2;
};


/**
 * Recursively builds cross links from nodes of lower layer hierarchy
 * to nodes of higher.
 * @param {number} mainIndex Index of node element in node list (the one
 * that was clicked).
 * @param {number} neighborIndex Index of node element in node list (one of
 * the neighboring nodes).
 * @see #explodeNode
*/
Visual.prototype.buildUpCrosslinks = function(mainIndex, neighborIndex) {
  var testkey = mainIndex + '_' + neighborIndex;
  var isSameType = (nv.nodesList[mainIndex].type ==
                    nv.nodesList[neighborIndex].type);
  if (!(testkey in nv.crossLinksDict) && !isSameType) {
    this.buildCrosslinks_(mainIndex, neighborIndex);
    var neighbor_node =
        nv.nodesTree.getNodeByName(nv.nodesList[neighborIndex].nodeName);

    if (neighbor_node.parent.index != undefined) {
      var new_neighborIndex = neighbor_node.parent.index;
      this.buildUpCrosslinks(mainIndex, new_neighborIndex);
    }
  }
};


/**
 * Recursively builds cross links from nodes of higher layer hierarchy
 * to nodes of lower.
 * @param {number} mainIndex Index of node element in node list (the one
 * that was clicked).
 * @param {number} neighborIndex Index of node element in node list (one
 * of the neighboring nodes).
 * @see #explodeNode
*/
Visual.prototype.buildDownCrosslinks = function(mainIndex, neighborIndex) {
  var testkey = mainIndex + '_' + neighborIndex;
  var isSameType = (nv.nodesList[mainIndex].type ==
                    nv.nodesList[neighborIndex].type);

  if (nv.nodesList[neighborIndex].show &&
      !(testkey in nv.crossLinksDict) && !isSameType) {
    this.buildCrosslinks_(mainIndex, neighborIndex);
  } else if (!nv.nodesList[neighborIndex].show) {
    var neighbor_node =
        nv.nodesTree.getNodeByName(nv.nodesList[neighborIndex].nodeName);

    if (neighbor_node.children != null) {
      for (var each in neighbor_node.children) {
        var new_neighborIndex = neighbor_node.children[each].index;
        this.buildDownCrosslinks(mainIndex, new_neighborIndex);
      }
    }
  }
};


/**
 * Pushes node information onto the display-bar div whenever
 * user clicks on a node.
 * @param {object} elt A JS object within nv.nodesList holding node information.
*/
Visual.prototype.displayNodeInfo = function(elt) {
  var displayBar = document.getElementById('display-bar');
  displayBar.style.display = 'block';

  var displayName = document.getElementById('display-name');
  displayName.innerHTML = this.formatNodeName(elt.nodeName) + ' (node)';

  var properties = ['type']; // The properties we want to print out.
  var displayInfo = document.getElementById('display-info');
  displayInfo.innerHTML = '';

  for (var i = 0; i < properties.length; i++) {
    var prop = properties[i];
    var s = document.createElement('div');
    s.innerHTML = '<b>' + prop + '</b>: ' + elt[prop];
    displayInfo.appendChild(s);
  }
};


/**
 * Explodes a node to reveal underlying layer. Crosslinks are built
 * between nodes of differing layers, and exploded nodes are marked so
 * that #renderNodes handles them correctly.
 * @param {object} elt A JS object within nv.nodesList holding node information.
*/
Visual.prototype.explodeNode = function(elt) {
  var node = nv.nodesTree.getNodeByName(elt.nodeName);
  elt.hover = false;

  if (node.hasChildren()) {
    elt.show = false;
    elt.exploded = true; // prevents #renderNodes from showing exploded node
    var children = node.children;

    for (var obj in children) {
      var child_index = children[obj].index;
      nv.nodesList[child_index].show = true;
      nv.nodesList[child_index].exploded = true; // prevents #renderNodes
                                                 // from hiding exploded node
      for (var neighbor in elt.neighbors) {
        this.buildUpCrosslinks(child_index, neighbor);
        this.buildDownCrosslinks(child_index, neighbor);
      }
    }
  }
  nv.visControl.renderLinks();
  nv.vis.render();
};


/**
 * Formats the label for a node.
 * nv.nodesTree and nv.nodesList label metros as X, pops as X_X# and routers as
 * X_X#_br#.X#. This function formats metro labels as X, pop labels as X#, and
 * router labels as br#.X#.
 * @param {string} nodeName Name of node as they appear on nv.nodesTree nodes
 * and nv.nodesList nodes.
 * @return {string} The formatted name of the node.
 */
Visual.prototype.formatNodeName = function(nodeName) {
  return nodeName.split('_').slice(-1);
};


/**
 * Gives the corresponding Protovis object the correct color of the link.
 * @param {object} link A JS object within nv.linksList.
 * @return {string|pv.Color} The color we'd like the link to be.
 */
Visual.prototype.getLinkColor = function(link) {
  var color;
  if (link.type == 'router' && !link.dim) {
    var scale = this.colorscales['tricolor'];
    color = scale(link.utilization);
  } else {
    color = '#aaa';
  }
  return new pv.color(color).alpha(0.3+0.7*(1-link.dim));
};


/**
 * Gives the corresponding Protovis object the correct thickness of the link.
 * @param {object} link A JS object within nv.linksList.
 * @return {number} The thickness we'd like the link to be.
 */
Visual.prototype.getLinkThickness = function(link) {
  var thick;
  if (link.type == 'router') {
    thick = link.capacity * 0.5;
  } else {
    thick = 1.2;
  }
  return thick*(1+link.hover);
};


/**
 * Gives the corresponding Protovis object the correct border color of the node.
 * @param {object} elt A JS object within nv.nodesList.
 * @return {string} The color we'd like the node border to be.
 */
Visual.prototype.getNodeBorder = function(elt) {
  var nodeType = elt.type;

  if (elt.dim) {
    var color = this.layerPropertyMap[nodeType].dimBorder;
    return color;
  } else {
    var color = this.layerPropertyMap[nodeType].border;
    return color;
  }
};


/**
 * Gives the corresponding Protovis object the correct color of the node.
 * @param {object} elt A JS object within nv.nodesList.
 * @return {string | pv.color} The color we'd like the node to be.
 */
Visual.prototype.getNodeColor = function(elt) {
  var nodeType = elt.type;

  if (elt.dim) {
    var color = this.layerPropertyMap[nodeType].dimColor;
    return color;
  } else {
    var color = this.layerPropertyMap[nodeType].color;
    return color;
  }
};


/**
 * Gives the corresponding Protovis object the correct fontsize of the node.
 * @param {object} elt A JS object within nv.nodesList.
 * @return {number} The fontsize we'd like the node to be.
 */
Visual.prototype.getNodeFont = function(elt) {
  var nodeType = elt.type;
  return this.layerPropertyMap[nodeType].fontsize;
};


/**
 * Gives the corresponding Protovis object the correct size of the node.
 * @param {object} elt A JS object within nv.nodesList.
 * @return {number} The size we'd like the node to be.
 */
Visual.prototype.getNodeSize = function(elt) {
  var nodeType = elt.type;
  return this.layerPropertyMap[nodeType].size;
};


/**
 * Initializes link properties.
 */
Visual.prototype.initLinkProperties = function() {
  var l = nv.linksList.length;
  for (var i = 0; i < l; i++) {
    var elt = nv.linksList[i];

    elt.dim = false; // dims link when we highlight
    elt.filtered = false;
    elt.filteredBy = null;
    elt.hover = false;
  }
};


/**
 * Initializes node properties. Initializes all the node positions based
 * on pop lat/lngs by calling #setNodePosition function used to position node
 * aggregates (metros, its pops, its routers) as the user moves one of
 * the members of a node aggregate.
 */
Visual.prototype.initNodeProperties = function() {
  for (var i = 0; i < nv.numNodes; i++) {
    var elt = nv.nodesList[i];

    elt.dim = false; // dims node when we highlight a link
    elt.show = true; // indicates node visiblility
    elt.hover = false; // toggles when user hovers over a node
    elt.filtered = false; // indicates if node is being filtered
    elt.filteredBy = null; // label of filter that filtered the node

    if (elt.type == 'pop') {
      this.setNodePosition(elt,
          document.body.clientWidth / 1000, document.body.clientHeight / 750);
    }
  }
};


/**
 * Highlights a link by reducing the opacity of all other elements.
 * @param {object} link a JS object within nv.linksList.
 */
Visual.prototype.linkHighlightOn = function(link) {
  this.linkHighlightOff(); // Reset all nodes first.
  var src = link.source;
  var tar = link.target;
  var linkIndex = nv.nodesList[src].neighbors[tar];

  for (var i = 0; i < nv.numNodes; i++) {
      var elt = nv.nodesList[i];
      if (i != src && i != tar) {
        elt.dim = true; // dim all other nodes
      }
  }

  for (var i = 0; i < nv.linksList.length; i++) {
    if (i != linkIndex) {
      var elt = nv.linksList[i];
      elt.dim = true; // dim all other links
    }
  }
  nv.vis.render();
};


/**
 * Turns highlighting off.
 */
Visual.prototype.linkHighlightOff = function() {
  for (var i = 0; i < nv.numNodes; i++) {
    var elt = nv.nodesList[i];
    elt.dim = false;
  }

  for (var i = 0; i < nv.linksList.length; i++) {
    var elt = nv.linksList[i]
    elt.dim = false;
  }
  nv.vis.render();
};


/**
 * Renders links. Concatenates the new cross links with nv.linksList and then
 * filters out any link that is connected to a node that has been hidden by
 * #renderNodes.
*/
Visual.prototype.renderLinks = function() {
  nv.linksList = nv.linksList.concat(this.newCrossLinks);
  this.newCrossLinks = [];
  nv.network.links(nv.linksList.filter(
    function(d) {
      if (nv.nodesList[d.source].show &&
          nv.nodesList[d.target].show && !d.filtered) {
        return true;
      } else {
        return false;
      }
    })
  );
  this.linkHighlightOff();
  nv.network.reset();
};


/**
 * Runs over all nodes and displays or hides them according to their
 * exploded and filtered statuses, as well as the value of currentLayer.
 * Can also reset all exploded nodes back to default.
*/
Visual.prototype.renderNodes = function() {
  for (var i = 0; i < nv.numNodes; i++) {
    var resetExplosions = arguments[0];
    var elt = nv.nodesList[i];
    var node = nv.nodesTree.getNodeByName(elt.nodeName);

    if (resetExplosions) {
      elt.exploded = false;
    }

    if (node.filtered) {
      elt.show = false;
    } else {
      if (elt.type == this.currentLayer && !elt.exploded) {
        elt.show = true;
      } else if (elt.type != this.currentLayer && !elt.exploded) {
        elt.show = false;
      }
    }
  }
};


/**
 * Used to show a single layer. Sets the currentLayer to layer and then runs
 * #renderNodes to re-render all nodes, resetting exploded ones back to default.
 * @param {string} layer The name of the layer to show.
*/
Visual.prototype.setCurrentLayer = function(layer)
{
  this.currentLayer = layer;
  this.renderNodes(true); //reset explosions
};


/**
 * Whenever a node is moved by the user, this function is called to set
 * all corresponding parent and children nodes to the same area as the new
 * location of the moved node. Children nodes are positioned radially about the
 * center of the parent node (if there is one child, then it is moved to the
 * parent's location). Parent nodes are positioned at the centroid of its
 * children.
 * @param {object} elt A JS object within nv.nodesList holding node information.
 * @param {number} scaleX Scaling factor applied to the node's x-displacement
 * from top left corner. Used to scale from lat/lng positions to screen
 * positions.
 * @param {number} scaleY Scaling factor applied to the node's y-displacement
 * from top left corner.
*/
Visual.prototype.setNodePosition = function(elt, scaleX, scaleY) {
  var node = nv.nodesTree.getNodeByName(elt.nodeName);
  if (scaleX != undefined && scaleY != undefined) {
    node.getListElt().x *= scaleX;
    node.getListElt().y *= scaleY;
  }

  function setPositionFromParent(node, num, angle) {
    node.getListElt().x = node.parent.getListElt().x;
    node.getListElt().y = node.parent.getListElt().y;

    if (angle != null) {
      var radius;
      node.getListElt().type == 'pop' ? radius = 30 : radius = 50;
      node.getListElt().x += radius * Math.cos(num * angle);
      node.getListElt().y += radius * Math.sin(num * angle);
    }
  };

  function setPositionFromChildren(node) {
    var total_x = 0, total_y = 0, count = 0;
    for (var each in node.children) {
      var child = node.children[each];
      total_x += child.getListElt().x;
      total_y += child.getListElt().y;
      count += 1;
    }

    node.getListElt().x = total_x / count;
    node.getListElt().y = total_y / count;
  };

  function setChildrenPositions(node) {
    if (node.hasChildren()) {
      var i = 0, angle;
      var numChildren = node.numChildren;
      numChildren > 1 ? angle = 2 * Math.PI / numChildren : angle = null;

      for (var each in node.children) {
        var child = node.children[each];
        setPositionFromParent(child, i, angle);
        setChildrenPositions(child);
        i++;
      }
    }
  };

  function setParentPositions(node) {
    if (node.parent.nodeName != 'master') {
      setPositionFromChildren(node.parent);
      setParentPositions(node.parent);
    }
  }
  setChildrenPositions(node);
  setParentPositions(node);
  nv.vis.render();
};


function InteractionControl() {
  this.idToFilterMap = {
    'utilFilter': {
      filterElement: Filter.FilterElements.LINK,
      filterLabel: 'router_utilization',
    },
    'capFilter': {
      filterElement: Filter.FilterElements.LINK,
      filterLabel: 'router_capacity',
    },
    'routerNameFilter': {
      filterElement: Filter.FilterElements.NODE,
      filterLabel: 'router_nodeName',
    },
  };
};


InteractionControl.prototype.applyFilter = function(filterDomId) {
  var filterLabel = this.idToFilterMap[filterDomId].filterLabel.split('_');
  var filterElement = this.idToFilterMap[filterDomId].filterElement;
  var filterDom = document.getElementById(filterDomId);

  if (filterElement == Filter.FilterElements.LINK) {
    nv.filterGroup.filterLinks(filterLabel[0],
        filterLabel[1], $('#'+filterDomId).val() );
  } else {
    nv.filterGroup.filterNodes(filterLabel[0],
        filterLabel[1], $('#'+filterDomId).val() );
  }

  nv.visControl.renderNodes();
  nv.visControl.renderLinks();
  nv.vis.render();
};

InteractionControl.prototype.applyAllFilters = function() {
  for (var filterDomId in this.idToFilterMap) {
    this.applyFilter(filterDomId);
  }
};

InteractionControl.prototype.saveState = function() {
  var utilFilter = nv.filterGroup.getLinkFilter('router','utilization');
  var capFilter = nv.filterGroup.getLinkFilter('router','capacity');
  var routerNameFilter = nv.filterGroup.getNodeFilter('router','nodeName');

  var stateVector = {
    currentLayer: nv.visControl.currentLayer,
    utilFilter: utilFilter.lower + ';' + utilFilter.upper,
    capFilter: capFilter.lower + ';' + capFilter.upper,
    routerNameFilter: routerNameFilter.pattern,
  }

  var stateVectorString = '?';
  for (var state in stateVector) {
    stateVectorString += state + '=' + stateVector[state] + '&';
  }

  return stateVectorString.slice(0,-1);
};

InteractionControl.prototype.readState = function(stateVectorString) {
  var preStateVector = stateVectorString.substr(1).split('&');
  var stateVector = {};
  for (var preState in preStateVector) {
    var keyval = preStateVector[preState].split('=');
    stateVector[keyval[0]] = keyval[1];
  }

  return stateVector;
};

InteractionControl.prototype.loadState = function(stateVector) {
  nv.visControl.currentLayer = stateVector.currentLayer;
  var utilFilterDom = $('#utilFilter');
  utilFilterDom.val(stateVector.utilFilter);

  var capFilterDom = $('#capFilter');
  capFilterDom.val(stateVector.capFilter);

  var routerNameFilterDom = $('#routerNameFilter');
  routerNameFilterDom.val(stateVector.routerNameFilter);

  this.applyAllFilters();
};

/**
 * NOTE (Andrew): Prototyped some functions that will aid in a framework
 * that allows user to either add a new filter from a table of contents or a
 * new display layer (e.g. capacity visualization, LSP visualization, etc.)
 * from a table of contents.
 * Will need to integrate current event listener functions in main.js to get
 * this working. When user adds a new filter, it must be set to active in the
 * nv.filterGroup.
/*
InteractionControl.prototype.activateFilter = function(filterDomId, setInput) {
  var filterLabel = this.idToFilterMap[filterDomId].filterLabel.split('_');
  var filterElement = this.idToFilterMap[filterDomId].filterElement;
  var container = document.getElementById('interaction-container');

  if (filterElement == Filter.FilterElements.LINK) {
    nv.filterGroup.setLinkFilterActivity(filterLabel[0], filterLabel[1], true);
    var linkFilter =
        nv.filterGroup.getLinkFilter(filterLabel[0], filterLabel[1]);
    container.appendChild(this.getFilterHTML_(linkFilter, setInput));
    console.log(this.getFilterHTML_(linkFilter, setInput));
  } else {
    nv.filterGroup.setNodeFilterActivity(filterLabel[0], filterLabel[1], true);
    var nodeFilter =
        nv.filterGroup.getNodeFilter(filterLabel[0], filterLabel[1], true);
    container.appendChild(this.getFilterHTML_(nodeFilter, setInput));
    console.log(this.getFilterHTML_(nodeFilter, setInput));
  }


};


InteractionControl.prototype.getFilterHTML_ = function(filter, input) {
  var wrapper = this.getInteractionHTML_();
  if (filter.filterType == Filter.FilterTypes.QUANT) {
    var slider = document.createElement('input');
    slider.setAttribute('id', filter.id);
    slider.setAttribute('type', 'slider');
    if (input == undefined) {
      input = [filter.lower, filter.upper];
    }
    slider.setAttribute('value', input[0] + ';' + input[1]);
    slider.style.paddingTop = '20px';
    // Need to add slider event listener here.
    wrapper.childNodes[1].appendChild(slider);
  } else {
    var regexInput = document.createElement('input');
    regexInput.setAttribute('id',filter.id);
    regexInput.setAttribute('type', 'text');
    regexInput.className = 'regexInput';
    if (input == undefined) {
      input = 'Enter a regular expression';
    }
    regexInput.setAttribute('value', input);
    wrapper.childNodes[1].appendChild(regexInput);

    var regexCheckbox = document.createElement('input');
    regexCheckbox.setAttribute('id', 'includeNeighbors_checkbox');
    regexCheckbox.setAttribute('type', 'checkbox');
    wrapper.childNodes[1].appendChild(regexCheckbox);
    wrapper.childNodes[1].appendChild(
        document.createTextNode('Include neighbors'));

  }
  wrapper.childNodes[0].appendChild(
      document.createTextNode(filter.displayName));
  wrapper.childNodes[2].firstChild.setAttribute('id', 'close_' + filter.id);

  return wrapper;
};


InteractionControl.prototype.getInteractionHTML_ = function() {
  var wrapper = document.createElement('div');
  wrapper.className = 'interaction';
  var innerElements = ['title', 'content', 'side', 'clear'];

  function createDiv(className) {
    var div = document.createElement('div');
    div.className = className;
    return div;
  };

  for (var i = 0; i < innerElements.length; i++) {
    wrapper.appendChild(createDiv(innerElements[i]));
  }

  var close = document.createElement('button');
  close.appendChild(document.createTextNode('Remove'));

  wrapper.childNodes[2].appendChild(close);

  return wrapper;
};
*/

