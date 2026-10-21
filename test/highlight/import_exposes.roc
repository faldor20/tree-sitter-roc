module [main]

import Foo as Bar exposing [a, B]
#      ^^^ namespace
#             ^^^ namespace
#                          ^ punctuation.bracket
#                           ^ special.roc-special.exposed
#                            ^ punctuation.delimiter.roc-special.ordinary
#                              ^ special.roc-special.exposed
#                               ^ punctuation.bracket

main = 1
