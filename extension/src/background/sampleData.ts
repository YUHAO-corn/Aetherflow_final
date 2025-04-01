import { storageService } from '../services/storage';
import { Prompt } from '../services/prompt/types';
import { v4 as uuidv4 } from 'uuid';

// Initial sample prompt data
const samplePrompts: Omit<Prompt, 'id'>[] = [
  {
    title: 'How to Study Efficiently',
    content: `# How to Study Efficiently

## Background and Goals
Please provide a systematic set of efficient learning strategies to help improve knowledge acquisition, memory retention, and application ability.

## Specific Requirements
1. **Preparation Before Learning**
   - How to set clear learning objectives
   - Environment optimization suggestions
   - Time management techniques

2. **Core Learning Techniques**
   - Active learning methods
   - Information processing strategies
   - Attention management

3. **Memory and Consolidation**
   - Effective memory techniques
   - Spaced repetition systems
   - Knowledge application methods

4. **Evaluation and Adjustment**
   - Learning effectiveness evaluation metrics
   - Solutions to common problems
   - Personalized adjustment suggestions

## Output Requirements
- Use a clear step-by-step structure
- Include scientific basis and practical tips
- Provide specific actionable examples
- Include adaptable approaches for different learning scenarios
- Use concise and clear language, avoid academic jargon`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 50000,
    useCount: 15,
    lastUsed: Date.now() - 10000,
    tags: ['Learning', 'Efficiency', 'Methodology'],
    source: 'predefined',
    category: 'Learning Methods',
    isActive: true
  },
  {
    title: 'Scientific and Effective Body Management',
    content: `# How to Manage Your Body Scientifically and Effectively

## Core Goal
**Achieve healthy, sustainable body management through a systematic approach**, including weight control, body shaping, and overall health improvement.

## Key Elements

### 1. Nutrition Management
- **Balanced Diet**: Adopt a diverse meal structure with reasonable proportions of the three major nutrients
- **Calorie Control**: Develop appropriate calorie intake plans based on goals (fat loss/muscle gain/maintenance)
- **Diet Quality**: Prioritize natural, unprocessed foods, control refined sugar and trans fat intake

### 2. Exercise Plan
- **Cardio Exercise**: 3-5 times per week, 30-60 minutes each session (e.g., running, swimming, cycling)
- **Strength Training**: 2-3 times per week of full-body resistance training
- **Flexibility Training**: 2-3 stretch or yoga sessions per week

### 3. Lifestyle Habits
- **Sleep Management**: Ensure 7-9 hours of quality sleep
- **Stress Regulation**: Manage stress levels through meditation, deep breathing, etc.
- **Hydration**: Maintain 1.5-2 liters of water intake daily

## Monitoring and Adjustment
- Regularly measure key indicators such as body fat percentage and circumference
- Establish a diet and exercise recording system
- Evaluate progress and adjust plans every 4-6 weeks

## Precautions
- Avoid extreme dieting or excessive exercise
- Set realistic, achievable phased goals
- Seek professional nutritionist or fitness coach guidance when necessary

**Expected Output**: Please provide a 4-week personalized body management plan, including specific dietary suggestions, exercise arrangements, and lifestyle adjustment plans that are scientific, executable, and consistent with health principles.`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 900000,
    updatedAt: Date.now() - 80000,
    useCount: 8,
    lastUsed: Date.now() - 40000,
    tags: ['Health', 'Exercise', 'Diet'],
    source: 'predefined',
    category: 'Health Management',
    isActive: true
  },
  {
    title: 'Mood Regulation Guide',
    content: `# What Should I Do When I Feel Down?

Please provide a **comprehensive and structured** emotional regulation guide that includes the following elements:

1. **Immediate Emotion Regulation Techniques**
   - Physical methods for quickly relieving negative emotions
   - Practical steps for cognitive restructuring
   - Environmental adjustment suggestions

2. **Medium to Long-term Emotional Management Strategies**
   - Daily emotional maintenance habits
   - Preventive emotional regulation methods
   - Training plans for building emotional resilience

3. **Professional Support Recommendations**
   - Criteria for determining when to seek professional help
   - Guidelines for choosing psychological counseling/therapy
   - Reliable recommendations for self-help resources

**Output Requirements**:
- Present in sections according to the above structure
- Explain the scientific basis for each suggestion
- Include specific actionable steps
- Use easy-to-understand language
- Avoid general advice, provide detailed explanations`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 700000,
    updatedAt: Date.now() - 70000,
    useCount: 12,
    lastUsed: Date.now() - 20000,
    tags: ['Psychology', 'Emotions', 'Health'],
    source: 'predefined',
    category: 'Mental Health',
    isActive: true
  },
  {
    title: 'Frontend Template Integration Guide',
    content: `# How to Implement Integration Using Frontend Templates
Please provide detailed instructions on how to implement end-to-end integration using frontend interface design and modules as templates, based on the following requirements:

**Background Information:**
- Frontend interface design and functional modules have been approved
- Need to develop the complete process based on existing frontend as the standard

**Specific Requirements:**
1. **Technical Implementation Plan**:
   - Explain how to convert frontend designs into reusable templates
   - Describe specific methods for interface integration
   - List necessary technology stack and toolchain

2. **Process Implementation Steps**:
   - Explain the complete process from template to actual operation in stages
   - Key milestones and acceptance criteria for each stage
   - Potential technical challenges and solutions

3. **Quality Assurance Measures**:
   - How to ensure frontend-backend data consistency
   - Performance optimization and exception handling solutions
   - Testing strategies and verification methods

**Output Requirements:**
- Use a detailed step-by-step explanation format
- Include necessary technical details without sacrificing readability
- Emphasize the conversion process from design to implementation
- Provide quantifiable evaluation metrics`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 30000,
    useCount: 5,
    lastUsed: Date.now() - 15000,
    tags: ['Frontend', 'Development', 'Integration'],
    source: 'predefined',
    category: 'Technical Development',
    isActive: true
  }
];

/**
 * Initialize sample prompt data
 * Used for new installations or when no data exists
 */
export async function initializeSampleData(): Promise<void> {
  try {
    console.log('[SampleData] Starting to initialize sample prompt data...');
    
    // Batch save sample prompts
    for (const samplePrompt of samplePrompts) {
      const prompt: Prompt = {
        ...samplePrompt,
        id: uuidv4() // Generate unique ID
      };
      
      await storageService.savePrompt(prompt);
    }
    
    console.log('[SampleData] Sample prompt data initialization completed');
  } catch (error) {
    console.error('[SampleData] Failed to initialize sample data:', error);
    throw error;
  }
} 