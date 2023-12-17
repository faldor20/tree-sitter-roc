(expr_body) @scope

(argument_patterns(identifier_pattern
            (identifier)@definition))
; (argument_patterns(long_identifier)@local.definition)
(exposes_list(ident)@reference)


(opaque_type_def(apply_type(concrete_type)@definition.type))
(alias_type_def(apply_type(concrete_type)@definition.type))

(value_declaration(decl_left 
  (identifier_pattern 
   (identifier)@definition.function))(expr_body(anon_fun_expr)))

(value_declaration(decl_left 
  (identifier_pattern 
   (identifier) @definition.variable))
                  )

(identifier_pattern(identifier)@definition)

(exposes(ident)@reference)
(identifier)@reference
(tag_expr(tag))@reference
