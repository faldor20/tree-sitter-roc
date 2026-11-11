
(expr_body) @rainbow.scope
[
  (anon_fun_expr body: (_) @rainbow.scope)
  (match_branch expr: (_) @rainbow.scope)
  (expect body: (_) @rainbow.scope)
  (value_declaration body: (_) @rainbow.scope)
  (var_declaration body: (_) @rainbow.scope)
  (crash_expr message: (_) @rainbow.scope)
  (early_return_expr body: (_) @rainbow.scope)
  (parenthesized_expr expression: (_) @rainbow.scope)
]

[
  "[" "]"
  "(" ")"
  "{" "}"
  "|"
] @rainbow.bracket
