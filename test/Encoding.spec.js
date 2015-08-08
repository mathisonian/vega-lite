'use strict';

var expect = require('chai').expect;

var Encoding = require('../src/Encoding');

describe('Encoding.fromShorthand()', function () {
  it('should parse shorthand correctly', function () {
    var shorthand = 'mark=point|x=Effect__Amount_of_damage,O|y=avg_Cost__Total_$,Q';
    var encoding = Encoding.fromShorthand(shorthand);
    expect(encoding.has('y')).ok;
    expect(encoding.has('x')).ok;
  });
});

// FIXME(kanitw): Aug 8, 2015 - add test cases to test Encoding.fromShorthand, fromSpec params

describe('encoding.filter()', function () {
  var spec = {
      marktype: 'point',
      encoding: {
        y: {name: 'Q', type:'Q'},
        x: {name: 'T', type:'T'},
        color: {name: 'O', type:'O'}
      }
    };
  it('should add filterNull for Q and T by default', function () {
    var encoding = Encoding.fromSpec(spec),
      filter = encoding.filter();
    expect(filter.length).to.equal(2);
    expect(filter.indexOf({name: 'O', type:'O'})).to.equal(-1);
  });

  it('should add filterNull for O when specified', function () {
    var encoding = Encoding.fromSpec(spec, {}, {
      config: {
        filterNull: {O: true}
      }
    });
    var filter = encoding.filter();
    expect(filter.length).to.equal(3);
  });
});
