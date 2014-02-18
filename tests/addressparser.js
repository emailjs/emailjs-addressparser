
test("Single address", function(){
    var input = "andris@tr.ee",
        expected = [{address:"andris@tr.ee", name:""}];
    deepEqual(addressparser.parse(input), expected);
});

test("Multiple addresses", function(){
    var input = "andris@tr.ee, andris@example.com",
        expected = [{address:"andris@tr.ee", name:""}, {address:"andris@example.com", name:""}];
    deepEqual(addressparser.parse(input), expected);
});

test("With unquoted name", function(){
    var input = "andris <andris@tr.ee>",
        expected = [{name: "andris", address:"andris@tr.ee"}];
    deepEqual(addressparser.parse(input), expected);
});

test("With quoted name", function(){
    var input = "\"reinman, andris\" <andris@tr.ee>",
        expected = [{name: "reinman, andris", address:"andris@tr.ee"}];
    deepEqual(addressparser.parse(input), expected);
});

test("Unquoted name, unquoted address", function(){
    var input = "andris andris@tr.ee",
        expected = [{name: "andris", address:"andris@tr.ee"}];
    deepEqual(addressparser.parse(input), expected);
});

test("Emtpy group", function(){
    var input = "Undisclosed:;",
        expected = [{"name":"Undisclosed","group":[]}];
    deepEqual(addressparser.parse(input), expected);
});

test("Address group", function(){
    var input = "Disclosed:andris@tr.ee, andris@example.com;",
        expected = [{"name":"Disclosed","group":[{"address":"andris@tr.ee","name":""}, {"address":"andris@example.com","name":""}]}];
    deepEqual(addressparser.parse(input), expected);
});

test("Mixed group", function(){
    var input = "Test User <test.user@mail.ee>, Disclosed:andris@tr.ee, andris@example.com;,,,, Undisclosed:;",
        expected = [{"address":"test.user@mail.ee","name":"Test User"}, {"name":"Disclosed","group":[{"address":"andris@tr.ee","name":""}, {"address":"andris@example.com","name":""}]}, {"name":"Undisclosed","group":[]}];
    deepEqual(addressparser.parse(input), expected);
});

test("Name from comment", function(){
    var input = "andris@tr.ee (andris)",
        expected = [{name: "andris", address:"andris@tr.ee"}];
    deepEqual(addressparser.parse(input), expected);
});

test("Skip comment", function(){
    var input = "andris@tr.ee (reinman) andris",
        expected = [{name: "andris", address:"andris@tr.ee"}];
    deepEqual(addressparser.parse(input), expected);
});

test("No address", function(){
    var input = "andris",
        expected = [{name: "andris", address:""}];
    deepEqual(addressparser.parse(input), expected);
});

test("Apostrophe in name", function(){
    var input = "O'Neill",
        expected = [{name: "O'Neill", address:""}];
    deepEqual(addressparser.parse(input), expected);
});

test("Particularily bad input, unescaped colon", function(){
    var input = "FirstName Surname-WithADash :: Company <firstname@company.com>",
        expected = [ { name: 'FirstName Surname-WithADash',
                group: 
                 [ { name: undefined,
                     group: [ { address: 'firstname@company.com', name: 'Company' } ] } ] } ];
    deepEqual(addressparser.parse(input), expected);
});
