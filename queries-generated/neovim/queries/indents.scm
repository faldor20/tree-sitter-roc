; ;;How to write indents:
; ;;think about the structures that should have indents inside and mark them with indent and extend
; ;;think about the structures that indicate the end of an indent and mark them with extend.prevent-once
; ;;find partially complete structures and create speciall rules for them.
; ;;eg: (ERROR (is))  
(expr_body) @indent.begin
(anon_fun_expr body: (_) @indent.begin)
(match_branch expr: (_) @indent.begin)
(expect body: (_) @indent.begin)
(value_declaration body: (_) @indent.begin)
(var_declaration body: (_) @indent.begin)
(crash_expr message: (_) @indent.begin)
(early_return_expr body: (_) @indent.begin)
(parenthesized_expr expression: (_) @indent.begin)