import * as vscode from 'vscode';
import * as http from 'http';

// Mapping of CSS/JS syntax patterns to web-features IDs
const SYNTAX_TO_FEATURE: { [pattern: string]: { featureId: string, length: number } } = {
    // CSS Selectors
    ':has(': { featureId: 'has', length: 5 },
    ':is(': { featureId: 'is', length: 4 },
    ':where(': { featureId: 'where', length: 7 },
    
    // Container Queries
    'container-type': { featureId: 'container-queries', length: 14 },
    'container-name': { featureId: 'container-queries', length: 14 },
    '@container': { featureId: 'container-queries', length: 10 },
    
    // Scroll & View Animations
    'view-timeline': { featureId: 'scroll-driven-animations', length: 13 },
    'scroll-timeline': { featureId: 'scroll-driven-animations', length: 15 },
    'animation-timeline': { featureId: 'scroll-driven-animations', length: 18 },
    
    // Anchor Positioning
    'anchor(': { featureId: 'anchor-positioning', length: 7 },
    'anchor-name': { featureId: 'anchor-positioning', length: 11 },
    
    // Cascade Layers
    '@layer': { featureId: 'cascade-layers', length: 6 },
    
    // Nesting
    '&': { featureId: 'nesting', length: 1 }, 
    
    // Starting Style
    '@starting-style': { featureId: 'starting-style', length: 15 },
    
    // Subgrid
    'subgrid': { featureId: 'subgrid', length: 7 },
    
    // Color Functions
    'color-mix(': { featureId: 'color-mix', length: 10 },
    'color(': { featureId: 'color-function', length: 6 },
    
    // Logical Properties 
    'inset-block': { featureId: 'logical-properties', length: 11 },
    'inset-inline': { featureId: 'logical-properties', length: 12 },
    
    // JavaScript APIs
    '<dialog': { featureId: 'dialog', length: 7 },
    'popover': { featureId: 'popover', length: 7 },
};

function makeRequest(url: string, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(options.body);
        
        const req = http.request('http://localhost:3000/api/check-baseline', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function extractFeatureFromSelection(selectedText: string): string {
    const text = selectedText.toLowerCase().trim();
    
    const featureMap: { [key: string]: string } = {
        'display: flex': 'flexbox',
        'display: grid': 'grid',
        'display:flex': 'flexbox',
        'display:grid': 'grid',
        'container-type': 'container-queries',
        'container-query': 'container-queries',
        ':has(': 'has',
        ':has ': 'has',
        'view-timeline': 'scroll-driven-animations',
        'aspect-ratio': 'aspect-ratio',
        'serviceworker': 'service-worker',
        'service worker': 'service-worker',
        '<dialog': 'dialog',
        'dialog': 'dialog',
        'fetch(': 'fetch',
        '@container': 'container-queries'
    };
    
    for (const [pattern, feature] of Object.entries(featureMap)) {
        if (text.includes(pattern)) {
            return feature;
        }
    }
    
    return selectedText.trim();
}

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('WebWise');
    outputChannel.appendLine('WebWise extension is now active!');


    async function analyzeFeatureWithFeedback(feature: string) {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `🔍 Checking ${feature}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Querying database..." });
            
            try {
                const result = await makeRequest('http://localhost:3000/api/check-baseline', {
                    body: { feature: feature.trim() }
                });
                
                progress.report({ message: "Getting AI insights..." });
                
                const icon = result.isBaseline ? '✅' : '⚠️';
                const status = result.isBaseline ? 'SAFE TO USE' : 'NEEDS ATTENTION';
                const message = `${icon} ${feature.toUpperCase()}: ${status}`;
                
                if (result.isBaseline) {
                    vscode.window.showInformationMessage(message, 'View Details').then(selection => {
                        if (selection === 'View Details') {
                            outputChannel.show();
                        }
                    });
                } else {
                    vscode.window.showWarningMessage(message, 'Show Alternatives').then(selection => {
                        if (selection === 'Show Alternatives') {
                            outputChannel.show();
                            if (result.aiSuggestion) {
                                vscode.window.showInformationMessage(`💡 Try: ${result.aiSuggestion.alternatives[0]}`);
                            }
                        }
                    });
                }
                
                return result;
                
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Failed to check ${feature}. Is the backend running?`, 'Retry', 'View Logs').then(selection => {
                    if (selection === 'View Logs') {
                        outputChannel.show();
                    }
                });
                throw error;
            }
        });
    }

    function extractFeaturesFromText(text: string): string[] {
        const features = new Set<string>();
        
        const cssPatterns = [
            /display:\s*(flex|grid|inline-flex)/g,
            /container-type:/g,
            /:has\(/g,
            /view-timeline:/g,
            /@container/g,
            /aspect-ratio:/g
        ];
        
        const jsPatterns = [
            /serviceWorker/g,
            /fetch\(/g,
            /querySelector.*:has/g,
            /<dialog/g
        ];
        
        cssPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (match.includes('flex')) features.add('flexbox');
                    if (match.includes('grid')) features.add('grid');
                    if (match.includes('container-type')) features.add('container-queries');
                    if (match.includes(':has')) features.add('has');
                    if (match.includes('view-timeline')) features.add('scroll-driven-animations');
                    if (match.includes('@container')) features.add('container-queries');
                    if (match.includes('aspect-ratio')) features.add('aspect-ratio');
                });
            }
        });
        
        jsPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (match.includes('serviceWorker')) features.add('service-worker');
                    if (match.includes('fetch')) features.add('fetch');
                    if (match.includes('dialog')) features.add('dialog');
                });
            }
        });
        
        return Array.from(features);
    }

    let disposable = vscode.commands.registerCommand('webwise.checkFeature', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        let feature: string;
        if (selectedText) {
            feature = extractFeatureFromSelection(selectedText);
            if (feature !== selectedText.trim()) {
                vscode.window.showInformationMessage(`🎯 Detected: ${feature} (from "${selectedText.trim()}")`);
            }
        } else {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter CSS/JS feature to check (e.g., flexbox, css-grid)',
                placeHolder: 'flexbox'
            });
            if (!input) return;
            feature = input;
        }

        if (!feature) return;

        try {
            const result = await analyzeFeatureWithFeedback(feature); 
            
            outputChannel.appendLine(`Feature: ${feature}`);
            outputChannel.appendLine(`Baseline: ${result.isBaseline}`);
            outputChannel.appendLine(`Status: ${result.status}`);
            outputChannel.appendLine(`Description: ${result.description}`);
            
            if (result.aiSuggestion) {
                outputChannel.appendLine(`\n🤖 AI Suggestions:`);
                outputChannel.appendLine(`Explanation: ${result.aiSuggestion.explanation}`);
                outputChannel.appendLine(`Alternatives:`);
                result.aiSuggestion.alternatives.forEach((alt: string, index: number) => {
                    outputChannel.appendLine(`  ${index + 1}. ${alt}`);
                });
                outputChannel.appendLine(`Timeline: ${result.aiSuggestion.timeline}`);
            }
            outputChannel.appendLine('---');
            
        } catch (error) {
            // Error handling is done in analyzeFeatureWithFeedback
        }
    });

    let analyzeFileCommand = vscode.commands.registerCommand('webwise.analyzeFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        const text = document.getText();
        
        const features = extractFeaturesFromText(text);
        
        if (features.length === 0) {
            vscode.window.showInformationMessage('No web features detected in this file');
            return;
        }

        vscode.window.showInformationMessage(`🔍 Analyzing ${features.length} features...`);

        const results = [];
        for (const feature of features) {
            try {
                const result = await makeRequest('http://localhost:3000/api/check-baseline', {
                    body: { feature: feature.trim() }
                });
                results.push({ feature, result });
            } catch (error) {
                results.push({ feature, result: { error: 'Failed to check' } });
            }
        }

        const baselineCount = results.filter(r => r.result.isBaseline).length;
        const nonBaselineCount = results.length - baselineCount;
        
        vscode.window.showInformationMessage(
            `📊 Analysis complete: ${baselineCount} ✅ baseline, ${nonBaselineCount} ⚠️ need attention`
        );

        outputChannel.appendLine(`\n🔍 FILE ANALYSIS RESULTS:`);
        outputChannel.appendLine(`File: ${document.fileName}`);
        outputChannel.appendLine(`Features analyzed: ${results.length}`);
        outputChannel.appendLine('---');
        
        results.forEach(({ feature, result }) => {
            if (result.error) {
                outputChannel.appendLine(`❌ ${feature}: Error checking`);
            } else {
                const icon = result.isBaseline ? '✅' : '⚠️';
                outputChannel.appendLine(`${icon} ${feature}: ${result.isBaseline ? 'Baseline Safe' : 'Not Baseline'}`);
                if (result.aiSuggestion) {
                    outputChannel.appendLine(`   💡 ${result.aiSuggestion.explanation}`);
                }
            }
        });
        outputChannel.appendLine('===');
    });

    
    // Cache for non-baseline features
    const nonBaselineFeatures = new Set<string>();
    let cacheLoaded = false;

    // Load baseline data from backend at startup
    async function loadBaselineCache() {
        try {
            outputChannel.appendLine('Loading baseline data from backend...');
            
            const req = http.request('http://localhost:3000/api/all-features', {
                method: 'GET'
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        // Cache non-baseline feature IDs
                        response.features.forEach((feature: any) => {
                            if (!feature.isBaseline) {
                                nonBaselineFeatures.add(feature.id);
                            }
                        });
                        
                        cacheLoaded = true;
                        outputChannel.appendLine(`Loaded ${nonBaselineFeatures.size} non-baseline features from backend`);
                        
                        // Update diagnostics for open documents
                        if (vscode.window.activeTextEditor) {
                            updateDiagnostics(vscode.window.activeTextEditor.document);
                        }
                    } catch (error) {
                        outputChannel.appendLine('Failed to parse baseline data, using fallback');
                        useFallbackCache();
                    }
                });
            });
            
            req.on('error', (error) => {
                outputChannel.appendLine(`Backend unavailable: ${error}`);
                useFallbackCache();
            });
            
            req.end();
            
        } catch (error) {
            outputChannel.appendLine('Failed to load baseline data');
            useFallbackCache();
        }
    }
    
    // Fallback: use common non-baseline features if backend is unavailable
    function useFallbackCache() {
        const fallbackFeatures = [
            'has', 'container-queries', 'scroll-driven-animations',
            'anchor-positioning', 'starting-style', 'cascade-layers'
        ];
        fallbackFeatures.forEach(f => nonBaselineFeatures.add(f));
        cacheLoaded = true;
        outputChannel.appendLine(`Using fallback cache with ${nonBaselineFeatures.size} features`);
    }

    // Initialize cache
    loadBaselineCache();

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('webwise');

   function updateDiagnostics(document: vscode.TextDocument) {
    if (!cacheLoaded) {
        return;
    }
    
    if (document.languageId !== 'css' && document.languageId !== 'javascript' && 
        document.languageId !== 'typescript' && document.languageId !== 'html') {
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
        // NO console.log here - too much output
        for (const [pattern, { featureId, length }] of Object.entries(SYNTAX_TO_FEATURE)) {
            if (line.includes(pattern) && nonBaselineFeatures.has(featureId)) {
                const index = line.indexOf(pattern);
                const range = new vscode.Range(lineIndex, index, lineIndex, index + length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `${featureId} is not baseline yet. Use Quick Fix for alternatives.`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.code = 'webwise-non-baseline';
                diagnostic.source = 'WebWise';
                diagnostics.push(diagnostic);
            }
        }
    });
    
    diagnosticCollection.set(document.uri, diagnostics);
}

    // Code Actions Provider
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        
        ['css', 'javascript', 'typescript', 'html'],
        {
            provideCodeActions(document, range, context) {
                console.log('here')
                const codeActions: vscode.CodeAction[] = [];
                const line = document.lineAt(range.start.line);
                const lineText = line.text;
                
                // Check all patterns dynamically
                for (const [pattern, { featureId }] of Object.entries(SYNTAX_TO_FEATURE)) {
                    if (lineText.includes(pattern) && nonBaselineFeatures.has(featureId)) {
                        const action = new vscode.CodeAction(
                            `💡 Show alternatives for ${featureId}`,
                            vscode.CodeActionKind.QuickFix
                        );
                        action.command = {
                            command: 'webwise.showAlternatives',
                            title: 'Show alternatives',
                            arguments: [featureId]
                        };
                        codeActions.push(action);
                    }
                }
                
                return codeActions;
            }
        }
    );

    // Single generic command handler
    let showAlternativesCommand = vscode.commands.registerCommand(
        'webwise.showAlternatives',
        async (feature: string) => {
            try {
                const result = await makeRequest('http://localhost:3000/api/check-baseline', {
                    body: { feature: feature }
                });
                
                if (result.aiSuggestion) {
                    vscode.window.showInformationMessage(`💡 ${result.aiSuggestion.alternatives[0]}`);

                    outputChannel.appendLine(`AI Analysis for ${feature}:`);
                    outputChannel.appendLine(`${result.aiSuggestion.explanation}`);
                    outputChannel.appendLine(`\nAlternatives:`);
                    result.aiSuggestion.alternatives.forEach((alt: string) => {
                        outputChannel.appendLine(`- ${alt}`);
                    });
                    outputChannel.appendLine(`\nTimeline: ${result.aiSuggestion.timeline}`);
                    outputChannel.appendLine('---');
                    outputChannel.show();
                }
            } catch (error) {
                vscode.window.showErrorMessage('Failed to get alternatives');
            }
        }
    );
    
    // Refresh cache command
    let refreshCacheCommand = vscode.commands.registerCommand('webwise.refreshCache', async () => {
        nonBaselineFeatures.clear();
        cacheLoaded = false;
        await loadBaselineCache();
        vscode.window.showInformationMessage('WebWise: Baseline data refreshed!');
    });

    // Document change listeners
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document)),
        vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                updateDiagnostics(editor.document);
            }
        }),
        diagnosticCollection,
        disposable,
        analyzeFileCommand,
        codeActionProvider,
        showAlternativesCommand,
        refreshCacheCommand
    );

    // Update diagnostics for currently open document
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }
}


export function deactivate() {}