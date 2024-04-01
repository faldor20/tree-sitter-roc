## The Graph interface represents a [graph](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics))
## using an [adjacency list](https://en.wikipedia.org/wiki/Adjacency_list)
## and exposes functions for working with graphs, such as creating one from a list and
## performing a depth-first or breadth-first search.
interface Graph
    exposes [
        Graph,
        fromList,
        fromDict,
        dfs,
        bfs,
    ]
    imports []

rangeTest = \ ->
    myList = [Foo, Bar, Baz]

    when myList is
        [] -> 0
        [Foo, ..] -> 1
        [_, ..] -> 2
        [Foo, Bar, ..] -> 3
        [Foo, Bar, Baz] -> 4
        [Foo, a, ..] -> 5
        [.., Foo] -> 7
        [A, B, .., C, D] -> 8
        [head, .. as tail] -> 9

## Graph type representing a graph as a dictionary of adjacency lists,
## where each key is a vertex and each value is a list of its adjacent vertices.
Graph a := Dict a (List a) where a implements Eq & Something

foo : (U8, U30) #U30 is deliberately invalid

## Create a Graph from an adjacency list.
# fromList : List (a, List a) -> Graph a
fromList = \adjacencyList ->
    emptyDict = Dict.withCapacity (List.len adjacencyList)

    update = \dict, (vertex, edges) ->
        Dict.insert dict vertex edges

    List.walk adjacencyList emptyDict update
    |> @Graph

## Create a Graph from an adjacency list.
fromDict : Dict a (List a) -> Graph a
fromDict = @Graph

## Perform a depth-first search on a graph to find a target vertex.
## [Algorithm animation](https://en.wikipedia.org/wiki/Depth-first_search#/media/File:Depth-First-Search.gif)
##
## - `isTarget` : A function that returns true if a vertex is the target.
## - `root`     : The starting vertex for the search.
## - `graph`    : The graph to perform the search on.
dfs : (a -> Bool), a, Graph a -> Result a [NotFound]
dfs = \isTarget, root, @Graph graph ->
    dfsHelper isTarget [root] (Set.empty {}) graph

# A helper function for performing the depth-first search.
#
# `isTarget` : A function that returns true if a vertex is the target.
# `stack`    : A List of vertices to visit.
# `visited`  : A Set of visited vertices.
# `graph`    : The graph to perform the search on.
dfsHelper : (a -> Bool), List a, Set a, Dict a (List a) -> Result a [NotFound]
dfsHelper = \isTarget, stack, visited, graph ->
    when stack is
        [] ->
            Err NotFound

        [.., current] ->
            rest = List.dropLast stack 1

            if isTarget current then
                Ok current
            else if Set.contains visited current then
                dfsHelper isTarget rest visited graph
            else
                newVisited = Set.insert visited current

                when Dict.get graph current is
                    Ok neighbors ->
                        # filter out all visited neighbors
                        filtered =
                            neighbors
                            |> List.keepIf (\n -> !(Set.contains newVisited n))
                            |> List.reverse

                        # newly explored nodes are added to LIFO stack
                        newStack = List.concat rest filtered

                        dfsHelper isTarget newStack newVisited graph

                    Err KeyNotFound ->
                        dfsHelper isTarget rest newVisited graph

## Perform a breadth-first search on a graph to find a target vertex.
## [Algorithm animation](https://en.wikipedia.org/wiki/Breadth-first_search#/media/File:Animated_BFS.gif)
##
## - `isTarget` : A function that returns true if a vertex is the target.
## - `root`     : The starting vertex for the search.
## - `graph`    : The graph to perform the search on.
bfs : (a -> Bool), a, Graph a -> Result a [NotFound]
bfs = \isTarget, root, @Graph graph ->
    bfsHelper isTarget [root] (Set.single root) graph

# A helper function for performing the breadth-first search.
#
# `isTarget` : A function that returns true if a vertex is the target.
# `queue`    : A List of vertices to visit.
# `seen`  : A Set of all seen vertices.
# `graph`    : The graph to perform the search on.
bfsHelper : (a -> Bool), List a, Set a, Dict a (List a) -> Result a [NotFound]
bfsHelper = \isTarget, queue, seen, graph ->
    when queue is
        [] ->
            Err NotFound

        [current, ..] ->
            rest = List.dropFirst queue 1

            if isTarget current then
                Ok current
            else
                when Dict.get graph current is
                    Ok neighbors ->
                        # filter out all seen neighbors
                        filtered = List.keepIf neighbors (\n -> !(Set.contains seen n))

                        # newly explored nodes are added to the FIFO queue
                        newQueue = List.concat rest filtered

                        # the new nodes are also added to the seen set
                        newSeen = List.walk filtered seen Set.insert

                        bfsHelper isTarget newQueue newSeen graph

                    Err KeyNotFound ->
                        bfsHelper isTarget rest seen graph

# Test DFS with multiple paths
expect
    actual = dfs (\v -> Str.startsWith v "C") "A" testGraphMultipath
    expected = Ok "Ccorrect"

    actual == expected

# Test BFS with multiple paths
expect
    actual = bfs (\v -> Str.startsWith v "C") "A" testGraphMultipath
    expected = Ok "Ccorrect"

    actual == expected

# Test DFS
expect
    actual = dfs (\v -> Str.startsWith v "F") "A" testGraphSmall
    expected = Ok "F-DFS"

    actual == expected

## Test BFS
expect
    actual = bfs (\v -> Str.startsWith v "F") "A" testGraphSmall
    expected = Ok "F-BFS"

    actual == expected

# Test NotFound DFS
expect
    actual = dfs (\v -> v == "not a node") "A" testGraphSmall
    expected = Err NotFound

    actual == expected

# Test NotFound BFS
expect
    actual = dfs (\v -> v == "not a node") "A" testGraphSmall
    expected = Err NotFound

    actual == expected

# Test DFS large
expect
    actual = dfs (\v -> v == "AE") "A" testGraphLarge
    expected = Ok "AE"

    actual == expected

## Test BFS large
expect
    actual = bfs (\v -> v == "AE") "A" testGraphLarge
    expected = Ok "AE"

    actual == expected

# Some helpers for testing
testGraphSmall =
    fromList    
        [
            ("A", ["B", "C", "F-BFS"]),
            ("B", ["D", "E"]),
            ("C", []),
            ("D", []),
            ("E", ["F-DFS"]),
            ("F-BFS", []),
            ("F-DFS", []),
        ]

testGraphLarge =
    fromList
        [
            ("A", ["B", "C", "D"]),
            ("B", ["E", "F", "G"]),
            ("C", ["H", "I", "J"]),
            ("D", ["K", "L", "M"]),
            ("E", ["N", "O"]),
            ("F", ["P", "Q"]),
            ("G", ["R", "S"]),
            ("H", ["T", "U"]),
            ("I", ["V", "W"]),
            ("J", ["X", "Y"]),
            ("K", ["Z", "AA"]),
            ("L", ["AB", "AC"]),
            ("M", ["AD", "AE"]),
            ("N", []),
            ("O", []),
            ("P", []),
            ("Q", []),
            ("R", []),
            ("S", []),
            ("T", []),
            ("U", []),
            ("V", []),
            ("W", []),
            ("X", []),
            ("Y", []),
            ("Z", []),
            ("AA", []),
            ("AB", []),
            ("AC", []),
            ("AD", []),
            ("AE", []),
        ]

testGraphMultipath =
    fromList
        [
            ("A", ["B", "Ccorrect"]),
            ("B", ["Ccorrect", "Cwrong"]),
            ("Ccorrect", []),
            ("Cwrong", []),
        ]
