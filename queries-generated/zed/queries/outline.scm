; Z01 deliberately captures only direct file children.
(file
  [
    (alias_type_def name: (apply_type (concrete_type) @name))
    (opaque_type_def name: (apply_type (concrete_type) @name))
    (nominal_type_def name: (apply_type (concrete_type) @name))
  ] @item)

(file
  (annotation_type_def
    name: (annotation_pre_colon (identifier) @name)) @item)

(file
  (value_declaration
    pattern: (decl_left (identifier_pattern (identifier) @name))) @item)
