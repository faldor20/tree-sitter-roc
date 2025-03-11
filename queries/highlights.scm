;; Highlight names (like `@comment.block.documentation`) are arbitrary.
;; However, some text editors encourage a standard set in their themes.
;; For consistency and quality, these queries assign the highlight names that Helix uses:
;; see https://docs.helix-editor.com/themes.html#scopes



;;
;; Higher-priorty queries
;;



; TODO: remove or adapt, since this is not a Helix scope
(ability_chain "&" @operator.typedef)



; TODO: remove or adapt, since this is not a Helix scope
(parenthesized_type ["(" ")"]  @punctuation.bracket.typedef)
(record_type ["{" "}"] @punctuation.bracket.typedef)
(tags_type ["[" "]"] @punctuation.bracket.typedef)
(tuple_type ["(" ")"] @punctuation.bracket.typedef)

; TODO: remove or adapt, since this is not a Helix scope
(function_type "," @punctuation.delimiter.typedef)
(record_field_type ":" @punctuation.delimiter.typedef)
(record_type "," @punctuation.delimiter.typedef)
(tuple_type "," @punctuation.delimiter.typedef)

; TODO: remove or adapt, since this is not a Helix scope
(function_type (arrow) @punctuation.delimiter.structural.typedef)



; TODO: remove or adapt, since this is not a Helix scope
(record_field_type (field_name) @variable.other.enum.typedef)



;;
;; Normal-priorty queries
;;



; N/A [TODO: investigate, then either confirm N/A or implement]
; @attribute



; N/A [TODO: investigate, then either confirm N/A or implement]
; @comment

; N/A [TODO: investigate, then either confirm N/A or implement]
; @comment.block

(doc_comment) @comment.block.documentation

(line_comment) @comment.line



; N/A [TODO: investigate, then either confirm N/A or implement]
; @constant

[
  "dbg"
] @constant.builtin

; TODO: prefix incidental names with `temp.` to avoid implicit exports? Like `@temp.module`
(variable_expr (module) @module (identifier) @constant.builtin.boolean
  (#eq? @constant.builtin.boolean "false") (#eq? @module "Bool"))
(variable_expr (module) @module (identifier) @constant.builtin.boolean
  (#eq? @constant.builtin.boolean "true") (#eq? @module "Bool"))

(char) @constant.character

(escape_char) @constant.character.escape

; N/A [TODO: investigate, then either confirm N/A or implement]
; @constant.numeric

[
  (iint)
  (int)
  (natural)
  (uint)
  (xint)
] @constant.numeric.integer

[
  (decimal)
  (float)
] @constant.numeric.float



[
  (opaque_tag)
  (tag)
] @constructor



(annotation_type_def (annotation_pre_colon         (identifier) @function)
  (function_type))
(bin_op_expr (operator "|>") (variable_expr        (identifier) @function))
(function_call_pnc_expr caller: (field_access_expr (identifier) @function .))
(function_call_pnc_expr caller: (variable_expr     (identifier) @function))

; N/A [TODO: investigate, then either confirm N/A or implement]
; @function.builtin

; TODO: remove or adapt, since this is not a Helix scope
(value_declaration (decl_left (identifier_pattern (identifier) @function.definition))
  (expr_body (anon_fun_expr)))

; N/A [TODO: investigate, then either confirm N/A or implement]
; @function.macros
; @function.method
; @function.method.private
; @function.special



; N/A [TODO: investigate, then either confirm N/A or implement]
; @keyword

[
  "app"
  "expect"
  "import"
  "module"
  "package"
] @keyword.control

[
  "else"
  "if"
  "then"
] @keyword.control.conditional

; N/A [TODO: investigate, then either confirm N/A or implement]
; @keyword.control.exception
; @keyword.control.import
; @keyword.control.repeat
; @keyword.control.return

; TODO: remove or adapt, since this is not a Helix scope
[
  "as"
  (implements)
  (is)
  (to)
  (when)
] @keyword.control.roc

; N/A [TODO: investigate, then either confirm N/A or implement]
; @keyword.directive
; @keyword.function
; @keyword.operator
; @keyword.storage
; @keyword.storage.modifier
; @keyword.storage.type



; N/A [TODO: investigate, then either confirm N/A or implement]
; @label



(identifier "!" @operator)
(identifier "_" @operator)
[
  "|"
  "&"
  "<-"
  ".."
  (operator)
  (wildcard_pattern)
] @operator



; TODO: remove or adapt, since this is not a Helix scope
(annotation_type_def (annotation_pre_colon        (identifier) @parameter.definition))
(value_declaration (decl_left (identifier_pattern (identifier) @parameter.definition)))



; N/A [TODO: investigate, then either confirm N/A or implement]
; @punctuation

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  (interpolation_char)
] @punctuation.bracket

[
  ","
  ":"
] @punctuation.delimiter

; TODO: remove or adapt, since this is not a Helix scope
[
  "?"
  (arrow)
  (fat_arrow)
  ("|")
] @punctuation.delimiter.structural

; N/A [TODO: investigate, then either confirm N/A or implement]
; @punctuation.special



; N/A [TODO: investigate, then either confirm N/A or implement]
; @special



(multiline_string) @string
(string) @string

; N/A [TODO: investigate, then either confirm N/A or implement]
; @string.regexp
; @string.special
; @string.special.path
; @string.special.symbol
; @string.special.url



; N/A [TODO: investigate, then either confirm N/A or implement]
; @tag
; @tag.builtin



; N/A [TODO: investigate, then either confirm N/A or implement]
; @type

((concrete_type) @type.builtin
  (#match? @type.builtin "^(Bool|Box|Dec|Decode|Dict|Encode|Hash|Inspect|Int|List|Num|Result|Set|Str)"))
((concrete_type) @type.builtin
  (#match? @type.builtin "^[IU](8|16|32|64|128)"))
((concrete_type) @type.builtin
  (#match? @type.builtin "^(Dec|F(32|64))"))

; Opinion: Type defs cross into documentation
;          and should be highlighted differently from normal code.
(opaque_type_def (_ (concrete_type) @type.definition))

; N/A [TODO: investigate, then either confirm N/A or implement]
; @type.enum

(tag_type) @type.enum.variant

; TODO: remove or adapt @type.keyword, since it is not a Helix scope
(where_implements _
  (where)      @type.keyword
  (identifier)    @type.parameter
  (implements) @type.keyword
  (ability_chain) @type.parameter)

(bound_variable) @type.parameter



(record_field_pattern (_ (identifier) @variable))

; N/A [TODO: investigate, then either confirm N/A or implement]
; @variable.builtin
; @variable.other

(field_name)                         @variable.other.member
; Note: This query matches the second identifier and all subsequent ones.
(field_access_expr      (identifier) @variable.other.member)
; Note: This query highlights module members as records instead of free variables,
;       which avoids highlighting them as out-of-scope vars.
(variable_expr (module) (identifier) @variable.other.member)

; N/A [TODO: investigate, then either confirm N/A or implement]
; @variable.other.member.private

(argument_patterns                (identifier_pattern (identifier) @variable.parameter))
(argument_patterns (_             (identifier_pattern (identifier) @variable.parameter)))
(argument_patterns (_ (_          (identifier_pattern (identifier) @variable.parameter))))
(argument_patterns (_ (_ (_       (identifier_pattern (identifier) @variable.parameter)))))
(argument_patterns (_ (_ (_ (_    (identifier_pattern (identifier) @variable.parameter))))))
(argument_patterns (_ (_ (_ (_ (_ (identifier_pattern (identifier) @variable.parameter)))))))
(spread_pattern                                       (identifier) @variable.parameter)
(when_is_branch pattern: (_       (identifier_pattern (identifier) @variable.parameter)))



;;
;; Lower-priorty queries
;;



; TODO: remove or adapt, since this is not a Helix scope
; #any-of? not working in the tree-sitter for helix 23.10
((module) @namespace.builtin (#eq? @namespace.builtin "Bool"))
((module) @namespace.builtin (#eq? @namespace.builtin "Box"))
((module) @namespace.builtin (#eq? @namespace.builtin "Decode"))
((module) @namespace.builtin (#eq? @namespace.builtin "Dict"))
((module) @namespace.builtin (#eq? @namespace.builtin "Encode"))
((module) @namespace.builtin (#eq? @namespace.builtin "Hash"))
((module) @namespace.builtin (#eq? @namespace.builtin "Inspect"))
((module) @namespace.builtin (#eq? @namespace.builtin "List"))
((module) @namespace.builtin (#eq? @namespace.builtin "Num"))
((module) @namespace.builtin (#eq? @namespace.builtin "Result"))
((module) @namespace.builtin (#eq? @namespace.builtin "Set"))
((module) @namespace.builtin (#eq? @namespace.builtin "Str"))
(module) @namespace



(concrete_type) @type



(identifier) @variable
