import { Plugin, MarkdownPostProcessorContext, MarkdownView, Notice, PluginSettingTab, App, Setting } from 'obsidian';
import * as child_process from 'child_process';
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const RUN_BUTTON_CLASS = "run-code-button";

export default class RunCodeblockPlugin extends Plugin {
    tempFileId: string | undefined = undefined;
    async onload() {
        console.log('loading plugin');
        this.registerMarkdownPostProcessor((element, context) => {
			this.addRunButtons(element, context);
		}); 
    }


	/**
	 * Add a button to each code block that allows the user to run the code.
	 *
	 * @param {HTMLElement} element - The individual div element on the page. The div can have a heading <h1>, a <p>, a <pre>, etc. So addRunButtons will be called for each <div> on page.
	 * @param {MarkdownPostProcessorContext} context - The context of the markdown post-processor.
	 */
	private addRunButtons(element: HTMLElement, context: MarkdownPostProcessorContext) {
        console.log("Inside addRunButtons");
        console.log("element: ", element);
		element.querySelectorAll("pre > code") // Triple ticks ``` ``` (fenced code) create <pre><code> tags. Inline single ticks ` ` only create <code> tag. 
			.forEach((codeBlock: HTMLElement) => {
                console.log("codeBlock: ", codeBlock);
                console.log("codeBlock.textContent: ", codeBlock.textContent);
                console.log("codeblock.className: ", codeBlock.className);
                console.log("codeblock.classList: ", codeBlock.classList);

				const language = codeBlock.className.toLowerCase();
                console.log("language: " + language);
				if (!language || !language.contains("language-"))
					return;

				let code = codeBlock.getText();
                console.log("code: " + code);

                /*
                codeBlock.getText() returns only the code, so we can't access the first line in the codeblock. 
                context.getSectionInfo(codeBlock) is an object that will have everyting in the "text" property, not just the code, 
                from the whole note. Must use "lineEnd" and "lineStart" properties to get text only for current element.
                Example of what context.getSectionInfo(codeBlock) returns:
                {
                    "text": "\n```python #norun\nprint(\"hgg, !\")\n```\n\n# Headline\n\n\n```python\nprint(\"Hello, Worldasdasd!\")\n```\n\n\t",
                    "lineStart": 8,
                    "lineEnd": 10
                } 
                */
                console.log("context.getSectionInfo(codeBlock): ", context.getSectionInfo(codeBlock));
                const sectionInfoLineStart = context.getSectionInfo(codeBlock)?.lineStart;
                const sectionInfoText = context.getSectionInfo(codeBlock)?.text;
                const firstLineOfCurrentCodeBlock = sectionInfoText?.split('\n')[sectionInfoLineStart ?? 0] ?? "";
                console.log("firstLineOfCurrentCodeBlock: ", firstLineOfCurrentCodeBlock);
                if (!firstLineOfCurrentCodeBlock.includes("#run")) {
                    console.log("Codeblock doesn't contain #run. Not adding run button.");
                    return;                    
                }

				const pre = codeBlock.parentElement as HTMLPreElement;
				//const parent = pre.parentElement as HTMLDivElement;
                console.log(pre);
                //console.log(parent);

                //console.log("parent.classList: " + parent.classList);
                const button = this.createRunButton();
                pre.appendChild(button);
                this.addListenerToButton(language, code, button);
			});
	}
    	/**
	 * Creates a new run button and returns it.
	 *
	 * @returns { HTMLButtonElement } The newly created run button.
	 */
	private createRunButton() {
		console.log("Add run button");
		const button = document.createElement("button");
		button.classList.add(RUN_BUTTON_CLASS);
		button.setText("Run");
		return button;
	}

    private addListenerToButton(language: string, code: string, button: HTMLButtonElement) {
		if (language === "language-js") {
			button.addEventListener("click", async () => {
                await this.runJavascriptCode(code);
            });
        } else if(language === "language-python") {
            button.addEventListener("click", async () => {
                await this.runPythonCode(code);
            });
        } else if(language === "language-csharp") {
            button.addEventListener("click", async () => {
                await this.runCSharpCode(code);
            });
        } else if(language === "language-ts") {
            button.addEventListener("click", async () => {
                await this.runTypeScriptCode(code);
            });
        }
    }
    private async runJavascriptCode(code: string){
        console.log("Inside runJavascriptCode");
        console.log("code: " + code);
        try {
            new Function(code)();
          } catch (err) {
            console.error(err);
        }
    }

    private async runPythonCode(code: string){
        console.log("Inside runPythonCode");
        console.log("code: " + code);
        let pythonProcess: child_process.ChildProcessWithoutNullStreams;
        let handleOutput: Promise<void>;
        let pythonPath = "python"; // Needs to have Python installed globally and added to PATH. For example, C:\Users\jonas.svensson\AppData\Local\Programs\Python\Python39\python.exe
        pythonProcess = child_process.spawn(pythonPath, ['-u', '-c', code]);

        handleOutput = new Promise((resolve, reject) => {
            pythonProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
            pythonProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });
            pythonProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                resolve();
            });
        });
        try {
            await handleOutput;
          } catch (err) {
            console.error(err);
        }
    }
    private async runCSharpCode(code: string){
        console.log("Inside runCSharpCode");
        console.log("code: " + code);
        let csharpProcess: child_process.ChildProcessWithoutNullStreams;
        let handleOutput: Promise<void>;
        let csharpPath = "C:/Users/jonas.svensson/.dotnet/tools/dotnet-script.exe"; // install dotnet core sdk https://dotnet.microsoft.com/en-us/download and run in command line "dotnet tool install -g dotnet-script"
        //let cmd = `C:/Users/jonas.svensson/.dotnet/tools/dotnet-script.exe`;
        const tempFileName = this.getTempFile("csx"); // C:\Users\JONAS~1.SVE\AppData\Local\Temp\temp_1721227658357.csx
        //let tempFileName = "C:/tempfile.csx";
        let args = [tempFileName];
        fs.writeFileSync(tempFileName, code);
        console.log("csharpPath: ", csharpPath);
        console.log("args: ", args);
        console.log("env: ", process.env);
        console.log("tempFileName: ", tempFileName);
        // Spawn a new process to run the C# code using the dotnet-script CLI tool.
        // The `csharpPath` is the path to the dotnet-script CLI tool that should be used to run the code.
        // args[0] have the file path to the C# code.
        csharpProcess = child_process.spawn(csharpPath, args, { env: process.env, shell: true });
        handleOutput = new Promise((resolve, reject) => {
            csharpProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
            csharpProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });
            csharpProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                this.tempFileId = undefined; // Reset the file id to use a new file next time
                resolve();
            });
        });
        try {
            await handleOutput;
          } catch (err) {
            console.error(err);
        }
    }

    private async runTypeScriptCode(code: string){
        console.log("Inside runTypeScriptCode");
        console.log("code: " + code);
        let typeScriptProcess: child_process.ChildProcessWithoutNullStreams;
        let handleOutput: Promise<void>;
        let typeScriptPath = "ts-node"; // Requirements: Node.js installed then run in command line `npm install typescript -g` and `npm install ts-node -g`. (`-g` means global install)
        //let cmd = `C:/Users/jonas.svensson/.dotnet/tools/dotnet-script.exe`;
        const tempFileName = this.getTempFile("ts"); // C:\Users\JONAS~1.SVE\AppData\Local\Temp\temp_1721227658357.csx
        //let tempFileName = "C:/tempfile.csx";
        let args = [tempFileName];
        fs.writeFileSync(tempFileName, code);
        console.log("csharpPath: ", typeScriptPath);
        console.log("args: ", args);
        console.log("env: ", process.env);
        console.log("tempFileName: ", tempFileName);
        // Spawn a new process to run the C# code using the dotnet-script CLI tool.
        // The `csharpPath` is the path to the dotnet-script CLI tool that should be used to run the code.
        // args[0] have the file path to the C# code.
        typeScriptProcess = child_process.spawn(typeScriptPath, args, { env: process.env, shell: true });
        handleOutput = new Promise((resolve, reject) => {
            typeScriptProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
            typeScriptProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });
            typeScriptProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                this.tempFileId = undefined; // Reset the file id to use a new file next time
                resolve();
            });
        });
        try {
            await handleOutput;
          } catch (err) {
            console.error(err);
        }
    }

	/**
	 * Creates a new unique file name for the given file extension. The file path is set to the temp path of the os.
	 * The file name is the current timestamp: '/{temp_dir}/temp_{timestamp}.{file_extension}'
	 * this.tempFileId will be updated, accessible to other methods
	 * Once finished using this value, remember to set it to undefined to generate a new file
	 *
	 * @param ext The file extension. Should correspond to the language of the code.
	 * @returns The temporary file path
	 */
	private getTempFile(ext: string) {
		if (this.tempFileId === undefined)
			this.tempFileId = Date.now().toString();
		console.log("temp file: ", path.join(os.tmpdir(), `temp_${this.tempFileId}.${ext}`));
		return path.join(os.tmpdir(), `temp_${this.tempFileId}.${ext}`);
	}

    onunload() {

		document
			.querySelectorAll("." + RUN_BUTTON_CLASS)
			.forEach((button: HTMLButtonElement) => button.remove());

		console.log("Unloaded plugin. Removed all run buttons.");
	}
}