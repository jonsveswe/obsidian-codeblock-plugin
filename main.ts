import { Plugin, MarkdownPostProcessorContext, MarkdownView, Notice, PluginSettingTab, App, Setting } from 'obsidian';
import * as child_process from 'child_process';

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
        } else {

        }
    }
    private async runJavascriptCode(code: string){
        console.log("Inside runCode");
        console.log("code: " + code);
        try {
            new Function(code)();
          } catch (err) {
            console.error(err);
        }
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
            pythonProcess = child_process.spawn(this.settings.pythonPath, ['-u', '-c', source]);

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