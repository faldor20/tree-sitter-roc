postfix = result?
#               ^ keyword.control.return.roc-special.try

infix = result ? fallback
#              ^ keyword.control.return.roc-special.try

defaulted = maybe_value ?? 0
#                       ^^ operator

unwrap = || {
    return result
#   ^^^^^^ keyword.control.return
}
