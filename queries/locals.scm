(expression_body) @local.scope

(argument_patterns(long_identifier)@local.definition)
(identifier_pattern(long_identifier (identifier)@local.definition))
(argument_patterns(long_identifier)@local.definition)
(exposes_list(ident)@local.definition)

(opaque_type_def(apply_type(concrete_type)@local.definition))

(exposes(ident)@local.reference)
(identifier)@local.reference
