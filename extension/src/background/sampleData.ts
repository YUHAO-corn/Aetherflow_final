import { storageService } from '../services/storage';
import { Prompt } from '../services/prompt/types';
import { v4 as uuidv4 } from 'uuid';

// Initial sample prompt data
const samplePrompts: Omit<Prompt, 'id'>[] = [
  {
    title: 'How to Study Efficiently',
    content: `How to Study Efficiently

Background
I need a systematic guide for effective learning strategies to improve my study habits.

Requirements
1. Preparation Techniques
   • Setting clear objectives
   • Environment optimization
   • Time management

2. Learning Methods
   • Active learning approaches
   • Memory techniques
   • Focus maintenance

3. Application & Review
   • Knowledge application
   • Progress evaluation
   • Problem-solving strategies

Output Format
• Use clear structure with practical examples
• Include scientific basis where relevant
• Provide adaptable methods for different subjects`,
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
    title: 'Scientific Body Management',
    content: `Scientific Body Management Plan

Goal
Create a balanced 4-week health plan for [GOAL] (weight management/muscle building/general fitness).

Key Components

1. Nutrition
• Balanced meal structure with appropriate macronutrients
• Calorie guidelines based on activity level
• Food quality recommendations

2. Exercise
• Weekly cardio schedule (3-5 sessions)
• Strength training plan (2-3 sessions)
• Flexibility and mobility work

3. Lifestyle
• Sleep optimization
• Stress management techniques
• Hydration guidelines

Expected Output
Provide a practical 4-week plan with specific recommendations for nutrition, exercise, and lifestyle habits tailored to my goal.

Note: Simply replace [GOAL] with your specific health objective.`,
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
    content: `Emotional Regulation Guide

As a mental health professional, provide practical strategies for managing [EMOTION] (anxiety/sadness/anger/stress).

Structure

1. Immediate Relief Techniques
   • Physical methods (breathing, exercise)
   • Cognitive approaches (thought restructuring)
   • Environmental adjustments

2. Long-term Management
   • Daily emotional maintenance practices
   • Preventive strategies
   • Resilience-building methods

3. Professional Support
   • When to seek help
   • Types of appropriate therapy
   • Reliable self-help resources

Output Format
• Provide scientifically-backed, actionable strategies
• Include specific steps for implementation
• Use accessible language without oversimplification

Note: Replace [EMOTION] with the specific emotion you're experiencing.`,
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
    title: 'Assignment Feedback Generator',
    content: `Educational Assignment Feedback

As an experienced educator, review the attached [ASSIGNMENT_TYPE] (essay/report/project/problem set) for [SUBJECT] and provide structured feedback.

Evaluation Framework

1. Content Assessment
• Accuracy and depth of understanding
• Application of key concepts
• Critical thinking and creativity
• Use of evidence and examples

2. Structure & Technical Elements
• Organization and logical flow
• Language usage and clarity
• Format and presentation
• Citation and referencing (if applicable)

Feedback Structure

1. Strengths Summary (2-3 key points)
2. Areas for Improvement (2-3 priorities)
3. Specific Examples (referencing particular sections)
4. Growth Recommendations (3-5 actionable steps)

Use constructive, supportive language while maintaining academic standards.

Note: Simply attach student work and specify the assignment type and subject.`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 20000,
    useCount: 18,
    lastUsed: Date.now() - 5000,
    tags: ['Education', 'Teaching', 'Feedback'],
    source: 'predefined',
    category: 'Educational Tools',
    isActive: true
  },
  {
    title: 'Content Creation Engine',
    content: `SEO Content Creator

As a content strategist, create a [CONTENT_TYPE] (article/blog post/social media/email) about [TOPIC] optimized for [TARGET_AUDIENCE].

Content Framework

1. SEO Elements
• Strategic keyword incorporation
• SEO-optimized headline and structure
• Meta description recommendation
• Internal/external linking suggestions

2. Content Structure
• Engaging introduction with hook
• Logical section organization
• Compelling conclusion with call-to-action
• Supporting evidence and examples

3. Engagement Features
• Data points or statistics
• Relevant analogies or metaphors
• Visual content suggestions
• Interactive elements (questions, polls)

Delivery Requirements
• Professionally written, publication-ready content
• Proper formatting with headers and lists
• Balanced creativity and clarity
• 600-1000 words (adjustable based on content type)

Note: Simply specify content type, topic, and target audience to generate customized content.`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 250000,
    updatedAt: Date.now() - 15000,
    useCount: 22,
    lastUsed: Date.now() - 3000,
    tags: ['Marketing', 'SEO', 'Content Creation'],
    source: 'predefined',
    category: 'Marketing Tools',
    isActive: true
  },
  {
    title: 'Research Paper Analyzer',
    content: `Research Paper Analysis

As a research methodology expert, analyze the attached paper on [TOPIC] and provide a comprehensive evaluation.

Analysis Framework

1. Methodology Assessment
• Research design appropriateness
• Data collection and analysis methods
• Validity and reliability considerations
• Limitations and their handling

2. Contribution Evaluation
• Positioning within existing literature
• Theoretical and practical significance
• Innovation in approach or findings
• Implications for the field

3. Quality Analysis
• Argument coherence and logic
• Evidence strength and relevance
• Alternative interpretations
• Ethical considerations

Output Format

1. Executive Summary (200 words)
2. Strengths & Weaknesses (3-5 points each)
3. Key Implications (theoretical and practical)
4. Future Research Directions (2-3 suggestions)

Include specific examples from the paper to support your analysis.

Note: Simply attach the research paper and specify the topic to receive a tailored analysis.`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 25000,
    useCount: 14,
    lastUsed: Date.now() - 8000,
    tags: ['Research', 'Academic', 'Analysis'],
    source: 'predefined',
    category: 'Academic Tools',
    isActive: true
  },
  {
    title: 'Legal Document Analyzer',
    content: `Legal Document Analysis

As a legal specialist, review the attached [DOCUMENT_TYPE] (contract/agreement/policy) and provide a comprehensive assessment.

Analysis Framework

1. Structural Review
• Document organization and completeness
• Required legal elements and compliance
• Formatting and referencing standards
• Missing or incomplete sections

2. Content Evaluation
• Terms and definitions clarity
• Rights and obligations specification
• Liability and risk allocation
• Dispute resolution mechanisms

3. Risk Assessment
• Potential enforceability issues
• Legal vulnerabilities or loopholes
• Compliance with relevant regulations
• Protection adequacy for involved parties

Output Format

1. Executive Summary (document quality assessment)
2. Critical Issues (3-5 priority concerns)
3. Improvement Recommendations (specific language suggestions)
4. Implementation Guidance (next steps and priorities)

Provide practical, actionable advice based on established legal principles.

Note: Simply attach your legal document and specify the document type to receive tailored analysis.`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 450000,
    updatedAt: Date.now() - 22000,
    useCount: 10,
    lastUsed: Date.now() - 7000,
    tags: ['Legal', 'Contracts', 'Analysis'],
    source: 'predefined',
    category: 'Legal Tools',
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