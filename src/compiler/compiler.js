'use strict';

var vldata = require('../data');

require('../globals');

var compiler = module.exports = {};

var Encoding = require('../Encoding'),
  axis = compiler.axis = require('./axis'),
  filter = compiler.filter = require('./filter'),
  legend = compiler.legend = require('./legend'),
  marks = compiler.marks = require('./marks'),
  scale = compiler.scale = require('./scale');

compiler.aggregate = require('./aggregate');
compiler.bin = require('./bin');
compiler.facet = require('./facet');
compiler.group = require('./group');
compiler.layout = require('./layout');
compiler.sort = require('./sort');
compiler.stack = require('./stack');
compiler.style = require('./style');
compiler.subfacet = require('./subfacet');
compiler.template = require('./template');
compiler.time = require('./time');

compiler.compile = function (spec, stats, theme) {
  return compiler.compileEncoding(Encoding.fromSpec(spec, stats, theme));
};

compiler.shorthand = function (shorthand, data, stats, config, theme) {
  return compiler.compileEncoding(Encoding.fromShorthand(shorthand, data, stats, config, theme));
};

compiler.compileEncoding = function (encoding) {
  // no need to pass stats if you pass in the data
  if (!encoding.stats() && encoding.hasValues()) {
    encoding.setStats(vldata.stats(encoding.data().values));
  }

  var layout = compiler.layout(encoding),
    spec = compiler.template(encoding, layout);

  // .data related stuff
  var rawTable = spec.data[0],
    dataTable = spec.data[1];

  rawTable = filter.addFilters(rawTable, encoding); // modify rawTable
  spec = compiler.time(spec, encoding);              // modify rawTable, add scales
  dataTable = compiler.bin(dataTable, encoding);     // modify dataTable
  var aggResult = compiler.aggregate(dataTable, encoding); // modify dataTable
  var sorting = compiler.sort(spec.data, encoding); // append new data

  // marks
  var style = compiler.style(encoding),
    group = spec.marks[0],
    mdefs = marks.def(encoding, layout, style),
    mdef = mdefs[mdefs.length - 1];  // TODO: remove this dirty hack by refactoring the whole flow

  for (var i = 0; i < mdefs.length; i++) {
    group.marks.push(mdefs[i]);
  }

  var lineType = marks[encoding.marktype()].line;

  // handle subfacets

  var details = aggResult.details,
    hasDetails = details && details.length > 0,
    stack = aggResult.aggregated && hasDetails && compiler.stack(spec.data, encoding, mdef, aggResult.facets); // modify spec.data, mdef.{from,properties}

  if (hasDetails && (stack || lineType)) {
    //subfacet to group stack / line together in one group
    compiler.subfacet(group, mdef, details, stack, encoding);
  }

  // auto-sort line/area values
  //TODO(kanitw): have some config to turn off auto-sort for line (for line chart that encodes temporal information)
  if (lineType) {
    var f = (encoding.isMeasure(X) && encoding.isDimension(Y)) ? Y : X;
    if (!mdef.from) mdef.from = {};
    // TODO: why - ?
    mdef.from.transform = [{type: 'sort', by: '-' + encoding.fieldRef(f)}];
  }

  // get a flattened list of all scale names that are used in the vl spec
  var singleScaleNames = [].concat.apply([], mdefs.map(function(markProps) {
    return scale.names(markProps.properties.update);
  }));

  // Small Multiples
  if (encoding.has(ROW) || encoding.has(COL)) {
    spec = compiler.facet(group, encoding, layout, style, sorting, spec, singleScaleNames, stack);
    spec.legends = legend.defs(encoding, style);
  } else {
    group.scales = scale.defs(singleScaleNames, encoding, layout,  style, sorting, {stack: stack});

    group.axes = [];
    if (encoding.has(X)) group.axes.push(axis.def(X, encoding, layout));
    if (encoding.has(Y)) group.axes.push(axis.def(Y, encoding, layout));

    group.legends = legend.defs(encoding, style);
  }

  filter.filterLessThanZero(dataTable, encoding);

  return spec;
};

