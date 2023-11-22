
[
"?"
(arrow)
(back_arrow)
(backslash)
] @punctuation.delimiter



;;from fsharp

;; ----------------------------------------------------------------------------
;; Literals and comments

[
  (line_comment)
  (block_comment)
  (block_comment_content)
] @comment


;; ----------------------------------------------------------------------------
;; Punctuation

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  "," 
] @punctuation.delimiter

[
  "|" 
  (infix_op)
  (symbolic_op)
] @operator


[
  "if"
  "then"
  "else"

] @keyword.control.conditional

(interface_header(name)@type.interface)

[
    "app"
    "packages"
    "imports"
    "provides"
    "interface"
    "exposes"
    "expect"
 ] @keyword.control

  (implements)@keyword.control.roc
 (when) @keyword.control.roc
 (is) @keyword.control.roc
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
] @punctuation.delimiter


;----things that could be functions----

(value_declaration(value_declaration_left 
  (identifier_pattern 
   (long_identifier (identifier)@function)))(expression_body(fun_expression)))

(value_declaration_top 
 (value_declaration_left 
  (identifier_pattern 
   (long_identifier (identifier)@function))) 
 (expression_body 
  (fun_expression))) 

(application_expression
  caller: (long_identifier_or_op
    (long_identifier
      (identifier)@function)))
(application_expression
  caller: (dot_expression
    (long_identifier_or_op
    (long_identifier
      (identifier)@function)) . ))


; (fun_expression
;   (argument_patterns
;     (long_identifier
;       (identifier)@variable.parameter))
;      )

(annotation_type_def 
 (annotation_pre_colon 
  (identifier)@function )
 (type_annotation (function_type)))




(imports
  (imports_entry
          (long_module_name
            (module)
              @namespace)))

(packages
  (record
    (record_field_expr
      (field_name)@namespace)))

(concrete_type)@type

(tag)@constructor
(opaque_tag)@constructor

(string)@string
(char) @constant.character

; (boolean_literal) @constant.builtin.boolean
(long_identifier
  (module)@module
  (identifier)@constant.builtin.boolean
  (#eq? @constant.builtin.boolean "true" )
  (#eq? @module "Bool." )
  )
(long_identifier
  (module)@module
  (identifier)@constant.builtin.boolean
  (#eq? @constant.builtin.boolean "false" )
  (#eq? @module "Bool." )
  )

; (fun_expression
;   (argument_patterns)@variable.parameter)
(argument_patterns(long_identifier)@variable.parameter)
(argument_patterns(_(identifier_pattern)@variable.parameter))
(argument_patterns(_(_(identifier_pattern)@variable.parameter)))
(argument_patterns(_(_(_(identifier_pattern)@variable.parameter))))
(argument_patterns(_(_(_(_(identifier_pattern)@variable.parameter)))))
(argument_patterns(_(_(_(_(_(identifier_pattern)@variable.parameter))))))

(field_name)@variable.other.member

;matches the second identifier and all subsequent ones
(dot_expression (_)(long_identifier_or_op)* @variable.other.member)


[
  (int)
  (uint)
  (iint)
  (xint)
  (natural)
] @constant.numeric.integer
[
  (decimal)
  (float)
] @constant.numeric.float

(module)@namespace
(module)@module

(long_identifier_or_op)@variable
