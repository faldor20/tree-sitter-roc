changes:

- [x] PNC calling syntax
- [x] Snake case
- [x] |a| lambda syntax
- [x] "${}" string interpolation syntax  
- [x] string interpolation within pattern matching
- [x] ... for todo
- [x] new ident type for _ suffixed shadowable variables
- [x] new ident type for effecctful variables
- [ ] changes in extensable types
  - [ ] add `..` or `..<type>` to the end of records and tags
- [ ] remove `*` in type variables
- [ ] pattern matching/destructuring
  - [ ] Change list destructuring to use .. and remove as
        Lists: [a, b, c] or [a, b, .., d] or [a, b, c, ..d] (not .. as d)
  - [ ] Change record destructuring to support ..
        {a, b, ..} or {a, b, ..rest}
- [ ] support  .. as a spread operator inside records and lists
      




## later:
- [ ] for loop syntax
  - What do i actually need for this?
- [ ] custom record/nominal types syntax
- [ ] static dispatch syntax 
  - [x] .method() invocation
  - [ ] new autoderive syntax
  - [ ] remove abilities (probably put this off for a bit)
