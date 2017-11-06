# Address Parser

[![Greenkeeper badge](https://badges.greenkeeper.io/emailjs/emailjs-addressparser.svg)](https://greenkeeper.io/) [![Build Status](https://travis-ci.org/emailjs/emailjs-addressparser.png?branch=master)](https://travis-ci.org/emailjs/emailjs-addressparser) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)  [![ES6+](https://camo.githubusercontent.com/567e52200713e0f0c05a5238d91e1d096292b338/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f65732d362b2d627269676874677265656e2e737667)](https://kangax.github.io/compat-table/es6/)


`emailjs-addressparser` allows you to parse mime formatted e-mail address lists. This module does not decode any mime-word or punycode encoded strings, it is only a basic parser for parsing the base data.

## Usage

```
npm install --save emailjs-addressparser
```

### parse

```
import parse from "emailjs-addressparser"
```

Parsing Addresses w/o groups:

> `String -> [{name: String, address: String}]`

```
parse(('"Bach, Sebastian" <sebu@example.com>, mozart@example.com (Mozzie)')
->
  [{
    name: "Bach, Sebastian",
    address: "sebu@example.com"
  }, {
    name: "Mozzie",
    address: "mozart@example.com"
  }]
```

And when using groups

> `String -> [{name: String, group: [{name: String, address: String}]}]`

```
parse('Composers:"Bach, Sebastian" <sebu@example.com>, mozart@example.com (Mozzie);')
->
  [{
    name: "Composers",
    group: [{
      address: "sebu@example.com",
      name: "Bach, Sebastian"
    }, {
      address: "mozart@example.com",
      name: "Mozzie"
    }]
  }]
```

## License

    The MIT License

    Copyright (c) 2013 Andris Reinman

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
