app [main!] { pf: platform "./platform/main.roc" }

outer = |x| {
    local = |x| x
    use = |y| x + y
    match x {
        Ok(value) => |z| value + z,
        Err(other) => other,
    }
}

check = |input| {
    expect input == 1
    var counter = input
    counter
}

expect 1 == 1
message = crash "oops"
returned = return 2
parenthesized = (3)
record = {field: 4}
debugged = dbg 5
standalone = { 6 }
