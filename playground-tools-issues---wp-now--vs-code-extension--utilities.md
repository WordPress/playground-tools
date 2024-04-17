---
name: Playground Tools issues - wp-now, VS Code extension, utilities
about: Did a tool not work the way you want it to? Let us know!
title: Report an issue in the Playground Tools repo
labels: bug
assignees: ''

---

## First make sure that you search for related issues in the `Playground Tools` repo's [issues](https://github.com/WordPress/playground-tools/issues)

if not found...

## Describe the issue
Please provide a clear and concise description, including step by step instructions to get to the error case you have found. This will include providing info on the configuring, tool, and environmental information. 

## To reproduce behavior
Steps to reproduce the behavior:
1. Enter the tool you are using, and context
2. What mode did you boot Playground in?
3. What specifically were you attempting to do?
4. Show errors from development environment and what you see on the Playground instance

**Expected behavior**
A clear and concise description of what you expected to happen.

## Blueprint or no?
Did you send a custom blueprint to the instance, or just boot up as-is?
<!-- 

Yes, I used a custom blueprint: 
- link to blueprint URL (GitHub, SVN, publicly accessible link)
- or replace these lines with Blueprint code attached from below

No - I went to a URL pointing to a fragment on playground.wordpress.net 
If you didn't use a custom blueprint: 
- write no custom blueprint and
- explain user flow for how you got to this link
- Please link to the Issue, Pull Request, or discussion around the link with fragment


-->

## What protocol is used with the blueprint?
Query API: https://wordpress.github.io/wordpress-playground/apis-overview#query-api
JavaScript API: https://wordpress.github.io/wordpress-playground/apis-overview#javascript-api
PR Previewer - Look in `./testing/PROP.md` for more info

## paste blueprint as `JSON` code below
The best practice is to copy directly from the code editor, this will retain formatting and readibility in most cases. 

If there are formatting issues, you can use a `JSON` code formatter like https://jsonformatter.org/
Please copy/paste your blueprint from a code editor, which will retain spacing

Once copy pasted below, you can delete all of these instructions. 
It should be just the the `JSON` code directly below the bold sub-section above.
<!--

```JSON

```

-->

If you chose **No** above - you did not have a blueprint...
Please delete the entire previous section to help keep the issue clean.

## Screenshots or screen recording
If applicable, add screenshots to help explain your problem.

**Hint:** To avoid showing your system information, use a tool like [Oh My Zsh!](https://ohmyz.sh/) to hide the folder directory structure if you don't want to send this info

It can be helpful to show the directory structure for certain issues, use your discretion here.

## Error reporting
You can use the [Site Health](https://wordpress.org/documentation/article/site-health-screen/) screen to 
 - submit WordPress environment info
 - submit local system info

You can use the Playground menu to `Report error`, which will automaticlly send some information and submit to the `#playground-logs` Channel on Making WordPress Slack.


## Include Console errors
<!-- - 
Copy/paste the error into this section 

-->
Please include the error you see in the console in a code block. 


## Environmental info 
Please complete the following information
 - OS: [e.g. `'nix'`, 'MacOS', 'Windows' or the exact platform build]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
