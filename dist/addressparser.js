'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = parse;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Parses structured e-mail addresses from an address field
 *
 * Example:
 *
 *    "Name <address@domain>"
 *
 * will be converted to
 *
 *     [{name: "Name", address: "address@domain"}]
 *
 * @param {String} str Address field
 * @return {Array} An array of address objects
 */
function parse(str) {
  var tokenizer = new Tokenizer(str);
  var tokens = tokenizer.tokenize();

  var addresses = [];
  var address = [];
  var parsedAddresses = [];

  tokens.forEach(function (token) {
    if (token.type === 'operator' && (token.value === ',' || token.value === ';')) {
      if (address.length) {
        addresses.push(address);
      }
      address = [];
    } else {
      address.push(token);
    }
  });

  if (address.length) {
    addresses.push(address);
  }

  addresses.forEach(function (address) {
    address = _handleAddress(address);
    if (address.length) {
      parsedAddresses = parsedAddresses.concat(address);
    }
  });

  return parsedAddresses;
};

/**
 * Converts tokens for a single address into an address object
 *
 * @param {Array} tokens Tokens object
 * @return {Object} Address object
 */
function _handleAddress(tokens) {
  var isGroup = false;
  var state = 'text';
  var address = void 0;
  var addresses = [];
  var data = {
    address: [],
    comment: [],
    group: [],
    text: []

    // Filter out <addresses>, (comments) and regular text
  };for (var i = 0, len = tokens.length; i < len; i++) {
    var token = tokens[i];

    if (token.type === 'operator') {
      switch (token.value) {
        case '<':
          state = 'address';
          break;
        case '(':
          state = 'comment';
          break;
        case ':':
          state = 'group';
          isGroup = true;
          break;
        default:
          state = 'text';
      }
    } else {
      if (token.value) {
        data[state].push(token.value);
      }
    }
  }

  // If there is no text but a comment, replace the two
  if (!data.text.length && data.comment.length) {
    data.text = data.comment;
    data.comment = [];
  }

  if (isGroup) {
    // http://tools.ietf.org/html/rfc2822#appendix-A.1.3
    data.text = data.text.join(' ');
    addresses.push({
      name: data.text || address && address.name,
      group: data.group.length ? parse(data.group.join(',')) : []
    });
  } else {
    // If no address was found, try to detect one from regular text
    if (!data.address.length && data.text.length) {
      for (var _i = data.text.length - 1; _i >= 0; _i--) {
        if (data.text[_i].match(/^[^@\s]+@[^@\s]+$/)) {
          data.address = data.text.splice(_i, 1);
          break;
        }
      }

      var _regexHandler = function _regexHandler(address) {
        if (!data.address.length) {
          data.address = [address.trim()];
          return ' ';
        } else {
          return address;
        }
      };

      // still no address
      if (!data.address.length) {
        for (var _i2 = data.text.length - 1; _i2 >= 0; _i2--) {
          data.text[_i2] = data.text[_i2].replace(/\s*\b[^@\s]+@[^@\s]+\b\s*/, _regexHandler).trim();
          if (data.address.length) {
            break;
          }
        }
      }
    }

    // If there's still is no text but a comment exixts, replace the two
    if (!data.text.length && data.comment.length) {
      data.text = data.comment;
      data.comment = [];
    }

    // Keep only the last address occurence, push others to regular text
    if (data.address.length > 1) {
      var _address = data.address.pop();
      data.text = data.text.concat(data.address.map(function (fakeAddress) {
        return '<' + fakeAddress + '>';
      }));
      data.address = [_address];
    }

    // Join values with spaces
    data.text = data.text.join(' ');
    data.address = data.address.join(' ');

    if (!data.address && isGroup) {
      return [];
    } else {
      address = {
        address: data.address || data.text || '',
        name: data.text || data.address || ''
      };

      if (address.address === address.name) {
        if ((address.address || '').match(/@/)) {
          address.name = '';
        } else {
          address.address = '';
        }
      }

      addresses.push(address);
    }
  }

  return addresses;
};

/*
 * Operator tokens and which tokens are expected to end the sequence
 */
var OPERATORS = {
  '"': '"',
  '(': ')',
  '<': '>',
  ',': '',
  // Groups are ended by semicolons
  ':': ';',
  // Semicolons are not a legal delimiter per the RFC2822 grammar other
  // than for terminating a group, but they are also not valid for any
  // other use in this context.  Given that some mail clients have
  // historically allowed the semicolon as a delimiter equivalent to the
  // comma in their UI, it makes sense to treat them the same as a comma
  // when used outside of a group.
  ';': ''

  /**
   * Creates a Tokenizer object for tokenizing address field strings
   *
   * @constructor
   * @param {String} str Address field string
   */
};
var Tokenizer = function () {
  function Tokenizer(str) {
    _classCallCheck(this, Tokenizer);

    this.str = (str || '').toString();
    this.operatorCurrent = '';
    this.operatorExpecting = '';
    this.node = null;
    this.escaped = false;
    this.list = [];
  }

  /**
   * Tokenizes the original input string
   *
   * @return {Array} An array of operator|text tokens
   */


  _createClass(Tokenizer, [{
    key: 'tokenize',
    value: function tokenize() {
      var chr = void 0;
      var list = [];
      for (var i = 0, len = this.str.length; i < len; i++) {
        chr = this.str.charAt(i);
        this.checkChar(chr);
      }

      this.list.forEach(function (node) {
        node.value = (node.value || '').toString().trim();
        if (node.value) {
          list.push(node);
        }
      });

      return list;
    }

    /**
     * Checks if a character is an operator or text and acts accordingly
     *
     * @param {String} chr Character from the address field
     */

  }, {
    key: 'checkChar',
    value: function checkChar(chr) {
      if ((chr in OPERATORS || chr === '\\') && this.escaped) {
        this.escaped = false;
      } else if (this.operatorExpecting && chr === this.operatorExpecting) {
        this.node = {
          type: 'operator',
          value: chr
        };
        this.list.push(this.node);
        this.node = null;
        this.operatorExpecting = '';
        this.escaped = false;
        return;
      } else if (!this.operatorExpecting && chr in OPERATORS) {
        this.node = {
          type: 'operator',
          value: chr
        };
        this.list.push(this.node);
        this.node = null;
        this.operatorExpecting = OPERATORS[chr];
        this.escaped = false;
        return;
      }

      if (!this.escaped && chr === '\\') {
        this.escaped = true;
        return;
      }

      if (!this.node) {
        this.node = {
          type: 'text',
          value: ''
        };
        this.list.push(this.node);
      }

      if (this.escaped && chr !== '\\') {
        this.node.value += '\\';
      }

      this.node.value += chr;
      this.escaped = false;
    }
  }]);

  return Tokenizer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hZGRyZXNzcGFyc2VyLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwic3RyIiwidG9rZW5pemVyIiwiVG9rZW5pemVyIiwidG9rZW5zIiwidG9rZW5pemUiLCJhZGRyZXNzZXMiLCJhZGRyZXNzIiwicGFyc2VkQWRkcmVzc2VzIiwiZm9yRWFjaCIsInRva2VuIiwidHlwZSIsInZhbHVlIiwibGVuZ3RoIiwicHVzaCIsIl9oYW5kbGVBZGRyZXNzIiwiY29uY2F0IiwiaXNHcm91cCIsInN0YXRlIiwiZGF0YSIsImNvbW1lbnQiLCJncm91cCIsInRleHQiLCJpIiwibGVuIiwiam9pbiIsIm5hbWUiLCJtYXRjaCIsInNwbGljZSIsIl9yZWdleEhhbmRsZXIiLCJ0cmltIiwicmVwbGFjZSIsInBvcCIsIm1hcCIsImZha2VBZGRyZXNzIiwiT1BFUkFUT1JTIiwidG9TdHJpbmciLCJvcGVyYXRvckN1cnJlbnQiLCJvcGVyYXRvckV4cGVjdGluZyIsIm5vZGUiLCJlc2NhcGVkIiwibGlzdCIsImNociIsImNoYXJBdCIsImNoZWNrQ2hhciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7a0JBY3dCQSxLOzs7O0FBZHhCOzs7Ozs7Ozs7Ozs7OztBQWNlLFNBQVNBLEtBQVQsQ0FBZ0JDLEdBQWhCLEVBQXFCO0FBQ2xDLE1BQU1DLFlBQVksSUFBSUMsU0FBSixDQUFjRixHQUFkLENBQWxCO0FBQ0EsTUFBTUcsU0FBU0YsVUFBVUcsUUFBVixFQUFmOztBQUVBLE1BQU1DLFlBQVksRUFBbEI7QUFDQSxNQUFJQyxVQUFVLEVBQWQ7QUFDQSxNQUFJQyxrQkFBa0IsRUFBdEI7O0FBRUFKLFNBQU9LLE9BQVAsQ0FBZSxVQUFVQyxLQUFWLEVBQWlCO0FBQzlCLFFBQUlBLE1BQU1DLElBQU4sS0FBZSxVQUFmLEtBQThCRCxNQUFNRSxLQUFOLEtBQWdCLEdBQWhCLElBQXVCRixNQUFNRSxLQUFOLEtBQWdCLEdBQXJFLENBQUosRUFBK0U7QUFDN0UsVUFBSUwsUUFBUU0sTUFBWixFQUFv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QUwsQ0FBVTNCLElBQVYsQ0FBZSxLQUFLeUIsSUFBcEI7QUFDQSxhQUFLQSxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUtELGlCQUFMLEdBQXlCLEVBQXpCO0FBQ0EsYUFBS0UsT0FBTCxHQUFlLEtBQWY7QUFDQTtBQUNELE9BVk0sTUFVQSxJQUFJLENBQUMsS0FBS0YsaUJBQU4sSUFBMkJJLE9BQU9QLFNBQXRDLEVBQWlEO0FBQ3RELGFBQUtJLElBQUwsR0FBWTtBQUNWNUIsZ0JBQU0sVUFESTtBQUVWQyxpQkFBTzhCO0FBRkcsU0FBWjtBQUlBLGFBQUtELElBQUwsQ0FBVTNCLElBQVYsQ0FBZSxLQUFLeUIsSUFBcEI7QUFDQSxhQUFLQSxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUtELGlCQUFMLEdBQXlCSCxVQUFVTyxHQUFWLENBQXpCO0FBQ0EsYUFBS0YsT0FBTCxHQUFlLEtBQWY7QUFDQTtBQUNEOztBQUVELFVBQUksQ0FBQyxLQUFLQSxPQUFOLElBQWlCRSxRQUFRLElBQTdCLEVBQW1DO0FBQ2pDLGFBQUtGLE9BQUwsR0FBZSxJQUFmO0FBQ0E7QUFDRDs7QUFFRCxVQUFJLENBQUMsS0FBS0QsSUFBVixFQUFnQjtBQUNkLGFBQUtBLElBQUwsR0FBWTtBQUNWNUIsZ0JBQU0sTUFESTtBQUVWQyxpQkFBTztBQUZHLFNBQVo7QUFJQSxhQUFLNkIsSUFBTCxDQUFVM0IsSUFBVixDQUFlLEtBQUt5QixJQUFwQjtBQUNEOztBQUVELFVBQUksS0FBS0MsT0FBTCxJQUFnQkUsUUFBUSxJQUE1QixFQUFrQztBQUNoQyxhQUFLSCxJQUFMLENBQVUzQixLQUFWLElBQW1CLElBQW5CO0FBQ0Q7O0FBRUQsV0FBSzJCLElBQUwsQ0FBVTNCLEtBQVYsSUFBbUI4QixHQUFuQjtBQUNBLFdBQUtGLE9BQUwsR0FBZSxLQUFmO0FBQ0QiLCJmaWxlIjoiYWRkcmVzc3BhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUGFyc2VzIHN0cnVjdHVyZWQgZS1tYWlsIGFkZHJlc3NlcyBmcm9tIGFuIGFkZHJlc3MgZmllbGRcbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqICAgIFwiTmFtZSA8YWRkcmVzc0Bkb21haW4+XCJcbiAqXG4gKiB3aWxsIGJlIGNvbnZlcnRlZCB0b1xuICpcbiAqICAgICBbe25hbWU6IFwiTmFtZVwiLCBhZGRyZXNzOiBcImFkZHJlc3NAZG9tYWluXCJ9XVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgQWRkcmVzcyBmaWVsZFxuICogQHJldHVybiB7QXJyYXl9IEFuIGFycmF5IG9mIGFkZHJlc3Mgb2JqZWN0c1xuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXJzZSAoc3RyKSB7XG4gIGNvbnN0IHRva2VuaXplciA9IG5ldyBUb2tlbml6ZXIoc3RyKVxuICBjb25zdCB0b2tlbnMgPSB0b2tlbml6ZXIudG9rZW5pemUoKVxuXG4gIGNvbnN0IGFkZHJlc3NlcyA9IFtdXG4gIGxldCBhZGRyZXNzID0gW11cbiAgbGV0IHBhcnNlZEFkZHJlc3NlcyA9IFtdXG5cbiAgdG9rZW5zLmZvckVhY2goZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnR5cGUgPT09ICdvcGVyYXRvcicgJiYgKHRva2VuLnZhbHVlID09PSAnLCcgfHwgdG9rZW4udmFsdWUgPT09ICc7JykpIHtcbiAgICAgIGlmIChhZGRyZXNzLmxlbmd0aCkge1xuICAgICAgICBhZGRyZXNzZXMucHVzaChhZGRyZXNzKVxuICAgICAgfVxuICAgICAgYWRkcmVzcyA9IFtdXG4gICAgfSBlbHNlIHtcbiAgICAgIGFkZHJlc3MucHVzaCh0b2tlbilcbiAgICB9XG4gIH0pXG5cbiAgaWYgKGFkZHJlc3MubGVuZ3RoKSB7XG4gICAgYWRkcmVzc2VzLnB1c2goYWRkcmVzcylcbiAgfVxuXG4gIGFkZHJlc3Nlcy5mb3JFYWNoKGZ1bmN0aW9uIChhZGRyZXNzKSB7XG4gICAgYWRkcmVzcyA9IF9oYW5kbGVBZGRyZXNzKGFkZHJlc3MpXG4gICAgaWYgKGFkZHJlc3MubGVuZ3RoKSB7XG4gICAgICBwYXJzZWRBZGRyZXNzZXMgPSBwYXJzZWRBZGRyZXNzZXMuY29uY2F0KGFkZHJlc3MpXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBwYXJzZWRBZGRyZXNzZXNcbn07XG5cbi8qKlxuICogQ29udmVydHMgdG9rZW5zIGZvciBhIHNpbmdsZSBhZGRyZXNzIGludG8gYW4gYWRkcmVzcyBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB0b2tlbnMgVG9rZW5zIG9iamVjdFxuICogQHJldHVybiB7T2JqZWN0fSBBZGRyZXNzIG9iamVjdFxuICovXG5mdW5jdGlvbiBfaGFuZGxlQWRkcmVzcyAodG9rZW5zKSB7XG4gIGxldCBpc0dyb3VwID0gZmFsc2VcbiAgbGV0IHN0YXRlID0gJ3RleHQnXG4gIGxldCBhZGRyZXNzXG4gIGNvbnN0IGFkZHJlc3NlcyA9IFtdXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgYWRkcmVzczogW10sXG4gICAgY29tbWVudDogW10sXG4gICAgZ3JvdXA6IFtdLFxuICAgIHRleHQ6IFtdXG4gIH1cblxuICAvLyBGaWx0ZXIgb3V0IDxhZGRyZXNzZXM+LCAoY29tbWVudHMpIGFuZCByZWd1bGFyIHRleHRcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRva2Vucy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gJ29wZXJhdG9yJykge1xuICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICBjYXNlICc8JzpcbiAgICAgICAgICBzdGF0ZSA9ICdhZGRyZXNzJ1xuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgIHN0YXRlID0gJ2NvbW1lbnQnXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnOic6XG4gICAgICAgICAgc3RhdGUgPSAnZ3JvdXAnXG4gICAgICAgICAgaXNHcm91cCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHN0YXRlID0gJ3RleHQnXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0b2tlbi52YWx1ZSkge1xuICAgICAgICBkYXRhW3N0YXRlXS5wdXNoKHRva2VuLnZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIElmIHRoZXJlIGlzIG5vIHRleHQgYnV0IGEgY29tbWVudCwgcmVwbGFjZSB0aGUgdHdvXG4gIGlmICghZGF0YS50ZXh0Lmxlbmd0aCAmJiBkYXRhLmNvbW1lbnQubGVuZ3RoKSB7XG4gICAgZGF0YS50ZXh0ID0gZGF0YS5jb21tZW50XG4gICAgZGF0YS5jb21tZW50ID0gW11cbiAgfVxuXG4gIGlmIChpc0dyb3VwKSB7XG4gICAgLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjgyMiNhcHBlbmRpeC1BLjEuM1xuICAgIGRhdGEudGV4dCA9IGRhdGEudGV4dC5qb2luKCcgJylcbiAgICBhZGRyZXNzZXMucHVzaCh7XG4gICAgICBuYW1lOiBkYXRhLnRleHQgfHwgKGFkZHJlc3MgJiYgYWRkcmVzcy5uYW1lKSxcbiAgICAgIGdyb3VwOiBkYXRhLmdyb3VwLmxlbmd0aCA/IHBhcnNlKGRhdGEuZ3JvdXAuam9pbignLCcpKSA6IFtdXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICAvLyBJZiBubyBhZGRyZXNzIHdhcyBmb3VuZCwgdHJ5IHRvIGRldGVjdCBvbmUgZnJvbSByZWd1bGFyIHRleHRcbiAgICBpZiAoIWRhdGEuYWRkcmVzcy5sZW5ndGggJiYgZGF0YS50ZXh0Lmxlbmd0aCkge1xuICAgICAgZm9yIChsZXQgaSA9IGRhdGEudGV4dC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBpZiAoZGF0YS50ZXh0W2ldLm1hdGNoKC9eW15AXFxzXStAW15AXFxzXSskLykpIHtcbiAgICAgICAgICBkYXRhLmFkZHJlc3MgPSBkYXRhLnRleHQuc3BsaWNlKGksIDEpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgX3JlZ2V4SGFuZGxlciA9IGZ1bmN0aW9uIChhZGRyZXNzKSB7XG4gICAgICAgIGlmICghZGF0YS5hZGRyZXNzLmxlbmd0aCkge1xuICAgICAgICAgIGRhdGEuYWRkcmVzcyA9IFthZGRyZXNzLnRyaW0oKV1cbiAgICAgICAgICByZXR1cm4gJyAnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGFkZHJlc3NcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzdGlsbCBubyBhZGRyZXNzXG4gICAgICBpZiAoIWRhdGEuYWRkcmVzcy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGRhdGEudGV4dC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGRhdGEudGV4dFtpXSA9IGRhdGEudGV4dFtpXS5yZXBsYWNlKC9cXHMqXFxiW15AXFxzXStAW15AXFxzXStcXGJcXHMqLywgX3JlZ2V4SGFuZGxlcikudHJpbSgpXG4gICAgICAgICAgaWYgKGRhdGEuYWRkcmVzcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBzdGlsbCBpcyBubyB0ZXh0IGJ1dCBhIGNvbW1lbnQgZXhpeHRzLCByZXBsYWNlIHRoZSB0d29cbiAgICBpZiAoIWRhdGEudGV4dC5sZW5ndGggJiYgZGF0YS5jb21tZW50Lmxlbmd0aCkge1xuICAgICAgZGF0YS50ZXh0ID0gZGF0YS5jb21tZW50XG4gICAgICBkYXRhLmNvbW1lbnQgPSBbXVxuICAgIH1cblxuICAgIC8vIEtlZXAgb25seSB0aGUgbGFzdCBhZGRyZXNzIG9jY3VyZW5jZSwgcHVzaCBvdGhlcnMgdG8gcmVndWxhciB0ZXh0XG4gICAgaWYgKGRhdGEuYWRkcmVzcy5sZW5ndGggPiAxKSB7XG4gICAgICBjb25zdCBhZGRyZXNzID0gZGF0YS5hZGRyZXNzLnBvcCgpXG4gICAgICBkYXRhLnRleHQgPSBkYXRhLnRleHQuY29uY2F0KGRhdGEuYWRkcmVzcy5tYXAoZmFrZUFkZHJlc3MgPT4gYDwke2Zha2VBZGRyZXNzfT5gKSlcbiAgICAgIGRhdGEuYWRkcmVzcyA9IFthZGRyZXNzXVxuICAgIH1cblxuICAgIC8vIEpvaW4gdmFsdWVzIHdpdGggc3BhY2VzXG4gICAgZGF0YS50ZXh0ID0gZGF0YS50ZXh0LmpvaW4oJyAnKVxuICAgIGRhdGEuYWRkcmVzcyA9IGRhdGEuYWRkcmVzcy5qb2luKCcgJylcblxuICAgIGlmICghZGF0YS5hZGRyZXNzICYmIGlzR3JvdXApIHtcbiAgICAgIHJldHVybiBbXVxuICAgIH0gZWxzZSB7XG4gICAgICBhZGRyZXNzID0ge1xuICAgICAgICBhZGRyZXNzOiBkYXRhLmFkZHJlc3MgfHwgZGF0YS50ZXh0IHx8ICcnLFxuICAgICAgICBuYW1lOiBkYXRhLnRleHQgfHwgZGF0YS5hZGRyZXNzIHx8ICcnXG4gICAgICB9XG5cbiAgICAgIGlmIChhZGRyZXNzLmFkZHJlc3MgPT09IGFkZHJlc3MubmFtZSkge1xuICAgICAgICBpZiAoKGFkZHJlc3MuYWRkcmVzcyB8fCAnJykubWF0Y2goL0AvKSkge1xuICAgICAgICAgIGFkZHJlc3MubmFtZSA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWRkcmVzcy5hZGRyZXNzID0gJydcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhZGRyZXNzZXMucHVzaChhZGRyZXNzKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhZGRyZXNzZXNcbn07XG5cbi8qXG4gKiBPcGVyYXRvciB0b2tlbnMgYW5kIHdoaWNoIHRva2VucyBhcmUgZXhwZWN0ZWQgdG8gZW5kIHRoZSBzZXF1ZW5jZVxuICovXG5jb25zdCBPUEVSQVRPUlMgPSB7XG4gICdcIic6ICdcIicsXG4gICcoJzogJyknLFxuICAnPCc6ICc+JyxcbiAgJywnOiAnJyxcbiAgLy8gR3JvdXBzIGFyZSBlbmRlZCBieSBzZW1pY29sb25zXG4gICc6JzogJzsnLFxuICAvLyBTZW1pY29sb25zIGFyZSBub3QgYSBsZWdhbCBkZWxpbWl0ZXIgcGVyIHRoZSBSRkMyODIyIGdyYW1tYXIgb3RoZXJcbiAgLy8gdGhhbiBmb3IgdGVybWluYXRpbmcgYSBncm91cCwgYnV0IHRoZXkgYXJlIGFsc28gbm90IHZhbGlkIGZvciBhbnlcbiAgLy8gb3RoZXIgdXNlIGluIHRoaXMgY29udGV4dC4gIEdpdmVuIHRoYXQgc29tZSBtYWlsIGNsaWVudHMgaGF2ZVxuICAvLyBoaXN0b3JpY2FsbHkgYWxsb3dlZCB0aGUgc2VtaWNvbG9uIGFzIGEgZGVsaW1pdGVyIGVxdWl2YWxlbnQgdG8gdGhlXG4gIC8vIGNvbW1hIGluIHRoZWlyIFVJLCBpdCBtYWtlcyBzZW5zZSB0byB0cmVhdCB0aGVtIHRoZSBzYW1lIGFzIGEgY29tbWFcbiAgLy8gd2hlbiB1c2VkIG91dHNpZGUgb2YgYSBncm91cC5cbiAgJzsnOiAnJ1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBUb2tlbml6ZXIgb2JqZWN0IGZvciB0b2tlbml6aW5nIGFkZHJlc3MgZmllbGQgc3RyaW5nc1xuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBBZGRyZXNzIGZpZWxkIHN0cmluZ1xuICovXG5jbGFzcyBUb2tlbml6ZXIge1xuICBjb25zdHJ1Y3RvciAoc3RyKSB7XG4gICAgdGhpcy5zdHIgPSAoc3RyIHx8ICcnKS50b1N0cmluZygpXG4gICAgdGhpcy5vcGVyYXRvckN1cnJlbnQgPSAnJ1xuICAgIHRoaXMub3BlcmF0b3JFeHBlY3RpbmcgPSAnJ1xuICAgIHRoaXMubm9kZSA9IG51bGxcbiAgICB0aGlzLmVzY2FwZWQgPSBmYWxzZVxuICAgIHRoaXMubGlzdCA9IFtdXG4gIH1cblxuICAvKipcbiAgICogVG9rZW5pemVzIHRoZSBvcmlnaW5hbCBpbnB1dCBzdHJpbmdcbiAgICpcbiAgICogQHJldHVybiB7QXJyYXl9IEFuIGFycmF5IG9mIG9wZXJhdG9yfHRleHQgdG9rZW5zXG4gICAqL1xuICB0b2tlbml6ZSAoKSB7XG4gICAgbGV0IGNoclxuICAgIGxldCBsaXN0ID0gW11cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5zdHIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNociA9IHRoaXMuc3RyLmNoYXJBdChpKVxuICAgICAgdGhpcy5jaGVja0NoYXIoY2hyKVxuICAgIH1cblxuICAgIHRoaXMubGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICBub2RlLnZhbHVlID0gKG5vZGUudmFsdWUgfHwgJycpLnRvU3RyaW5nKCkudHJpbSgpXG4gICAgICBpZiAobm9kZS52YWx1ZSkge1xuICAgICAgICBsaXN0LnB1c2gobm9kZSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYSBjaGFyYWN0ZXIgaXMgYW4gb3BlcmF0b3Igb3IgdGV4dCBhbmQgYWN0cyBhY2NvcmRpbmdseVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gY2hyIENoYXJhY3RlciBmcm9tIHRoZSBhZGRyZXNzIGZpZWxkXG4gICAqL1xuICBjaGVja0NoYXIgKGNocikge1xuICAgIGlmICgoY2hyIGluIE9QRVJBVE9SUyB8fCBjaHIgPT09ICdcXFxcJykgJiYgdGhpcy5lc2NhcGVkKSB7XG4gICAgICB0aGlzLmVzY2FwZWQgPSBmYWxzZVxuICAgIH0gZWxzZSBpZiAodGhpcy5vcGVyYXRvckV4cGVjdGluZyAmJiBjaHIgPT09IHRoaXMub3BlcmF0b3JFeHBlY3RpbmcpIHtcbiAgICAgIHRoaXMubm9kZSA9IHtcbiAgICAgICAgdHlwZTogJ29wZXJhdG9yJyxcbiAgICAgICAgdmFsdWU6IGNoclxuICAgICAgfVxuICAgICAgdGhpcy5saXN0LnB1c2godGhpcy5ub2RlKVxuICAgICAgdGhpcy5ub2RlID0gbnVsbFxuICAgICAgdGhpcy5vcGVyYXRvckV4cGVjdGluZyA9ICcnXG4gICAgICB0aGlzLmVzY2FwZWQgPSBmYWxzZVxuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmICghdGhpcy5vcGVyYXRvckV4cGVjdGluZyAmJiBjaHIgaW4gT1BFUkFUT1JTKSB7XG4gICAgICB0aGlzLm5vZGUgPSB7XG4gICAgICAgIHR5cGU6ICdvcGVyYXRvcicsXG4gICAgICAgIHZhbHVlOiBjaHJcbiAgICAgIH1cbiAgICAgIHRoaXMubGlzdC5wdXNoKHRoaXMubm9kZSlcbiAgICAgIHRoaXMubm9kZSA9IG51bGxcbiAgICAgIHRoaXMub3BlcmF0b3JFeHBlY3RpbmcgPSBPUEVSQVRPUlNbY2hyXVxuICAgICAgdGhpcy5lc2NhcGVkID0gZmFsc2VcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghdGhpcy5lc2NhcGVkICYmIGNociA9PT0gJ1xcXFwnKSB7XG4gICAgICB0aGlzLmVzY2FwZWQgPSB0cnVlXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgdGhpcy5ub2RlID0ge1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgfVxuICAgICAgdGhpcy5saXN0LnB1c2godGhpcy5ub2RlKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmVzY2FwZWQgJiYgY2hyICE9PSAnXFxcXCcpIHtcbiAgICAgIHRoaXMubm9kZS52YWx1ZSArPSAnXFxcXCdcbiAgICB9XG5cbiAgICB0aGlzLm5vZGUudmFsdWUgKz0gY2hyXG4gICAgdGhpcy5lc2NhcGVkID0gZmFsc2VcbiAgfVxufVxuIl19