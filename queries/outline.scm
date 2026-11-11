; Only file and associated-member children are outline entries. Block locals
; are excluded by these parent patterns, including local type bindings.
(file
  [
    (alias_type_def name: (apply_type (concrete_type) @name) ":" @context)
    (opaque_type_def name: (apply_type (concrete_type) @name) (double_colon) @context)
    (nominal_type_def name: (apply_type (concrete_type) @name) (colon_equals) @context)
    (annotation_type_def name: (annotation_pre_colon (identifier) @name) ":" @context)
  ] @item)

(nominal_methods
  [
    (alias_type_def name: (apply_type (concrete_type) @name) ":" @context)
    (opaque_type_def name: (apply_type (concrete_type) @name) (double_colon) @context)
    (nominal_type_def name: (apply_type (concrete_type) @name) (colon_equals) @context)
    (annotation_type_def name: (annotation_pre_colon (identifier) @name) ":" @context)
    (inferred_associated_annotation name: (annotation_pre_colon (identifier) @name) ":" @context)
  ] @item)

; Partition definitions by their preceding non-comment sibling. Optional
; signature captures cannot test absence: #not-eq? rejects absent captures.
; First definitions, unsigned definitions, and differently named signatures
; have separate patterns; matching signatures already supply the entry.
; Keep predecessor captures: the pinned engine otherwise drops consecutive
; definition matches when noncaptured predecessor paths merge.
(file
  . [(line_comment) (doc_comment)]* .
  (value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item)
(nominal_methods
  . [(line_comment) (doc_comment)]* .
  (value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item)

(file
  [(app_header) (module_header) (package_header) (platform_header) (ERROR)
   (alias_type_def) (opaque_type_def) (nominal_type_def) (expect)
   (value_declaration) (var_declaration) (expr_body) (import_expr) (import_file_expr)] @_previous
  . [(line_comment) (doc_comment)]* .
  (value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item)
(nominal_methods
  [(alias_type_def) (opaque_type_def) (nominal_type_def) (expect) (ERROR)
   (value_declaration) (var_declaration) (expr_body) (import_expr) (import_file_expr)] @_previous
  . [(line_comment) (doc_comment)]* .
  (value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item)

(file
  (annotation_type_def name: (annotation_pre_colon (identifier) @_signature))
  . [(line_comment) (doc_comment)]* .
  (value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item
  (#not-eq? @_signature @name))
(nominal_methods
  [(annotation_type_def name: (annotation_pre_colon (identifier) @_signature))
   (inferred_associated_annotation name: (annotation_pre_colon (identifier) @_signature))]
  . [(line_comment) (doc_comment)]* .
  (value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item
  (#not-eq? @_signature @name))
