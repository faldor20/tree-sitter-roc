module.exports = grammar({
  name: 'YOUR_LANGUAGE_NAME',

  rules: {

  // The external scanner (scanner.cc) allows us to inject "dummy" tokens into the grammar.
  // These tokens are used to track the indentation-based scoping used in F#
  externals: $ => [
    $._virtual_open_section, // Signal the external scanner that a new indentation scope should be opened. Add the indetation size to the stack.
    $._virtual_end_section, // end an indentation scope, popping the indentation off the stack.
    $._virtual_end_decl, // end an indentation scope with equal alignment, popping the indentation off the stack.
    $.block_comment_content

  ],
        // TODO: add the actual grammar rules

    source_file: $ => 'hello',
    // string_escape: $ => choice('\t', '\\', '\n', '\"', ''),

    string_escape: ($) => /\\(u\{[0-9A-Fa-f]{4,6}\}|[nrt\"'\\])/,
    _string_content: $ => repeat1(choice($.string_escape, /[^\\"]+|\\/)),
    string: $ => seq('"', optional($._string_content), '"'),

    _identifier: $ => /[a-z][a-zA-Z0-9_]/,
    _identifier_capital: $ => /[A-Z][a-zA-Z0-9_]/,



    record: $ => choice(
      $.empty_record,
      seq(
        '{',
        $.assigned_fields,
        '}'
      )
    ),


    empty_record: $ => seq('{', '}'),

    assigned_fields: $ => seq(
      repeat(seq(
        $.assigned_field,
        optional($.comma)
      )),
      optional($.assigned_field)
    ),
    _arrow: $ => "->",
    list: $ => seq("[", $.list_content, "]"),

    module: $ => seq(
      header(),
      optional(module_defs()),
      indented_end()
    ),

   apply:$ =>
seq(
    apply_start_pattern, apply_args
),
parens_around:$=>seq('(',$.full_expr,')'),
access_start:$=>choice($._identifier,$.record,$.parens_around),

op_expr:$=>$.pizza_expr,
//a pizza is this '|>' operator
//TODO: they use bool_or_expr
pizza_expr:$=> seq($.expr,),
pizza_end:$=>seq("|>",$.expr)
    full_expr: $ => choice(
      op_expr,
      seq(
        $._virtual_open_section,
        op_expr(),
    $._virtual_end_section, // end an indentation scope, popping the indentation off the stack.
        close_or_end()
      )
    ),


    op_expr: $ => pizza_expr(),

    expr:$=>choice($.common_expr,$.apply),    // Assumption: common_expr is a single node with multiple possible child expressions

    common_expr: $ => choice(
      closure,
      expect,
      if_expr,
      when,
      backpass,
      list,
      record,
      record_update,
      parens_around,
      token(Number),
      token(NumberBase),
      token(String),
      module_var,
      tag,
      accessor_function,
      defs,
      annotation,
      token(LowercaseIdent)
    ),

    expr: $ => choice(
      access,
      apply,
      common_expr
    ),

    closure: $ => seq(
      '\\',
      $.args,
      $._arrow,
      $.closure_body
    ),

    // Assumption: closure_body handles indentation
    closure_body: $ => choice(
      seq(
        $._virtual_open_section,
        full_expr(),
        choice($._virtual_close_section, end_of_file(), not($.')'')
      ),
      optional(token(SameIndent)),
      full_expr()
    ),

    args: $ => seq(
      $.arg,
      repeat(seq(
        ",",
        $.arg,

      ))
    ),

    arg: $ => choice(
      '_',
      $._identifier,
      $.record_destructure

    ),
    record_field: $ => $._identifier,
    type: $ => $._identifier,
    typed_record_field: $ => seq($.record_field, ":", $.type),
    record_value: $ => choice($.record_field, $.typed_record_field),
    record_destructure_body: $ => seq(optional(repeat1(seq($.record_value, ","))), $.record_value),
    record_destructure: $ => seq("{", $.record_body, "}")


    assigned_field: $ => {
      choice(
        $.required_value,
        $._identifier

      )

    },
    required_value: $ => seq($._identifier, ":", $._identifier)

  });
