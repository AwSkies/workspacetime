// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const getConfig = <T>(configuration: string) => vscode.workspace.getConfiguration('workspacetime').get<T>(configuration);
const timeKey = 'time';

let statusBarItem: vscode.StatusBarItem;
let workspaceState: vscode.Memento;
let interval: NodeJS.Timeout;
let running = false;
let activated = false;
let seconds: number;
let lastActivityTime: number;

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
	lastActivityTime = seconds;
	workspaceState = context.workspaceState;

	// Update activity on basically any event
	const listeners = [
		vscode.authentication.onDidChangeSessions,
		vscode.debug.onDidChangeActiveDebugSession,
		vscode.debug.onDidChangeBreakpoints,
		vscode.debug.onDidReceiveDebugSessionCustomEvent,
		vscode.debug.onDidStartDebugSession,
		vscode.debug.onDidTerminateDebugSession,
		vscode.env.onDidChangeLogLevel,
		vscode.env.onDidChangeShell,
		vscode.env.onDidChangeTelemetryEnabled,
		vscode.extensions.onDidChange,
		vscode.tasks.onDidEndTask,
		vscode.tasks.onDidEndTaskProcess,
		vscode.tasks.onDidStartTask,
		vscode.tasks.onDidStartTaskProcess,
		vscode.window.onDidChangeActiveColorTheme,
		vscode.window.onDidChangeActiveTextEditor,
		vscode.window.onDidChangeActiveNotebookEditor,
		vscode.window.onDidChangeActiveTerminal,
		vscode.window.onDidChangeNotebookEditorSelection,
		vscode.window.onDidChangeNotebookEditorVisibleRanges,
		vscode.window.onDidChangeTerminalState,
		vscode.window.onDidChangeTextEditorOptions,
		vscode.window.onDidChangeTextEditorSelection,
		vscode.window.onDidChangeTextEditorViewColumn,
		vscode.window.onDidChangeTextEditorVisibleRanges,
		vscode.window.onDidChangeVisibleNotebookEditors,
		vscode.window.onDidChangeVisibleTextEditors,
		vscode.window.onDidChangeWindowState,
		vscode.window.onDidCloseTerminal,
		vscode.window.onDidOpenTerminal,
		vscode.workspace.onDidChangeConfiguration,
		vscode.workspace.onDidChangeNotebookDocument,
		vscode.workspace.onDidChangeTextDocument,
		vscode.workspace.onDidChangeWorkspaceFolders,
		vscode.workspace.onDidCloseNotebookDocument,
		vscode.workspace.onDidCloseTextDocument,
		vscode.workspace.onDidCreateFiles,
		vscode.workspace.onDidDeleteFiles,
		vscode.workspace.onDidOpenNotebookDocument,
		vscode.workspace.onDidOpenTextDocument,
		vscode.workspace.onDidRenameFiles,
		vscode.workspace.onDidRenameFiles,
		vscode.workspace.onDidSaveNotebookDocument,
		vscode.workspace.onDidSaveTextDocument
	];
	for (const listener of listeners) {
		context.subscriptions.push(listener(e => handleActivity()));
	}

	// Only start if configured to do so
	if (getConfig<boolean>('startOnOpen')) {
		start();
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	clearInterval(interval);
}

function start() {
	statusBarItem.show();
	activated = true;
	resume();
}

function stop() {
	statusBarItem.hide();
	activated = false;
	pause();
}

function resume() {
	if (!running) {
		interval = setInterval(increment, 1000);
		running = true;
		updateText();
		console.log("Timer resumed.");
	}
}

function pause() {
	if (running) {
		clearInterval(interval);
		running = false;
		updateText();
		console.log("Timer paused.");
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
	const timedOut = seconds - lastActivityTime > getConfig<number>('idleTimeout')!;
	if (timedOut) {
		pause();
	}
	updateText();
}

function handleActivity() {
	lastActivityTime = seconds;
	if (!running && activated) {
		resume();
	}
}

function updateText() {
	statusBarItem.text = `$(${running ? 'clock' : 'debug-pause'}) ${getConfig<string>('pattern')!
		.replace('$hours', Math.floor(seconds / 3600 % 3600).toString())
		.replace('$minutes', Math.floor(seconds / 60 % 60).toString().padStart(2, '0'))
		.replace('$seconds', (seconds % 60).toString().padStart(2, '0'))
		.replace('$name', vscode.workspace.name!)}`;
}
