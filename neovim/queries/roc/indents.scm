;; ======This seems broken and needs more testing=====

; [
; 	(value_declaration)	
; 	(then)
; 	(else)
; 	(when_is_expr)
; 	(when_is_branch)
; 	(record_field_expr)
; 	(function_call_expr)
; 	; (function_type)
; 	(annotation_type_def)
; 	; (parenthesized_type)
; 	(interface_header)
; 	(expect)

; ] @indent.begin 
; [
; 	(value_declaration)	
; 	(then)
; 	(else)
; 	(when_is_expr)
; 	(when_is_branch)
; 	(record_field_expr)
; 	(function_call_expr)
; 	; (function_type)
; 	(annotation_type_def)
; 	(interface_header)
; 	(expect)

; 	; (record_expr)
; ]  @indent.align
; [
; 	(exposes)
; 	(imports)
; 	(provides)
; 	(requires)
; 	]@indent.begin 

; (ERROR "expect")@indent.begin @indent.align

; [
; "["
; "{"
; "("]@indent.begin @indent.align

; ["}"
; "]"
; ")"]@indent.end

; [
; 	(record_expr)
; 	(list_expr)
; 	(tuple_expr)
; 	(record_pattern)
; 	(list_pattern)
; 	(tuple_pattern)
; 	(tuple_type)
; 	(parenthesized_type)
; 	(parenthesized_expr)
; 	(paren_pattern)
	
; ]@indent.begin


; ;;starting a when is expression
; (ERROR (is)@indent.begin @indent.align) 
; ;;starting a record_field
; (ERROR ":"@indent.begin @indent.align) 
; ;starting a type annotation
;  (ERROR "(")@indent.begin @indent.align 



; (value_declaration
; (expr_body
; 	result: (_)
; ) @indent.end 
; )
; (then
; (expr_body
; 	result: (_)
; ) @indent.end
; )
; (else
; (expr_body
; 	result: (_)
; ) @indent.end
; )
;  (when_is_branch
; (expr_body
; 	result: (_)
; )@indent.end
; )
;  (expect
; (expr_body
; 	result: (_)
; )@indent.end
; )


