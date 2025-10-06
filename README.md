WebWise 

AI-Powered Baseline Compatibility Checker

Overview
WebWise is a Visual Studio Code extension that helps web developers instantly check whether CSS, JavaScript, and HTML features are baseline-compatible across major browsers. It integrates real-time diagnostics, AI-powered recommendations, and quick fixes directly into the developer workflow.
How It Works
Architecture
WebWise uses a hybrid client-server architecture:

VS Code Extension (Frontend): Provides real-time diagnostics, code actions, and developer commands
Node.js Backend: Serves baseline compatibility data and AI-generated alternatives
Data Sources:

web-features npm package for official baseline status
Google Gemini AI for intelligent suggestions and alternatives



Key Components
1. Real-Time Diagnostics

Pattern Matching: Uses a curated syntax-to-feature mapping to detect non-baseline features as you type
Caching Strategy: Loads all non-baseline features from backend at startup (531 features), stores in memory for instant lookups
Visual Feedback: Yellow squiggly underlines appear under non-baseline features with informative hover tooltips

2. Quick Fixes (Code Actions)

Lightbulb appears when cursor is on a non-baseline feature
Provides actionable alternatives via AI
One-click access to detailed recommendations

3. AI Integration

Backend queries Google Gemini AI for contextual alternatives
Generates practical fallback strategies
Provides timeline estimates for when features will become baseline

4. File Analysis

Scans entire files for all web features used
Generates comprehensive reports showing baseline vs non-baseline usage
Helps teams audit codebases before production

Technical Implementation
Syntax-to-Feature Mapping
The extension maintains a curated mapping of CSS/JS syntax patterns to web-features IDs:
':has(' → 'css-has'
'container-type' → 'css-container-queries'
'@layer' → 'css-cascade-layers'

Hybrid Caching Strategy
At Extension Startup:

Extension requests /api/all-features from backend
Backend queries web-features package for all 531 non-baseline features
Extension caches feature IDs in memory
Fallback: Uses 6 common features if backend unavailable

Commands

WebWise: Check Feature - Analyze a specific feature or selected code
WebWise: Analyze File - Scan entire file for all features
WebWise: Refresh Cache - Reload baseline data from backend

Technology Stack

Frontend: TypeScript, VS Code Extension API
Backend: Node.js, Express, TypeScript
Data: web-features npm package (official baseline data)
AI: Google Gemini API
Real-time Detection: Pattern matching + in-memory caching

