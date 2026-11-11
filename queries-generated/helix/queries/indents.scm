; ;;How to write indents:
; ;;think about the structures that should have indents inside and mark them with indent and extend
; ;;think about the structures that indicate the end of an indent and mark them with extend.prevent-once
; ;;find partially complete structures and create speciall rules for them.
; ;;eg: (ERROR (is))  
(expr_body) @indent
(anon_fun_expr body: (_) @indent)
(match_branch expr: (_) @indent)
(expect body: (_) @indent)
(value_declaration body: (_) @indent)
(var_declaration body: (_) @indent)
(crash_expr message: (_) @indent)
(early_return_expr body: (_) @indent)
(parenthesized_expr expression: (_) @indent)