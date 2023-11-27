const PREC = {
	FIELD_ACCESS_START: 0,
	WHERE_IMPLEMENTS: 1,
	PATTERN: 0,
	TAG: 1,
	FUNCTION_START: 1,
	PART: 1,
	CASE_OF_BRANCH: 6,
	FUNC: 10,
};

module.exports = grammar({
	name: "roc",

	// The external scanner (scanner.cc) allows us to inject "dummy" tokens into the grammar.
	// These tokens are used to track the indentation-based scoping used in F#

	externals: ($) => [
		$._newline,
		$._end_newline,
		$._indent,
		$._dedent,
		$.string_start,
		$._string_content,
		$.escape_interpolation,
		$.string_end,

		// Mark comments as external tokens so that the external scanner is always
		// invoked, even if no external token is expected. This allows for better
		// error recovery, because the external scanner can maintain the overall
		// structure by returning dedent tokens whenever a dedent occurs, even
		// if no dedent is expected.
		$.comment,

		// Allow the external scanner to check for the validity of closing brackets
		// so that it can avoid returning dedent tokens between brackets.
		"]",
		")",
		"}",
		"except",
	],

	extras: ($) => [$.line_comment, /[ \s\f\uFEFF\u2060\u200B]|\\\r?n/],

	conflicts: ($) => [
		[$._function_call_target, $._atom_expr],
		[$.function_call_expr],
		[$._pattern, $._atom_expr],
		[$._atomic_pattern, $._atom_expr],
		[$.tag_pattern, $.tag_expr],
		[$.record_pattern, $.record_expr],
		[$.record_field_pattern, $.record_field_expr],
		[$.identifier_pattern, $.long_identifier],
		[$.list_pattern, $.list_expr],
		[$._module_elem, $.value_declaration],
	],

	words: ($) => /\s+/,

	inline: ($) => [
		$._type_annotation_paren_fun,
		$.module,
		$.tag,
		$.field_name,
		$.bound_variable,
		$.operator,
		$.variable_expr,
		$.inferred,
	],

	// supertypes: ($) => [$._module_elem, $._pattern, $._expr_inner],

	rules: {
		file: ($) =>
			seq(
				//TODO
				optional(seq($._module_header, $._end_newline)),

				repeat1(seq($._module_elem, $._end_newline)),
			),
		//TODO i could make a different version of this for when the module is an interface
		_module_elem: ($) =>
			choice(
				$.annotation_type_def,
				$.alias_type_def,
				$.opaque_type_def,
				$.expect,
				$.implements_definition,
				$.value_declaration,
			),

		expect: ($) => prec(1, seq("expect", field("body", $.expr_body))),
		value_declaration: ($) =>
			prec(
				0,
				seq(
					//TODO i should be able to find a better solution that this silly /n
					optional(seq($.annotation_type_def, $._end_newline)),

					// $._newline,
					alias($._assigment_pattern, $.decl_left),
					"=",
					field("body", seq(alias($.expr_body_terminal, $.expr_body))),
				),
			),

		expr_body: ($) =>
			choice(
				seq(
					$._indent,
					repeat(seq(choice($.value_declaration, $.backpassing_expr))),
					$._expr_inner,
					$._dedent,
				),
				seq(
					repeat(seq(choice($.value_declaration, $.backpassing_expr))),
					$._expr_inner,
				),
			),
		expr_body_terminal: ($) =>
			choice(
				seq(
					$._indent,
					repeat(seq(choice($.value_declaration, $.backpassing_expr))),
					$._expr_inner,
					$._dedent,
				),
				seq(
					repeat(seq(choice($.value_declaration, $.backpassing_expr))),
					$._expr_inner,
					$._end_newline,
				),
			),
		_atom_expr: ($) =>
			choice(
				$.anon_fun_expr,
				$.const,
				$.record_expr,
				$.record_update_expr,
				$.if_expr,
				$.when_is_expr,
				$.variable_expr,
				$.parenthesized_expr,
				$.operator_as_function_expr,
				$.tag_expr,
				$.tuple_expr,
				$.list_expr,
				$.field_access_expr,
			),
		_call_or_atom: ($) => choice($.function_call_expr, $._atom_expr),
		_expr_inner: ($) =>
			choice(
				// $.seq_infix,
				// $.if_expr,
				// $.long_identifier_or_op,
				// $._keyword_expr,
				// $._assignement_expr,
				// $._atom_context_expr,
				$.prefixed_expression,
				$.bin_op_expr,
				$._call_or_atom,
			),

		prefixed_expression: ($) => prec.left(seq($.operator, $._call_or_atom)),
		else: ($) => seq("else", $.expr_body),

		then: ($) => seq("then", field("then", $.expr_body)),
		else_if: ($) =>
			prec.left(seq("else", "if", field("guard", $._expr_inner), $.then)),

		variable_expr: ($) => alias($.long_identifier, $.variable_expr),
		long_identifier: ($) => seq(repeat(seq($.module, ".")), $.identifier),
		parenthesized_expr: ($) => seq("(", field("expression", $.expr_body), ")"),
		if_expr: ($) =>
			seq(
				alias("if", $.if),
				field("guard", $._expr_inner),
				$.then,
				repeat($.else_if),
				$.else,
			),
		backpassing_expr: ($) =>
			seq(
				field("assignee", $._assigment_pattern),
				$.back_arrow,
				field("value", $._expr_inner),
				$._end_newline,
			),
		_field_access_start: ($) =>
			prec(
				PREC.FIELD_ACCESS_START,
				choice(
					$.variable_expr,
					$.parenthesized_expr,
					$.record_expr,
					$.record_update_expr,
				),
			),
		field_access_expr: ($) =>
			prec.left(
				seq(
					field("target", $._field_access_start),
					repeat1(seq(".", $.identifier)),
				),
			),

		function_call_expr: ($) =>
			prec.dynamic(
				PREC.FUNC,
				seq(
					field("caller", $._function_call_target),
					field("arg", repeat1($._atom_expr)),
				),
			),
		operator_as_function_expr: ($) => $._operator_as_function_inner,

		_operator_as_function_inner: ($) =>
			seq("(", field("operator", $.operator_identifier), ")"),

		_function_call_target: ($) =>
			choice(
				$.field_access_expr,
				// $.field_accessor_function_expr,
				$.variable_expr,
				$.operator_as_function_expr,
				$.parenthesized_expr,
			),
		bin_op_expr: ($) =>
			field(
				"part",
				prec(
					PREC.PART,
					seq(
						$._call_or_atom,
						prec.right(repeat1(seq($.operator, $._call_or_atom))),
					),
				),
			),

		//WHEN_IS

		when_is_expr: ($) =>
			seq(
				alias("when", $.when),
				$._expr_inner,
				alias("is", $.is),
				$._indent,
				$.when_is_branch,
				optional($._more_when_is_branches),
				$._dedent,
			),

		_more_when_is_branches: ($) =>
			prec.dynamic(
				PREC.CASE_OF_BRANCH,
				repeat1(seq($._newline, field("branch", $.when_is_branch))),
			),

		when_is_branch: ($) =>
			seq(
				field("pattern", $._pattern),
				optional(alias(seq("if", $._expr_inner), $.if)),
				$.arrow,
				//TODO: evaluate what options can got here
				field("expr", $.expr_body),
			),
		tag_expr: ($) =>
			prec.left(
				PREC.TAG,
				seq(choice($.opaque_tag, $.tag), repeat($._atom_expr)),
			),
		anon_fun_expr: ($) =>
			seq($.backslash, $.argument_patterns, $.arrow, $.expr_body),

		//RECORDS

		record_field_expr: ($) =>
			prec.right(seq($.field_name, optional(seq(":", $.expr_body)))),
		record_field_builder: ($) =>
			seq($.field_name, seq(":", "<-", $.identifier)),

		record_expr: ($) =>
			seq(
				"{",
				sep_tail(choice($.record_field_expr, $.record_field_builder), ","),
				"}",
			),

		record_update_expr: ($) =>
			seq("{", $.identifier, "&", sep1_tail($.record_field_expr, ","), "}"),

		list_expr: ($) =>
			seq("[", optional(sep1_tail(field("exprList", $._expr_inner), ",")), "]"),

		tuple_expr: ($) =>
			seq(
				"(",
				optional_indent(
					seq(
						field("expr", $._expr_inner),
						repeat1(seq(",", field("expr", $._expr_inner))),
					),
					$,
				),
				")",
			),

		//####---------###
		//#### PATTERN ###
		//####---------###
		// Pattern rules (BEGIN)
		_pattern: ($) =>
			choice(
				// alias("null", $.null_pattern),
				alias("_", $.wildcard_pattern),
				alias($.const, $.const_pattern),
				$.identifier_pattern,
				$.as_pattern,
				$.disjunct_pattern,
				$.conjunct_pattern,
				$.cons_pattern,
				// // $.repeat_pattern,
				$.paren_pattern,
				$.list_pattern,
				$.tag_pattern,
				$.record_pattern,
				$.tuple_pattern,
				$.range_pattern,
				// $.typed_pattern,
				// $.attribute_pattern,
				// :? atomic-type
				// :? atomic-type as ident
			),
		identifier_pattern: ($) => $.identifier,
		as_pattern: ($) => prec.left(0, seq($._pattern, "as", $.identifier)),
		cons_pattern: ($) => prec.left(0, seq($._pattern, "::", $._pattern)),
		disjunct_pattern: ($) => prec.left(0, seq($._pattern, "|", $._pattern)),
		conjunct_pattern: ($) => prec.left(0, seq($._pattern, "&", $._pattern)),

		paren_pattern: ($) => seq("(", $._pattern, ")"),
		range_pattern: ($) => seq(".."),

		tag_pattern: ($) =>
			prec.left(
				PREC.TAG,
				seq(choice($.opaque_tag, $.tag), repeat($._atomic_pattern)),
			),
		tuple_pattern: ($) =>
			prec.right(
				seq(
					"(",
					$._atomic_pattern,
					",",
					repeat(prec.right(seq($._atomic_pattern, ","))),
					$._atomic_pattern,
					")",
				),
			),

		argument_patterns: ($) =>
			seq($._atomic_pattern, repeat(seq(",", $._atomic_pattern))),
		_atomic_pattern: ($) =>
			choice(
				"null",
				alias("_", $.wildcard_pattern),
				$.const,
				$.identifier_pattern,
				$.list_pattern,
				$.tuple_pattern,
				$.record_pattern,
				$.tag_pattern,
				$.range_pattern,
				seq("(", $._pattern, ")"),

				// :? atomic_type
			),
		_assigment_pattern: ($) =>
			choice(
				alias("_", $.wildcard_pattern),
				$.identifier_pattern,
				$.list_pattern,
				$.tuple_pattern,
				$.record_pattern,
			),

		list_pattern: ($) =>
			choice(
				seq("[", "]"),
				seq("[", $._atomic_pattern, repeat(seq(",", $._atomic_pattern)), "]"),
			),

		record_pattern: ($) =>
			seq(
				"{",
				sep_tail(
					choice(
						// $.record_field_type,
						$.record_field_pattern,
						$.record_field_optional_pattern,
						// $.identifier_pattern,
					),
					",",
				),
				"}",
			),
		//TODO is this really a pattern??
		record_field_optional_pattern: ($) => seq($.field_name, "?", $.expr_body),
		record_field_pattern: ($) =>
			seq($.field_name, optional(seq(":", $._atomic_pattern))),
		//###--------####
		//### HEADER ####
		//###--------###

		_module_header: ($) =>
			seq(
				choice($.app_header, $.platform_header, $.interface_header),
				//sometimes it seems we have an unmatched close which stops this from ending and breaks everything after
			),
		app_header: ($) =>
			seq(
				"app",
				alias($.string, $.app_name),
				$._indent,
				$.app_header_body,
				$._dedent,
			),
		app_header_body: ($) =>
			sep1(choice($.packages, $.imports, $.provides), "\n"),
		//TODO make this a function for app and platform
		platform_header: ($) =>
			seq(
				"platform",
				alias($.string, $.name),
				$._indent,
				$.platform_header_body,
				$._dedent,
			),
		platform_header_body: ($) =>
			sep1(
				choice(
					$.requires,
					$.exposes,
					$.packages,
					$.imports,
					$.provides,
					$.effects,
				),
				"\n",
			),

		interface_header: ($) =>
			seq(
				"interface",
				alias(sep1($._upper_identifier, "."), $.name),
				$._indent,
				$.interface_header_body,
				$._dedent,
			),

		interface_header_body: ($) => sep1_tail(choice($.exposes, $.imports), "\n"),

		//TODO: should this actually be a record_pattern?
		packages: ($) => seq("packages", $.record_pattern),

		exposes_list: ($) => seq("{", sep_tail($.ident, ","), "}"),
		exposes: ($) => seq("exposes", "[", sep_tail($.ident, ","), "]"),

		imports: ($) => seq("imports", "[", sep_tail($.imports_entry, ","), "]"),
		imports_entry: ($) =>
			seq(
				optional(seq($.identifier, ".")),
				seq($.module, repeat(seq(".", $.module))),
				optional(seq(".", $.exposes_list)),
			),
		//TODO make a function for all these comma separated trailing comma things
		to: ($) => "to",
		provides: ($) =>
			seq(
				"provides",
				"[",
				optional($.ident),
				repeat(seq(",", $.ident)),
				optional(","),
				"]",
				optional(seq($.to, choice($.string, $.ident))),
			),
		requires: ($) =>
			seq("requires", $.requires_rigids, "{", $.typed_ident, "}"),

		requires_rigids: ($) =>
			choice(
				seq(
					"{",
					optional(
						seq(
							$.requires_rigid,
							repeat(seq(",", $.requires_rigid)),
							optional(","),
						),
					),
					"}",
				),
			),

		requires_rigid: ($) =>
			seq($.identifier, optional(seq("=>", $._upper_identifier))),

		//####-------###
		//#### TYPES ###
		//####-------###

		annotation_type_def: ($) =>
			seq($.annotation_pre_colon, ":", $.type_annotation),
		alias_type_def: ($) => seq($.apply_type, ":", $.type_annotation),
		opaque_type_def: ($) =>
			seq($.apply_type, alias(":=", $.colon_equals), $.type_annotation),

		type_annotation: ($) =>
			prec.left(
				choice(
					seq(
						$._indent,
						choice($._type_annotation_no_fun, $.function_type),
						$._dedent,
					),
					choice($._type_annotation_no_fun, $.function_type),
				),
			),

		//TODO i can probably get rid of this, because type_annotation_no_fun can eventually laev to (functio_type)
		_type_annotation_paren_fun: ($) =>
			choice($._type_annotation_no_fun, seq("(", $.function_type, ")")),

		function_type: ($) =>
			seq(
				sep1(field("param", $._type_annotation_paren_fun), ","),
				$.arrow,
				sep1($._type_annotation_paren_fun, $.arrow),
			),

		_type_annotation_no_fun: ($) =>
			choice(
				seq("(", $.type_annotation, ")"),
				$.record_type,
				$.apply_type,
				$.where_implements,
				$.implements_implementation,
				$.tags_type,
				$.bound_variable,
				$.inferred,
				$.wildcard,
			),

		implements: ($) => "implements",

		where_implements: ($) =>
			prec.right(
				seq(
					$._type_annotation_no_fun,
					alias("where", $.where),
					sep1($._implements_body, ","),
				),
			),
		_implements_body: ($) => seq($.identifier, $.implements, $.ability_chain),

		implements_implementation: ($) =>
			seq(
				$._type_annotation_no_fun,
				$.implements,
				"[",
				sep1_tail($.apply_type, ","),
				"]",
			),

		implements_definition: ($) =>
			seq(
				$._upper_identifier,
				$.implements,

				$.record_type,
				// "{",
				//   $._indent,
				//   sep1($.alias, $._newline),
				//   $._dedent,
				// "}"
			),
		//    init : {} -> f where f implements InspectFormatter
		_ability: ($) => sep1($._upper_identifier, "."),
		ability_chain: ($) => prec.right(sep1($._ability, "&")),

		tags_type: ($) => seq("[", optional($._tags_only), "]"),

		_tags_only: ($) =>
			seq(
				// optional(T('SameIndent')),
				$.apply_type,
				// optional(T('SameIndent')),
				repeat(seq(",", $.apply_type)),
				optional(","),
				// optional(T('SameIndent'))
			),

		type_variable: ($) => choice("_", $.bound_variable),

		bound_variable: ($) => alias($.identifier, $.bound_variable),

		wildcard: ($) => "*",

		inferred: ($) => alias("_", $.inferred),

		apply_type: ($) =>
			prec.right(seq($.concrete_type, optional($.apply_type_args))),

		concrete_type: ($) =>
			seq($._upper_identifier, repeat(seq(".", $._upper_identifier))),

		//we need a n optional \n to stop this eating the value that follows it
		apply_type_args: ($) => prec.right(repeat1($.apply_type_arg)),

		apply_type_arg: ($) => prec.left($._type_annotation_no_fun),

		typed_ident: ($) => seq($.identifier, ":", $.type_annotation),

		record_type: ($) =>
			seq(
				"{",
				sep_tail(
					choice($.record_field_type, $.record_field_type_optional),
					",",
				),
				"}",
			),

		record_field_type: ($) => seq($.field_name, ":", $.type_annotation),
		record_field_type_optional: ($) =>
			seq($.field_name, "?", $.type_annotation),

		annotation_pre_colon: ($) =>
			choice(
				//TODO implimeent apply $.apply,
				//tag seems not needed when we have alias
				// $.tag,
				$.identifier,
			),

		effects: ($) =>
			seq(
				// '__',
				"effects",
				$.effect_name,
				$.record_type,
			),

		effect_name: ($) => seq($.identifier, ".", $._upper_identifier),
		//##------------##
		//##-- consts --##
		//##------------##

		const: ($) =>
			choice(
				$.float,
				$.xint,
				$.decimal,
				$.natural,
				$.uint,
				$.iint,

				$.char,
				$.string,
				$.int,
				"false",
				"true",
				// $.unit,
			),

		//STRINGS
		string: ($) =>
			seq(
				'"',
				repeat(choice(/[^\\"]/, $.interpolation_char, $.escape_char)),
				imm('"'),
			),
		escape_char: ($) => imm(/\\[\\"\'ntbrafv]/),
		interpolation_char: ($) => seq(imm(/\\\(/), $.variable_expr, ")"),
		_simple_string_char: ($) => /[^\t\r\u0008\a\f\v\\"]/,
		_simple_char_char: ($) => imm(/[^\n\t\r\u0008\a\f\v'\\]/),
		char: ($) => seq("'", choice($.escape_char, $._simple_char_char), imm("'")),

		//NUMBERS
		int: ($) => token(seq(/[0-9][0-9_]*/)),

		//ROC
		uint: ($) => token(seq(/[0-9][0-9_]*/, imm(/u(32|8|16|64|128)/))),
		iint: ($) => token(seq(/[0-9][0-9_]*/, imm(/i(32|8|16|64|128)/))),
		decimal: ($) => token(/[0-9]+(\.)?[0-9]*(dec)/),
		natural: ($) => token(/[0-9]+(nat)/),

		float: ($) => token(seq(/[0-9]+(\.)?[0-9]*(e-?[0-9]*)?((f32)|(f64))?/)),
		_hex_int: ($) => token(seq(/0[x][0-9abcdef]*/)),
		_binary_int: ($) => token(seq(/0[b]/, /[01][01_]*/)),
		xint: ($) => choice($._binary_int, $._hex_int),
		// block_comment: ($) => seq("(*", $._block_comment_content, "*)"),

		//PRIMATIVES
		back_arrow: ($) => "<-",
		arrow: ($) => "->",
		identifier: ($) => $._lower_identifier,
		field_name: ($) => alias($.identifier, $.field_name),
		ident: ($) => choice($._lower_identifier, $._upper_identifier),
		_lower_identifier: ($) => /_?[a-z][0-9a-zA-Z_]*/,
		_upper_identifier: ($) => /[A-Z][0-9a-zA-Z_]*/,
		tag: ($) => alias($._upper_identifier, $.tag),
		opaque_tag: ($) => /@[A-Z][0-9a-zA-Z_]*/,
		module: ($) => alias($._upper_identifier, $.module),
		backslash: ($) => "\\",

		line_comment: ($) => token(seq(/#/, repeat(/[^\n]/))),

		operator: ($) => alias($.operator_identifier, $.operator),
		operator_identifier: ($) =>
			choice(
				"+",
				"-",
				"*",
				"/",
				"!",
				"//",
				"^",
				"==",
				"/=",
				"<",
				">",
				"<=",
				">=",
				"&&",
				"||",
				"++",
				"<|",
				"|>",
				"<<",
				">>",
				"::",
				"</>",
				"<?>",
				"|.",
				"|=",
			),
	},
});

function sep1(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)));
}
function sep1_tail(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)), optional(separator));
}
function sep_tail(rule, separator) {
	return optional(sep1_tail(rule, separator));
}
function optional_indent(rule, $) {
	return choice(seq($._indent, rule, $._dedent), rule);
}
function imm(x) {
	return token.immediate(x);
}
