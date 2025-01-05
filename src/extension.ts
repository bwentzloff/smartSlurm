import * as vscode from 'vscode';
import axios from 'axios';

async function fetchSlurmParameters(scriptContent: string): Promise<string> {
    const apiUrl = 'https://api.openai.com/v1/chat/completions'; 
	const configuration = vscode.workspace.getConfiguration('slurmParamGenerator');
    const apiKey = configuration.get<string>('apiKey');

	if (!apiKey) {
        vscode.window.showErrorMessage('API key not configured. Please set it in the extension settings.');
        return '';
    }

    try {
        const response = await axios.post(
            apiUrl,
            {
                model: 'gpt-3.5-turbo',
    messages: [
        {
            role: 'user',
            content: `
Analyze the following bash script and predict the optimal Slurm parameters for memory, time, and CPUs. 
Provide the result in this exact format:
#SBATCH --time=<time>
#SBATCH --mem=<memory>
#SBATCH --cpus-per-task=<cpus>

Bash Script:
${scriptContent}`
        }
    ],
    max_tokens: 150,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
		const err = error as Error;
		vscode.window.showErrorMessage(`Failed to fetch Slurm parameters: ${err.message}`);
		return '';
	}	
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.generateSlurmParams', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found.');
            return;
        }

        const document = editor.document;
        const scriptContent = document.getText();

        vscode.window.showInformationMessage('Generating Slurm parameters...');
        const slurmParams = await fetchSlurmParameters(scriptContent);

        if (slurmParams) {
            editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), `# Predicted Slurm Parameters:\n${slurmParams}\n\n`);
            });
            vscode.window.showInformationMessage('Slurm parameters added to the script.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
