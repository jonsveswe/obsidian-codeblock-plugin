
# Obsidian code block plugin

NOTE: DO NOT USE. Plugin only used for my testing. Use the one under references below. 

You can choose to add a run button to the code block:

````
```js #run
console.log("Hello");
```
````

Clicking the button will output the result in the Console in dev tools `ctrl+shift+I`.

Supported languages:
- Javascript (js)
- Typescript (ts)
  - Install Node.js. Run in command line `npm install typescript -g` and `npm install ts-node -g`. (`-g` means global install)
- Python (python)
  - Python installed globally and added to PATH.
- C# (csharp)
  - Install dotnet core sdk https://dotnet.microsoft.com/en-us/download and run in command line `dotnet tool install -g dotnet-script`. Path to script is hardcoded in the code `let csharpPath = "C:/Users/xyz/.dotnet/tools/dotnet-script.exe";`.

:warning: NOTE: only run code you understand and trust. The code in the code block will have access to your entire computer and file system! :warning:

use the plugin by doing `npm run build`, then copy `main.js manifest.json styles.css` to the plugin folder.

## References
I used these as a template and stripped down and changed the code. Use the first one for a much more complete solution. 
- https://github.com/twibiral/obsidian-execute-code
- https://github.com/WilliamEchols/obsidian-execute-python
- https://github.com/obsidianmd/obsidian-sample-plugin

