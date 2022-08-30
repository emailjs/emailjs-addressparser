import parse from './addressparser'

describe('addressparser', () => {
  it('should handle single address correctly', () => {
    const input = 'andris@tr.ee'
    const expected = [{
      address: 'andris@tr.ee',
      name: ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle multiple addresses correctly', () => {
    const input = 'andris@tr.ee, andris@example.com'
    const expected = [{
      address: 'andris@tr.ee',
      name: ''
    }, {
      address: 'andris@example.com',
      name: ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle unquoted name correctly', () => {
    const input = 'andris <andris@tr.ee>'
    const expected = [{
      name: 'andris',
      address: 'andris@tr.ee'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle quoted name correctly', () => {
    const input = '"reinman, andris" <andris@tr.ee>'
    const expected = [{
      name: 'reinman, andris',
      address: 'andris@tr.ee'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle quoted semicolons correctly', () => {
    const input = '"reinman; andris" <andris@tr.ee>'
    const expected = [{
      name: 'reinman; andris',
      address: 'andris@tr.ee'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle unquoted name, unquoted address correctly', () => {
    const input = 'andris andris@tr.ee'
    const expected = [{
      name: 'andris',
      address: 'andris@tr.ee'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle empty group correctly', () => {
    const input = 'Undisclosed:;'
    const expected = [{
      'name': 'Undisclosed',
      'group': []
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle address group correctly', () => {
    const input = 'Disclosed:andris@tr.ee, andris@example.com;'
    const expected = [{
      'name': 'Disclosed',
      'group': [{
        'address': 'andris@tr.ee',
        'name': ''
      }, {
        'address': 'andris@example.com',
        'name': ''
      }]
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle semicolon as a delimiter', () => {
    const input = 'andris@tr.ee; andris@example.com;'
    const expected = [{
      address: 'andris@tr.ee',
      name: ''
    }, {
      address: 'andris@example.com',
      name: ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle mixed group correctly', () => {
    const input = 'Test User <test.user@mail.ee>, Disclosed:andris@tr.ee, andris@example.com;,,,, Undisclosed:;'
    const expected = [{
      'address': 'test.user@mail.ee',
      'name': 'Test User'
    }, {
      'name': 'Disclosed',
      'group': [{
        'address': 'andris@tr.ee',
        'name': ''
      }, {
        'address': 'andris@example.com',
        'name': ''
      }]
    }, {
      'name': 'Undisclosed',
      'group': []
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('semicolon as delimiter should not break group parsing ', () => {
    const input = 'Test User <test.user@mail.ee>; Disclosed:andris@tr.ee, andris@example.com;,,,, Undisclosed:; bob@example.com;'
    const expected = [{
      'address': 'test.user@mail.ee',
      'name': 'Test User'
    }, {
      'name': 'Disclosed',
      'group': [{
        'address': 'andris@tr.ee',
        'name': ''
      }, {
        'address': 'andris@example.com',
        'name': ''
      }]
    }, {
      'name': 'Undisclosed',
      'group': []
    }, {
      'address': 'bob@example.com',
      'name': ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle name from comment correctly', () => {
    const input = 'andris@tr.ee (andris)'
    const expected = [{
      name: 'andris',
      address: 'andris@tr.ee'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle skip comment correctly', () => {
    const input = 'andris@tr.ee (reinman) andris'
    const expected = [{
      name: 'andris',
      address: 'andris@tr.ee'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle missing address correctly', () => {
    const input = 'andris'
    const expected = [{
      name: 'andris',
      address: ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle apostrophe in name correctly', () => {
    const input = "O'Neill"
    const expected = [{
      name: "O'Neill",
      address: ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle particularly bad input, unescaped colon correctly', () => {
    const input = 'FirstName Surname-WithADash :: Company <firstname@company.com>'
    const expected = [{
      name: 'FirstName Surname-WithADash',
      group: [{
        name: undefined,
        group: [{
          address: 'firstname@company.com',
          name: 'Company'
        }]
      }]
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle phishing address with name looking like an address', () => {
    const input = '<phising@address.com> <real@address.com>'
    const expected = [{
      address: 'real@address.com',
      name: '<phising@address.com>'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle phishing address and multiple addresses 1', () => {
    const input = 'me@example.com, <phising@address.com> <real@address.com>'
    const expected = [{
      address: 'me@example.com',
      name: ''
    }, {
      address: 'real@address.com',
      name: '<phising@address.com>'
    }]
    expect(parse(input)).to.deep.equal(expected)
  })

  it('should handle phishing address and multiple addresses 2', () => {
    const input = '<phising@address.com> <real@address.com>, me@example.com'
    const expected = [{
      address: 'real@address.com',
      name: '<phising@address.com>'
    }, {
      address: 'me@example.com',
      name: ''
    }]
    expect(parse(input)).to.deep.equal(expected)
  })
})
