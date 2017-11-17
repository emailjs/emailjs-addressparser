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

    // Keep only the first address occurence, push others to regular text
    if (data.address.length > 1) {
      data.text = data.text.concat(data.address.splice(1));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hZGRyZXNzcGFyc2VyLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwic3RyIiwidG9rZW5pemVyIiwiVG9rZW5pemVyIiwidG9rZW5zIiwidG9rZW5pemUiLCJhZGRyZXNzZXMiLCJhZGRyZXNzIiwicGFyc2VkQWRkcmVzc2VzIiwiZm9yRWFjaCIsInRva2VuIiwidHlwZSIsInZhbHVlIiwibGVuZ3RoIiwicHVzaCIsIl9oYW5kbGVBZGRyZXNzIiwiY29uY2F0IiwiaXNHcm91cCIsInN0YXRlIiwiZGF0YSIsImNvbW1lbnQiLCJncm91cCIsInRleHQiLCJpIiwibGVuIiwiam9pbiIsIm5hbWUiLCJtYXRjaCIsInNwbGljZSIsIl9yZWdleEhhbmRsZXIiLCJ0cmltIiwicmVwbGFjZSIsIk9QRVJBVE9SUyIsInRvU3RyaW5nIiwib3BlcmF0b3JDdXJyZW50Iiwib3BlcmF0b3JFeHBlY3RpbmciLCJub2RlIiwiZXNjYXBlZCIsImxpc3QiLCJjaHIiLCJjaGFyQXQiLCJjaGVja0NoYXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O2tCQWN3QkEsSzs7OztBQWR4Qjs7Ozs7Ozs7Ozs7Ozs7QUFjZSxTQUFTQSxLQUFULENBQWdCQyxHQUFoQixFQUFxQjtBQUNsQyxNQUFNQyxZQUFZLElBQUlDLFNBQUosQ0FBY0YsR0FBZCxDQUFsQjtBQUNBLE1BQU1HLFNBQVNGLFVBQVVHLFFBQVYsRUFBZjs7QUFFQSxNQUFNQyxZQUFZLEVBQWxCO0FBQ0EsTUFBSUMsVUFBVSxFQUFkO0FBQ0EsTUFBSUMsa0JBQWtCLEVBQXRCOztBQUVBSixTQUFPSyxPQUFQLENBQWUsVUFBVUMsS0FBVixFQUFpQjtBQUM5QixRQUFJQSxNQUFNQyxJQUFOLEtBQWUsVUFBZixLQUE4QkQsTUFBTUUsS0FBTixLQUFnQixHQUFoQixJQUF1QkYsTUFBTUUsS0FBTixLQUFnQixHQUFyRSxDQUFKLEVBQStFO0FBQzdFLFVBQUlMLFFBQVFNLE1BQVosRUFBb0I7QUFDbEJQLGtCQUFVUSxJQUFWLENBQWVQ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QUFJLENBQUMsS0FBS0YsaUJBQU4sSUFBMkJJLE9BQU9QLFNBQXRDLEVBQWlEO0FBQ3RELGFBQUtJLElBQUwsR0FBWTtBQUNWekIsZ0JBQU0sVUFESTtBQUVWQyxpQkFBTzJCO0FBRkcsU0FBWjtBQUlBLGFBQUtELElBQUwsQ0FBVXhCLElBQVYsQ0FBZSxLQUFLc0IsSUFBcEI7QUFDQSxhQUFLQSxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUtELGlCQUFMLEdBQXlCSCxVQUFVTyxHQUFWLENBQXpCO0FBQ0EsYUFBS0YsT0FBTCxHQUFlLEtBQWY7QUFDQTtBQUNEOztBQUVELFVBQUksQ0FBQyxLQUFLQSxPQUFOLElBQWlCRSxRQUFRLElBQTdCLEVBQW1DO0FBQ2pDLGFBQUtGLE9BQUwsR0FBZSxJQUFmO0FBQ0E7QUFDRDs7QUFFRCxVQUFJLENBQUMsS0FBS0QsSUFBVixFQUFnQjtBQUNkLGFBQUtBLElBQUwsR0FBWTtBQUNWekIsZ0JBQU0sTUFESTtBQUVWQyxpQkFBTztBQUZHLFNBQVo7QUFJQSxhQUFLMEIsSUFBTCxDQUFVeEIsSUFBVixDQUFlLEtBQUtzQixJQUFwQjtBQUNEOztBQUVELFVBQUksS0FBS0MsT0FBTCxJQUFnQkUsUUFBUSxJQUE1QixFQUFrQztBQUNoQyxhQUFLSCxJQUFMLENBQVV4QixLQUFWLElBQW1CLElBQW5CO0FBQ0Q7O0FBRUQsV0FBS3dCLElBQUwsQ0FBVXhCLEtBQVYsSUFBbUIyQixHQUFuQjtBQUNBLFdBQUtGLE9BQUwsR0FBZSxLQUFmO0FBQ0QiLCJmaWxlIjoiYWRkcmVzc3BhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUGFyc2VzIHN0cnVjdHVyZWQgZS1tYWlsIGFkZHJlc3NlcyBmcm9tIGFuIGFkZHJlc3MgZmllbGRcbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqICAgIFwiTmFtZSA8YWRkcmVzc0Bkb21haW4+XCJcbiAqXG4gKiB3aWxsIGJlIGNvbnZlcnRlZCB0b1xuICpcbiAqICAgICBbe25hbWU6IFwiTmFtZVwiLCBhZGRyZXNzOiBcImFkZHJlc3NAZG9tYWluXCJ9XVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgQWRkcmVzcyBmaWVsZFxuICogQHJldHVybiB7QXJyYXl9IEFuIGFycmF5IG9mIGFkZHJlc3Mgb2JqZWN0c1xuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXJzZSAoc3RyKSB7XG4gIGNvbnN0IHRva2VuaXplciA9IG5ldyBUb2tlbml6ZXIoc3RyKVxuICBjb25zdCB0b2tlbnMgPSB0b2tlbml6ZXIudG9rZW5pemUoKVxuXG4gIGNvbnN0IGFkZHJlc3NlcyA9IFtdXG4gIGxldCBhZGRyZXNzID0gW11cbiAgbGV0IHBhcnNlZEFkZHJlc3NlcyA9IFtdXG5cbiAgdG9rZW5zLmZvckVhY2goZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnR5cGUgPT09ICdvcGVyYXRvcicgJiYgKHRva2VuLnZhbHVlID09PSAnLCcgfHwgdG9rZW4udmFsdWUgPT09ICc7JykpIHtcbiAgICAgIGlmIChhZGRyZXNzLmxlbmd0aCkge1xuICAgICAgICBhZGRyZXNzZXMucHVzaChhZGRyZXNzKVxuICAgICAgfVxuICAgICAgYWRkcmVzcyA9IFtdXG4gICAgfSBlbHNlIHtcbiAgICAgIGFkZHJlc3MucHVzaCh0b2tlbilcbiAgICB9XG4gIH0pXG5cbiAgaWYgKGFkZHJlc3MubGVuZ3RoKSB7XG4gICAgYWRkcmVzc2VzLnB1c2goYWRkcmVzcylcbiAgfVxuXG4gIGFkZHJlc3Nlcy5mb3JFYWNoKGZ1bmN0aW9uIChhZGRyZXNzKSB7XG4gICAgYWRkcmVzcyA9IF9oYW5kbGVBZGRyZXNzKGFkZHJlc3MpXG4gICAgaWYgKGFkZHJlc3MubGVuZ3RoKSB7XG4gICAgICBwYXJzZWRBZGRyZXNzZXMgPSBwYXJzZWRBZGRyZXNzZXMuY29uY2F0KGFkZHJlc3MpXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBwYXJzZWRBZGRyZXNzZXNcbn07XG5cbi8qKlxuICogQ29udmVydHMgdG9rZW5zIGZvciBhIHNpbmdsZSBhZGRyZXNzIGludG8gYW4gYWRkcmVzcyBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB0b2tlbnMgVG9rZW5zIG9iamVjdFxuICogQHJldHVybiB7T2JqZWN0fSBBZGRyZXNzIG9iamVjdFxuICovXG5mdW5jdGlvbiBfaGFuZGxlQWRkcmVzcyAodG9rZW5zKSB7XG4gIGxldCBpc0dyb3VwID0gZmFsc2VcbiAgbGV0IHN0YXRlID0gJ3RleHQnXG4gIGxldCBhZGRyZXNzXG4gIGNvbnN0IGFkZHJlc3NlcyA9IFtdXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgYWRkcmVzczogW10sXG4gICAgY29tbWVudDogW10sXG4gICAgZ3JvdXA6IFtdLFxuICAgIHRleHQ6IFtdXG4gIH1cblxuICAvLyBGaWx0ZXIgb3V0IDxhZGRyZXNzZXM+LCAoY29tbWVudHMpIGFuZCByZWd1bGFyIHRleHRcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRva2Vucy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gJ29wZXJhdG9yJykge1xuICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICBjYXNlICc8JzpcbiAgICAgICAgICBzdGF0ZSA9ICdhZGRyZXNzJ1xuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgIHN0YXRlID0gJ2NvbW1lbnQnXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnOic6XG4gICAgICAgICAgc3RhdGUgPSAnZ3JvdXAnXG4gICAgICAgICAgaXNHcm91cCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHN0YXRlID0gJ3RleHQnXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0b2tlbi52YWx1ZSkge1xuICAgICAgICBkYXRhW3N0YXRlXS5wdXNoKHRva2VuLnZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIElmIHRoZXJlIGlzIG5vIHRleHQgYnV0IGEgY29tbWVudCwgcmVwbGFjZSB0aGUgdHdvXG4gIGlmICghZGF0YS50ZXh0Lmxlbmd0aCAmJiBkYXRhLmNvbW1lbnQubGVuZ3RoKSB7XG4gICAgZGF0YS50ZXh0ID0gZGF0YS5jb21tZW50XG4gICAgZGF0YS5jb21tZW50ID0gW11cbiAgfVxuXG4gIGlmIChpc0dyb3VwKSB7XG4gICAgLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjgyMiNhcHBlbmRpeC1BLjEuM1xuICAgIGRhdGEudGV4dCA9IGRhdGEudGV4dC5qb2luKCcgJylcbiAgICBhZGRyZXNzZXMucHVzaCh7XG4gICAgICBuYW1lOiBkYXRhLnRleHQgfHwgKGFkZHJlc3MgJiYgYWRkcmVzcy5uYW1lKSxcbiAgICAgIGdyb3VwOiBkYXRhLmdyb3VwLmxlbmd0aCA/IHBhcnNlKGRhdGEuZ3JvdXAuam9pbignLCcpKSA6IFtdXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICAvLyBJZiBubyBhZGRyZXNzIHdhcyBmb3VuZCwgdHJ5IHRvIGRldGVjdCBvbmUgZnJvbSByZWd1bGFyIHRleHRcbiAgICBpZiAoIWRhdGEuYWRkcmVzcy5sZW5ndGggJiYgZGF0YS50ZXh0Lmxlbmd0aCkge1xuICAgICAgZm9yIChsZXQgaSA9IGRhdGEudGV4dC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBpZiAoZGF0YS50ZXh0W2ldLm1hdGNoKC9eW15AXFxzXStAW15AXFxzXSskLykpIHtcbiAgICAgICAgICBkYXRhLmFkZHJlc3MgPSBkYXRhLnRleHQuc3BsaWNlKGksIDEpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgX3JlZ2V4SGFuZGxlciA9IGZ1bmN0aW9uIChhZGRyZXNzKSB7XG4gICAgICAgIGlmICghZGF0YS5hZGRyZXNzLmxlbmd0aCkge1xuICAgICAgICAgIGRhdGEuYWRkcmVzcyA9IFthZGRyZXNzLnRyaW0oKV1cbiAgICAgICAgICByZXR1cm4gJyAnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGFkZHJlc3NcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzdGlsbCBubyBhZGRyZXNzXG4gICAgICBpZiAoIWRhdGEuYWRkcmVzcy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGRhdGEudGV4dC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGRhdGEudGV4dFtpXSA9IGRhdGEudGV4dFtpXS5yZXBsYWNlKC9cXHMqXFxiW15AXFxzXStAW15AXFxzXStcXGJcXHMqLywgX3JlZ2V4SGFuZGxlcikudHJpbSgpXG4gICAgICAgICAgaWYgKGRhdGEuYWRkcmVzcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBzdGlsbCBpcyBubyB0ZXh0IGJ1dCBhIGNvbW1lbnQgZXhpeHRzLCByZXBsYWNlIHRoZSB0d29cbiAgICBpZiAoIWRhdGEudGV4dC5sZW5ndGggJiYgZGF0YS5jb21tZW50Lmxlbmd0aCkge1xuICAgICAgZGF0YS50ZXh0ID0gZGF0YS5jb21tZW50XG4gICAgICBkYXRhLmNvbW1lbnQgPSBbXVxuICAgIH1cblxuICAgIC8vIEtlZXAgb25seSB0aGUgZmlyc3QgYWRkcmVzcyBvY2N1cmVuY2UsIHB1c2ggb3RoZXJzIHRvIHJlZ3VsYXIgdGV4dFxuICAgIGlmIChkYXRhLmFkZHJlc3MubGVuZ3RoID4gMSkge1xuICAgICAgZGF0YS50ZXh0ID0gZGF0YS50ZXh0LmNvbmNhdChkYXRhLmFkZHJlc3Muc3BsaWNlKDEpKVxuICAgIH1cblxuICAgIC8vIEpvaW4gdmFsdWVzIHdpdGggc3BhY2VzXG4gICAgZGF0YS50ZXh0ID0gZGF0YS50ZXh0LmpvaW4oJyAnKVxuICAgIGRhdGEuYWRkcmVzcyA9IGRhdGEuYWRkcmVzcy5qb2luKCcgJylcblxuICAgIGlmICghZGF0YS5hZGRyZXNzICYmIGlzR3JvdXApIHtcbiAgICAgIHJldHVybiBbXVxuICAgIH0gZWxzZSB7XG4gICAgICBhZGRyZXNzID0ge1xuICAgICAgICBhZGRyZXNzOiBkYXRhLmFkZHJlc3MgfHwgZGF0YS50ZXh0IHx8ICcnLFxuICAgICAgICBuYW1lOiBkYXRhLnRleHQgfHwgZGF0YS5hZGRyZXNzIHx8ICcnXG4gICAgICB9XG5cbiAgICAgIGlmIChhZGRyZXNzLmFkZHJlc3MgPT09IGFkZHJlc3MubmFtZSkge1xuICAgICAgICBpZiAoKGFkZHJlc3MuYWRkcmVzcyB8fCAnJykubWF0Y2goL0AvKSkge1xuICAgICAgICAgIGFkZHJlc3MubmFtZSA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWRkcmVzcy5hZGRyZXNzID0gJydcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhZGRyZXNzZXMucHVzaChhZGRyZXNzKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhZGRyZXNzZXNcbn07XG5cbi8qXG4gKiBPcGVyYXRvciB0b2tlbnMgYW5kIHdoaWNoIHRva2VucyBhcmUgZXhwZWN0ZWQgdG8gZW5kIHRoZSBzZXF1ZW5jZVxuICovXG5jb25zdCBPUEVSQVRPUlMgPSB7XG4gICdcIic6ICdcIicsXG4gICcoJzogJyknLFxuICAnPCc6ICc+JyxcbiAgJywnOiAnJyxcbiAgLy8gR3JvdXBzIGFyZSBlbmRlZCBieSBzZW1pY29sb25zXG4gICc6JzogJzsnLFxuICAvLyBTZW1pY29sb25zIGFyZSBub3QgYSBsZWdhbCBkZWxpbWl0ZXIgcGVyIHRoZSBSRkMyODIyIGdyYW1tYXIgb3RoZXJcbiAgLy8gdGhhbiBmb3IgdGVybWluYXRpbmcgYSBncm91cCwgYnV0IHRoZXkgYXJlIGFsc28gbm90IHZhbGlkIGZvciBhbnlcbiAgLy8gb3RoZXIgdXNlIGluIHRoaXMgY29udGV4dC4gIEdpdmVuIHRoYXQgc29tZSBtYWlsIGNsaWVudHMgaGF2ZVxuICAvLyBoaXN0b3JpY2FsbHkgYWxsb3dlZCB0aGUgc2VtaWNvbG9uIGFzIGEgZGVsaW1pdGVyIGVxdWl2YWxlbnQgdG8gdGhlXG4gIC8vIGNvbW1hIGluIHRoZWlyIFVJLCBpdCBtYWtlcyBzZW5zZSB0byB0cmVhdCB0aGVtIHRoZSBzYW1lIGFzIGEgY29tbWFcbiAgLy8gd2hlbiB1c2VkIG91dHNpZGUgb2YgYSBncm91cC5cbiAgJzsnOiAnJ1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBUb2tlbml6ZXIgb2JqZWN0IGZvciB0b2tlbml6aW5nIGFkZHJlc3MgZmllbGQgc3RyaW5nc1xuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBBZGRyZXNzIGZpZWxkIHN0cmluZ1xuICovXG5jbGFzcyBUb2tlbml6ZXIge1xuICBjb25zdHJ1Y3RvciAoc3RyKSB7XG4gICAgdGhpcy5zdHIgPSAoc3RyIHx8ICcnKS50b1N0cmluZygpXG4gICAgdGhpcy5vcGVyYXRvckN1cnJlbnQgPSAnJ1xuICAgIHRoaXMub3BlcmF0b3JFeHBlY3RpbmcgPSAnJ1xuICAgIHRoaXMubm9kZSA9IG51bGxcbiAgICB0aGlzLmVzY2FwZWQgPSBmYWxzZVxuICAgIHRoaXMubGlzdCA9IFtdXG4gIH1cblxuICAvKipcbiAgICogVG9rZW5pemVzIHRoZSBvcmlnaW5hbCBpbnB1dCBzdHJpbmdcbiAgICpcbiAgICogQHJldHVybiB7QXJyYXl9IEFuIGFycmF5IG9mIG9wZXJhdG9yfHRleHQgdG9rZW5zXG4gICAqL1xuICB0b2tlbml6ZSAoKSB7XG4gICAgbGV0IGNoclxuICAgIGxldCBsaXN0ID0gW11cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5zdHIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNociA9IHRoaXMuc3RyLmNoYXJBdChpKVxuICAgICAgdGhpcy5jaGVja0NoYXIoY2hyKVxuICAgIH1cblxuICAgIHRoaXMubGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICBub2RlLnZhbHVlID0gKG5vZGUudmFsdWUgfHwgJycpLnRvU3RyaW5nKCkudHJpbSgpXG4gICAgICBpZiAobm9kZS52YWx1ZSkge1xuICAgICAgICBsaXN0LnB1c2gobm9kZSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYSBjaGFyYWN0ZXIgaXMgYW4gb3BlcmF0b3Igb3IgdGV4dCBhbmQgYWN0cyBhY2NvcmRpbmdseVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gY2hyIENoYXJhY3RlciBmcm9tIHRoZSBhZGRyZXNzIGZpZWxkXG4gICAqL1xuICBjaGVja0NoYXIgKGNocikge1xuICAgIGlmICgoY2hyIGluIE9QRVJBVE9SUyB8fCBjaHIgPT09ICdcXFxcJykgJiYgdGhpcy5lc2NhcGVkKSB7XG4gICAgICB0aGlzLmVzY2FwZWQgPSBmYWxzZVxuICAgIH0gZWxzZSBpZiAodGhpcy5vcGVyYXRvckV4cGVjdGluZyAmJiBjaHIgPT09IHRoaXMub3BlcmF0b3JFeHBlY3RpbmcpIHtcbiAgICAgIHRoaXMubm9kZSA9IHtcbiAgICAgICAgdHlwZTogJ29wZXJhdG9yJyxcbiAgICAgICAgdmFsdWU6IGNoclxuICAgICAgfVxuICAgICAgdGhpcy5saXN0LnB1c2godGhpcy5ub2RlKVxuICAgICAgdGhpcy5ub2RlID0gbnVsbFxuICAgICAgdGhpcy5vcGVyYXRvckV4cGVjdGluZyA9ICcnXG4gICAgICB0aGlzLmVzY2FwZWQgPSBmYWxzZVxuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmICghdGhpcy5vcGVyYXRvckV4cGVjdGluZyAmJiBjaHIgaW4gT1BFUkFUT1JTKSB7XG4gICAgICB0aGlzLm5vZGUgPSB7XG4gICAgICAgIHR5cGU6ICdvcGVyYXRvcicsXG4gICAgICAgIHZhbHVlOiBjaHJcbiAgICAgIH1cbiAgICAgIHRoaXMubGlzdC5wdXNoKHRoaXMubm9kZSlcbiAgICAgIHRoaXMubm9kZSA9IG51bGxcbiAgICAgIHRoaXMub3BlcmF0b3JFeHBlY3RpbmcgPSBPUEVSQVRPUlNbY2hyXVxuICAgICAgdGhpcy5lc2NhcGVkID0gZmFsc2VcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghdGhpcy5lc2NhcGVkICYmIGNociA9PT0gJ1xcXFwnKSB7XG4gICAgICB0aGlzLmVzY2FwZWQgPSB0cnVlXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgdGhpcy5ub2RlID0ge1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgfVxuICAgICAgdGhpcy5saXN0LnB1c2godGhpcy5ub2RlKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmVzY2FwZWQgJiYgY2hyICE9PSAnXFxcXCcpIHtcbiAgICAgIHRoaXMubm9kZS52YWx1ZSArPSAnXFxcXCdcbiAgICB9XG5cbiAgICB0aGlzLm5vZGUudmFsdWUgKz0gY2hyXG4gICAgdGhpcy5lc2NhcGVkID0gZmFsc2VcbiAgfVxufVxuIl19