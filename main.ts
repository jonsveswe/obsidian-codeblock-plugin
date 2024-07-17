import { Plugin, MarkdownPostProcessorContext, MarkdownView, Notice, PluginSettingTab, App, Setting } from 'obsidian';
import * as child_process from 'child_process';
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const runButtonClass = "run-code-button";
const hasButtonClass = "has-run-code-button";

interface ExecutePythonSettings {
    pythonPath: string;
    showCodeInPreview: boolean;
    showExitCode: boolean;
}

const DEFAULT_SETTINGS: ExecutePythonSettings = {
    pythonPath: 'python',
    showCodeInPreview: true,
    showExitCode: false
}

export default class ExecutePython extends Plugin {
    settings: ExecutePythonSettings;
    tempFileId: string | undefined = undefined;
    async onload() {
        await this.loadSettings();

        this.addSettingTab(new MyPluginSettingTab(this.app, this));

        //this.registerMarkdownCodeBlockProcessor('python', this.processPythonCodeBlock.bind(this));

        this.registerMarkdownPostProcessor((element, _context) => {
			this.addRunButtons(element, _context.sourcePath);
		}); 
    }

    /**
	 * Add a button to each code block that allows the user to run the code. 
	 *
	 * @param element The parent element (i.e. the currently showed html page / note).
	 * @param file An identifier for the currently showed note
	 */
	private addRunButtons(element: HTMLElement, file: string) {
        console.log("Inside addRunButtons");
		Array.from(element.getElementsByTagName("code"))
			.forEach((codeBlock: HTMLElement) => {
                console.log("codeBlock: " + codeBlock);
                console.log("codeBlock.textContent: " + codeBlock.textContent);
                console.log("codeblock.className: " + codeBlock.className);

				const language = codeBlock.className.toLowerCase();
                console.log("language: " + language);
				if (!language || !language.contains("language-"))
					return;

				const pre = codeBlock.parentElement as HTMLPreElement;
				const parent = pre.parentElement as HTMLDivElement;

				const code = codeBlock.getText();
                console.log("parent.classList: " + parent.classList);
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
		button.classList.add(runButtonClass);
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
                await this.runPythonCode2(code);
            });
        } else if(language === "language-csharp") {
            button.addEventListener("click", async () => {
                await this.runCSharpCode(code);
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

    private async runPythonCode2(code: string){
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

    processPythonCodeBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        let noInput = source.includes("#noinput");
	    source = source.replace("#noinput\n", "");
	    source = source.replace("#noinput", "");

        if (this.settings.showCodeInPreview) {
            let codeBlock = el.createEl('pre');
            let codeElement = codeBlock.createEl('code');
            codeElement.className = "language-python";
            codeElement.textContent = source;
        }

        const outputArea = el.createEl('div', { cls: 'python-output', attr: {style: 'white-space: pre-wrap;'} });

        this.runPythonCode(source, outputArea, noInput);
    }

/*     addRunButtons(mdView: MarkdownView, el: HTMLElement) {
        el.querySelectorAll('pre.language-python').forEach((block: HTMLPreElement) => {
            let noInput = block.textContent.includes("#noinput");
            if (this.settings.showCodeInPreview) {
                let codeBlock = block.createEl('pre');
                let codeElement = codeBlock.createEl('code');
                codeElement.className = "language-python";
                codeElement.textContent = block.textContent;
            }

            const source = block.querySelector('code')?.textContent || '';
            const outputArea = block.createEl('div', { cls: 'python-output', attr: {style: 'white-space: pre-wrap;'} });

            this.runPythonCode(source, outputArea, noInput);

        });
    } */

    async runPythonCode(source: string, outputArea: HTMLElement, noInput: boolean = false) {
        console.log("Inside runPythonCode");
        outputArea.textContent = '';  // Clear the output area before each run

        let inputField;
        let submitButton;
        if (!noInput) {
            inputField = outputArea.createEl('input', { attr: {type: 'text'} });
            submitButton = outputArea.createEl('button', { text: 'Submit Input' });
        }
        let runButton = outputArea.createEl('button', { text: 'Start' });
        let resetButton = outputArea.createEl('button', { text: 'Reset' });
        let outputPre = null;
        
        let pythonProcess: child_process.ChildProcessWithoutNullStreams;
        let handleOutput: Promise<void>;

        const reset = () => {
            pythonProcess && pythonProcess.kill();
            inputField && (inputField.value = '');
            outputPre && outputArea.removeChild(outputPre);
            outputPre = null;
        };

        const run = async () => {
            // Spawn a new process to run the Python code. The '-u' flag specifies that the output should be unbuffered, and '-c' specifies that the following argument should be treated as a command to be executed.
            // The `this.settings.pythonPath` is the path to the Python executable that should be used to run the code.
            // The `source` argument is the code to be executed.
            pythonProcess = child_process.spawn(this.settings.pythonPath, ['-u', '-c', source]);
            console.log("this.settings.pythonPath: ", this.settings.pythonPath)// python

            const submitInput = () => {
                pythonProcess.stdin.write(inputField.value + "\n");
                inputField.value = '';
            };

            if (!noInput) {
                submitButton.addEventListener('click', submitInput);
                inputField.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        submitInput();
                    }
                });
            }

            handleOutput = new Promise((resolve, reject) => {
                pythonProcess.stdout.on('data', (data) => {
                    if (!outputPre) {
                        outputPre = outputArea.createEl('pre');
                    }
                    outputPre.append(data.toString());
                });

                pythonProcess.stderr.on('data', (data) => {
                    if (!outputPre) {
                        outputPre = outputArea.createEl('pre');
                    }
                    outputPre.append(`Error: ${data}`);
                });

                pythonProcess.on('close', (code) => {
                    if (this.settings.showExitCode) {
                        if (!outputPre) {
                            outputPre = outputArea.createEl('pre');
                        }
                        outputPre.append(`\nPython exited with code: ${code}`);
                    }
                    resolve();
                });

                pythonProcess.on('error', (err) => {
                    reject(err);
                });
            });

            try {
                await handleOutput;
            } catch (err) {
                if (!outputPre) {
                    outputPre = outputArea.createEl('pre');
                }
                outputPre.append(`\nAn error occurred: ${err}`);
            }
        };

        runButton.addEventListener('click', run);
        resetButton.addEventListener('click', reset);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class MyPluginSettingTab extends PluginSettingTab {
    plugin: ExecutePython;

    constructor(app: App, plugin: ExecutePython) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;

        containerEl.empty();
        new Setting(containerEl)
            .setName('Python')
            .setDesc('The command used to invoke Python on your system. (ex. python or python3)')
            .addText(text => text
                .setValue(this.plugin.settings.pythonPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Toggle code snippet')
            .setDesc('Always show or hide Python code in the markdown preview.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showCodeInPreview)
                .onChange(async (value) => {
                    this.plugin.settings.showCodeInPreview = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show exit code')
            .setDesc('Toggle whether to show the exit code message after code execution.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showExitCode)
                .onChange(async (value) => {
                    this.plugin.settings.showExitCode = value;
                    await this.plugin.saveSettings();
                }));
    }
}