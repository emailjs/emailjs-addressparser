# Address parser

`addressparser` allows you to parse mime formatted e-mail address lists. NB! this module does not decode any mime-word or punycode encoded strings, it is only a basic parser for parsing the base data, you need to decode the encoded parts later by yourself.

## Usage

### Volo

Install with [volo](http://volojs.org/):

    volo add Kreata/addressparser

### AMD

Require [addressparser.js](addressparser.js) as `addressparser`

### Global context

Include file [addressparser.js](addressparser.js) on the page.

```html
<script src="addressparser.js"></script>
```

This exposes global variable `addressparser`

## Methods

### parse

 Parses a list of mime formatted e-mail addresses. Returned array includes objects in the form of `{name, address}`. If the address is a [group](http://tools.ietf.org/html/rfc2822#appendix-A.1.3), instead of `address` parameter, `group` parameter (array) with nested address objects is used.

    addressparser.parse(addressStr) -> String

  * **addressStr** - Address field

For example:

    addressparser.parse(('"Bach, Sebastian" <sebu@example.com>, mozart@example.com (Mozzie)');

results in

    [{name: "Bach, Sebastian", address: "sebu@example.com"},
     {name: "Mozzie", address: "mozart@example.com"}]

And when using groups

    addressparser.parse('Composers:"Bach, Sebastian" <sebu@example.com>, mozart@example.com (Mozzie);');

the result is

    [
        {
            name: "Composers",
            group: [
                {
                    address: "sebu@example.com",
                    name: "Bach, Sebastian"
                },
                {
                    address: "mozart@example.com",
                    name: "Mozzie"
                }
            ]
        }
    ]


## Tests

Tests are handled by QUnit. Open [testrunner.html](tests/testrunner.html) to run the tests.

## License

**MIT**
