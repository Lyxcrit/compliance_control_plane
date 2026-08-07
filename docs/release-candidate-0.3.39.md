# Release Candidate 0.3.39

- Removed the JavaScript token handoff from Check Detail.
- Requirements now uses a documented Simple XML row drilldown with `target="blank"`.
- The destination receives `form.framework_token` and `form.requirement_token` directly from the clicked row.
- Kept the raw framework and requirement keys in the search result while hiding them from the displayed table using `<fields>`.
- Removed destination-side framework token unsets that could erase URL-provided requirement values during initialization.
