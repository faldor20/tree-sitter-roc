;;How to write indents:
;;think about the structures that should have indents inside and mark them with indent and extend
;;think about the structures that indicate the end of an indent and mark them with extend.prevent-once
;;find partially complete structures and create speciall rules for them.
;;eg: (ERROR (is))  
[
	(value_declaration)	
	(then)
	(else)
	(when_is_expr)
	(when_is_branch)
	(record_field_expr)
	(function_call_expr)
	; (function_type)
	(annotation_type_def)
	; (parenthesized_type)
	(interface_header)
	(expect)

] @indent 
[
	(value_declaration)	
	(then)
	(else)
	(when_is_expr)
	(when_is_branch)
	(record_field_expr)
	(function_call_expr)
	; (function_type)
	(annotation_type_def)
	(interface_header)
	(expect)

	; (record_expr)
]  @extend
[
	(exposes)
	(imports)
	(provides)
	(requires)
	]@indent 

(ERROR "expect")@indent @extend

[
"["
"{"
"("]@indent @extend

["}"
"]"
")"]@outdent

[
	(record_expr)
	(list_expr)
	(tuple_expr)
	(record_pattern)
	(list_pattern)
	(tuple_pattern)
	(tuple_type)
	(parenthesized_type)
	(parenthesized_expr)
	(paren_pattern)
	
]@indent


;;starting a when is expression
(ERROR (is)@indent @extend) 
;;starting a record_field
(ERROR ":"@indent @extend) 
;starting a type annotation
 (ERROR "(")@indent @extend 



(value_declaration
(expr_body
	result: (_)
) @extend.prevent-once
)
(then
(expr_body
	result: (_)
) @extend.prevent-once
)
(else
(expr_body
	result: (_)
) @extend.prevent-once
)
 (when_is_branch
(expr_body
	result: (_)
)@extend.prevent-once
)
 (expect
(expr_body
	result: (_)
)@extend.prevent-once
)

