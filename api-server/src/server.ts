import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BaselineService } from './services/baseline-service';
import { AIService } from './services/ai-service';
import { features } from 'web-features';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const baselineService = new BaselineService();
const aiService = new AIService();

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});


app.post('/api/check-baseline', async (req: Request, res: Response) => {
  const { feature } = req.body;
  
  if (!feature) {
    return res.status(400).json({ error: 'Feature name is required' });
  }

  try {
    const baselineResult = baselineService.checkFeature(feature);
    
    // Get AI suggestion
    const aiSuggestion = await aiService.getSuggestion(
      feature,
      baselineResult.isBaseline,
      baselineResult.status,
      baselineResult.description
    );

    res.json({
      ...baselineResult,
      aiSuggestion 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to check feature' });
  }
});


app.get('/api/css-features', (req: Request, res: Response) => {
  const features = baselineService.getAllCSSFeatures();
  res.json({ features });
});


app.get('/api/all-features', (req: Request, res: Response) => {
  try {
    const allFeatures = Object.keys(features).map(key => {
      const feature = features[key] as any;
      const status = feature.status;
      
      // Modern approach: both 'high' and 'low' are baseline
      const isBaseline = status?.baseline === 'high' || 
                         status?.baseline === 'low' || 
                         status?.baseline === true;
      
      return {
        id: key,
        name: feature.name || key,
        isBaseline: isBaseline,
        description: feature.description || ''
      };
    });
    
    res.json({ features: allFeatures });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

app.get('/api/debug-feature/:name', (req: Request, res: Response) => {
  const featureName = req.params.name;
  const feature = features[featureName] as any;
  
  if (!feature) {
    return res.json({ error: 'Feature not found' });
  }
  
  // Return the RAW data from web-features
  res.json({
    featureName,
    rawFeature: {
      name: feature.name,
      description: feature.description,
      status: feature.status,
      spec: feature.spec
    }
  });
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎨 CSS features: http://localhost:${PORT}/api/css-features`);
});