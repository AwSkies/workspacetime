// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const config = vscode.workspace.getConfiguration('workspacetime');
const timeKey = 'time';

let statusBarItem: vscode.StatusBarItem;
let workspaceState: vscode.Memento;
let interval: NodeJS.Timeout;
let running = false;
let seconds: number;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Do not activate if no workspace is selected
	if (vscode.workspace.name === undefined) {
		return;
	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Starting WorkspaceTime...');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('workspacetime.start', start));
	context.subscriptions.push(vscode.commands.registerCommand('workspacetime.resume', resume));
	context.subscriptions.push(vscode.commands.registerCommand('workspacetime.stop', stop));
	context.subscriptions.push(vscode.commands.registerCommand('workspacetime.pause', pause));
	context.subscriptions.push(vscode.commands.registerCommand('workspacetime.toggle', toggle));
	context.subscriptions.push(vscode.commands.registerCommand('workspacetime.reset', reset));

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	statusBarItem.command = 'workspacetime.toggle';
	context.subscriptions.push(statusBarItem);

	seconds = context.workspaceState.get<number>(timeKey) ?? 0;

	workspaceState = context.workspaceState;
	start();
}

// This method is called when your extension is deactivated
export function deactivate() {
	clearInterval(interval);
}

function start() {
	statusBarItem.show();
	resume();
}

function stop() {
	statusBarItem.hide();
	pause();
}

function resume() {
	if (!running) {
		interval = setInterval(increment, 1000);
		running = true;
		updateText();
		console.log("Timer resumed.");
	} else {
		vscode.window.showErrorMessage("Timer is already running.");
	}
}

function pause() {
	if (running) {
		clearInterval(interval);
		running = false;
		updateText();
		console.log("Timer paused.");
	} else {
		vscode.window.showErrorMessage("Timer is not currently running.");
	}
}

function toggle() {
	(running ? pause : resume)();
}

function reset() {
	seconds = 0;
	workspaceState.update(timeKey, 0);
	updateText();
}

function increment() {
	seconds++;
	workspaceState.update(timeKey, seconds);
	updateText();
}

function updateText() {
	statusBarItem.text = `$(${running ? 'clock' : 'debug-pause'}) ${config.get<string>('pattern')!
		.replace('$hours', Math.floor(seconds / 3600 % 3600).toString())
		.replace('$minutes', Math.floor(seconds / 60 % 60).toString().padStart(2, '0'))
		.replace('$seconds', (seconds % 60).toString().padStart(2, '0'))
		.replace('$name', vscode.workspace.name!)}`;
}
