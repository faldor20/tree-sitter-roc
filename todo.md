- [ ] fix naming
  - [ ] long_identifier_or_op
- [x] add impliments syntax

- [x] remove old fsharp code
- [ ] test for parsing invalid code
- [ ] unify the patterns and expressions
  - [ ] make a shared subcollection for things that are in both
- [x] dotexpression seems weird and we should try to fix that
- [ ] tighten up cases from fsharp

  - [ ] long_identifier
        roc has strict naming for module name vs function names
  - [ ] also should be able to parse tags and make a tag pattern type

  - [ ] i believe tags is getting matched incorrectly

- [x] Make a record pattern separate from a record expression
      ##big
      make the whole system use nested expressions instead of a list of expressions
      there are a bunch of cases where we currently don't use expression list swhere we should becasue it causese issues
      eg this is valid syntax we don't currently support :

```elm
{
	a:
		b=10
		b
}

```

Something about my whole setup is a bit messed up. i had to add else to the list of expressions because it wouldn't ever get passed when it was inside if... maybe i should try restarting this and basing it more off python, they seem to be very well set up

I think better use of precidence would help a lot

If i make use of inlining i can split up my expressions better, infact i should be using it more generally
I can probably fix a bunch of my issues using the conflicts field, which should make tree-sitter explore the next token;w
b

I made a significant error.
roc is actually like elm in that you cannot have a sequence of expressions in a function body.
eg :
main=
a b
c d
this syntax is invalid because there is no "void" type

I need to fundimentally rework things to support inline if statements

## Modern syntax follow-ups

- [x] Disambiguate negative numeric patterns from prefixed numeric expressions.
      `basic-webserver/platform/Sqlite.roc` uses match branches such as
      `-1 => ...`; a contextual pattern rule currently steals negative values in
      record expressions because expressions and patterns intentionally conflict.
- [x] Disambiguate plain tag destructuring assignments from tag calls.
      `FileRoot(root) = route.files` parses as a tag pattern declaration at
      module level and inside blocks. The `(` must directly follow the tag.
- [x] Move spaced `?` and `??` into the binary operator chain and unify signed
      numeric parsing. This reduced the generated parser from about 12.7 MB / 7,467
      states to about 6.5 MB / 3,799 states without reducing real-source coverage.
- [x] Consolidate calls, field access, tuple access, and suffix operations into
      a deterministic postfix tier. Prefix operators now wrap complete postfix
      chains, and pipe suffixes retain their intended grouping.
- [ ] Reduce generated-parser size after the modern syntax expansion. The
      current parser has 5,678 states and is about 9.9 MB, compared with 2,084
      states and 2.5 MB on `master`.
- [ ] Support uppercase alias, opaque, and nominal type definitions inside
      block bodies without causing constructor expressions such as `Ok({})` to be
      recovered as incomplete type declarations.
- [ ] Reject same-line top-level fragments such as `x = 10 -3` consistently;
      the Roc compiler rejects this spacing, but module-element recovery can accept
      the trailing negative expression as a separate item.
