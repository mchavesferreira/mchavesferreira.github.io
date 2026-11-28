(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AvrPins = factory();
  }
}(this, function () {
  'use strict';

  var unoAliases = {
    B: ['D8', 'D9', 'D10', 'D11', 'D12', 'D13', null, null],
    C: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', null],
    D: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']
  };
  var reservedReasons = {
    PB6: 'clock',
    PB7: 'clock',
    PC6: 'RESET'
  };
  var pins = [];
  var pinsById = Object.create(null);

  ['B', 'C', 'D'].forEach(function (port) {
    unoAliases[port].forEach(function (unoAlias, bit) {
      var id = 'P' + port + bit;
      var reservedReason = reservedReasons[id] || null;
      var pin = Object.freeze({
        id: id,
        port: port,
        bit: bit,
        ddr: 'DDR' + port,
        portRegister: 'PORT' + port,
        pinRegister: 'PIN' + port,
        unoAlias: unoAlias,
        available: reservedReason === null,
        reservedReason: reservedReason
      });
      pins.push(pin);
      pinsById[id] = pin;
    });
  });

  return {
    list: function () {
      return pins.slice();
    },
    get: function (id) {
      return typeof id === 'string' ? pinsById[id] || null : null;
    }
  };
}));
