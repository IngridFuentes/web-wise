import { features } from 'web-features';

export interface BaselineResult {
  feature: string;
  isBaseline: boolean;
  status: string;
  description: string;
  supportLevel: 'high' | 'medium' | 'low';
  browserSupport: any;
}

export class BaselineService {
  checkFeature(featureName: string): BaselineResult {
    const feature = features[featureName];
    
    if (!feature) {
        return {
            feature: featureName,
            isBaseline: false,
            status: 'unknown',
            description: 'Feature not found in web-features database',
            supportLevel: 'low',
            browserSupport: null
        };
    }

    const status = (feature as any).status;
    
    // Modern approach: Accept both 'high' and 'low' as baseline
    const isBaseline = status?.baseline === 'high' || 
                       status?.baseline === 'low' || 
                       status?.baseline === true;
    
    return {
        feature: featureName,
        isBaseline,
        status: status?.baseline || 'unknown',
        description: (feature as any).description || (feature as any).name || featureName,
        supportLevel: this.calculateSupportLevel(status),
        browserSupport: status?.support || null
    };
}

private calculateSupportLevel(status: any): 'high' | 'medium' | 'low' {
    if (!status) return 'low';
    
    const baseline = status.baseline;
    if (baseline === 'high') return 'high';
    if (baseline === 'low') return 'medium'; // Newly baseline
    return 'low';
}

  // Simplified method to get some feature names for testing
  getAllCSSFeatures(): string[] {
    const featureNames = Object.keys(features);
    
    // Filter for likely CSS features and return first 10
    return featureNames
      .filter(key => key.includes('css') || key.includes('grid') || key.includes('flex'))
      .slice(0, 10);
  }

  //test specific known features
  getTestFeatures(): string[] {
    return [
      'css-grid',
      'flexbox', 
      'css-variables',
      'css-container-queries',
      'css-has'
    ];
  }
}