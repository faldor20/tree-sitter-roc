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

# Each declaration body needs the same scope range as its old expr_body.
plain_int = 42
plain_name = plain_int
computed = plain_int + 1
called = I64.to_f64(plain_int)
items = [plain_int, 2]
conditional = if plain_int == 1 { 1 } else { 2 }
selected = match plain_int { 0 => 1, _ => 2 }
negated = -plain_int
field = holder.member
suffix = called?
tagged = Ok(plain_int)
empty_list = []
function_value = |argument| argument
block_value = { plain_int }
lookup = items.0
record_value = {entry: plain_int}
return_value = return plain_int
crash_value = crash "oops"
parenthesized_value = (plain_int)
debug_value = dbg plain_int

nested = |value| {
    constant_body = 1
    variable_body = value
    binary_body = value + 1
    call_body = I64.to_f64(value)
    list_body = [value]
    if_body = if value == 1 { value } else { 2 }
    match_body = match value { 0 => 1, _ => value }
    prefix_body = -value
    expect value
    var mutable = value + 2
    match value {
        0 => value + 1,
        _ => [value],
    }
}
