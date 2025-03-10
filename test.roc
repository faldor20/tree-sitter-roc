app [main!] {
    cli: platform "https://github.com/roc-lang/basic-cli/releases/download/0.19.0/Hj-J_zxz7V9YurCSTFcFdu6cQJie4guzsPMUi5kBYUk.tar.br",
}

import cli.Stdout
import cli.Arg exposing [Arg,_weird,effctful!]
import cli.Env
import cli.Http
import cli.Dir
import cli.Utc exposing [Utc]
import cli.Path exposing [Path as Path,]
import cli.Path as Path

main! : List Arg,_ => Result {} _
main! = |args,_|

    # Get time since [Unix Epoch](https://en.wikipedia.org/wiki/Unix_time)
    start_time : Utc
    start_time = Utc.now!({})

    a=effectful!(hi)
    # Read the HELLO environment variable
    hello_env : Str
    hello_env =
        read_env_var!("HELLO")?
        |> |env_var_content|
            if Str.is_empty(env_var_content) then
                "was empty"
            else
                "was set to ${env_var_content}"

    Stdout.line!("HELLO env var ${hello_env}")?

    # Read command line arguments
    { url, output_path } = parse_args!(args)?

    Stdout.line!("Fetching content from ${url}...")?

    # Fetch the provided url using HTTP
    html_str : Str
    html_str = fetch_html!(url)?

    Stdout.line!("Saving url HTML to ${Path.display(output_path)}...")?

    # Write HTML string to a file
    Result.map_err(
        Path.write_utf8!(html_str, output_path),
        |_| FailedToWriteFile("Failed to write to file ${Path.display(output_path)}, usage: ${usage}"),
    )?

    test={a : b, c: d  }
    # Print contents of current working directory
    list_cwd_contents!({})?

    end_time : Utc
    end_time = Utc.now!({})

    run_duration = Utc.delta_as_millis(start_time, end_time)

    Stdout.line!("Run time: ${Num.to_str(run_duration)} ms")?

    Stdout.line!("Done")?

    Ok({})

parse_args! : List Arg => Result { url : Str, output_path : Path } _
parse_args! = |args|
    when List.map(args, Arg.display) is
        [_, first, second, ..] ->
            Ok({ url: first, output_path: Path.from_str(second) })

        _ ->
            Err(FailedToReadArgs("Failed to read command line arguments, usage: ${usage}"))

read_env_var! : Str => Result Str []
read_env_var! = |env_var_name|
    when Env.var!(env_var_name) is
        Ok(env_var_str) if !Str.is_empty(env_var_str) -> Ok(env_var_str)
        _ -> Ok("")

fetch_html! : Str => Result Str _
fetch_html! = |url|
    Http.get_utf8!(url)
    |> Result.map_err(|err| FailedToFetchHtml("Failed to fetch URL ${Inspect.to_str(err)}, usage: ${usage}"))

# effects need to be functions so we use the empty input type `{}`
list_cwd_contents! : {} => Result {} _
list_cwd_contents! = |_|

    dir_contents =
        Result.map_err(
            Dir.list!("."),
            |_| FailedToListCwd("Failed to list contents of current directory, usage: ${usage}"),
        )?

    contents_str =
        dir_contents
        |> List.map(Path.display)
        |> Str.join_with(",")

    Stdout.line!("Contents of current directory: ${contents_str}")
